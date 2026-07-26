import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react";

import {
  resolveBackendUrl,
} from "../../services/apiClient";

import type {
  SearchResult,
} from "../search/search.types";

import "./VideoPlayerModal.css";

interface VideoPlayerModalProps {
  result: SearchResult;
  onClose: () => void;
}

type PlaybackState =
  | "loading"
  | "seeking"
  | "ready"
  | "error";

export function VideoPlayerModal({
  result,
  onClose,
}: VideoPlayerModalProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(null);

  const [playbackState, setPlaybackState] =
    useState<PlaybackState>("loading");

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [actualSeekTime, setActualSeekTime] =
    useState<number | null>(null);

  const targetTimestamp = Math.max(
    0,
    result.timestamp_seconds,
  );

  const videoUrl = useMemo(
    () =>
      resolveBackendUrl(
        result.video_url,
      ),
    [result.video_url],
  );

  const posterUrl = useMemo(
    () =>
      resolveBackendUrl(
        result.frame_url,
      ),
    [result.frame_url],
  );

  const missingVideo =
    !result.video_available ||
    !videoUrl;

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

      const video =
        videoRef.current;

      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [onClose]);

  useEffect(() => {
    setPlaybackState("loading");
    setErrorMessage(null);
    setActualSeekTime(null);
  }, [
    result.video_id,
    result.timestamp_seconds,
    result.video_url,
  ]);

  function handleBackdropClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose();
    }
  }

  function seekToResultTimestamp(
    video: HTMLVideoElement,
  ) {
    if (
      !Number.isFinite(
        video.duration,
      )
    ) {
      setPlaybackState("error");

      setErrorMessage(
        "The browser could not read the video duration.",
      );

      return;
    }

    if (
      targetTimestamp >
      video.duration
    ) {
      setPlaybackState("error");

      setErrorMessage(
        `Frame timestamp ${targetTimestamp.toFixed(3)}s ` +
          `is beyond video duration ${video.duration.toFixed(3)}s. ` +
          "Check the frame-to-video mapping.",
      );

      return;
    }

    setPlaybackState("seeking");

    // Không dùng fastSeek vì nó có thể
    // chỉ nhảy đến keyframe gần nhất.
    video.currentTime =
      targetTimestamp;
  }

  function handleLoadedMetadata() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    seekToResultTimestamp(video);
  }

  async function handleSeeked() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    setActualSeekTime(
      video.currentTime,
    );

    setPlaybackState("ready");

    try {
      await video.play();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (
          error.name ===
            "NotAllowedError" ||
          error.name ===
            "AbortError"
        )
      ) {
        return;
      }

      console.error(
        "Unable to autoplay video:",
        error,
      );
    }
  }

  function handleVideoError() {
    const mediaError =
      videoRef.current?.error;

    const messages: Record<
      number,
      string
    > = {
      1: "Video loading was aborted.",
      2: "A network error occurred while loading video.",
      3: "The video could not be decoded. The codec may not be browser-compatible.",
      4: "The video source is unsupported or unavailable.",
    };

    setPlaybackState("error");

    setErrorMessage(
      mediaError
        ? messages[
            mediaError.code
          ] ??
            "The video could not be played."
        : "The video could not be played.",
    );
  }

  async function replayFromFrame() {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    setErrorMessage(null);

    seekToResultTimestamp(video);

    try {
      await video.play();
    } catch (error) {
      if (
        error instanceof DOMException &&
        (
          error.name ===
            "NotAllowedError" ||
          error.name ===
            "AbortError"
        )
      ) {
        return;
      }

      console.error(
        "Unable to replay video:",
        error,
      );
    }
  }

  return (
    <div
      className="video-player-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`Video player for ${result.video_id}`}
      onMouseDown={
        handleBackdropClick
      }
    >
      <div className="video-player-modal__panel">
        <header className="video-player-modal__header">
          <div>
            <strong>
              Original Video
            </strong>

            <span>
              {result.video_id}
              {" · "}
              Frame {result.frame_index}
              {" · "}
              {targetTimestamp.toFixed(
                3,
              )}
              s
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

        {missingVideo ? (
          <section className="video-player-modal__message video-player-modal__message--error">
            <AlertTriangle
              size={22}
            />

            <div>
              <strong>
                Original video not found
              </strong>

              <p>
                Backend chưa map được{" "}
                <code>
                  {result.video_id}
                </code>{" "}
                với video gốc.
              </p>
            </div>
          </section>
        ) : (
          <>
            <section className="video-player-modal__content">
              <video
                ref={videoRef}
                key={[
                  result.video_id,
                  targetTimestamp,
                  videoUrl,
                ].join("-")}
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                poster={posterUrl}
                onLoadedMetadata={
                  handleLoadedMetadata
                }
                onSeeked={
                  handleSeeked
                }
                onError={
                  handleVideoError
                }
              >
                Your browser does not
                support video.
              </video>

              {playbackState ===
                "loading" && (
                <div className="video-player-modal__overlay-message">
                  Loading video
                  metadata...
                </div>
              )}

              {playbackState ===
                "seeking" && (
                <div className="video-player-modal__overlay-message">
                  Seeking to{" "}
                  {targetTimestamp.toFixed(
                    3,
                  )}
                  s...
                </div>
              )}
            </section>

            {errorMessage && (
              <section className="video-player-modal__message video-player-modal__message--error">
                <AlertTriangle
                  size={22}
                />

                <span>
                  {errorMessage}
                </span>
              </section>
            )}

            <footer className="video-player-modal__footer">
              <div>
                <span>Video</span>

                <strong>
                  {result.video_id}
                </strong>
              </div>

              <div>
                <span>
                  Target timestamp
                </span>

                <strong>
                  {targetTimestamp.toFixed(
                    3,
                  )}
                  s
                </strong>
              </div>

              <div>
                <span>
                  Browser position
                </span>

                <strong>
                  {actualSeekTime ===
                  null
                    ? "—"
                    : `${actualSeekTime.toFixed(
                        3,
                      )}s`}
                </strong>
              </div>

              <button
                type="button"
                onClick={
                  replayFromFrame
                }
              >
                <RotateCcw
                  size={16}
                />
                Replay from frame
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}