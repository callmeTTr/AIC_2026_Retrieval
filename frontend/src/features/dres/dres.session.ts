const RUN_ID_KEY = "aic.dres.runId";
const BRIDGE_TOKEN_KEY = "aic.dres.bridgeToken";
const USERNAME_KEY = "aic.dres.username";

export function getDresRunId(): string {
  return localStorage.getItem(RUN_ID_KEY) ?? "";
}

export function setDresRunId(runId: string): void {
  const normalized = runId.trim();

  if (normalized) {
    localStorage.setItem(RUN_ID_KEY, normalized);
  } else {
    localStorage.removeItem(RUN_ID_KEY);
  }
}

export function getDresBridgeToken(): string {
  return sessionStorage.getItem(BRIDGE_TOKEN_KEY) ?? "";
}

export function setDresBridgeToken(token: string): void {
  sessionStorage.setItem(BRIDGE_TOKEN_KEY, token);
}

export function getDresUsername(): string {
  return sessionStorage.getItem(USERNAME_KEY) ?? "";
}

export function setDresUsername(username: string): void {
  sessionStorage.setItem(USERNAME_KEY, username);
}

export function clearDresSession(): void {
  sessionStorage.removeItem(BRIDGE_TOKEN_KEY);
  sessionStorage.removeItem(USERNAME_KEY);
}