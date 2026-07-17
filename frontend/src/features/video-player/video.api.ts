import { apiRequest } from "../../services/apiClient";

import type { VideoClipResponse } from "./video.types";

export function getVideoClip(
  videoId: string,
  centerTime: number,
  before = 5,
  after = 5,
): Promise<VideoClipResponse> {
  const encodedVideoId = encodeURIComponent(videoId);

  return apiRequest<VideoClipResponse>(
    `/videos/${encodedVideoId}/clip` +
      `?center_time=${centerTime}` +
      `&before=${before}` +
      `&after=${after}`,
  );
}