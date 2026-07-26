from __future__ import annotations

import argparse
import json
import sys

import httpx


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Smoke-test AIC search and HTTP Range video streaming."
        )
    )
    parser.add_argument(
        "--base-url",
        required=True,
        help=(
            "Example: "
            "https://your-domain.ngrok-free.app/api/v1"
        ),
    )
    parser.add_argument(
        "--video-id",
        default="L21_V002",
    )
    parser.add_argument(
        "--query",
        default="three people playing a metal instrument",
    )
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")

    with httpx.Client(
        timeout=120.0,
        follow_redirects=True,
        headers={
            "Accept": "application/json",
            "ngrok-skip-browser-warning": "true",
        },
    ) as client:
        health = client.get(f"{base_url}/health")
        health.raise_for_status()

        print("HEALTH")
        print(json.dumps(health.json(), indent=2))

        info = client.get(
            f"{base_url}/videos/{args.video_id}/info"
        )
        info.raise_for_status()

        print("\nVIDEO INFO")
        print(json.dumps(info.json(), indent=2))

        range_response = client.get(
            f"{base_url}/videos/{args.video_id}/stream",
            headers={
                "Range": "bytes=0-1023",
                "ngrok-skip-browser-warning": "true",
            },
        )

        if range_response.status_code != 206:
            raise RuntimeError(
                "Expected HTTP 206, got "
                f"{range_response.status_code}: "
                f"{range_response.text[:300]}"
            )

        if len(range_response.content) != 1024:
            raise RuntimeError(
                "Expected exactly 1024 bytes, got "
                f"{len(range_response.content)}"
            )

        print("\nRANGE")
        print("status:", range_response.status_code)
        print(
            "accept-ranges:",
            range_response.headers.get("accept-ranges"),
        )
        print(
            "content-range:",
            range_response.headers.get("content-range"),
        )
        print(
            "content-length:",
            range_response.headers.get("content-length"),
        )

        search = client.post(
            f"{base_url}/search",
            json={
                "task": "task_1",
                "feedback": "",
                "scenes": [
                    {
                        "scene_id": 1,
                        "visual_query": args.query,
                        "ocr_query": "",
                        "asr_query": "",
                    }
                ],
                "options": {
                    "top_k_per_modality": 20,
                    "display_result_count": 5,
                },
            },
        )
        search.raise_for_status()
        body = search.json()

    print("\nSEARCH SUMMARY")
    print(
        json.dumps(
            {
                "total_results": body.get("total_results"),
                "warnings": body.get("warnings"),
                "first_result": (
                    body.get("results") or [None]
                )[0],
            },
            indent=2,
        )
    )

    first_result = (body.get("results") or [None])[0]

    if first_result is None:
        raise RuntimeError(
            "Search returned no results, so playback fields "
            "could not be validated."
        )

    required_fields = {
        "video_id",
        "timestamp_seconds",
        "video_url",
        "video_available",
    }
    missing = required_fields - set(first_result)

    if missing:
        raise RuntimeError(
            f"Search result is missing fields: {sorted(missing)}"
        )

    print("\nALL SMOKE TESTS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
