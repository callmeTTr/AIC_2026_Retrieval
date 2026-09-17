from collections.abc import Callable
from datetime import datetime, timezone
import secrets
import threading

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel


router = APIRouter(
    prefix="/workspace",
    tags=["team-workspace"],
)

ROOM_CODE_ALPHABET = (
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
)

ROOM_CODE_LENGTH = 6

_workspace_auth_resolver: (
    Callable[[str], str] | None
) = None

_rooms_lock = threading.Lock()

rooms: dict[str, dict] = {}


class TeamCandidateCreate(BaseModel):
    task_name: str

    candidate_key: str

    video_id: str
    frame_index: int
    timestamp_seconds: float

    thumbnail_url: str | None = None
    frame_url: str | None = None
    video_url: str | None = None

    note: str = ""


def configure_workspace_auth(
    resolver: Callable[[str], str],
) -> None:
    global _workspace_auth_resolver
    _workspace_auth_resolver = resolver


def get_authenticated_username(
    bridge_token: str,
) -> str:
    if _workspace_auth_resolver is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Workspace authentication "
                "is not configured"
            ),
        )

    return _workspace_auth_resolver(
        bridge_token,
    )


def normalize_room_code(
    room_code: str,
) -> str:
    return room_code.strip().upper()


def generate_room_code() -> str:
    while True:
        room_code = "".join(
            secrets.choice(
                ROOM_CODE_ALPHABET
            )
            for _ in range(
                ROOM_CODE_LENGTH
            )
        )

        if room_code not in rooms:
            return room_code


def get_room_or_404(
    room_code: str,
) -> dict:
    normalized_code = normalize_room_code(
        room_code,
    )

    room = rooms.get(
        normalized_code,
    )

    if room is None:
        raise HTTPException(
            status_code=404,
            detail="Team room not found",
        )

    return room


@router.post("/rooms")
def create_room(
    x_bridge_token: str = Header(...),
):
    username = get_authenticated_username(
        x_bridge_token,
    )

    created_at = datetime.now(
        timezone.utc,
    ).isoformat()

    with _rooms_lock:
        room_code = generate_room_code()

        rooms[room_code] = {
            "room_code": room_code,
            "created_by": username,
            "created_at": created_at,
            "items": [],
        }

    return {
        "status": "ok",
        "room_code": room_code,
        "created_by": username,
        "created_at": created_at,
    }


@router.get("/rooms/{room_code}")
def get_room(
    room_code: str,
    task_name: str | None = None,
    x_bridge_token: str = Header(...),
):
    get_authenticated_username(
        x_bridge_token,
    )

    normalized_code = normalize_room_code(
        room_code,
    )

    with _rooms_lock:
        room = get_room_or_404(
            normalized_code,
        )

        items = list(
            room["items"]
        )

        if task_name:
            items = [
                item
                for item in items
                if item["task_name"]
                == task_name
            ]

        return {
            "room_code": room[
                "room_code"
            ],
            "created_by": room[
                "created_by"
            ],
            "created_at": room[
                "created_at"
            ],
            "items": items,
        }


@router.post(
    "/rooms/{room_code}/items"
)
def share_candidate(
    room_code: str,
    payload: TeamCandidateCreate,
    x_bridge_token: str = Header(...),
):
    username = get_authenticated_username(
        x_bridge_token,
    )

    normalized_code = normalize_room_code(
        room_code,
    )

    shared_at = datetime.now(
        timezone.utc,
    ).isoformat()

    with _rooms_lock:
        room = get_room_or_404(
            normalized_code,
        )

        duplicate = next(
            (
                item
                for item
                in room["items"]
                if (
                    item["shared_by"]
                    == username
                    and item[
                        "candidate_key"
                    ]
                    == payload.candidate_key
                    and item[
                        "task_name"
                    ]
                    == payload.task_name
                )
            ),
            None,
        )

        if duplicate is not None:
            raise HTTPException(
                status_code=409,
                detail=(
                    "This candidate was "
                    "already shared by "
                    "this member"
                ),
            )

        item = {
            "id": secrets.token_hex(6),
            "task_name": (
                payload.task_name
            ),
            "candidate_key": (
                payload.candidate_key
            ),
            "video_id": (
                payload.video_id
            ),
            "frame_index": (
                payload.frame_index
            ),
            "timestamp_seconds": (
                payload.timestamp_seconds
            ),
            "thumbnail_url": (
                payload.thumbnail_url
            ),
            "frame_url": (
                payload.frame_url
            ),
            "video_url": (
                payload.video_url
            ),
            "note": payload.note,
            "shared_by": username,
            "shared_at": shared_at,
        }

        room["items"].insert(
            0,
            item,
        )

    return {
        "status": "ok",
        "room_code": normalized_code,
        "item": item,
    }
@router.delete(
    "/rooms/{room_code}/items/{item_id}"
)
def delete_candidate(
    room_code: str,
    item_id: str,
    x_bridge_token: str = Header(...),
):
    username = get_authenticated_username(
        x_bridge_token,
    )

    normalized_code = normalize_room_code(
        room_code,
    )

    with _rooms_lock:
        room = get_room_or_404(
            normalized_code,
        )

        item_index = next(
            (
                index
                for index, item
                in enumerate(
                    room["items"]
                )
                if item["id"] == item_id
            ),
            None,
        )

        if item_index is None:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Shared candidate "
                    "not found"
                ),
            )

        item = room["items"][
            item_index
        ]

        can_delete = (
            item["shared_by"] == username
            or room["created_by"] == username
        )

        if not can_delete:
            raise HTTPException(
                status_code=403,
                detail=(
                    "You cannot delete "
                    "this shared candidate"
                ),
            )

        removed_item = room[
            "items"
        ].pop(item_index)

    return {
        "status": "ok",
        "room_code": normalized_code,
        "item_id": removed_item["id"],
        "deleted_by": username,
    }