import {
  useEffect,
  useState,
} from "react";

import {
  createTeamRoom,
  getTeamRoom,
  type TeamRoom,
} from "./team-workspace.api";

import {
  clearTeamRoomCode,
  getTeamRoomCode,
  setTeamRoomCode,
} from "./team-workspace.session";

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
    </section>
  );
}