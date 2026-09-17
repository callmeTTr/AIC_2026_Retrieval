import { env } from "../../config/env";
import {
  getDresBridgeToken,
} from "../dres/dres.session";


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


function getWorkspaceToken(): string {
  const token =
    getDresBridgeToken().trim();

  if (!token) {
    throw new Error(
      "Connect to DRES before using Team Room.",
    );
  }

  return token;
}


async function workspaceRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getWorkspaceToken();

  const response = await fetch(
    buildWorkspaceUrl(path),
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Bridge-Token": token,
        ...options.headers,
      },
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