import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Send,
  X,
} from "lucide-react";

import {
  submitToDres,
} from "../dres/dres.api";

import {
  getDresBridgeToken,
  getDresRunId,
} from "../dres/dres.session";

import "./ManualKisSubmissionModal.css";

type ManualMode =
  | "frame"
  | "milliseconds";

interface ManualKisSubmissionModalProps {
  initialVideoId?: string;
  initialTimestampMs?: number;
  onClose: () => void;
}

export function ManualKisSubmissionModal({
  initialVideoId = "",
  initialTimestampMs,
  onClose,
}: ManualKisSubmissionModalProps) {
  const [mode, setMode] =
    useState<ManualMode>("milliseconds");

  const [videoId, setVideoId] =
    useState(initialVideoId);

  const [frameIndex, setFrameIndex] =
    useState("");

  const [fps, setFps] =
    useState("");

  const [timestamp, setTimestamp] =
    useState(
      initialTimestampMs === undefined
        ? ""
        : String(
            Math.round(
              initialTimestampMs,
            ),
          ),
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<{
      submission: string;
      description: string;
      timestampMs: number;
    } | null>(null);

  function resolveTimestampMs(): number {
    if (mode === "milliseconds") {
      const value = Number(timestamp);

      if (
        !Number.isInteger(value) ||
        value < 0
      ) {
        throw new Error(
          "Timestamp must be a non-negative integer in milliseconds.",
        );
      }

      return value;
    }

    const frameValue =
      Number(frameIndex);

    const fpsValue =
      Number(fps);

    if (
      !Number.isInteger(frameValue) ||
      frameValue < 0
    ) {
      throw new Error(
        "Frame index must be a non-negative integer.",
      );
    }

    if (
      !Number.isFinite(fpsValue) ||
      fpsValue <= 0
    ) {
      throw new Error(
        "FPS must be a valid number greater than 0.",
      );
    }

    return Math.round(
      (frameValue / fpsValue) * 1000,
    );
  }

  async function handleSubmit() {
    const normalizedVideoId =
      videoId.trim().toUpperCase();

    if (!normalizedVideoId) {
      setErrorMessage(
        "Video ID is required.",
      );
      return;
    }

    const evaluationId =
      getDresRunId().trim();

    const bridgeToken =
      getDresBridgeToken().trim();

    if (!evaluationId) {
      setErrorMessage(
        "DRES Run ID is missing.",
      );
      return;
    }

    if (!bridgeToken) {
      setErrorMessage(
        "DRES is not connected.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const timestampMs =
        resolveTimestampMs();

      const response =
        await submitToDres(
          evaluationId,
          bridgeToken,
          {
            media_item_name:
              normalizedVideoId,
            timestamp_ms:
              timestampMs,
          },
        );

      if (
        response.status !== "ok" ||
        response.dres_response.status !== true
      ) {
        throw new Error(
          response.dres_response.description ??
            "DRES rejected the submission.",
        );
      }

      setResult({
        submission:
          response.dres_response.submission ??
          "UNKNOWN",

        description:
          response.dres_response.description ??
          "Submission sent to DRES.",

        timestampMs,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit to DRES.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="manual-kis__overlay"
      role="presentation"
    >
      <section
        className="manual-kis"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-kis-title"
      >
        <header className="manual-kis__header">
          <div>
            <span className="manual-kis__eyebrow">
              Competition submission
            </span>

            <h2 id="manual-kis-title">
              Manual KIS submission
            </h2>
          </div>

          <button
            type="button"
            className="manual-kis__close"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close manual submission"
          >
            <X size={20} />
          </button>
        </header>

        <div className="manual-kis__body">
          {result ? (
            <div className="manual-kis__result">
              <CheckCircle2
                size={44}
                className="manual-kis__success-icon"
              />

              <h3>Submission sent</h3>

              <p>{result.description}</p>

              <dl className="manual-kis__details">
                <div>
                  <dt>DRES result</dt>
                  <dd>{result.submission}</dd>
                </div>

                <div>
                  <dt>Timestamp</dt>
                  <dd>
                    {result.timestampMs} ms
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              <label className="manual-kis__field">
                <span>Video ID</span>

                <input
                  value={videoId}
                  onChange={(event) =>
                    setVideoId(
                      event.target.value,
                    )
                  }
                  placeholder="L21_V001"
                  disabled={isSubmitting}
                />
              </label>

              <div className="manual-kis__mode">
                <button
                  type="button"
                  className={
                    mode === "frame"
                      ? "manual-kis__mode-button manual-kis__mode-button--active"
                      : "manual-kis__mode-button"
                  }
                  onClick={() =>
                    setMode("frame")
                  }
                  disabled={isSubmitting}
                >
                  By frame
                </button>

                <button
                  type="button"
                  className={
                    mode === "milliseconds"
                      ? "manual-kis__mode-button manual-kis__mode-button--active"
                      : "manual-kis__mode-button"
                  }
                  onClick={() =>
                    setMode("milliseconds")
                  }
                  disabled={isSubmitting}
                >
                  Milliseconds
                </button>
              </div>

              {mode === "frame" ? (
                <>
                  <label className="manual-kis__field">
                    <span>Frame index</span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={frameIndex}
                      onChange={(event) =>
                        setFrameIndex(
                          event.target.value,
                        )
                      }
                      placeholder="23460"
                      disabled={isSubmitting}
                    />
                  </label>

                  <label className="manual-kis__field">
                    <span>
                      FPS — Local DRES helper
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={fps}
                      onChange={(event) =>
                        setFps(
                          event.target.value,
                        )
                      }
                      placeholder="30"
                      disabled={isSubmitting}
                    />
                  </label>
                </>
              ) : (
                <label className="manual-kis__field">
                  <span>
                    Timestamp (ms)
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={timestamp}
                    onChange={(event) =>
                      setTimestamp(
                        event.target.value,
                      )
                    }
                    placeholder="262603"
                    disabled={isSubmitting}
                  />
                </label>
              )}

              {mode === "frame" &&
                frameIndex &&
                fps &&
                Number(fps) > 0 && (
                  <div className="manual-kis__preview">
                    Calculated timestamp:{" "}
                    {Math.round(
                      (
                        Number(frameIndex) /
                        Number(fps)
                      ) * 1000,
                    )}
                    {" ms"}
                  </div>
                )}

              {errorMessage && (
                <div
                  className="manual-kis__error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="manual-kis__footer">
          {result ? (
            <button
              type="button"
              className="manual-kis__primary"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                className="manual-kis__secondary"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="button"
                className="manual-kis__primary"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                <Send size={18} />

                {isSubmitting
                  ? "Submitting..."
                  : "Submit to DRES"}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}