import type {
  TaskId as HeaderTaskId,
} from "../header/AppHeader";

export type TaskId = HeaderTaskId;
import type { QueryBuilderValue } from "../query-builder/query.types";

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
  timestamp_seconds: number;
  timestamp_display: string;
  thumbnail_url: string;
  frame_url: string;
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
  processing_time_ms: number;
  total_results: number;
  warnings: SearchWarning[];
  results: SearchResult[];
}

export function createSearchRequest(
  task: TaskId,
  feedback: string,
  queryBuilder: QueryBuilderValue,
): SearchRequest {
  return {
    task,
    feedback: feedback.trim(),

    scenes: queryBuilder.scenes.map((scene, index) => ({
      scene_id: index + 1,
      visual_query: scene.visualQuery.trim(),
      ocr_query: scene.ocrQuery.trim(),
      asr_query: scene.asrQuery.trim(),
    })),

    options: {
      top_k_per_modality:
        queryBuilder.topKPerModality,

      display_result_count:
        queryBuilder.displayResultCount,
    },
  };
}