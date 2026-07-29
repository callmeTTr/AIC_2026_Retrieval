import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
} from "../search/search.types";

export interface RefinementRequest {
  /**
   * Chỉ dùng nội bộ frontend để giữ đúng task
   * khi backend không trả task trong response.
   */
  task: SearchRequest["task"];

  search_id: string;
  selected_frame_ref: string;
  feedback: string;
  top_k: number;
  display_result_count: number;
}

export interface FeedbackHistoryEntry {
  turn: number;
  feedback: string;
  reconstructed_state: Record<string, unknown>;
}

/**
 * Contract nội bộ của frontend.
 *
 * Live backend trả `iteration`, nhưng AppShell hiện
 * đang dùng `refinement_iteration`. API adapter sẽ
 * normalize field đó trước khi trả về UI.
 */
export interface RefinementResponse
  extends SearchResponse {
  parent_search_id: string;
  refinement_iteration: number;

  original_query?: string;
  reconstructed_query?: string;
  query_state?: Record<string, unknown>;
  feedback_history?: FeedbackHistoryEntry[];
}

interface CreateRefinementRequestInput {
  originalRequest: SearchRequest;
  parentSearchId: string;



  referenceResult: SearchResult;
  feedback: string;
}

export function createRefinementRequest(
  input: CreateRefinementRequestInput,
): RefinementRequest {
  const {
    originalRequest,
    parentSearchId,
    referenceResult,
    feedback,
  } = input;

  const searchId =
    parentSearchId.trim();

  const selectedFrameRef =
    referenceResult.frame_ref?.trim();

  const normalizedFeedback =
    feedback.trim();

  if (!searchId) {
    throw new Error(
      "The active search session is missing.",
    );
  }

  if (!selectedFrameRef) {
    throw new Error(
      "This result does not contain a live frame reference. Run a new search and try again.",
    );
  }

  if (!normalizedFeedback) {
    throw new Error(
      "Enter feedback before refining the results.",
    );
  }

  return {
    task:
      originalRequest.task,

    search_id:
      searchId,

    selected_frame_ref:
      selectedFrameRef,

    feedback:
      normalizedFeedback,

    top_k:
      originalRequest.options
        .top_k_per_modality,

    display_result_count:
      originalRequest.options
        .display_result_count,
  };
}
