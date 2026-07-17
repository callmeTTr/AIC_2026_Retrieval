from fastapi import APIRouter, Path, Query

from app.schemas.frame import (
    NeighborFrame,
    NeighborFramesResponse,
)

router = APIRouter(prefix="/videos")


def format_timestamp(seconds: float) -> str:
    milliseconds = int((seconds % 1) * 1000)
    total_seconds = int(seconds)

    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    remaining_seconds = total_seconds % 60

    return (
        f"{hours:02d}:"
        f"{minutes:02d}:"
        f"{remaining_seconds:02d}."
        f"{milliseconds:03d}"
    )


@router.get(
    "/{video_id}/frames/{frame_index}/neighbors",
    response_model=NeighborFramesResponse,
)
async def get_neighbor_frames(
    video_id: str,
    frame_index: int = Path(ge=0),
    before: int = Query(default=20, ge=0, le=100),
    after: int = Query(default=20, ge=0, le=100),
) -> NeighborFramesResponse:
    mock_fps = 30.0

    start_frame = max(0, frame_index - before)
    end_frame = frame_index + after

    frames: list[NeighborFrame] = []

    for current_frame in range(
        start_frame,
        end_frame + 1,
    ):
        timestamp_seconds = current_frame / mock_fps
        image_seed = f"{video_id}-{current_frame}"

        frames.append(
            NeighborFrame(
                video_id=video_id,
                frame_index=current_frame,
                timestamp_seconds=timestamp_seconds,
                timestamp_display=format_timestamp(
                    timestamp_seconds
                ),
                thumbnail_url=(
                    "https://picsum.photos/"
                    f"seed/{image_seed}/320/180"
                ),
                frame_url=(
                    "https://picsum.photos/"
                    f"seed/{image_seed}/1280/720"
                ),
                is_center=current_frame == frame_index,
            )
        )

    return NeighborFramesResponse(
        video_id=video_id,
        center_frame_index=frame_index,
        before=frame_index - start_frame,
        after=end_frame - frame_index,
        total_frames=len(frames),
        frames=frames,
    )