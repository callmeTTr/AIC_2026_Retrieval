const TEAM_ROOM_CODE_KEY =
  "aic.team.roomCode";

const TEAM_USERNAME_KEY =
  "aic.team.username";

const TEAM_TOKEN_KEY =
  "aic.team.token";


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


export function getTeamUsername(): string {
  return (
    localStorage.getItem(
      TEAM_USERNAME_KEY,
    ) ?? ""
  );
}


export function setTeamUsername(
  username: string,
): void {
  const normalized =
    username.trim();

  if (normalized) {
    localStorage.setItem(
      TEAM_USERNAME_KEY,
      normalized,
    );
  } else {
    localStorage.removeItem(
      TEAM_USERNAME_KEY,
    );
  }
}


export function clearTeamUsername(): void {
  localStorage.removeItem(
    TEAM_USERNAME_KEY,
  );
}


export function getTeamToken(): string {
  return (
    sessionStorage.getItem(
      TEAM_TOKEN_KEY,
    ) ?? ""
  );
}


export function setTeamToken(
  token: string,
): void {
  if (token.trim()) {
    sessionStorage.setItem(
      TEAM_TOKEN_KEY,
      token,
    );
  } else {
    sessionStorage.removeItem(
      TEAM_TOKEN_KEY,
    );
  }
}


export function clearTeamToken(): void {
  sessionStorage.removeItem(
    TEAM_TOKEN_KEY,
  );
}


export function clearTeamIdentity(): void {
  clearTeamUsername();
  clearTeamToken();
}