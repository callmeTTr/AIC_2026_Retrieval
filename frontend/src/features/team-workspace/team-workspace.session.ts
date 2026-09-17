const TEAM_ROOM_CODE_KEY =
  "aic.team.roomCode";


export function getTeamRoomCode(): string {
  return (
    localStorage.getItem(
      TEAM_ROOM_CODE_KEY,
    ) ?? ""
  );
}


export function setTeamRoomCode(
  roomCode: string,
): void {
  const normalized =
    roomCode.trim().toUpperCase();

  if (normalized) {
    localStorage.setItem(
      TEAM_ROOM_CODE_KEY,
      normalized,
    );
  } else {
    localStorage.removeItem(
      TEAM_ROOM_CODE_KEY,
    );
  }
}


export function clearTeamRoomCode(): void {
  localStorage.removeItem(
    TEAM_ROOM_CODE_KEY,
  );
}