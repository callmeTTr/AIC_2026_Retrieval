import {
  useEffect,
  type MouseEvent,
} from "react";

import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Send,
  X,
} from "lucide-react";

import type {
  SearchResult,
  TaskId,
} from "../search/search.types";

import { submitResult } from "./submission.api";

import "./SubmissionModal.css";

interface SubmissionModalProps {
  task: TaskId;
  searchId: string;
  result: SearchResult;
  onClose: () => void;
}

export function SubmissionModal({
  task,
  searchId,
  result,
  onClose,
}: SubmissionModalProps) {
  const submissionMutation = useMutation({
    mutationFn: submitResult,
  });

  const isSubmitting = submissionMutation.isPending;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !isSubmitting
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isSubmitting, onClose]);

  function handleSubmit() {
    const timestampSeconds =
      typeof result.frame_timestamp_seconds ===
        "number" &&
      Number.isFinite(
        result.frame_timestamp_seconds,
      )
        ? result.frame_timestamp_seconds
        : typeof result.fps === "number" &&
            Number.isFinite(result.fps) &&
            result.fps > 0
          ? result.frame_index / result.fps
          : result.timestamp_seconds;

    submissionMutation.mutate({
      task,
      search_id: searchId,
      video_id: result.video_id,
      frame_index: result.frame_index,
      timestamp_seconds:
        timestampSeconds,
    });
  }

  function handleOverlayClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target === event.currentTarget &&
      !isSubmitting
    ) {
      onClose();
    }
  }

  const errorMessage =
    submissionMutation.error instanceof Error
      ? submissionMutation.error.message
      : "The submission could not be completed.";

  const submissionWasAccepted =
    submissionMutation.isSuccess &&
    submissionMutation.data.status ===
      "accepted";

  return (
    <div
      className="submission-modal__overlay"
      role="presentation"
      onMouseDown={handleOverlayClick}
    >
      <section
        className="submission-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-modal-title"
      >
        <header className="submission-modal__header">
          <div>
            <span className="submission-modal__eyebrow">
              Competition submission
            </span>

            <h2 id="submission-modal-title">
              Submit selected result
            </h2>
          </div>

          <button
            type="button"
            className="submission-modal__close"
            aria-label="Close submission dialog"
            disabled={isSubmitting}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="submission-modal__body">
          {submissionMutation.isSuccess ? (
            <div className="submission-modal__state">
              {submissionWasAccepted ? (
                <CheckCircle2
                  className="submission-modal__state-icon submission-modal__state-icon--success"
                  size={44}
                />
              ) : (
                <AlertCircle
                  className="submission-modal__state-icon"
                  size={44}
                />
              )}

              <h3>
                {submissionWasAccepted
                  ? "Submission accepted"
                  : "Submission rejected"}
              </h3>

              <p>
                {
                  submissionMutation.data
                    .message
                }
              </p>

              <dl className="submission-modal__details">
                <div>
                  <dt>DRES result</dt>
                  <dd>
                    {
                      submissionMutation.data
                        .dres_result
                    }
                  </dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>
                    {
                      submissionMutation.data
                        .status
                    }
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <>
              <div className="submission-modal__preview">
                <img
                  src={result.thumbnail_url}
                  alt={`Selected frame from ${result.video_id}`}
                />

                <div className="submission-modal__rank">
                  #{result.rank}
                </div>
              </div>

              <dl className="submission-modal__details">
                <div>
                  <dt>Task</dt>
                  <dd>
                    {task.replace("_", " ")}
                  </dd>
                </div>

                <div>
                  <dt>Video</dt>
                  <dd>{result.video_id}</dd>
                </div>

                <div>
                  <dt>Frame</dt>
                  <dd>{result.frame_index}</dd>
                </div>

                <div>
                  <dt>Timestamp</dt>
                  <dd>
                    {Math.round(
                      (
                        typeof result.frame_timestamp_seconds ===
                          "number" &&
                        Number.isFinite(
                          result.frame_timestamp_seconds,
                        )
                          ? result.frame_timestamp_seconds
                          : typeof result.fps ===
                                "number" &&
                              Number.isFinite(
                                result.fps,
                              ) &&
                              result.fps > 0
                            ? result.frame_index /
                              result.fps
                            : result.timestamp_seconds
                      ) * 1000,
                    )}{" "}
                    ms
                  </dd>
                </div>
              </dl>

              <p className="submission-modal__warning">
                Confirm that this is the frame you
                want to submit. A real competition
                submission may not be reversible.
              </p>

              {submissionMutation.isError && (
                <div
                  className="submission-modal__error"
                  role="alert"
                >
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        <footer className="submission-modal__footer">
          {submissionMutation.isSuccess ? (
            <button
              type="button"
              className="submission-modal__button submission-modal__button--primary"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                className="submission-modal__button submission-modal__button--secondary"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Cancel
              </button>

              <button
                type="button"
                className="submission-modal__button submission-modal__button--primary"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle
                      className="submission-modal__spinner"
                      size={18}
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Confirm submission
                  </>
                )}
              </button>
            </>
          )}
        </footer>
      </section>
    </div>
  );
}