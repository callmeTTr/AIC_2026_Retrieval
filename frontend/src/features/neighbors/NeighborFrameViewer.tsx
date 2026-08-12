import {
  useEffect,
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
  getNeighborFrames,
} from "./neighbor.api";

import type {
  NeighborFrame,
  NeighborFramesResponse,
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
  const [
    neighborData,
    setNeighborData,
  ] = useState<
    NeighborFramesResponse | null
  >(null);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState<string | null>(
    null,
  );

  const [
    selectedFrameIndex,
    setSelectedFrameIndex,
  ] = useState(
    result.frame_index,
  );

  useEffect(() => {
    let isActive = true;

    setNeighborData(null);
    setIsLoading(true);
    setLoadError(null);

    setSelectedFrameIndex(
      result.frame_index,
    );

    getNeighborFrames(
      result,
      3,
    )
      .then((data) => {
        if (!isActive) {
          return;
        }

        setNeighborData(data);

        const centerFrame =
          data.frames.find(
            (frame) =>
              frame.is_center ||
              frame.frame_index ===
                result.frame_index,
          ) ??
          data.frames[0];

        setSelectedFrameIndex(
          centerFrame?.frame_index ??
            result.frame_index,
        );
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load neighbor frames.",
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [result]);

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
    neighborData?.frames.find(
      (frame) =>
        frame.frame_index ===
        selectedFrameIndex,
    ) ??
    neighborData?.frames.find(
      (frame) => frame.is_center,
    ) ??
    neighborData?.frames[0];

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
              {neighborData?.before ?? 0} before
              {" / "}
              {neighborData?.after ?? 0} after
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
        {isLoading && (
          <section className="neighbor-viewer__message">
            Loading neighbor frames...
          </section>
        )}

        {!isLoading &&
          loadError && (
            <section className="neighbor-viewer__message">
              {loadError}
            </section>
          )}
        {!isLoading &&
          !loadError &&
          neighborData?.total_frames ===
            0 && (
          <section className="neighbor-viewer__message">
            No neighbor frames were
            returned for this result.
          </section>
        )}

        {neighborData &&
          selectedFrame && (
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
