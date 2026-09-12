import { useEffect, useState } from "react";

import {
  getCurrentDresTask,
  loginToDres,
  startDresTask,
  type DresCurrentTask,
} from "./dres.api";

import {
  clearDresSession,
  getDresBridgeToken,
  getDresRunId,
  getDresUsername,
  setDresBridgeToken,
  setDresRunId,
  setDresUsername,
} from "./dres.session";

import "./DresConnectionPanel.css";

interface DresConnectionPanelProps {
  onClose: () => void;
  onCurrentTaskChange: (
    task: DresCurrentTask | null,
  ) => void;
}

export function DresConnectionPanel({
  onClose,
  onCurrentTaskChange,
}: DresConnectionPanelProps) {
  const [runId, setRunId] =
    useState(getDresRunId());

  const [username, setUsername] =
    useState(getDresUsername());

  const [password, setPassword] =
    useState("");

  const [bridgeToken, setBridgeToken] =
    useState(getDresBridgeToken());

  const [currentTaskName, setCurrentTaskName] =
    useState("");

  const [isConnecting, setIsConnecting] =
    useState(false);

  const [isSavingRun, setIsSavingRun] =
    useState(false);
  const [isStartingTask, setIsStartingTask] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [
    hasValidatedRun,
    setHasValidatedRun,
  ] = useState(false);

  const isConnected = Boolean(bridgeToken);

  async function validateRun(
    evaluationId: string,
    token: string,
  ): Promise<DresCurrentTask | null> {
    try {
      const task = await getCurrentDresTask(
        evaluationId,
        token,
      );

      if (!task.name) {
        throw new Error(
          "DRES returned no current task.",
        );
      }

      return task;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "";

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes(
          "invalid bridge token",
        )
      ) {
        throw new Error(
          "DRES session expired. Please reconnect.",
        );
      }

      if (
        normalizedMessage.includes(
          "no active task",
        ) ||
        normalizedMessage.includes(
          "no current task",
        )
      ) {
        return null;
      }

      throw new Error(
        "Run ID is unavailable or the evaluation has ended.",
      );
    }
  }

  useEffect(() => {
    const savedRunId =
      getDresRunId().trim();

    const savedToken =
      getDresBridgeToken().trim();

    if (!savedRunId || !savedToken) {
      return;
    }

    let cancelled = false;

    void validateRun(
      savedRunId,
      savedToken,
    )
      .then((task) => {
        if (cancelled) {
          return;
        }

        setCurrentTaskName(
          task?.name ?? "",
        );

        onCurrentTaskChange(task);
        setHasValidatedRun(true);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to validate DRES session.";

        if (
          message ===
          "DRES session expired. Please reconnect."
        ) {
          clearDresSession();
          setBridgeToken("");
          setCurrentTaskName("");
          onCurrentTaskChange(null);
          setHasValidatedRun(false);
        }

        setErrorMessage(message);
      });

    return () => {
      cancelled = true;
    };
  }, [onCurrentTaskChange]);

  async function handleConnect() {
    const normalizedRunId = runId.trim();
    const normalizedUsername = username.trim();

    if (!normalizedRunId) {
      setErrorMessage("Run ID is required.");
      return;
    }

    if (!normalizedUsername || !password) {
      setErrorMessage(
        "Username and password are required.",
      );
      return;
    }

    setIsConnecting(true);
    setErrorMessage(null);

    try {
      const response = await loginToDres(
        normalizedUsername,
        password,
      );

      const task = await validateRun(
        normalizedRunId,
        response.access_token,
      );

      setDresRunId(normalizedRunId);
      setDresBridgeToken(response.access_token);
      setDresUsername(
        response.username ?? normalizedUsername,
      );

      setRunId(normalizedRunId);
      setUsername(
        response.username ?? normalizedUsername,
      );
      setBridgeToken(response.access_token);
      setCurrentTaskName(
        task?.name ?? "",
      );

      onCurrentTaskChange(task);
      setHasValidatedRun(true);

      // Password is intentionally never stored.
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to DRES.",
      );
    } finally {
      setIsConnecting(false);
    }
  }

  function handleDisconnect() {
    clearDresSession();
    setBridgeToken("");
    setCurrentTaskName("");
    onCurrentTaskChange(null);
    setHasValidatedRun(false);
    setPassword("");
    setErrorMessage(null);
  }

  async function handleSaveRunId() {
    const normalizedRunId = runId.trim();

    if (!normalizedRunId) {
      setErrorMessage("Run ID is required.");
      return;
    }

    if (!bridgeToken) {
      setErrorMessage(
        "DRES is not connected.",
      );
      return;
    }

    setIsSavingRun(true);
    setErrorMessage(null);

    try {
      const task = await validateRun(
        normalizedRunId,
        bridgeToken,
      );

      setDresRunId(normalizedRunId);
      setRunId(normalizedRunId);
      setCurrentTaskName(
        task?.name ?? "",
      );

      onCurrentTaskChange(task);
      setHasValidatedRun(true);
    } catch {
      setRunId(getDresRunId());

      setErrorMessage(
        "Run ID is unavailable or the evaluation has ended. Last saved run restored.",
      );
    } finally {
      setIsSavingRun(false);
    }
  }
  async function handleStartTask() {
    const normalizedRunId =
      runId.trim();

    if (!normalizedRunId) {
      setErrorMessage(
        "Run ID is required.",
      );
      return;
    }

    if (!bridgeToken) {
      setErrorMessage(
        "DRES is not connected.",
      );
      return;
    }

    setIsStartingTask(true);
    setErrorMessage(null);

    try {
      await startDresTask(
        normalizedRunId,
        bridgeToken,
      );

      const task =
        await validateRun(
          normalizedRunId,
          bridgeToken,
        );

      setDresRunId(normalizedRunId);
      setCurrentTaskName(
        task?.name ?? "",
      );

      onCurrentTaskChange(task);
      setHasValidatedRun(true);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to start DRES task.";

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes(
          "invalid bridge token",
        ) ||
        normalizedMessage.includes(
          "session expired",
        )
      ) {
        clearDresSession();
        setBridgeToken("");
        setCurrentTaskName("");
        onCurrentTaskChange(null);
        setHasValidatedRun(false);

        setErrorMessage(
          "DRES session expired. Please reconnect.",
        );
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsStartingTask(false);
    }
  }
  return (
    <div className="dres-panel">
      <div className="dres-panel__header">
        <div>
          <span className="dres-panel__eyebrow">
            Competition connection
          </span>

          <h2>DRES</h2>
        </div>

        <button
          type="button"
          className="dres-panel__close"
          onClick={onClose}
          aria-label="Close DRES panel"
        >
          ×
        </button>
      </div>

      {isConnected ? (
        <div className="dres-panel__connected">
          <div className="dres-panel__status">
            <span className="dres-panel__status-dot" />
            Connected
          </div>

          <div className="dres-panel__account">
            {username}
          </div>

          {currentTaskName ? (
            <div className="dres-panel__account">
              Current task: {currentTaskName}
            </div>
          ) : (
            hasValidatedRun && (
              <div className="dres-panel__account">
                No active task is currently available.
              </div>
            )
          )}

          <label className="dres-panel__field">
            <span>Run ID</span>

            <input
              value={runId}
              onChange={(event) =>
                setRunId(event.target.value)
              }
              placeholder="Evaluation / Run ID"
            />
          </label>

          <div className="dres-panel__actions">
            <button
              type="button"
              disabled={
                isSavingRun ||
                isStartingTask
              }
              onClick={handleStartTask}
            >
              {isStartingTask
                ? "Starting..."
                : "Start task"}
            </button>

            <button
              type="button"
              disabled={
                isSavingRun ||
                isStartingTask
              }
              onClick={handleSaveRunId}
            >
              {isSavingRun
                ? "Checking..."
                : "Save run"}
            </button>

            <button
              type="button"
              disabled={
                isSavingRun ||
                isStartingTask
              }
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <div className="dres-panel__form">
          <label className="dres-panel__field">
            <span>Run ID</span>

            <input
              value={runId}
              onChange={(event) =>
                setRunId(event.target.value)
              }
              placeholder="Evaluation / Run ID"
            />
          </label>

          <label className="dres-panel__field">
            <span>Username</span>

            <input
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              autoComplete="username"
            />
          </label>

          <label className="dres-panel__field">
            <span>Password</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
            />
          </label>

          <button
            type="button"
            className="dres-panel__connect"
            disabled={isConnecting}
            onClick={handleConnect}
          >
            {isConnecting
              ? "Connecting..."
              : "Connect"}
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          className="dres-panel__error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}