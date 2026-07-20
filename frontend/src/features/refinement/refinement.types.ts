import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "../search/search.types";

export interface RefinementReferenceResult {
  video_id: string;
  frame_index: number;
  timestamp_seconds: number;
  thumbnail_url: string;
  frame_url: string;
}

export interface RefinementRequest {
  task: SearchRequest["task"];
  parent_search_id: string;
  refinement_iteration: number;
  reference_result: RefinementReferenceResult;
  feedback: string;
  original_scenes: SearchRequest["scenes"];
  options: SearchRequest["options"];
}

export interface RefinementResponse
  extends SearchResponse {
  parent_search_id: string;
  refinement_iteration: number;
}

interface CreateRefinementRequestInput {
  originalRequest: SearchRequest;
  parentSearchId: string;
  refinementIteration: number;
  referenceResult: SearchResult;
  feedback: string;
}

export function createRefinementRequest({
  originalRequest,
  parentSearchId,
  refinementIteration,
  referenceResult,
  feedback,
}: CreateRefinementRequestInput): RefinementRequest {
  return {
    task: originalRequest.task,

    parent_search_id: parentSearchId,

    refinement_iteration:
      refinementIteration,

    reference_result: {
      video_id: referenceResult.video_id,
      frame_index:
        referenceResult.frame_index,
      timestamp_seconds:
        referenceResult.timestamp_seconds,
      thumbnail_url:
        referenceResult.thumbnail_url,
      frame_url: referenceResult.frame_url,
    },

    feedback: feedback.trim(),

    original_scenes:
      originalRequest.scenes.map(
        (scene) => ({
          ...scene,
        }),
      ),

    options: {
      ...originalRequest.options,
    },
  };
}