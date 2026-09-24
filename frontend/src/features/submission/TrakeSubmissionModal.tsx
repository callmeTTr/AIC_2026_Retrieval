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

interface TrakeFrameDraft {
  id: number;
  frameId: string;
}

interface TrakeSubmissionModalProps {
  initialVideoId?: string;
  initialFrameIds?: number[];
  onClose: () => void;
}

function createFrame(
  id: number,
  frameId = "",
): TrakeFrameDraft {
  return {
    id,
    frameId,
  };
}

export function TrakeSubmissionModal({
  initialVideoId = "",
  initialFrameIds,
  onClose,
}: TrakeSubmissionModalProps) {
  const [videoId, setVideoId] =
    useState(initialVideoId);

  const [frames, setFrames] =
    useState<TrakeFrameDraft[]>(
      initialFrameIds &&
      initialFrameIds.length > 0
        ? initialFrameIds.map(
            (frameId, index) =>
              createFrame(
                index + 1,
                String(frameId),
              ),
          )
        : [
            createFrame(1),
            createFrame(2),
          ],
    );

  const [nextId, setNextId] =
    useState(
      initialFrameIds &&
      initialFrameIds.length > 0
        ? initialFrameIds.length + 1
        : 3,
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [result, setResult] =
    useState<{
      submission: string;
      description: string;
      videoId: string;
      frameIds: number[];
      submittedText: string;
    } | null>(null);

  function updateFrame(
    id: number,
    frameId: string,
  ) {
    setFrames((current) =>
      current.map((frame) =>
        frame.id === id
          ? {
              ...frame,
              frameId,
            }
          : frame,
      ),
    );
  }

  function addFrame() {
    setFrames((current) => [
      ...current,
      createFrame(nextId),
    ]);

    setNextId((current) =>
      current + 1
    );
  }

  function removeFrame(
    id: number,
  ) {
    setFrames((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter(
        (frame) =>
          frame.id !== id,
      );
    });
  }

  function moveFrame(
    index: number,
    direction: -1 | 1,
  ) {
    const targetIndex =
      index + direction;

    if (
      targetIndex < 0 ||
      targetIndex >= frames.length
    ) {
      return;
    }

    setFrames((current) => {
      const next = [...current];

      const [moved] =
        next.splice(index, 1);

      next.splice(
        targetIndex,
        0,
        moved,
      );

      return next;
    });
  }

  function getPreviewText() {
    const normalizedVideoId =
      videoId
        .trim()
        .replace(/\.mp4$/i, "");

    const frameText =
      frames
        .map((frame) =>
          frame.frameId.trim() ||
          "<FRAME_ID>",
        )
        .join(",");

    return (
      `TR-${normalizedVideoId || "<VIDEO_ID>"}-` +
      frameText
    );
  }

  async function handleSubmit() {
    const evaluationId =
      getDresRunId().trim();

    const bridgeToken =
      getDresBridgeToken().trim();

    const normalizedVideoId =
      videoId
        .trim()
        .replace(/\.mp4$/i, "")
        .toUpperCase();

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

    if (!normalizedVideoId) {
      setErrorMessage(
        "Video ID is required.",
      );
      return;
    }

    if (frames.length < 1) {
      setErrorMessage(
        "TRAKE requires at least one frame ID.",
      );
      return;
    }

    let frameIds: number[];

    try {
      frameIds = frames.map(
        (frame, index) => {
          const value =
            Number(
              frame.frameId.trim(),
            );

          if (
            !Number.isInteger(value) ||
            value < 0
          ) {
            throw new Error(
              `Frame ${index + 1} must be a non-negative integer.`,
            );
          }

          return value;
        },
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Invalid TRAKE frame IDs.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const response =
        await submitTrakeToDres(
          evaluationId,
          bridgeToken,
          {
            media_item_name:
              normalizedVideoId,

            frame_ids:
              frameIds,
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

        videoId:
          response.submitted
            .media_item_name,

        frameIds:
          response.submitted
            .frame_ids,

        submittedText:
          response.submitted.text,
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
              Ordered semantic keyframes
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
                  <dt>Video ID</dt>
                  <dd>
                    {result.videoId}
                  </dd>
                </div>

                <div>
                  <dt>Frame IDs</dt>
                  <dd>
                    {result.frameIds.join(
                      ", ",
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Frames</dt>
                  <dd>
                    {
                      result.frameIds
                        .length
                    }
                  </dd>
                </div>
              </dl>

              <div className="manual-kis__preview">
                {result.submittedText}
              </div>
            </div>
          ) : (
            <>
              <label className="manual-kis__field">
                <span>
                  Video ID
                </span>

                <input
                  value={videoId}
                  onChange={(event) =>
                    setVideoId(
                      event.target.value,
                    )
                  }
                  placeholder="L27_V004"
                  disabled={isSubmitting}
                  autoFocus
                />
              </label>

              {frames.map(
                (
                  frame,
                  index,
                ) => (
                  <div
                    key={frame.id}
                    className="manual-kis__details"
                  >
                    <div>
                      <strong>
                        Frame ID{" "}
                        {index + 1}
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
                            moveFrame(
                              index,
                              -1,
                            )
                          }
                          aria-label={`Move frame ${index + 1} up`}
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
                              frames.length -
                                1
                          }
                          onClick={() =>
                            moveFrame(
                              index,
                              1,
                            )
                          }
                          aria-label={`Move frame ${index + 1} down`}
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
                            frames.length <= 1
                          }
                          onClick={() =>
                            removeFrame(
                              frame.id,
                            )
                          }
                          aria-label={`Remove frame ${index + 1}`}
                        >
                          <Trash2
                            size={16}
                          />
                        </button>
                      </div>
                    </div>

                    <label className="manual-kis__field">
                      <span>
                        Frame index
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={
                          frame.frameId
                        }
                        onChange={(
                          event,
                        ) =>
                          updateFrame(
                            frame.id,
                            event.target
                              .value,
                          )
                        }
                        placeholder="11740"
                        disabled={
                          isSubmitting
                        }
                      />
                    </label>
                  </div>
                ),
              )}

              <button
                type="button"
                className="manual-kis__secondary"
                disabled={isSubmitting}
                onClick={addFrame}
              >
                <Plus size={18} />
                Add frame
              </button>

              <div className="manual-kis__preview">
                Submission format:{" "}
                <strong>
                  {getPreviewText()}
                </strong>
              </div>

              <div className="manual-kis__preview">
                Frame order is preserved
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