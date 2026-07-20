import {
  useEffect,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";

import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";

import type {
  SearchRequest,
  SearchResult,
} from "../search/search.types";

import { refineSearchResults } from "./refinement.api";

import {
  createRefinementRequest,
  type RefinementResponse,
} from "./refinement.types";

import "./RefinementModal.css";

interface RefinementModalProps {
  originalRequest: SearchRequest;
  parentSearchId: string;
  refinementIteration: number;
  result: SearchResult;
  onRefinementComplete: (
    response: RefinementResponse,
  ) => void;
  onClose: () => void;
}

export function RefinementModal({
  originalRequest,
  parentSearchId,
  refinementIteration,
  result,
  onRefinementComplete,
  onClose,
}: RefinementModalProps) {
  const [feedbackText, setFeedbackText] =
    useState("");

  const refinementMutation = useMutation({
    mutationFn: refineSearchResults,

    onSuccess: (response) => {
      onRefinementComplete(response);
      onClose();
    },
  });

  const isRefining =
    refinementMutation.isPending;

  const normalizedFeedback =
    feedbackText.trim();

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !isRefining
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
  }, [isRefining, onClose]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!normalizedFeedback) {
      return;
    }

    refinementMutation.mutate(
      createRefinementRequest({
        originalRequest,
        parentSearchId,
        refinementIteration,
        referenceResult: result,
        feedback: normalizedFeedback,
      }),
    );
  }

  function handleOverlayClick(
    event: MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target === event.currentTarget &&
      !isRefining
    ) {
      onClose();
    }
  }

  const errorMessage =
    refinementMutation.error instanceof Error
      ? refinementMutation.error.message
      : "The refinement request could not be completed.";

  return (
    <div
      className="refinement-modal__overlay"
      role="presentation"
      onMouseDown={handleOverlayClick}
    >
      <form
        className="refinement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="refinement-modal-title"
        onSubmit={handleSubmit}
      >
        <header className="refinement-modal__header">
          <div>
            <span className="refinement-modal__eyebrow">
              Result-level refinement
            </span>

            <h2 id="refinement-modal-title">
              Refine from selected frame
            </h2>
          </div>

          <button
            type="button"
            className="refinement-modal__close"
            aria-label="Close refinement dialog"
            disabled={isRefining}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="refinement-modal__body">
          <div className="refinement-modal__preview">
            <img
              src={result.thumbnail_url}
              alt={`Reference frame from ${result.video_id}`}
            />

            <span className="refinement-modal__rank">
              Reference #{result.rank}
            </span>
          </div>

          <dl className="refinement-modal__details">
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
              <dd>{result.timestamp_display}</dd>
            </div>

            <div>
              <dt>Iteration</dt>
              <dd>{refinementIteration}</dd>
            </div>
          </dl>

          <label
            className="refinement-modal__feedback"
            htmlFor="refinement-feedback"
          >
            <span>
              Describe what should change
            </span>

            <textarea
              id="refinement-feedback"
              name="refinementFeedback"
              autoFocus
              maxLength={500}
              value={feedbackText}
              placeholder="Example: Change the shirt color to blue..."
              disabled={isRefining}
              onChange={(event) =>
                setFeedbackText(
                  event.target.value,
                )
              }
            />

            <small>
              {feedbackText.length}/500 characters
            </small>
          </label>

          <p className="refinement-modal__notice">
            This currently uses deterministic mock
            reranking. A semantic image-text model
            will replace the mock service later.
          </p>

          {refinementMutation.isError && (
            <div
              className="refinement-modal__error"
              role="alert"
            >
              <AlertCircle size={18} />

              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        <footer className="refinement-modal__footer">
          <button
            type="button"
            className="refinement-modal__button refinement-modal__button--secondary"
            disabled={isRefining}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="refinement-modal__button refinement-modal__button--primary"
            disabled={
              isRefining ||
              !normalizedFeedback
            }
          >
            {isRefining ? (
              <>
                <LoaderCircle
                  className="refinement-modal__spinner"
                  size={18}
                />
                Refining...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Refine results
              </>
            )}
          </button>
        </footer>
      </form>
    </div>
  );
}