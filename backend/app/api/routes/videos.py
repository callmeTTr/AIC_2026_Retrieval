from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    Request,
)
from fastapi.responses import StreamingResponse

from app.schemas.video import VideoClipResponse
from app.services.video_source import (
    video_source_resolver,
)
from app.services.video_stream import (
    VideoUpstreamError,
    video_stream_service,
)


router = APIRouter(prefix="/videos")


@router.get(
    "/{video_id}/stream",
    name="stream_video",
)
async def stream_video(
    video_id: str,
    request: Request,
) -> StreamingResponse:
    """
    Stream video through the backend.

    Browser Range requests are forwarded to allow seeking
    without downloading the entire video.
    """

    source = video_source_resolver.resolve(video_id)

    try:
        opened_stream = await video_stream_service.open(
            source=source,
            range_header=request.headers.get("range"),
        )

    except VideoUpstreamError as error:
        raise HTTPException(
            status_code=error.status_code,
            detail=str(error),
        ) from error

    return StreamingResponse(
        content=opened_stream.iter_bytes(),
        status_code=opened_stream.status_code,
        media_type=opened_stream.media_type,
        headers=opened_stream.headers,
    )


@router.get(
    "/{video_id}/clip",
    response_model=VideoClipResponse,
)
async def get_video_clip(
    video_id: str,
    request: Request,
    center_time: float = Query(ge=0),
    before: float = Query(
        default=5,
        ge=0,
        le=60,
    ),
    after: float = Query(
        default=5,
        ge=0,
        le=60,
    ),
) -> VideoClipResponse:
    """
    Return the internal video URL and surrounding time range.

    The frontend seeks to start_time and pauses at end_time.
    """

    start_time = max(
        0,
        center_time - before,
    )

    end_time = center_time + after

    stream_url = request.url_for(
        "stream_video",
        video_id=video_id,
    )

    return VideoClipResponse(
        video_id=video_id,
        center_time=center_time,
        start_time=start_time,
        end_time=end_time,
        video_url=str(stream_url),
        poster_url=None,
    )