import type {
  SearchResult,
  TaskId,
} from "../search/search.types";

export interface CandidateItem {
  key: string;
  task: TaskId;
  searchId: string;
  result: SearchResult;
  selectedAt: string;
}

export function createCandidateKey(
  result: SearchResult,
): string {
  return [
    result.video_id,
    result.frame_index,
  ].join(":");
}