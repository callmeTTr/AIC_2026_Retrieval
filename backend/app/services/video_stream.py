from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx

from app.services.video_source import VideoSource


FORWARDED_RESPONSE_HEADERS = (
    "accept-ranges",
    "cache-control",
    "content-length",
    "content-range",
    "etag",
    "last-modified",
)


class VideoUpstreamError(RuntimeError):
    """Raised when the remote video source cannot be streamed."""

    def __init__(
        self,
        message: str,
        status_code: int = 502,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code


@dataclass(slots=True)
class OpenedVideoStream:
    """Represents an opened remote video response."""

    status_code: int
    media_type: str
    headers: dict[str, str]

    _client: httpx.AsyncClient
    _response: httpx.Response

    async def iter_bytes(self) -> AsyncIterator[bytes]:
        """
        Yield video bytes and close resources after streaming ends.
        """

        try:
            async for chunk in self._response.aiter_raw():
                yield chunk
        finally:
            await self.close()

    async def close(self) -> None:
        """Close the upstream response and HTTP client."""

        await self._response.aclose()
        await self._client.aclose()


class VideoStreamService:
    """Opens video streams from remote media sources."""

    async def open(
        self,
        source: VideoSource,
        range_header: str | None,
    ) -> OpenedVideoStream:
        request_headers = {
            "Accept": "video/*",
        }

        if range_header:
            request_headers["Range"] = range_header

        timeout = httpx.Timeout(
            connect=15.0,
            read=None,
            write=15.0,
            pool=15.0,
        )

        client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=timeout,
        )

        try:
            upstream_request = client.build_request(
                method="GET",
                url=source.url,
                headers=request_headers,
            )

            upstream_response = await client.send(
                upstream_request,
                stream=True,
            )

        except httpx.HTTPError as error:
            await client.aclose()

            raise VideoUpstreamError(
                "Backend could not connect to the video source: "
                f"{error}"
            ) from error

        if upstream_response.status_code == 416:
            await upstream_response.aclose()
            await client.aclose()

            raise VideoUpstreamError(
                "The requested video byte range is not available.",
                status_code=416,
            )

        if upstream_response.status_code >= 400:
            upstream_status = upstream_response.status_code

            await upstream_response.aclose()
            await client.aclose()

            raise VideoUpstreamError(
                "Remote video source returned HTTP "
                f"{upstream_status}."
            )

        response_headers: dict[str, str] = {}

        for header_name in FORWARDED_RESPONSE_HEADERS:
            header_value = upstream_response.headers.get(
                header_name
            )

            if header_value:
                response_headers[header_name] = header_value

        media_type = upstream_response.headers.get(
            "content-type",
            source.media_type,
        )

        return OpenedVideoStream(
            status_code=upstream_response.status_code,
            media_type=media_type,
            headers=response_headers,
            _client=client,
            _response=upstream_response,
        )


video_stream_service = VideoStreamService()