import type { TaskId } from "../search/search.types";

export type SubmissionStatus =
  | "accepted"
  | "rejected";

export interface SubmissionRequest {
  task: TaskId;
  search_id: string;
  video_id: string;
  frame_index: number;
  timestamp_seconds: number;
}

export interface SubmissionResponse {
  submission_id: string;
  status: SubmissionStatus;
  task: TaskId;
  search_id: string;
  video_id: string;
  frame_index: number;
  timestamp_seconds: number;
  submitted_at: string;
  message: string;
}