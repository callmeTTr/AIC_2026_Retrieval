import { apiRequest } from "../../services/apiClient";

import type {
  NeighborFramesResponse,
} from "./neighbor.types";

export function getNeighborFrames(
  videoId: string,
  frameIndex: number,
  before = 20,
  after = 20,
): Promise<NeighborFramesResponse> {
  const encodedVideoId = encodeURIComponent(videoId);

  return apiRequest<NeighborFramesResponse>(
    `/videos/${encodedVideoId}/frames/${frameIndex}/neighbors` +
      `?before=${before}&after=${after}`,
  );
}