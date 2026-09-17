import {
  useEffect,
  useState,
} from "react";
import { Trash2 } from "lucide-react";
import {
  createTeamRoom,
  deleteTeamCandidate,
  getTeamRoom,
  type TeamRoom,
  type TeamWorkspaceItem,
} from "./team-workspace.api";

import {
  clearTeamRoomCode,
  getTeamRoomCode,
  setTeamRoomCode,
} from "./team-workspace.session";
import {
  getDresUsername,
} from "../dres/dres.session";
import "./TeamRoomPanel.css";


interface TeamRoomPanelProps {
  currentTaskName: string;
  onClose: () => void;
}


export function TeamRoomPanel({
  currentTaskName,
  onClose,
}: TeamRoomPanelProps) {
  const [
    roomCode,
    setRoomCodeState,
  ] = useState(
    getTeamRoomCode(),
  );

  const [
    joinCode,
    setJoinCode,
  ] = useState(
    getTeamRoomCode(),
  );

  const [
    room,
    setRoom,
  ] = useState<TeamRoom | null>(
    null,
  );

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");
  const [
    deletingItemId,
    setDeletingItemId,
  ] = useState<string | null>(
    null,
  );

  const currentUsername =
    getDresUsername().trim();
  const [
    previewItem,
    setPreviewItem,
  ] = useState<TeamWorkspaceItem | null>(
    null,
  );

  const [
    previewMode,
    setPreviewMode,
  ] = useState<"frame" | "video">(
    "frame",
  );
  useEffect(() => {
    if (!previewItem) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setPreviewItem(null);
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
  }, [previewItem]);
  useEffect(() => {
    if (!roomCode) {
      setRoom(null);
      return;
    }

    let cancelled = false;

    async function refreshRoom() {
      try {
        const response =
          await getTeamRoom(
            roomCode,
            currentTaskName ||
              undefined,
          );

        if (!cancelled) {
          setRoom(response);
          setErrorMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load Team Room.",
          );
        }
      }
    }

    void refreshRoom();

    const intervalId =
      window.setInterval(
        () => {
          void refreshRoom();
        },
        2000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    roomCode,
    currentTaskName,
  ]);


  async function handleCreateRoom() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response =
        await createTeamRoom();

      setTeamRoomCode(
        response.room_code,
      );

      setRoomCodeState(
        response.room_code,
      );

      setJoinCode(
        response.room_code,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create Team Room.",
      );
    } finally {
      setIsLoading(false);
    }
  }


  async function handleJoinRoom() {
    const normalizedCode =
      joinCode
        .trim()
        .toUpperCase();

    if (!normalizedCode) {
      setErrorMessage(
        "Enter a room code.",
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response =
        await getTeamRoom(
          normalizedCode,
          currentTaskName ||
            undefined,
        );

      setTeamRoomCode(
        normalizedCode,
      );

      setRoomCodeState(
        normalizedCode,
      );

      setJoinCode(
        normalizedCode,
      );

      setRoom(response);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to join Team Room.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteItem(
    item: TeamWorkspaceItem,
  ) {
    if (!roomCode) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove ${item.video_id}, frame ${item.frame_index} from Team Room?`,
      );

    if (!confirmed) {
      return;
    }

    setDeletingItemId(
      item.id,
    );

    setErrorMessage("");

    try {
      await deleteTeamCandidate(
        roomCode,
        item.id,
      );

      setRoom((currentRoom) => {
        if (!currentRoom) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          items:
            currentRoom.items.filter(
              (currentItem) =>
                currentItem.id !==
                item.id,
            ),
        };
      });

      if (
        previewItem?.id ===
        item.id
      ) {
        setPreviewItem(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to remove shared candidate.",
      );
    } finally {
      setDeletingItemId(null);
    }
  }
  function handleLeaveRoom() {
    clearTeamRoomCode();

    setRoomCodeState("");
    setJoinCode("");
    setRoom(null);
    setErrorMessage("");
  }


  return (
    <section
      className="team-room-panel"
      aria-label="Team Room"
    >
      <header className="team-room-panel__header">
        <div>
          <span>
            Team workspace
          </span>

          <h2>
            {roomCode
              ? `Room ${roomCode}`
              : "Team Room"}
          </h2>
        </div>

        <button
          type="button"
          className="team-room-panel__close"
          onClick={onClose}
          aria-label="Close Team Room"
        >
          ×
        </button>
      </header>

      {!roomCode ? (
        <div className="team-room-panel__setup">
          <button
            type="button"
            className="team-room-panel__primary"
            disabled={isLoading}
            onClick={
              handleCreateRoom
            }
          >
            Create Room
          </button>

          <div className="team-room-panel__divider">
            <span>or join</span>
          </div>

          <label>
            <span>Room code</span>

            <input
              type="text"
              value={joinCode}
              maxLength={6}
              placeholder="ABC123"
              autoComplete="off"
              onChange={(event) =>
                setJoinCode(
                  event.target.value
                    .toUpperCase(),
                )
              }
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key === "Enter"
                ) {
                  void handleJoinRoom();
                }
              }}
            />
          </label>

          <button
            type="button"
            className="team-room-panel__secondary"
            disabled={isLoading}
            onClick={
              handleJoinRoom
            }
          >
            Join Room
          </button>
        </div>
      ) : (
        <>
          <div className="team-room-panel__room-info">
            <div>
              <span>Room code</span>
              <strong>
                {roomCode}
              </strong>
            </div>

            <button
              type="button"
              onClick={
                handleLeaveRoom
              }
            >
              Leave
            </button>
          </div>

          {currentTaskName && (
            <p className="team-room-panel__task">
              Current task:{" "}
              <strong>
                {currentTaskName}
              </strong>
            </p>
          )}

          <div className="team-room-panel__feed">
            {!room ? (
              <p className="team-room-panel__empty">
                Loading room...
              </p>
            ) : room.items.length === 0 ? (
              <p className="team-room-panel__empty">
                No shared candidates yet.
              </p>
            ) : (
              room.items.map(
                (item) => (
                  <article
                    key={item.id}
                    className="team-room-panel__item"
                    role="button"
                    tabIndex={0}
                    aria-label={
                      `Open ${item.video_id}, frame ${item.frame_index}`
                    }
                    onClick={() => {
                      setPreviewItem(item);
                      setPreviewMode("frame");
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        setPreviewItem(item);
                        setPreviewMode("frame");
                      }
                    }}
                  >
                    {item.thumbnail_url && (
                      <img
                        src={
                          item.thumbnail_url
                        }
                        alt=""
                      />
                    )}

                    <div>
                      <span className="team-room-panel__sender">
                        {item.shared_by}
                      </span>

                      <strong>
                        {item.video_id}
                      </strong>

                      <small>
                        Frame{" "}
                        {item.frame_index}
                        {" · "}
                        {item.timestamp_seconds.toFixed(
                          2,
                        )}
                        s
                      </small>

                      {item.note && (
                        <p>
                          {item.note}
                        </p>
                      )}
                    </div>

                    {(
                      item.shared_by ===
                        currentUsername ||
                      room.created_by ===
                        currentUsername
                    ) && (
                      <button
                        type="button"
                        className="team-room-panel__delete-item"
                        disabled={
                          deletingItemId ===
                          item.id
                        }
                        aria-label={
                          `Remove ${item.video_id}, frame ${item.frame_index} from Team Room`
                        }
                        title="Remove from Team Room"
                        onMouseDown={(event) =>
                          event.stopPropagation()
                        }
                        onKeyDown={(event) =>
                          event.stopPropagation()
                        }
                        onClick={(event) => {
                          event.stopPropagation();

                          void handleDeleteItem(
                            item,
                          );
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </article>
                ),
              )
            )}
          </div>
        </>
      )}

      {errorMessage && (
        <p
          className="team-room-panel__error"
          role="alert"
        >
          {errorMessage}
        </p>
      )}
      {previewItem && (
        <div
          className="team-room-preview"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setPreviewItem(null);
            }
          }}
        >
          <section
            className="team-room-preview__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${previewItem.video_id}`}
          >
            <header className="team-room-preview__header">
              <div>
                <span>
                  Shared by{" "}
                  {previewItem.shared_by}
                </span>

                <h2>
                  {previewItem.video_id}
                </h2>

                <small>
                  Frame{" "}
                  {previewItem.frame_index}
                  {" · "}
                  {previewItem.timestamp_seconds.toFixed(
                    2,
                  )}
                  s
                </small>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreviewItem(null)
                }
                aria-label="Close preview"
              >
                ×
              </button>
            </header>

            <div className="team-room-preview__media">
              {previewMode === "video" &&
              previewItem.video_url ? (
                <video
                  key={previewItem.id}
                  src={
                    previewItem.video_url
                  }
                  poster={
                    previewItem.frame_url ??
                    previewItem.thumbnail_url ??
                    undefined
                  }
                  controls
                  autoPlay
                  playsInline
                  onLoadedMetadata={(
                    event,
                  ) => {
                    const video =
                      event.currentTarget;

                    const targetTime =
                      previewItem.timestamp_seconds;

                    if (
                      Number.isFinite(
                        video.duration,
                      ) &&
                      video.duration > 0
                    ) {
                      video.currentTime =
                        Math.min(
                          targetTime,
                          Math.max(
                            0,
                            video.duration -
                              0.1,
                          ),
                        );
                    } else {
                      video.currentTime =
                        targetTime;
                    }
                  }}
                />
              ) : previewItem.frame_url ||
                previewItem.thumbnail_url ? (
                <img
                  src={
                    previewItem.frame_url ??
                    previewItem.thumbnail_url ??
                    ""
                  }
                  alt={
                    `${previewItem.video_id} ` +
                    `frame ${previewItem.frame_index}`
                  }
                />
              ) : (
                <p>
                  Preview image is not
                  available.
                </p>
              )}
            </div>

            <footer className="team-room-preview__actions">
              <button
                type="button"
                disabled={
                  !previewItem.frame_url &&
                  !previewItem.thumbnail_url
                }
                className={
                  previewMode === "frame"
                    ? "team-room-preview__action team-room-preview__action--active"
                    : "team-room-preview__action"
                }
                onClick={() =>
                  setPreviewMode("frame")
                }
              >
                View Frame
              </button>

              <button
                type="button"
                disabled={
                  !previewItem.video_url
                }
                className={
                  previewMode === "video"
                    ? "team-room-preview__action team-room-preview__action--active"
                    : "team-room-preview__action"
                }
                onClick={() =>
                  setPreviewMode("video")
                }
              >
                Play Video
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}