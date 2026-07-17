from pydantic import BaseModel, Field


class VideoClipResponse(BaseModel):
    video_id: str

    center_time: float = Field(ge=0)
    start_time: float = Field(ge=0)
    end_time: float = Field(ge=0)

    video_url: str
    poster_url: str | None = None