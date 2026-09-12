import { useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";

import {
  submitTrakeToDres,
} from "../dres/dres.api";

import {
  getDresBridgeToken,
  getDresRunId,
} from "../dres/dres.session";

import "./ManualKisSubmissionModal.css";

type EventMode =
  | "frame"
  | "timestamp";

interface TrakeEventDraft {
  id: number;
  videoId: string;
  mode: EventMode;
  frameIndex: string;
  fps: string;
  timestamp: string;
}

interface TrakeSubmissionModalProps {
  onClose: () => void;
}

function createEvent(
  id: number,
): TrakeEventDraft {
  return {
    id,
    videoId: "",
    mode: "frame",
    frameIndex: "",
    fps: "",
    timestamp: "",
  };
}

export function TrakeSubmissionModal({
  onClose,
}: TrakeSubmissionModalProps) {
  const [events, setEvents] =
    useState<TrakeEventDraft[]>([
      createEvent(1),
      createEvent(2),
    ]);

  const [nextId, setNextId] =
    useState(3);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<{
      submission: string;
      description: string;
      submittedEvents: Array<{
        index: number;
        mediaItemName: string;
        startMs: number;
      }>;
    } | null>(null);

  function updateEvent(
    id: number,
    patch: Partial<TrakeEventDraft>,
  ) {
    setEvents((current) =>
      current.map((event) =>
        event.id === id
          ? {
              ...event,
              ...patch,
            }
          : event,
      ),
    );
  }

  function addEvent() {
    setEvents((current) => [
      ...current,
      createEvent(nextId),
    ]);

    setNextId((current) =>
      current + 1
    );
  }

  function removeEvent(
    id: number,
  ) {
    setEvents((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter(
        (event) =>
          event.id !== id,
      );
    });
  }

  function moveEvent(
    index: number,
    direction: -1 | 1,
  ) {
    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= events.length
    ) {
      return;
    }

    setEvents((current) => {
      const next = [...current];

      const [
        moved,
      ] = next.splice(
        index,
        1,
      );

      next.splice(
        targetIndex,
        0,
        moved,
      );

      return next;
    });
  }

  function resolveTimestamp(
    event: TrakeEventDraft,
    index: number,
  ): number {
    if (
      event.mode === "timestamp"
    ) {
      const value =
        Number(event.timestamp);

      if (
        !Number.isFinite(value) ||
        value < 0
      ) {
        throw new Error(
          `Event ${index + 1}: timestamp must be a valid number greater than or equal to 0.`,
        );
      }

      return value;
    }

    const frameValue =
      Number(event.frameIndex);

    const fpsValue =
      Number(event.fps);

    if (
      !Number.isInteger(frameValue) ||
      frameValue < 0
    ) {
      throw new Error(
        `Event ${index + 1}: frame index must be a non-negative integer.`,
      );
    }

    if (
      !Number.isFinite(fpsValue) ||
      fpsValue <= 0
    ) {
      throw new Error(
        `Event ${index + 1}: FPS must be greater than 0.`,
      );
    }

    return frameValue / fpsValue;
  }

  async function handleSubmit() {
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

    if (events.length < 1) {
      setErrorMessage(
        "TRAKE requires at least one event.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const requestEvents =
        events.map(
          (event, index) => {
            const videoId =
              event.videoId
                .trim()
                .toUpperCase();

            if (!videoId) {
              throw new Error(
                `Event ${index + 1}: Video ID is required.`,
              );
            }

            return {
              media_item_name:
                videoId,

              timestamp_seconds:
                resolveTimestamp(
                  event,
                  index,
                ),
            };
          },
        );

      const response =
        await submitTrakeToDres(
          evaluationId,
          bridgeToken,
          {
            events:
              requestEvents,
          },
        );

      if (response.status !== "ok") {
        throw new Error(
          response.dres_response
            .description ??
            "DRES rejected the TRAKE submission.",
        );
      }

      const submission =
        response.dres_response
          .submission ??
        (
          response.dres_http_status ===
          202
            ? "INDETERMINATE"
            : "ACCEPTED"
        );

      setResult({
        submission,

        description:
          response.dres_response
            .description ??
          "TRAKE submission sent to DRES.",

        submittedEvents:
          response.submitted.events.map(
            (event) => ({
              index:
                event.index,

              mediaItemName:
                event.media_item_name,

              startMs:
                event.start_ms,
            }),
          ),
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to submit TRAKE to DRES.";

      const normalizedMessage =
        message.toLowerCase();

      if (
        normalizedMessage.includes(
          "no running task for team",
        )
      ) {
        setErrorMessage(
          "TRAKE task is not currently running. Start or switch to an active DRES task before submitting.",
        );
      } else if (
        normalizedMessage.includes(
          "invalid bridge token",
        )
      ) {
        setErrorMessage(
          "DRES session expired. Please reconnect before submitting.",
        );
      } else {
        setErrorMessage(message);
      }
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
        aria-labelledby="trake-submission-title"
      >
        <header className="manual-kis__header">
          <div>
            <span className="manual-kis__eyebrow">
              Ordered temporal submission
            </span>

            <h2 id="trake-submission-title">
              TRAKE submission
            </h2>
          </div>

          <button
            type="button"
            className="manual-kis__close"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close TRAKE submission"
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

              <h3>
                Submission sent
              </h3>

              <p>
                {result.description}
              </p>

              <dl className="manual-kis__details">
                <div>
                  <dt>DRES result</dt>
                  <dd>
                    {result.submission}
                  </dd>
                </div>

                <div>
                  <dt>Events</dt>
                  <dd>
                    {
                      result
                        .submittedEvents
                        .length
                    }
                  </dd>
                </div>
              </dl>

              <div className="manual-kis__preview">
                {result.submittedEvents
                  .map(
                    (event) =>
                      `${event.index + 1}. ${event.mediaItemName} @ ${(event.startMs / 1000).toFixed(3)}s`,
                  )
                  .join(" → ")}
              </div>
            </div>
          ) : (
            <>
              {events.map(
                (
                  event,
                  index,
                ) => (
                  <div
                    key={event.id}
                    className="manual-kis__details"
                  >
                    <div>
                      <strong>
                        Event {index + 1}
                      </strong>

                      <div>
                        <button
                          type="button"
                          className="manual-kis__secondary"
                          disabled={
                            isSubmitting ||
                            index === 0
                          }
                          onClick={() =>
                            moveEvent(
                              index,
                              -1,
                            )
                          }
                          aria-label={`Move event ${index + 1} up`}
                        >
                          <ArrowUp
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          className="manual-kis__secondary"
                          disabled={
                            isSubmitting ||
                            index ===
                              events.length -
                                1
                          }
                          onClick={() =>
                            moveEvent(
                              index,
                              1,
                            )
                          }
                          aria-label={`Move event ${index + 1} down`}
                        >
                          <ArrowDown
                            size={16}
                          />
                        </button>

                        <button
                          type="button"
                          className="manual-kis__secondary"
                          disabled={
                            isSubmitting ||
                            events.length <=
                              1
                          }
                          onClick={() =>
                            removeEvent(
                              event.id,
                            )
                          }
                          aria-label={`Remove event ${index + 1}`}
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    </div>

                    <label className="manual-kis__field">
                      <span>
                        Video ID
                      </span>

                      <input
                        value={
                          event.videoId
                        }
                        onChange={(
                          changeEvent,
                        ) =>
                          updateEvent(
                            event.id,
                            {
                              videoId:
                                changeEvent
                                  .target
                                  .value,
                            },
                          )
                        }
                        placeholder="L21_V001"
                        disabled={
                          isSubmitting
                        }
                      />
                    </label>

                    <div className="manual-kis__mode">
                      <button
                        type="button"
                        className={
                          event.mode ===
                          "frame"
                            ? "manual-kis__mode-button manual-kis__mode-button--active"
                            : "manual-kis__mode-button"
                        }
                        disabled={
                          isSubmitting
                        }
                        onClick={() =>
                          updateEvent(
                            event.id,
                            {
                              mode:
                                "frame",
                            },
                          )
                        }
                      >
                        By frame
                      </button>

                      <button
                        type="button"
                        className={
                          event.mode ===
                          "timestamp"
                            ? "manual-kis__mode-button manual-kis__mode-button--active"
                            : "manual-kis__mode-button"
                        }
                        disabled={
                          isSubmitting
                        }
                        onClick={() =>
                          updateEvent(
                            event.id,
                            {
                              mode:
                                "timestamp",
                            },
                          )
                        }
                      >
                        By timestamp
                      </button>
                    </div>

                    {event.mode ===
                    "frame" ? (
                      <>
                        <label className="manual-kis__field">
                          <span>
                            Frame index
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={
                              event.frameIndex
                            }
                            onChange={(
                              changeEvent,
                            ) =>
                              updateEvent(
                                event.id,
                                {
                                  frameIndex:
                                    changeEvent
                                      .target
                                      .value,
                                },
                              )
                            }
                            placeholder="23460"
                            disabled={
                              isSubmitting
                            }
                          />
                        </label>

                        <label className="manual-kis__field">
                          <span>
                            FPS
                          </span>

                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={
                              event.fps
                            }
                            onChange={(
                              changeEvent,
                            ) =>
                              updateEvent(
                                event.id,
                                {
                                  fps:
                                    changeEvent
                                      .target
                                      .value,
                                },
                              )
                            }
                            placeholder="30"
                            disabled={
                              isSubmitting
                            }
                          />
                        </label>

                        {event.frameIndex &&
                          event.fps &&
                          Number(
                            event.fps,
                          ) > 0 && (
                            <div className="manual-kis__preview">
                              Timestamp:{" "}
                              {(
                                Number(
                                  event.frameIndex,
                                ) /
                                Number(
                                  event.fps,
                                )
                              ).toFixed(
                                3,
                              )}
                              s
                            </div>
                          )}
                      </>
                    ) : (
                      <label className="manual-kis__field">
                        <span>
                          Timestamp seconds
                        </span>

                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={
                            event.timestamp
                          }
                          onChange={(
                            changeEvent,
                          ) =>
                            updateEvent(
                              event.id,
                              {
                                timestamp:
                                  changeEvent
                                    .target
                                    .value,
                              },
                            )
                          }
                          placeholder="782.000"
                          disabled={
                            isSubmitting
                          }
                        />
                      </label>
                    )}
                  </div>
                ),
              )}

              <button
                type="button"
                className="manual-kis__secondary"
                disabled={isSubmitting}
                onClick={addEvent}
              >
                <Plus size={18} />
                Add event
              </button>

              <div className="manual-kis__preview">
                Event order is preserved
                exactly as shown above.
              </div>

              {errorMessage && (
                <div
                  className="manual-kis__error"
                  role="alert"
                >
                  <AlertCircle
                    size={18}
                  />

                  <span>
                    {errorMessage}
                  </span>
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
                  : "Submit TRAKE to DRES"}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}