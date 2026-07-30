import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ExternalLink,
  X,
} from "lucide-react";

import type {
  SearchResult,
} from "../search/search.types";

import {
  getEmbeddedNeighborFrames,
} from "./neighbor.api";

import type {
  NeighborFrame,
} from "./neighbor.types";

import "./NeighborFrameViewer.css";

interface NeighborFrameViewerProps {
  result: SearchResult;
  onClose: () => void;
}

export function NeighborFrameViewer({
  result,
  onClose,
}: NeighborFrameViewerProps) {
  const neighborData =
    useMemo(
      () =>
        getEmbeddedNeighborFrames(
          result,
        ),
      [result],
    );

  const initialFrame =
    neighborData.frames.find(
      (frame) => frame.is_center,
    ) ??
    neighborData.frames[0];

  const [
    selectedFrameIndex,
    setSelectedFrameIndex,
  ] = useState(
    initialFrame?.frame_index ??
      result.frame_index,
  );

  useEffect(() => {
    const centerFrame =
      result.neighbors.find(
        (frame) => frame.is_center,
      ) ??
      result.neighbors[0];

    setSelectedFrameIndex(
      centerFrame?.frame_index ??
        result.frame_index,
    );
  }, [
    result.frame_index,
    result.neighbors,
    result.video_id,
  ]);

  useEffect(() => {
    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
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
  }, [onClose]);

  const selectedFrame:
    NeighborFrame | undefined =
    neighborData.frames.find(
      (frame) =>
        frame.frame_index ===
        selectedFrameIndex,
    ) ??
    neighborData.frames.find(
      (frame) => frame.is_center,
    ) ??
    neighborData.frames[0];

  function handleBackdropClick(
    event:
      React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose();
    }
  }

  return (
    <div
      className="neighbor-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Neighbor frames for ${result.video_id}`}
      onMouseDown={
        handleBackdropClick
      }
    >
      <div className="neighbor-viewer__panel">
        <header className="neighbor-viewer__header">
          <div>
            <strong>
              Neighbor Frames
            </strong>

            <span>
              {result.video_id}
              {" · "}
              Center frame{" "}
              {result.frame_index}
              {" · "}
              {neighborData.before} before
              {" / "}
              {neighborData.after} after
            </span>
          </div>

          <nav
            className="neighbor-viewer__actions"
            aria-label="Neighbor frame actions"
          >
            {selectedFrame
              ?.kaggle_output_url && (
              <a
                className="neighbor-viewer__kaggle-link"
                href={
                  selectedFrame
                    .kaggle_output_url
                }
                target="_blank"
                rel="noreferrer"
                title={
                  selectedFrame
                    .kaggle_relative_path
                    ? `Open Kaggle Output: ${selectedFrame.kaggle_relative_path}`
                    : "Open the Kaggle Output containing this frame"
                }
              >
                <ExternalLink
                  size={16}
                />

                <span>
                  Open Kaggle Output
                </span>
              </a>
            )}

            <button
              type="button"
              aria-label="Close neighbor viewer"
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </nav>
        </header>

        {neighborData.total_frames ===
          0 && (
          <section className="neighbor-viewer__message">
            No neighbor frames were
            returned for this result.
          </section>
        )}

        {selectedFrame && (
          <>
            <section className="neighbor-viewer__preview">
              <img
                src={
                  selectedFrame.frame_url
                }
                alt={`Frame ${selectedFrame.frame_index}`}
                decoding="async"
              />

              <div>
                <strong>
                  Frame{" "}
                  {
                    selectedFrame.frame_index
                  }
                </strong>

                <span>
                  {
                    selectedFrame.timestamp_display
                  }
                </span>

                {selectedFrame.shot_id !==
                  null && (
                  <span>
                    Shot{" "}
                    {
                      selectedFrame.shot_id
                    }
                  </span>
                )}

                {selectedFrame
                  .kaggle_relative_path && (
                  <span
                    className="neighbor-viewer__source-path"
                    title={
                      selectedFrame
                        .kaggle_relative_path
                    }
                  >
                    {
                      selectedFrame
                        .kaggle_relative_path
                    }
                  </span>
                )}

                {selectedFrame.is_center && (
                  <em>
                    Original search result
                  </em>
                )}
              </div>
            </section>

            <section className="neighbor-viewer__timeline">
              {neighborData.frames.map(
                (frame) => (
                  <button
                    key={
                      frame.frame_ref ??
                      [
                        frame.video_id,
                        frame.frame_index,
                      ].join("-")
                    }
                    type="button"
                    className={[
                      "neighbor-viewer__thumbnail",

                      frame.is_center
                        ? "neighbor-viewer__thumbnail--center"
                        : "",

                      selectedFrameIndex ===
                      frame.frame_index
                        ? "neighbor-viewer__thumbnail--selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setSelectedFrameIndex(
                        frame.frame_index,
                      )
                    }
                  >
                    <img
                      src={
                        frame.thumbnail_url
                      }
                      alt={`Frame ${frame.frame_index}`}
                      loading="lazy"
                      decoding="async"
                    />

                    <span>
                      {frame.frame_index}
                    </span>
                  </button>
                ),
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
