import type {
  TaskId as HeaderTaskId,
} from "../header/AppHeader";

import type {
  QueryBuilderValue,
} from "../query-builder/query.types";

import type {
  NeighborFrame,
} from "../neighbors/neighbor.types";

export type TaskId = HeaderTaskId;

export interface SearchSceneRequest {
  scene_id: number;
  visual_query: string;
  ocr_query: string;
  asr_query: string;
}

export interface SearchRequest {
  task: TaskId;
  feedback: string;

  scenes: SearchSceneRequest[];

  options: {
    top_k_per_modality: number;
    display_result_count: number;
    use_query_rewrite?: boolean;

    /**
     * Legacy eager-neighbor mode.
     * Keep disabled for the normal search flow.
     */
    include_neighbors?: boolean;

    /**
     * When enabled, neighbor frames are fetched only
     * after the user opens the Neighbor viewer.
     */
    lazy_neighbors?: boolean;

    neighbor_radius?: number;
  };
}

export interface ModalityScores {
  visual: number | null;
  ocr: number | null;
  asr: number | null;
}

export interface SearchResult {
  rank: number;
  video_id: string;

  frame_index: number;

  /**
   * Opaque reference do live backend cấp.
   * Dùng để chọn frame làm reference cho iterative feedback.
   */
  frame_ref: string | null;

  timestamp_seconds: number;
  timestamp_display: string;

  thumbnail_url: string;
  frame_url: string;

  kaggle_output_url?: string | null;
  kaggle_relative_path?: string | null;

  /**
   * Backend-provided endpoint used to fetch neighbor
   * frames lazily for this result.
   */
  neighbors_url: string | null;

  /**
   * May contain preloaded neighbors from legacy responses.
   * Normal lazy-search responses return an empty array.
   */
  neighbors: NeighborFrame[];
  /**
   * URL stream video do backend trả về.
   *
   * Có thể là:
   * - URL tuyệt đối
   * - URL tương đối thuộc backend
   * - null nếu không tìm thấy video gốc
   */
  video_url: string | null;

  /**
   * Cho biết backend đã map được frame
   * với video gốc hay chưa.
   */
  video_available: boolean;

  score: number;
  matched_scene: number;

  modality_scores: ModalityScores;
}

export interface SearchWarning {
  module: string;
  code: string;
  message: string;
}

export interface SearchResponse {
  search_id: string;
  task: TaskId;
  query_mode?: string;

  processing_time_ms: number;
  total_results: number;

  warnings: SearchWarning[];
  results: SearchResult[];
}

export function createSearchRequest(
  task: TaskId,
  queryBuilder: QueryBuilderValue,
): SearchRequest {
  return {
    task,

    // Giữ để tương thích SearchRequest
    // của backend hiện tại.
    feedback: "",

    scenes: queryBuilder.scenes.map(
      (scene, index) => ({
        scene_id: index + 1,

        visual_query:
          scene.visualQuery.trim(),

        ocr_query:
          scene.ocrQuery.trim(),

        asr_query:
          scene.asrQuery.trim(),
      }),
    ),

    options: {
      top_k_per_modality:
        queryBuilder.topKPerModality,

      display_result_count:
        queryBuilder.displayResultCount,

      use_query_rewrite:
        queryBuilder.useQueryRewrite,

      include_neighbors: false,
      lazy_neighbors: true,
      neighbor_radius: 3,
    },
  };
}
