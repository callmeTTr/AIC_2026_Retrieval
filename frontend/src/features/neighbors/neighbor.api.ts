import type {
  SearchResult,
} from "../search/search.types";

import type {
  NeighborFramesResponse,
} from "./neighbor.types";

/**
 * Adapts neighbors embedded in the live search response
 * to the data shape consumed by NeighborFrameViewer.
 *
 * No additional backend request is required.
 */
export function getEmbeddedNeighborFrames(
  result: SearchResult,
): NeighborFramesResponse {
  const frames = result.neighbors;

  const centerPosition =
    frames.findIndex(
      (frame) => frame.is_center,
    );

  return {
    video_id:
      result.video_id,

    center_frame_index:
      result.frame_index,

    before:
      centerPosition >= 0
        ? centerPosition
        : 0,

    after:
      centerPosition >= 0
        ? Math.max(
            0,
            frames.length -
              centerPosition -
              1,
          )
        : 0,

    total_frames:
      frames.length,

    frames,
  };
}
