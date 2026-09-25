import { useEffect, useState } from "react";

import {
  getCurrentDresTask,
  getDresEvaluations,
  loginToDres,
  logoutFromDres,
  type DresCurrentTask,
  type DresEvaluation,
  type DresSubmissionModeSetting,
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
  submissionModeSetting: DresSubmissionModeSetting;
  onSubmissionModeSettingChange: (
    setting: DresSubmissionModeSetting,
  ) => void;
}

export function DresConnectionPanel({
  onClose,
  onCurrentTaskChange,
  submissionModeSetting,
  onSubmissionModeSettingChange,
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
  const [
    activeEvaluations,
    setActiveEvaluations,
  ] = useState<DresEvaluation[]>([]);
  const [isConnecting, setIsConnecting] =
    useState(false);

  const [isSavingRun, setIsSavingRun] =
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

    if (!savedToken) {
      return;
    }

    let cancelled = false;

    void getDresEvaluations(
      savedToken,
    )
      .then((response) => {
        if (cancelled) {
          return;
        }

        setActiveEvaluations(
          response.active_evaluations,
        );
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Unable to load active DRES evaluations.";

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
          setActiveEvaluations([]);
          setCurrentTaskName("");
          onCurrentTaskChange(null);
          setHasValidatedRun(false);
        }

        setErrorMessage(message);
      });

    if (savedRunId) {
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
            setActiveEvaluations([]);
            setCurrentTaskName("");
            onCurrentTaskChange(null);
            setHasValidatedRun(false);
          }

          setErrorMessage(message);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [onCurrentTaskChange]);

  async function handleConnect() {
    const requestedRunId = runId.trim();
    const normalizedUsername = username.trim();

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

      const evaluationResponse =
        await getDresEvaluations(
          response.access_token,
        );

      const active =
        evaluationResponse.active_evaluations;

      setActiveEvaluations(active);

      const authenticatedUsername =
        response.username ??
        normalizedUsername;

      setDresBridgeToken(
        response.access_token,
      );

      setDresUsername(
        authenticatedUsername,
      );

      setUsername(
        authenticatedUsername,
      );

      setBridgeToken(
        response.access_token,
      );

      let resolvedRunId =
        requestedRunId;

      if (!resolvedRunId) {
        if (active.length === 0) {
          throw new Error(
            "No active DRES evaluation was found. Enter a Run ID manually if needed.",
          );
        }

        if (active.length === 1) {
          resolvedRunId = String(
            active[0].id ?? "",
          ).trim();
        }

        if (active.length > 1) {
          setDresRunId("");
          setRunId("");
          setCurrentTaskName("");

          onCurrentTaskChange(null);
          onSubmissionModeSettingChange(
            "AUTO",
          );

          setHasValidatedRun(false);

          // Password is intentionally never stored.
          setPassword("");

          return;
        }
      }

      if (!resolvedRunId) {
        throw new Error(
          "The active DRES evaluation has no ID.",
        );
      }

      const task = await validateRun(
        resolvedRunId,
        response.access_token,
      );

      setDresRunId(resolvedRunId);
      setRunId(resolvedRunId);

      setCurrentTaskName(
        task?.name ?? "",
      );

      onCurrentTaskChange(task);
      onSubmissionModeSettingChange(
        "AUTO",
      );

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

  async function handleDisconnect() {
    const tokenToRevoke = bridgeToken;

    try {
      if (tokenToRevoke) {
        await logoutFromDres(tokenToRevoke);
      }
    } catch {
      // Local disconnect must still succeed
      // even if the bridge session already expired.
    } finally {
      clearDresSession();
      setBridgeToken("");
      setActiveEvaluations([]);
      setCurrentTaskName("");
      onCurrentTaskChange(null);
      onSubmissionModeSettingChange("AUTO");
      setHasValidatedRun(false);
      setPassword("");
      setErrorMessage(null);
    }
  }
  async function handleSelectActiveEvaluation(
    evaluationId: string,
  ) {
    const normalizedRunId =
      evaluationId.trim();

    if (!normalizedRunId) {
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

      setDresRunId(
        normalizedRunId,
      );

      setRunId(
        normalizedRunId,
      );

      setCurrentTaskName(
        task?.name ?? "",
      );

      onCurrentTaskChange(task);

      onSubmissionModeSettingChange(
        "AUTO",
      );

      setHasValidatedRun(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to switch DRES evaluation.",
      );
    } finally {
      setIsSavingRun(false);
    }
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
      onSubmissionModeSettingChange("AUTO");
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
          {activeEvaluations.length > 0 && (
            <label className="dres-panel__field">
              <span>Active evaluation</span>

              <select
                value={
                  activeEvaluations.some(
                    (evaluation) =>
                      String(
                        evaluation.id,
                      ) === runId
                  )
                    ? runId
                    : ""
                }
                disabled={isSavingRun}
                onChange={(event) =>
                  void handleSelectActiveEvaluation(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Select active evaluation
                </option>

                {activeEvaluations.map(
                  (evaluation) => (
                    <option
                      key={evaluation.id}
                      value={evaluation.id}
                    >
                      {evaluation.name ??
                        evaluation.id}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <label className="dres-panel__field">
            <span>Submission mode</span>

            <select
              value={submissionModeSetting}
              disabled={isSavingRun}
              onChange={(event) =>
                onSubmissionModeSettingChange(
                  event.target
                    .value as DresSubmissionModeSetting,
                )
              }
            >
              <option value="AUTO">
                Auto — use DRES task type
              </option>
              <option value="KIS">
                KIS
              </option>
              <option value="QA">
                QA
              </option>
              <option value="TRAKE">
                TRAKE
              </option>
            </select>
          </label>
          <label className="dres-panel__field">
            <span>Run ID (manual fallback)</span>

            <input
              value={runId}
              onChange={(event) =>
                setRunId(event.target.value)
              }
              placeholder="Manual evaluation ID"
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