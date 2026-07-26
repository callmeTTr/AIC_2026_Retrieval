import {
  Bookmark,
  Images,
  Maximize2,
  Play,
  Send,
  Sparkles,
  VideoOff,
} from "lucide-react";

import {
  resolveBackendUrl,
} from "../../services/apiClient";

import type {
  SearchResult,
} from "../search/search.types";

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
  const thumbnailUrl =
    resolveBackendUrl(
      result.thumbnail_url,
    );

  const videoTitle =
    result.video_available
      ? `Open ${result.video_id} at ${result.timestamp_seconds.toFixed(3)} seconds`
      : `Original video ${result.video_id} is unavailable`;

  return (
    <article className="result-card">
      <div className="result-card__image-wrapper">
        <button
          type="button"
          className="result-card__frame-button"
          title={videoTitle}
          aria-label={videoTitle}
          onClick={onPlay}
        >
          <img
            src={thumbnailUrl}
            alt={`Result ${result.rank} from ${result.video_id}`}
            loading="lazy"
            decoding="async"
          />
        </button>

        <span className="result-card__rank">
          #{result.rank}
        </span>

        <span
          className={[
            "result-card__video-status",
            result.video_available
              ? "result-card__video-status--available"
              : "result-card__video-status--missing",
          ].join(" ")}
        >
          {result.video_available ? (
            <>
              <Play size={13} />
              {result.timestamp_seconds.toFixed(3)}s
            </>
          ) : (
            <>
              <VideoOff size={13} />
              Video missing
            </>
          )}
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
            title={videoTitle}
            aria-label={videoTitle}
            onClick={onPlay}
          >
            {result.video_available ? (
              <Play size={17} />
            ) : (
              <VideoOff size={17} />
            )}
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