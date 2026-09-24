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

function formatVideoTimeMs(
  seconds: number,
): string {
  return `${Math.max(
    0,
    Math.round(seconds * 1000),
  )} ms`;
}

function formatFps(
  fps: number | null | undefined,
): string {
  if (
    fps === null ||
    fps === undefined
  ) {
    return "—";
  }

  const rounded =
    Math.round(fps);

  if (
    Math.abs(fps - rounded) <
    0.005
  ) {
    return rounded.toString();
  }

  return fps
    .toFixed(3)
    .replace(/\.?0+$/, "");
}

interface ResultCardProps {
  result: SearchResult;
  onOpen: () => void;
  onBrowseNeighbors: () => void;
  onPlay: () => void;
  onSubmit: () => void;
  onRefine: () => void;
  canRefineSearch: boolean;
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
  canRefineSearch,
  isCandidateSelected,
  onToggleCandidate,
}: ResultCardProps) {
const frameTimeSeconds =
  typeof result.frame_timestamp_seconds ===
    "number" &&
  Number.isFinite(
    result.frame_timestamp_seconds,
  )
    ? result.frame_timestamp_seconds
    : result.fps &&
        result.fps > 0
      ? result.frame_index /
        result.fps
      : result.timestamp_seconds;

const thumbnailUrl =
  resolveBackendUrl(
    result.thumbnail_url,
  );

const frameUrl =
  resolveBackendUrl(
    result.frame_url,
  );

const videoTitle =
    result.video_available
      ? `Open ${result.video_id} at ${Math.round(
          frameTimeSeconds * 1000,
        )} ms`
      : `Original video ${result.video_id} is unavailable`;

  const canRefine =
    canRefineSearch &&
    Boolean(
      result.frame_ref?.trim(),
    );

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
            src={thumbnailUrl ?? frameUrl}
            alt={`Result ${result.rank} from ${result.video_id}`}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              const image =
                event.currentTarget;

              if (
                frameUrl &&
                image.src !== frameUrl
              ) {
                image.src =
                  frameUrl;
              }
            }}
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
              {Math.round(
                frameTimeSeconds * 1000,
              )} ms
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
            <dt>Video time</dt>
            <dd>
              {formatVideoTimeMs(
                frameTimeSeconds,
              )}
            </dd>
          </div>

          <div>
            <dt>FPS</dt>
            <dd>
              {formatFps(
                result.fps,
              )}
            </dd>
          </div>

          <div>
            <dt>Scene</dt>
            <dd>{result.matched_scene}</dd>
          </div>
        </dl>

        <button
          type="button"
          className="result-card__refine-button"
          disabled={!canRefine}
          title={
            !canRefineSearch
              ? "OCR-only results cannot be used for refinement"
              : canRefine
                ? "Refine results from this frame"
                : "Run a new feedback-ready search before refining"
          }
          onClick={onRefine}
        >
          <Sparkles size={16} />
          Refine from this frame
        </button>
      </div>
    </article>
  );
}