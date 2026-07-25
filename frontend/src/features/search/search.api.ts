import { env } from "../../config/env";
import { apiRequest } from "../../services/apiClient";

import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "./search.types";

interface LiveSearchResult {
  final_rank: number;
  video_id: string;
  time: string;
  frame_idx: number;
  score: number;
  image_url: string;
}

interface LiveSearchResponse {
  status: string;
  total_results: number;
  data: LiveSearchResult[];
}

function parseTimestampSeconds(
  timestamp: string,
): number {
  const parts = timestamp
    .split(":")
    .map((part) => Number(part));

  if (
    parts.length === 0 ||
    parts.some((part) => !Number.isFinite(part))
  ) {
    return 0;
  }

  return parts.reduce(
    (total, part) => total * 60 + part,
    0,
  );
}

function createAbsoluteAssetUrl(
  imageUrl: string,
): string {
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const serverOrigin = new URL(
    env.apiBaseUrl,
  ).origin;

  return new URL(
    imageUrl,
    serverOrigin,
  ).toString();
}

function normalizeResult(
  result: LiveSearchResult,
  matchedScene: number,
): SearchResult {
  const assetUrl = createAbsoluteAssetUrl(
    result.image_url,
  );

  return {
    rank: result.final_rank,
    video_id: result.video_id,
    frame_index: result.frame_idx,
    timestamp_seconds:
      parseTimestampSeconds(result.time),
    timestamp_display: result.time,
    thumbnail_url: assetUrl,
    frame_url: assetUrl,
    score: result.score,
    matched_scene: matchedScene,
    modality_scores: {
      visual: result.score,
      ocr: null,
      asr: null,
    },
  };
}

export async function searchVideos(
  request: SearchRequest,
): Promise<SearchResponse> {
  const visualSceneIndex =
    request.scenes.findIndex(
      (scene) =>
        scene.visual_query.trim().length > 0,
    );

  if (visualSceneIndex < 0) {
    throw new Error(
      "The live retrieval server currently requires a Visual Query.",
    );
  }

  const visualQuery =
    request.scenes[
      visualSceneIndex
    ].visual_query.trim();

  const startedAt = performance.now();

  const liveResponse =
    await apiRequest<LiveSearchResponse>(
      "/search",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          query: visualQuery,
          top_k:
            request.options
              .top_k_per_modality,
        }),
      },
    );

  if (
    liveResponse.status !== "success" ||
    !Array.isArray(liveResponse.data)
  ) {
    throw new Error(
      "The live retrieval server returned an invalid response.",
    );
  }

  const displayResultCount =
    request.options.display_result_count;

  const results = liveResponse.data
    .slice(0, displayResultCount)
    .map((result) =>
      normalizeResult(
        result,
        visualSceneIndex + 1,
      ),
    );

  return {
    search_id: `live-${Date.now()}`,
    task: request.task,
    processing_time_ms: Math.round(
      performance.now() - startedAt,
    ),
    total_results: results.length,
    warnings: [],
    results,
  };
}
