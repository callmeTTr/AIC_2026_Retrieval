import { useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import type { SearchResult } from "../search/search.types";

import "./FrameLightbox.css";

interface FrameLightboxProps {
  results: SearchResult[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function FrameLightbox({
  results,
  currentIndex,
  onIndexChange,
  onClose,
}: FrameLightboxProps) {
  const result = results[currentIndex];

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < results.length - 1;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && hasPrevious) {
        onIndexChange(currentIndex - 1);
      }

      if (event.key === "ArrowRight" && hasNext) {
        onIndexChange(currentIndex + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentIndex,
    hasNext,
    hasPrevious,
    onClose,
    onIndexChange,
  ]);

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="frame-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Frame ${result.frame_index} from ${result.video_id}`}
      onMouseDown={handleBackdropClick}
    >
      <div className="frame-lightbox__panel">
        <header className="frame-lightbox__header">
          <div>
            <strong>{result.video_id}</strong>

            <span>
              Result {currentIndex + 1} of {results.length}
            </span>
          </div>

          <button
            type="button"
            className="frame-lightbox__close"
            aria-label="Close frame viewer"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="frame-lightbox__image-area">
          <button
            type="button"
            className="frame-lightbox__navigation frame-lightbox__navigation--left"
            disabled={!hasPrevious}
            aria-label="Previous result"
            onClick={() =>
              onIndexChange(currentIndex - 1)
            }
          >
            <ChevronLeft size={26} />
          </button>

          <img
            src={result.frame_url}
            alt={`Frame ${result.frame_index} from ${result.video_id}`}
          />

          <button
            type="button"
            className="frame-lightbox__navigation frame-lightbox__navigation--right"
            disabled={!hasNext}
            aria-label="Next result"
            onClick={() =>
              onIndexChange(currentIndex + 1)
            }
          >
            <ChevronRight size={26} />
          </button>
        </div>

        <footer className="frame-lightbox__metadata">
          <div>
            <span>Rank</span>
            <strong>#{result.rank}</strong>
          </div>

          <div>
            <span>Frame</span>
            <strong>{result.frame_index}</strong>
          </div>

          <div>
            <span>Timestamp</span>
            <strong>{result.timestamp_display}</strong>
          </div>

          <div>
            <span>Score</span>
            <strong>{result.score.toFixed(3)}</strong>
          </div>

          <div>
            <span>Matched Scene</span>
            <strong>{result.matched_scene}</strong>
          </div>
        </footer>
      </div>
    </div>
  );
}