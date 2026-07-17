export interface NeighborFrame {
  video_id: string;
  frame_index: number;
  timestamp_seconds: number;
  timestamp_display: string;
  thumbnail_url: string;
  frame_url: string;
  is_center: boolean;
}

export interface NeighborFramesResponse {
  video_id: string;
  center_frame_index: number;
  before: number;
  after: number;
  total_frames: number;
  frames: NeighborFrame[];
}