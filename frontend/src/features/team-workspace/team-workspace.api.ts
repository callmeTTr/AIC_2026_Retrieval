import { env } from "../../config/env";

import {
  clearTeamToken,
  getTeamToken,
  getTeamUsername,
  setTeamToken,
} from "./team-workspace.session";


export interface TeamWorkspaceItem {
  id: string;
  task_name: string;
  candidate_key: string;

  video_id: string;
  frame_index: number;
  timestamp_seconds: number;

  thumbnail_url: string | null;
  frame_url: string | null;
  video_url: string | null;

  note: string;

  shared_by: string;
  shared_at: string;
}


export interface TeamRoom {
  room_code: string;
  created_by: string;
  created_at: string;
  items: TeamWorkspaceItem[];
}


export interface CreateTeamRoomResponse {
  status: string;
  room_code: string;
  created_by: string;
  created_at: string;
}


export interface ShareTeamCandidateRequest {
  task_name: string;
  candidate_key: string;

  video_id: string;
  frame_index: number;
  timestamp_seconds: number;

  thumbnail_url?: string | null;
  frame_url?: string | null;
  video_url?: string | null;

  note?: string;
}


export interface ShareTeamCandidateResponse {
  status: string;
  room_code: string;
  item: TeamWorkspaceItem;
}
export interface CreateTeamSessionResponse {
  status: string;
  username: string;
  team_token: string;
}

interface WorkspaceErrorResponse {
  detail?: string;
}


function buildWorkspaceUrl(
  path: string,
): string {
  const baseUrl =
    env.dresBridgeUrl.replace(/\/+$/, "");

  const relativePath =
    path.replace(/^\/+/, "");

  return `${baseUrl}/${relativePath}`;
}


export async function createTeamSession(
  username: string,
): Promise<CreateTeamSessionResponse> {
  const normalizedUsername =
    username.trim();

  if (!normalizedUsername) {
    throw new Error(
      "Enter your Team name.",
    );
  }

  const response = await fetch(
    buildWorkspaceUrl(
      "/workspace/session",
    ),
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        username:
          normalizedUsername,
      }),
    },
  );

  if (!response.ok) {
    let message =
      `Team Workspace request failed with status ${response.status}`;

    try {
      const body =
        (await response.json()) as WorkspaceErrorResponse;

      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Response may not be JSON.
    }

    throw new Error(message);
  }

  const session =
    (await response.json()) as CreateTeamSessionResponse;

  setTeamToken(
    session.team_token,
  );

  return session;
}


async function getWorkspaceToken():
Promise<string> {
  const existingToken =
    getTeamToken().trim();

  if (existingToken) {
    return existingToken;
  }

  const username =
    getTeamUsername().trim();

  if (!username) {
    throw new Error(
      "Enter your Team name before using Team Room.",
    );
  }

  const session =
    await createTeamSession(
      username,
    );

  return session.team_token;
}


async function workspaceRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  async function sendRequest(
    token: string,
  ) {
    return fetch(
      buildWorkspaceUrl(path),
      {
        ...options,
        headers: {
          "Content-Type":
            "application/json",
          "X-Team-Token": token,
          ...options.headers,
        },
      },
    );
  }

  let token =
    await getWorkspaceToken();

  let response =
    await sendRequest(token);

  if (response.status === 401) {
    clearTeamToken();

    const username =
      getTeamUsername().trim();

    if (username) {
      const session =
        await createTeamSession(
          username,
        );

      token =
        session.team_token;

      response =
        await sendRequest(token);
    }
  }

  if (!response.ok) {
    let message =
      `Team Workspace request failed with status ${response.status}`;

    try {
      const body =
        (await response.json()) as WorkspaceErrorResponse;

      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Response may not be JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}


export function createTeamRoom():
Promise<CreateTeamRoomResponse> {
  return workspaceRequest<CreateTeamRoomResponse>(
    "/workspace/rooms",
    {
      method: "POST",
    },
  );
}


export function getTeamRoom(
  roomCode: string,
  taskName?: string,
): Promise<TeamRoom> {
  const normalizedRoomCode =
    roomCode.trim().toUpperCase();

  const params =
    new URLSearchParams();

  if (taskName?.trim()) {
    params.set(
      "task_name",
      taskName.trim(),
    );
  }

  const query =
    params.toString();

  return workspaceRequest<TeamRoom>(
    `/workspace/rooms/${encodeURIComponent(
      normalizedRoomCode,
    )}${query ? `?${query}` : ""}`,
    {
      method: "GET",
    },
  );
}


export function shareTeamCandidate(
  roomCode: string,
  request: ShareTeamCandidateRequest,
): Promise<ShareTeamCandidateResponse> {
  const normalizedRoomCode =
    roomCode.trim().toUpperCase();

  return workspaceRequest<ShareTeamCandidateResponse>(
    `/workspace/rooms/${encodeURIComponent(
      normalizedRoomCode,
    )}/items`,
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}
export interface DeleteTeamCandidateResponse {
  status: string;
  room_code: string;
  item_id: string;
  deleted_by: string;
}


export function deleteTeamCandidate(
  roomCode: string,
  itemId: string,
): Promise<DeleteTeamCandidateResponse> {
  const normalizedRoomCode =
    roomCode.trim().toUpperCase();

  return workspaceRequest<DeleteTeamCandidateResponse>(
    `/workspace/rooms/${encodeURIComponent(
      normalizedRoomCode,
    )}/items/${encodeURIComponent(
      itemId,
    )}`,
    {
      method: "DELETE",
    },
  );
}