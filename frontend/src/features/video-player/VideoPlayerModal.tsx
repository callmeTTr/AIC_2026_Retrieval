import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import type { SearchResult } from "../search/search.types";

import { getVideoClip } from "./video.api";

import "./VideoPlayerModal.css";

interface VideoPlayerModalProps {
  result: SearchResult;
  onClose: () => void;
}

export function VideoPlayerModal({
  result,
  onClose,
}: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const clipQuery = useQuery({
    queryKey: [
      "video-clip",
      result.video_id,
      result.timestamp_seconds,
    ],

    queryFn: () =>
      getVideoClip(
        result.video_id,
        result.timestamp_seconds,
        1,
        1,
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
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      const video = videoRef.current;

      if (video) {
        video.pause();
      }
    };
  }, [onClose]);

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    const clip = clipQuery.data;

    if (!video || !clip) {
      return;
    }

    const maximumStartTime = Math.max(
      0,
      video.duration - 0.1,
    );

    video.currentTime = Math.min(
      clip.start_time,
      maximumStartTime,
    );
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    const clip = clipQuery.data;

    if (!video || !clip) {
      return;
    }

    if (video.currentTime >= clip.end_time) {
      video.pause();
      video.currentTime = Math.min(
        clip.end_time,
        video.duration,
      );
    }
  }

  async function replayClip() {
    const video = videoRef.current;
    const clip = clipQuery.data;

    if (!video || !clip) {
      return;
    }

    video.pause();
    video.currentTime = clip.start_time;

    try {
      await video.play();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (
          error.name === "AbortError" ||
          error.name === "NotAllowedError"
        )
      ) {
        return;
      }

      console.error("Unable to replay video:", error);
    }
  }

  return (
    <div
      className="video-player-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Video player for ${result.video_id}`}
      onMouseDown={handleBackdropClick}
    >
      <div className="video-player-modal__panel">
        <header className="video-player-modal__header">
          <div>
            <strong>Surrounding Video</strong>

            <span>
              {result.video_id} · Frame{" "}
              {result.frame_index}
            </span>
          </div>

          <button
            type="button"
            aria-label="Close video player"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        {clipQuery.isPending && (
          <section className="video-player-modal__message">
            Loading video clip...
          </section>
        )}

        {clipQuery.isError && (
          <section className="video-player-modal__message video-player-modal__message--error">
            {clipQuery.error.message}
          </section>
        )}

        {clipQuery.data && (
          <>
            <section className="video-player-modal__content">
              <video
                ref={videoRef}
                key={clipQuery.data.video_url}
                src={clipQuery.data.video_url}
                controls
                playsInline
                preload="auto"
                poster={
                  clipQuery.data.poster_url ??
                  undefined
                }
                onLoadedMetadata={
                  handleLoadedMetadata
                }
                onTimeUpdate={handleTimeUpdate}
              >
                Your browser does not support video.
              </video>
            </section>

            <footer className="video-player-modal__footer">
              <div>
                <span>Video</span>

                <strong>
                  {clipQuery.data.video_id}
                </strong>
              </div>

              <div>
                <span>Clip range</span>

                <strong>
                  {clipQuery.data.start_time.toFixed(1)}s
                  {" → "}
                  {clipQuery.data.end_time.toFixed(1)}s
                </strong>
              </div>

              <div>
                <span>Search timestamp</span>

                <strong>
                  {result.timestamp_display}
                </strong>
              </div>

              <button
                type="button"
                onClick={replayClip}
              >
                Replay clip
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}