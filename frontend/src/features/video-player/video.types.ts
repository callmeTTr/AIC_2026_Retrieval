export interface VideoClipResponse {
  video_id: string;
  center_time: number;
  start_time: number;
  end_time: number;
  video_url: string;
  poster_url: string | null;
}