import {
  Bookmark,
  Images,
  Maximize2,
  Play,
  Send,
  Sparkles,
} from "lucide-react";

import type { SearchResult } from "../search/search.types";

import "./ResultCard.css";

interface ResultCardProps {
  result: SearchResult;
  onOpen: () => void;
  onBrowseNeighbors: () => void;
  onPlay: () => void;
  onSubmit: () => void;
  onRefine: () => void;
  isCandidateSelected: boolean;
  onToggleCandidate: () => void;
}

export function ResultCard({
  result,
  onOpen,
  onBrowseNeighbors,
  onPlay,
  onSubmit,
  onRefine,
  isCandidateSelected,
  onToggleCandidate,
}: ResultCardProps) {
  return (
    <article className="result-card">
      <div className="result-card__image-wrapper">
        <img
          src={result.thumbnail_url}
          alt={`Result ${result.rank} from ${result.video_id}`}
          loading="lazy"
        />

        <span className="result-card__rank">
          #{result.rank}
        </span>

        <div className="result-card__actions">
          <button
            type="button"
            className="result-card__action-button"
            title="Browse neighbor frames"
            aria-label="Browse neighbor frames"
            onClick={onBrowseNeighbors}
          >
            <Images size={17} />
          </button>

          <button
            type="button"
            className="result-card__action-button"
            title="Play surrounding video"
            aria-label="Play surrounding video"
            onClick={onPlay}
          >
            <Play size={17} />
          </button>
          <button
            type="button"
            className="result-card__action-button"
            title="Submit this result"
            aria-label="Submit this result"
            onClick={onSubmit}
          >
            <Send size={17} />
          </button>
          <button
            type="button"
            className={[
              "result-card__action-button",
              isCandidateSelected
                ? "result-card__action-button--selected"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={
              isCandidateSelected
                ? "Remove from candidates"
                : "Save as candidate"
            }
            aria-label={
              isCandidateSelected
                ? "Remove from candidates"
                : "Save as candidate"
            }
            aria-pressed={isCandidateSelected}
            onClick={onToggleCandidate}
          >
            <Bookmark
              size={17}
              fill={
                isCandidateSelected
                  ? "currentColor"
                  : "none"
              }
            />
          </button>
          <button
            type="button"
            className="result-card__action-button"
            title="Enlarge frame"
            aria-label="Enlarge frame"
            onClick={onOpen}
          >
            <Maximize2 size={17} />
          </button>
        </div>
      </div>

      <div className="result-card__body">
        <div className="result-card__title">
          <strong>{result.video_id}</strong>

          <span>
            Score {result.score.toFixed(3)}
          </span>
        </div>

        <dl className="result-card__metadata">
          <div>
            <dt>Frame</dt>
            <dd>{result.frame_index}</dd>
          </div>

          <div>
            <dt>Timestamp</dt>
            <dd>{result.timestamp_display}</dd>
          </div>

          <div>
            <dt>Scene</dt>
            <dd>{result.matched_scene}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="result-card__refine-button"
          onClick={onRefine}
        >
          <Sparkles size={16} />
          Refine from this frame
        </button>
      </div>
    </article>
  );
}