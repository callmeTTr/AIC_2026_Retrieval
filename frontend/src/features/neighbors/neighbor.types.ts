export interface NeighborFrame {
  frame_ref: string | null;

  video_id: string;
  frame_index: number;

  timestamp_seconds: number;
  timestamp_display: string;

  thumbnail_url: string;
  frame_url: string;

  shot_id: number | null;
  is_center: boolean;

  /**
   * Kaggle notebook Output page that supplied this frame.
   * Null/undefined when the backend cannot infer the notebook source.
   */
  kaggle_output_url?: string | null;

  /**
   * Relative path inside the notebook Output tree.
   * Useful for locating the exact video/frame after opening Kaggle.
   */
  kaggle_relative_path?: string | null;
}

export interface NeighborFramesResponse {
  video_id: string;
  center_frame_index: number;

  before: number;
  after: number;
  total_frames: number;

  frames: NeighborFrame[];
}
