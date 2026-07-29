import {
  apiRequest,
  resolveBackendUrl,
} from "../../services/apiClient";

import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "./search.types";

interface LiveModalityScores {
  visual?: number | null;
  ocr?: number | null;
  asr?: number | null;
}

interface ActiveModalities {
  visual: boolean;
  ocr: boolean;
  asr: boolean;
}

interface LiveSearchResult {
  // Contract mới
  rank?: number;
  frame_index?: number;
  timestamp_seconds?: number;
  timestamp_display?: string;
  thumbnail_url?: string;
  frame_url?: string;

  // Alias contract cũ
  final_rank?: number;
  frame_idx?: number;
  time?: string;
  image_url?: string;

  frame_ref?: string | null;

  video_id: string;

  video_url?: string | null;
  video_available?: boolean;

  score: number;
  matched_scene?: number;

  modality_scores?: LiveModalityScores;
}

interface LiveSearchResponse {
  status?: string;

  search_id?: string;
  task?: SearchResponse["task"];

  processing_time_ms?: number;
  total_results?: number;

  warnings?: SearchResponse["warnings"];

  // Contract mới
  results?: LiveSearchResult[];

  // Alias contract cũ
  data?: LiveSearchResult[];
}

function parseTimestampSeconds(
  timestamp: string,
): number {
  const parts = timestamp
    .split(":")
    .map((part) => Number(part));

  if (
    parts.length === 0 ||
    parts.some(
      (part) => !Number.isFinite(part),
    )
  ) {
    return 0;
  }

  return parts.reduce(
    (total, part) =>
      total * 60 + part,
    0,
  );
}

function formatTimestamp(
  seconds: number,
): string {
  const totalMilliseconds =
    Math.round(
      Math.max(0, seconds) * 1000,
    );

  const hours = Math.floor(
    totalMilliseconds / 3_600_000,
  );

  const minutes = Math.floor(
    (
      totalMilliseconds %
      3_600_000
    ) / 60_000,
  );

  const wholeSeconds = Math.floor(
    (
      totalMilliseconds %
      60_000
    ) / 1000,
  );

  const milliseconds =
    totalMilliseconds % 1000;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    wholeSeconds
      .toString()
      .padStart(2, "0"),
  ].join(":") +
    `.${milliseconds
      .toString()
      .padStart(3, "0")}`;
}

function normalizeResult(
  result: LiveSearchResult,
  matchedScene: number,
  activeModalities: ActiveModalities,
): SearchResult {
  const rank =
    result.rank ??
    result.final_rank;

  const frameIndex =
    result.frame_index ??
    result.frame_idx;

  const timestampText =
    result.timestamp_display ??
    result.time ??
    "";

  const timestampSeconds =
    typeof result.timestamp_seconds ===
      "number" &&
    Number.isFinite(
      result.timestamp_seconds,
    )
      ? result.timestamp_seconds
      : parseTimestampSeconds(
          timestampText,
        );

  const thumbnailSource =
    result.thumbnail_url ??
    result.image_url;

  const frameSource =
    result.frame_url ??
    thumbnailSource;

  if (
    rank === undefined ||
    frameIndex === undefined ||
    !thumbnailSource ||
    !frameSource
  ) {
    throw new Error(
      "The live retrieval server returned an incomplete result.",
    );
  }

  const thumbnailUrl =
    resolveBackendUrl(
      thumbnailSource,
    );

  const frameUrl =
    resolveBackendUrl(
      frameSource,
    );

  if (
    !thumbnailUrl ||
    !frameUrl
  ) {
    throw new Error(
      "Unable to resolve frame URL returned by the live server.",
    );
  }

  const videoUrl =
    resolveBackendUrl(
      result.video_url,
    ) ?? null;

  const videoAvailable =
    Boolean(videoUrl) &&
    (
      result.video_available ??
      true
    );

  return {
    rank,
    video_id: result.video_id,

    frame_index: frameIndex,

    frame_ref:
      result.frame_ref?.trim() ||
      null,

    timestamp_seconds:
      timestampSeconds,

    timestamp_display:
      timestampText ||
      formatTimestamp(
        timestampSeconds,
      ),

    thumbnail_url:
      thumbnailUrl,

    frame_url:
      frameUrl,

    video_url:
      videoUrl,

    video_available:
      videoAvailable,

    score:
      result.score,

    matched_scene:
      result.matched_scene ??
      matchedScene,

    modality_scores: {
      visual:
        result.modality_scores
          ?.visual ??
        (
          activeModalities.visual &&
          !activeModalities.ocr &&
          !activeModalities.asr
            ? result.score
            : null
        ),

      ocr:
        result.modality_scores
          ?.ocr ??
        (
          activeModalities.ocr &&
          !activeModalities.visual &&
          !activeModalities.asr
            ? result.score
            : null
        ),

      asr:
        result.modality_scores
          ?.asr ??
        (
          activeModalities.asr &&
          !activeModalities.visual &&
          !activeModalities.ocr
            ? result.score
            : null
        ),
    },
  };
}

export async function searchVideos(
  request: SearchRequest,
): Promise<SearchResponse> {
  const activeSceneIndex =
    request.scenes.findIndex(
      (scene) =>
        Boolean(
          scene.visual_query.trim() ||
          scene.ocr_query.trim(),
        ),
    );

  if (activeSceneIndex < 0) {
    throw new Error(
      "Enter at least one Visual or OCR query.",
    );
  }

  const activeScene =
    request.scenes[
      activeSceneIndex
    ];

  const visualQuery =
    activeScene.visual_query.trim();

  const ocrQuery =
    activeScene.ocr_query.trim();

  const activeModalities:
    ActiveModalities = {
    visual:
      visualQuery.length > 0,

    ocr:
      ocrQuery.length > 0,

    /**
     * ASR chưa được bật trên branch này.
     */
    asr:
      false,
  };

  const startedAt =
    performance.now();

  const liveResponse =
    await apiRequest<LiveSearchResponse>(
      "/search",
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "ngrok-skip-browser-warning":
            "true",
        },

        body: JSON.stringify({
          task:
            request.task,

          feedback:
            request.feedback,

          scenes: [
            {
              scene_id:
                activeScene.scene_id,

              /**
               * Backend tự reconstruct Visual Query
               * sang tiếng Anh khi được bật.
               */
              visual_query:
                visualQuery,

              /**
               * OCR giữ nguyên tiếng Việt và được
               * tìm riêng bằng SQLite FTS5.
               */
              ocr_query:
                ocrQuery,

              /**
               * ASR tạm thời chưa tích hợp.
               */
              asr_query: "",
            },
          ],

          options: {
            top_k_per_modality:
              request.options
                .top_k_per_modality,

            display_result_count:
              request.options
                .display_result_count,

            use_query_rewrite:
              request.options
                .use_query_rewrite ??
              true,
          },
        }),
      },
    );

  if (
    liveResponse.status &&
    liveResponse.status !== "success"
  ) {
    throw new Error(
      "The live retrieval server reported a failed search.",
    );
  }

  const sourceResults =
    liveResponse.results ??
    liveResponse.data;

  if (
    !Array.isArray(
      sourceResults,
    )
  ) {
    throw new Error(
      "The live retrieval server returned an invalid response.",
    );
  }

  const displayResultCount =
    request.options
      .display_result_count;

  const results =
    sourceResults
      .slice(
        0,
        displayResultCount,
      )
      .map((result) =>
        normalizeResult(
          result,
          activeSceneIndex + 1,
          activeModalities,
        ),
      );

  return {
    search_id:
      liveResponse.search_id ??
      `live-${Date.now()}`,

    task:
      liveResponse.task ??
      request.task,

    processing_time_ms:
      liveResponse
        .processing_time_ms ??
      Math.round(
        performance.now() -
          startedAt,
      ),

    total_results:
      liveResponse.total_results ??
      results.length,

    warnings:
      liveResponse.warnings ??
      [],

    results,
  };
}
