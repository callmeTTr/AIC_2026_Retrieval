import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import type { SearchResult } from "../search/search.types";

import { getNeighborFrames } from "./neighbor.api";
import type { NeighborFrame } from "./neighbor.types";

import "./NeighborFrameViewer.css";

interface NeighborFrameViewerProps {
  result: SearchResult;
  onClose: () => void;
}

export function NeighborFrameViewer({
  result,
  onClose,
}: NeighborFrameViewerProps) {
  const [selectedFrameIndex, setSelectedFrameIndex] =
    useState(result.frame_index);

  const neighborQuery = useQuery({
    queryKey: [
      "neighbor-frames",
      result.video_id,
      result.frame_index,
    ],
    queryFn: () =>
      getNeighborFrames(
        result.video_id,
        result.frame_index,
        20,
        20,
      ),
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const selectedFrame: NeighborFrame | undefined =
    neighborQuery.data?.frames.find(
      (frame) =>
        frame.frame_index === selectedFrameIndex,
    );

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="neighbor-viewer"
      role="dialog"
      aria-modal="true"
      aria-label={`Neighbor frames for ${result.video_id}`}
      onMouseDown={handleBackdropClick}
    >
      <div className="neighbor-viewer__panel">
        <header className="neighbor-viewer__header">
          <div>
            <strong>Neighbor Frames</strong>

            <span>
              {result.video_id} · Center frame{" "}
              {result.frame_index}
            </span>
          </div>

          <button
            type="button"
            aria-label="Close neighbor viewer"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        {neighborQuery.isPending && (
          <section className="neighbor-viewer__message">
            Loading neighbor frames...
          </section>
        )}

        {neighborQuery.isError && (
          <section className="neighbor-viewer__message neighbor-viewer__message--error">
            {neighborQuery.error.message}
          </section>
        )}

        {neighborQuery.data && selectedFrame && (
          <>
            <section className="neighbor-viewer__preview">
              <img
                src={selectedFrame.frame_url}
                alt={`Frame ${selectedFrame.frame_index}`}
              />

              <div>
                <strong>
                  Frame {selectedFrame.frame_index}
                </strong>

                <span>
                  {selectedFrame.timestamp_display}
                </span>

                {selectedFrame.is_center && (
                  <em>Original search result</em>
                )}
              </div>
            </section>

            <section className="neighbor-viewer__timeline">
              {neighborQuery.data.frames.map((frame) => (
                <button
                  key={frame.frame_index}
                  type="button"
                  className={[
                    "neighbor-viewer__thumbnail",
                    frame.is_center
                      ? "neighbor-viewer__thumbnail--center"
                      : "",
                    selectedFrameIndex === frame.frame_index
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
                    src={frame.thumbnail_url}
                    alt={`Frame ${frame.frame_index}`}
                    loading="lazy"
                  />

                  <span>{frame.frame_index}</span>
                </button>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}