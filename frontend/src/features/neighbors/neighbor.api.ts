import {
  apiRequest,
  resolveBackendUrl,
} from "../../services/apiClient";

import type {
  SearchResult,
} from "../search/search.types";

import type {
  NeighborFrame,
  NeighborFramesResponse,
} from "./neighbor.types";

interface LiveNeighborFrame {
  frame_ref?: string | null;

  video_id?: string;
  frame_index?: number;

  timestamp_seconds?: number;
  timestamp_display?: string;

  image_url?: string;
  thumbnail_url?: string;
  frame_url?: string;

  shot_id?: number | null;
  is_center?: boolean;

  kaggle_output_url?: string | null;
  kaggle_relative_path?: string | null;
}

interface LiveNeighborResponse {
  status?: string;

  video_id?: string;
  frame_index?: number;

  neighbor_count?: number;

  neighbors?: LiveNeighborFrame[];
  data?: LiveNeighborFrame[];
}

const neighborRequestCache =
  new Map<
    string,
    Promise<NeighborFramesResponse>
  >();

function formatTimestamp(
  seconds: number,
): string {
  const totalSeconds =
    Math.max(0, Math.floor(seconds));

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60,
    );

  const secs =
    totalSeconds % 60;

  return hours > 0
    ? [
        hours,
        minutes,
        secs,
      ]
        .map((value) =>
          value
            .toString()
            .padStart(2, "0"),
        )
        .join(":")
    : [minutes, secs]
        .map((value) =>
          value
            .toString()
            .padStart(2, "0"),
        )
        .join(":");
}

function normalizeNeighborFrame(
  frame: LiveNeighborFrame,
  result: SearchResult,
): NeighborFrame | null {
  if (
    frame.frame_index === undefined ||
    frame.timestamp_seconds === undefined
  ) {
    return null;
  }

  const frameUrl =
    resolveBackendUrl(
      frame.frame_url ??
        frame.image_url ??
        frame.thumbnail_url,
    );

  if (!frameUrl) {
    return null;
  }

  const thumbnailUrl =
    resolveBackendUrl(
      frame.thumbnail_url,
    ) ??
    frameUrl;

  return {
    frame_ref:
      frame.frame_ref?.trim() ??
      null,

    video_id:
      frame.video_id ??
      result.video_id,

    frame_index:
      frame.frame_index,

    timestamp_seconds:
      frame.timestamp_seconds,

    timestamp_display:
      frame.timestamp_display ??
      formatTimestamp(
        frame.timestamp_seconds,
      ),

    thumbnail_url:
      thumbnailUrl,

    frame_url:
      frameUrl,

    shot_id:
      frame.shot_id ??
      null,

    is_center:
      frame.is_center ??
      (
        frame.frame_index ===
        result.frame_index
      ),

    kaggle_output_url:
      frame.kaggle_output_url
        ?.trim() ??
      null,

    kaggle_relative_path:
      frame.kaggle_relative_path
        ?.trim() ??
      null,
  };
}

function buildNeighborResponse(
  result: SearchResult,
  frames: NeighborFrame[],
): NeighborFramesResponse {
  const centerPosition =
    frames.findIndex(
      (frame) =>
        frame.is_center ||
        frame.frame_index ===
          result.frame_index,
    );

  return {
    video_id:
      result.video_id,

    center_frame_index:
      result.frame_index,

    before:
      centerPosition >= 0
        ? centerPosition
        : 0,

    after:
      centerPosition >= 0
        ? Math.max(
            0,
            frames.length -
              centerPosition -
              1,
          )
        : 0,

    total_frames:
      frames.length,

    frames,
  };
}

function getEmbeddedNeighborFrames(
  result: SearchResult,
): NeighborFramesResponse | null {
  if (result.neighbors.length === 0) {
    return null;
  }

  return buildNeighborResponse(
    result,
    result.neighbors,
  );
}

async function requestNeighborFrames(
  result: SearchResult,
  radius: number,
): Promise<NeighborFramesResponse> {
  if (!result.neighbors_url) {
    throw new Error(
      "Neighbor endpoint is not available for this result.",
    );
  }

  const separator =
    result.neighbors_url.includes("?")
      ? "&"
      : "?";

  const response =
    await apiRequest<LiveNeighborResponse>(
      `${result.neighbors_url}${separator}radius=${radius}`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          "ngrok-skip-browser-warning":
            "true",
        },
      },
    );

  if (
    response.status &&
    response.status !== "success"
  ) {
    throw new Error(
      "The neighbor service reported a failed request.",
    );
  }

  const sourceFrames =
    response.neighbors ??
    response.data ??
    [];

  const frames =
    sourceFrames
      .map((frame) =>
        normalizeNeighborFrame(
          frame,
          result,
        ),
      )
      .filter(
        (
          frame,
        ): frame is NeighborFrame =>
          frame !== null,
      );

  return buildNeighborResponse(
    result,
    frames,
  );
}

export function getNeighborFrames(
  result: SearchResult,
  radius = 3,
): Promise<NeighborFramesResponse> {
  const embedded =
    getEmbeddedNeighborFrames(
      result,
    );

  if (embedded) {
    return Promise.resolve(
      embedded,
    );
  }

  const normalizedRadius =
    Math.max(
      1,
      Math.min(
        Math.trunc(radius),
        50,
      ),
    );

  const cacheIdentity =
    result.frame_ref ??
    result.neighbors_url;

  if (!cacheIdentity) {
    return Promise.reject(
      new Error(
        "Neighbor data is not available for this result.",
      ),
    );
  }

  const cacheKey =
    `${cacheIdentity}:${normalizedRadius}`;

  const cachedRequest =
    neighborRequestCache.get(
      cacheKey,
    );

  if (cachedRequest) {
    return cachedRequest;
  }

  const request =
    requestNeighborFrames(
      result,
      normalizedRadius,
    ).catch((error) => {
      neighborRequestCache.delete(
        cacheKey,
      );

      throw error;
    });

  neighborRequestCache.set(
    cacheKey,
    request,
  );

  return request;
}
