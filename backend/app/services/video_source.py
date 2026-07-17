from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class VideoSource:
    """Describes one playable video source."""

    url: str
    media_type: str = "video/mp4"


class VideoSourceResolver:
    """
    Maps a video ID to its media source.

    During the mock stage, every video ID uses the same remote
    sample video.

    When the real AIC dataset or media server becomes available,
    only this resolver needs to be replaced.
    """

    MOCK_VIDEO_URL = (
        "https://interactive-examples.mdn.mozilla.net/"
        "media/cc0-videos/flower.mp4"
    )

    def resolve(self, video_id: str) -> VideoSource:
        # video_id will be used with the real dataset mapping.
        _ = video_id

        return VideoSource(
            url=self.MOCK_VIDEO_URL,
            media_type="video/mp4",
        )


video_source_resolver = VideoSourceResolver()