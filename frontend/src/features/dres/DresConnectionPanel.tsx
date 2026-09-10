import { useState } from "react";

import {
  getCurrentDresTask,
  loginToDres,
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
}

export function DresConnectionPanel({
  onClose,
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

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const isConnected = Boolean(bridgeToken);

  async function validateRun(
    evaluationId: string,
    token: string,
  ): Promise<string> {
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

      return task.name;
    } catch {
      throw new Error(
        "Run ID is unavailable or the evaluation has ended.",
      );
    }
  }

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

      const taskName = await validateRun(
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
      setCurrentTaskName(taskName);

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
      const taskName = await validateRun(
        normalizedRunId,
        bridgeToken,
      );

      setDresRunId(normalizedRunId);
      setRunId(normalizedRunId);
      setCurrentTaskName(taskName);
    } catch {
      setRunId(getDresRunId());

      setErrorMessage(
        "Run ID is unavailable or the evaluation has ended. Last saved run restored.",
      );
    } finally {
      setIsSavingRun(false);
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

          {currentTaskName && (
            <div className="dres-panel__account">
              Current task: {currentTaskName}
            </div>
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
              disabled={isSavingRun}
              onClick={handleSaveRunId}
            >
              {isSavingRun
                ? "Checking..."
                : "Save run"}
            </button>

            <button
              type="button"
              disabled={isSavingRun}
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