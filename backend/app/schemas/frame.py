from pydantic import BaseModel, Field


class NeighborFrame(BaseModel):
    video_id: str
    frame_index: int = Field(ge=0)
    timestamp_seconds: float = Field(ge=0)
    timestamp_display: str
    thumbnail_url: str
    frame_url: str
    is_center: bool


class NeighborFramesResponse(BaseModel):
    video_id: str
    center_frame_index: int = Field(ge=0)
    before: int = Field(ge=0)
    after: int = Field(ge=0)
    total_frames: int = Field(ge=1)
    frames: list[NeighborFrame]