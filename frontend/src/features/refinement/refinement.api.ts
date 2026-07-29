import {
  apiRequest,
  resolveBackendUrl,
} from "../../services/apiClient";

import type {
  SearchResponse,
  SearchResult,
} from "../search/search.types";

import type {
  FeedbackHistoryEntry,
  RefinementRequest,
  RefinementResponse,
} from "./refinement.types";

interface LiveFeedbackResponse {
  status?: string;

  search_id?: string;
  task?: SearchResponse["task"];
  iteration?: number;

  processing_time_ms?: number;
  total_results?: number;

  warnings?: SearchResponse["warnings"];

  results?: SearchResult[];
  data?: SearchResult[];

  original_query?: string;
  reconstructed_query?: string;
  query_state?: Record<string, unknown>;

  feedback_history?:
    FeedbackHistoryEntry[];
}

function normalizeRefinedResult(
  result: SearchResult,
): SearchResult {
  const thumbnailUrl =
    resolveBackendUrl(
      result.thumbnail_url,
    );

  const frameUrl =
    resolveBackendUrl(
      result.frame_url,
    );

  if (
    !thumbnailUrl ||
    !frameUrl
  ) {
    throw new Error(
      "Unable to resolve a frame URL returned by the feedback server.",
    );
  }

  const videoUrl =
    resolveBackendUrl(
      result.video_url,
    ) ?? null;

  return {
    ...result,

    frame_ref:
      result.frame_ref?.trim() ||
      null,

    thumbnail_url:
      thumbnailUrl,

    frame_url:
      frameUrl,

    video_url:
      videoUrl,

    video_available:
      Boolean(videoUrl) &&
      (
        result.video_available ??
        true
      ),
  };
}

export async function refineSearchResults(
  request: RefinementRequest,
): Promise<RefinementResponse> {
  const {
    task,
    ...payload
  } = request;

  const liveResponse =
    await apiRequest<LiveFeedbackResponse>(
      "/search/feedback",
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "ngrok-skip-browser-warning":
            "true",
        },

        body:
          JSON.stringify(
            payload,
          ),
      },
    );

  if (
    liveResponse.status &&
    liveResponse.status !== "success"
  ) {
    throw new Error(
      "The live feedback server reported a failed refinement.",
    );
  }

  if (!liveResponse.search_id) {
    throw new Error(
      "The live feedback server did not return a search session ID.",
    );
  }

  if (
    typeof liveResponse.iteration !==
      "number" ||
    !Number.isFinite(
      liveResponse.iteration,
    )
  ) {
    throw new Error(
      "The live feedback server returned an invalid iteration.",
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
      "The live feedback server returned an invalid result list.",
    );
  }

  const results =
    sourceResults.map(
      normalizeRefinedResult,
    );

  return {
    search_id:
      liveResponse.search_id,

    parent_search_id:
      request.search_id,

    refinement_iteration:
      liveResponse.iteration,

    task:
      liveResponse.task ??
      task,

    processing_time_ms:
      liveResponse
        .processing_time_ms ??
      0,

    total_results:
      liveResponse.total_results ??
      results.length,

    warnings:
      liveResponse.warnings ??
      [],

    results,

    original_query:
      liveResponse.original_query,

    reconstructed_query:
      liveResponse
        .reconstructed_query,

    query_state:
      liveResponse.query_state,

    feedback_history:
      liveResponse.feedback_history,
  };
}
