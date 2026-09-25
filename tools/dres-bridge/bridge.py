from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import secrets
from threading import Lock
from team_workspace import (
    router as team_workspace_router,
)
DRES_BASE_URL = os.getenv(
    "DRES_BASE_URL",
    "http://127.0.0.1:8080",
).rstrip("/")

DRES_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "DRES_ALLOWED_ORIGINS",
        "http://localhost:5173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="AIC DRES Bridge")
app.include_router(team_workspace_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=DRES_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=[
        "GET",
        "POST",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Content-Type",
        "X-Bridge-Token",
        "X-Team-Token",
    ],
)

# Bridge token -> DRES sessionId
sessions = {}


# Competition submission duplicate guard.
#
# Scope:
# evaluation + current task/query + submission type + exact answer.
#
# This is intentionally Bridge-wide rather than per browser token,
# so two clients using the same shared Bridge cannot accidentally
# submit the exact same answer concurrently.
submission_guard_lock = Lock()
pending_submission_keys = set()
sent_submission_keys = set()


def build_submission_key(
    evaluation_id: str,
    task: dict,
    submission_type: str,
    answer_signature: str,
):
    task_identity = str(
        task.get("id")
        or task.get("name")
        or ""
    ).strip()

    if not task_identity:
        raise HTTPException(
            status_code=502,
            detail=(
                "Current DRES task has no stable "
                "identity for duplicate protection"
            ),
        )

    return (
        evaluation_id.strip(),
        task_identity,
        submission_type,
        answer_signature,
    )


def claim_submission(
    submission_key,
):
    with submission_guard_lock:
        if (
            submission_key
            in pending_submission_keys
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Duplicate submission blocked: "
                    "the identical answer is already "
                    "being submitted."
                ),
            )

        if (
            submission_key
            in sent_submission_keys
        ):
            raise HTTPException(
                status_code=409,
                detail=(
                    "Duplicate submission blocked: "
                    "the identical answer was already "
                    "sent for this DRES task."
                ),
            )

        pending_submission_keys.add(
            submission_key,
        )


def mark_submission_sent(
    submission_key,
):
    with submission_guard_lock:
        pending_submission_keys.discard(
            submission_key,
        )

        sent_submission_keys.add(
            submission_key,
        )


def release_submission(
    submission_key,
):
    with submission_guard_lock:
        pending_submission_keys.discard(
            submission_key,
        )
def dres_submission_was_processed(
    response_ok: bool,
    result,
):
    if not response_ok:
        return False

    if (
        isinstance(result, dict)
        and "status" in result
    ):
        return result.get("status") is True

    # A 2xx response without an explicit DRES
    # status is treated as delivered. Blocking an
    # identical retry is safer than risking a
    # duplicate competition submission.
    return True
class LoginRequest(BaseModel):
    username: str
    password: str


def get_dres_session(token: str):
    session_id = sessions.get(token)
    if not session_id:
        raise HTTPException(status_code=401, detail="Invalid bridge token")
    return session_id

@app.get("/health")
def health():
    try:
        r = requests.get(DRES_BASE_URL, timeout=3)
        return {
            "status": "ok",
            "bridge": "running",
            "dres": "reachable",
            "dres_status": r.status_code
        }
    except Exception as e:
        return {
            "status": "error",
            "bridge": "running",
            "dres": "unreachable",
            "detail": str(e)
        }


@app.post("/login")
def login(payload: LoginRequest):
    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/login",
            json={
                "username": payload.username,
                "password": payload.password,
            },
            timeout=10,
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=str(e),
        )

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail="DRES login failed",
        )

    data = r.json()
    session_id = data.get("sessionId")

    if not session_id:
        raise HTTPException(
            status_code=502,
            detail="DRES returned no sessionId",
        )

    bridge_token = secrets.token_urlsafe(32)
    sessions[bridge_token] = session_id

    authenticated_username = (
        data.get("username")
        or payload.username
    )

    return {
        "status": "ok",
        "username": authenticated_username,
        "role": data.get("role"),
        "access_token": bridge_token,
    }
@app.post("/logout")
def logout(
    x_bridge_token: str = Header(...),
):
    removed_session = sessions.pop(
        x_bridge_token,
        None,
    )

    return {
        "status": "ok",
        "session_removed": removed_session is not None,
    }
@app.get("/evaluations")
def list_evaluations(
    x_bridge_token: str = Header(...),
):
    session_id = get_dres_session(x_bridge_token)

    try:
        r = requests.get(
            f"{DRES_BASE_URL}/api/v2/client/evaluation/list",
            params={"session": session_id},
            timeout=10,
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=str(e),
        )

    if not r.ok:
        raise HTTPException(
            status_code=r.status_code,
            detail=r.text or "Unable to list DRES evaluations",
        )

    try:
        evaluations = r.json()
    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail="DRES returned an invalid evaluation list",
        ) from e

    if not isinstance(evaluations, list):
        raise HTTPException(
            status_code=502,
            detail="DRES evaluation list has an unexpected format",
        )

    active_evaluations = [
        evaluation
        for evaluation in evaluations
        if str(evaluation.get("status", "")).upper() == "ACTIVE"
    ]

    return {
        "status": "ok",
        "evaluations": evaluations,
        "active_evaluations": active_evaluations,
    }
@app.get("/current-task/{evaluation_id}")
def current_task(
    evaluation_id: str,
    x_bridge_token: str = Header(...)
):
    session_id = get_dres_session(x_bridge_token)

    try:
        r = requests.get(
            f"{DRES_BASE_URL}/api/v2/client/evaluation/currentTask/{evaluation_id}",
            params={"session": session_id},
            timeout=10
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail=r.text or "Unable to get current task"
        )

    return r.json()
@app.post("/start-task/{evaluation_id}")
def start_task(
    evaluation_id: str,
    x_bridge_token: str = Header(...)
):
    session_id = get_dres_session(x_bridge_token)

    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/evaluation/admin/{evaluation_id}/task/start",
            params={"session": session_id},
            timeout=10
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=str(e)
        )

    try:
        result = r.json()
    except ValueError:
        result = {
            "raw_response": r.text
        }

    if not r.ok:
        raise HTTPException(
            status_code=r.status_code,
            detail=result
        )

    return {
        "status": "ok",
        "dres_http_status": r.status_code,
        "dres_response": result
    }
class QaSubmitRequest(BaseModel):
    answer: str
    media_item_name: str
    timestamp_ms: int
class TrakeSubmitRequest(BaseModel):
    media_item_name: str
    frame_ids: list[int]
class SubmitRequest(BaseModel):
    media_item_name: str
    timestamp_ms: int | None = None

    # Legacy compatibility:
    # existing frontend submit buttons still send seconds
    # until they are migrated to timestamp_ms.
    timestamp_seconds: float | None = None

    media_item_collection_name: str = "aic-full"

    # Kept temporarily so older frontend payloads
    # are still accepted. KIS now submits one exact
    # frame timestamp, so this value is no longer
    # used to extend the answer range.
    segment_duration_seconds: float = 0.5


@app.post("/submit/{evaluation_id}")
def submit(
    evaluation_id: str,
    payload: SubmitRequest,
    x_bridge_token: str = Header(...)
):
    session_id = get_dres_session(x_bridge_token)
    media_item_name = (
        payload.media_item_name
        .strip()
    )

    if media_item_name.lower().endswith(".mp4"):
        media_item_name = media_item_name[:-4]

    if not media_item_name:
        raise HTTPException(
            status_code=400,
            detail="media_item_name is required",
        )
    # 1. Lấy task hiện tại từ DRES
    try:
        task_response = requests.get(
            f"{DRES_BASE_URL}/api/v2/client/evaluation/currentTask/{evaluation_id}",
            params={"session": session_id},
            timeout=10
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))

    if task_response.status_code != 200:
        raise HTTPException(
            status_code=task_response.status_code,
            detail=task_response.text or "Unable to get current task"
        )

    task = task_response.json()
    task_name = task.get("name")

    if not task_name:
        raise HTTPException(status_code=502, detail="Current task has no name")

    # 2. Resolve the exact frame timestamp in milliseconds.
    #
    # Official competition format uses milliseconds.
    # timestamp_seconds remains temporarily supported so
    # existing frontend submission flows keep working
    # during the migration.
    if payload.timestamp_ms is not None:
        if payload.timestamp_ms < 0:
            raise HTTPException(
                status_code=400,
                detail="timestamp_ms must be greater than or equal to 0",
            )

        selected_time_ms = payload.timestamp_ms

    elif payload.timestamp_seconds is not None:
        if payload.timestamp_seconds < 0:
            raise HTTPException(
                status_code=400,
                detail="timestamp_seconds must be greater than or equal to 0",
            )

        selected_time_ms = round(
            payload.timestamp_seconds * 1000
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "Either timestamp_ms or "
                "timestamp_seconds is required"
            ),
        )

    # KIS submission represents the selected frame
    # timestamp rather than an arbitrary 0.5-second range.
    start_ms = selected_time_ms
    end_ms = selected_time_ms

    dres_body = {
        "answerSets": [
            {
                "taskName": task_name,
                "answers": [
                    {
                        "mediaItemName": media_item_name,
                        "start": start_ms,
                        "end": end_ms
                    }
                ]
            }
        ]
    }
    submission_key = build_submission_key(
        evaluation_id,
        task,
        "KIS",
        f"{media_item_name}|{selected_time_ms}",
    )

    claim_submission(
        submission_key,
    )
    # 3. Submit to DRES.
    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/submit/{evaluation_id}",
            params={"session": session_id},
            json=dres_body,
            timeout=10
        )
    except requests.Timeout as e:
        # Delivery is ambiguous after a timeout:
        # DRES may already have received the answer.
        # Keep it blocked to avoid an accidental
        # duplicate submission.
        mark_submission_sent(
            submission_key,
        )

        raise HTTPException(
            status_code=504,
            detail=(
                "DRES submission timed out. "
                "Delivery status is unknown, so an "
                "identical retry is blocked to avoid "
                "a duplicate competition submission."
            ),
        ) from e

    except requests.RequestException as e:
        # No usable DRES response was obtained.
        # Release the claim so the user may retry.
        release_submission(
            submission_key,
        )

        raise HTTPException(
            status_code=502,
            detail=str(e),
        ) from e

    try:
        result = r.json()
    except ValueError:
        result = {
            "raw_response": r.text
        }

    dres_processed = (
        dres_submission_was_processed(
            r.ok,
            result,
        )
    )

    if dres_processed:
        mark_submission_sent(
            submission_key,
        )
    else:
        # Explicit DRES rejection / invalid payload
        # must not permanently poison this answer.
        release_submission(
            submission_key,
        )

    return {
        "status": (
            "ok"
            if dres_processed
            else "error"
        ),
        "dres_http_status": r.status_code,
        "task": task_name,
        "submitted": {
            "media_item_name": media_item_name,
            "start_ms": start_ms,
            "end_ms": end_ms
        },
        "dres_response": result
    }
@app.post("/submit-qa/{evaluation_id}")
def submit_qa(
    evaluation_id: str,
    payload: QaSubmitRequest,
    x_bridge_token: str = Header(...)
):
    session_id = get_dres_session(x_bridge_token)
    media_item_name = (
        payload.media_item_name
        .strip()
    )

    if media_item_name.lower().endswith(".mp4"):
        media_item_name = media_item_name[:-4]

    if not media_item_name:
        raise HTTPException(
            status_code=400,
            detail="media_item_name is required",
        )
    answer = payload.answer.strip()

    if not answer:
        raise HTTPException(
            status_code=400,
            detail="answer is required",
        )

    if payload.timestamp_ms < 0:
        raise HTTPException(
            status_code=400,
            detail="timestamp_ms must be greater than or equal to 0",
        )

    qa_text = (
        f"QA-{answer}-"
        f"{media_item_name}-"
        f"{payload.timestamp_ms}"
    )
    # 1. Get the currently running task.
    try:
        task_response = requests.get(
            f"{DRES_BASE_URL}/api/v2/client/evaluation/currentTask/{evaluation_id}",
            params={"session": session_id},
            timeout=10
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=str(e)
        )

    if task_response.status_code != 200:
        raise HTTPException(
            status_code=task_response.status_code,
            detail=task_response.text or "Unable to get current task"
        )

    task = task_response.json()
    task_name = task.get("name")

    if not task_name:
        raise HTTPException(
            status_code=502,
            detail="Current task has no name"
        )

    # 2. Build a DRES textual submission.
    dres_body = {
        "answerSets": [
            {
                "taskName": task_name,
                "answers": [
                    {
                        "text": qa_text
                    }
                ]
            }
        ]
    }
    submission_key = build_submission_key(
        evaluation_id,
        task,
        "QA",
        qa_text,
    )

    claim_submission(
        submission_key,
    )
    # 3. Submit to DRES.
    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/submit/{evaluation_id}",
            params={"session": session_id},
            json=dres_body,
            timeout=10
        )
    except requests.Timeout as e:
        mark_submission_sent(
            submission_key,
        )

        raise HTTPException(
            status_code=504,
            detail=(
                "DRES submission timed out. "
                "Delivery status is unknown, so an "
                "identical retry is blocked to avoid "
                "a duplicate competition submission."
            ),
        ) from e

    except requests.RequestException as e:
        release_submission(
            submission_key,
        )

        raise HTTPException(
            status_code=502,
            detail=str(e),
        ) from e

    try:
        result = r.json()
    except ValueError:
        result = {
            "raw_response": r.text
        }

    dres_processed = (
        dres_submission_was_processed(
            r.ok,
            result,
        )
    )

    if dres_processed:
        mark_submission_sent(
            submission_key,
        )
    else:
        release_submission(
            submission_key,
        )

    return {
        "status": (
            "ok"
            if dres_processed
            else "error"
        ),
        "dres_http_status": r.status_code,
        "task": task_name,
        "submitted": {
            "answer": answer,
            "media_item_name": media_item_name,
            "timestamp_ms": payload.timestamp_ms,
            "text": qa_text,
        },
        "dres_response": result
    }
@app.post("/submit-trake/{evaluation_id}")
def submit_trake(
    evaluation_id: str,
    payload: TrakeSubmitRequest,
    x_bridge_token: str = Header(...)
):
    session_id = get_dres_session(x_bridge_token)

    media_item_name = (
        payload.media_item_name
        .strip()
    )

    if media_item_name.lower().endswith(".mp4"):
        media_item_name = media_item_name[:-4]

    if not media_item_name:
        raise HTTPException(
            status_code=400,
            detail="media_item_name is required",
        )

    if not payload.frame_ids:
        raise HTTPException(
            status_code=400,
            detail="TRAKE requires at least one frame ID",
        )

    if any(
        frame_id < 0
        for frame_id in payload.frame_ids
    ):
        raise HTTPException(
            status_code=400,
            detail="TRAKE frame IDs must be non-negative integers",
        )

    # Preserve the supplied semantic-event order.
    trake_text = (
        f"TR-{media_item_name}-"
        + ",".join(
            str(frame_id)
            for frame_id in payload.frame_ids
        )
    )

    # Get current task so the bridge response
    # remains consistent with the other submit flows.
    try:
        task_response = requests.get(
            f"{DRES_BASE_URL}/api/v2/client/evaluation/currentTask/{evaluation_id}",
            params={"session": session_id},
            timeout=10
        )
    except requests.RequestException as e:
        raise HTTPException(
            status_code=502,
            detail=str(e)
        )

    if task_response.status_code != 200:
        raise HTTPException(
            status_code=task_response.status_code,
            detail=task_response.text or "Unable to get current task"
        )

    task = task_response.json()
    task_name = task.get("name")

    if not task_name:
        raise HTTPException(
            status_code=502,
            detail="Current task has no name"
        )

    # Official AIC 2026 TRAKE submission:
    # TR-<VIDEO_ID>-<FRAME_ID1>,<FRAME_ID2>,...
    dres_body = {
        "answerSets": [
            {
                "taskName": task_name,
                "answers": [
                    {
                        "text": trake_text
                    }
                ]
            }
        ]
    }
    submission_key = build_submission_key(
        evaluation_id,
        task,
        "TRAKE",
        trake_text,
    )

    claim_submission(
        submission_key,
    )
    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/submit/{evaluation_id}",
            params={"session": session_id},
            json=dres_body,
            timeout=10
        )
    except requests.Timeout as e:
        mark_submission_sent(
            submission_key,
        )

        raise HTTPException(
            status_code=504,
            detail=(
                "DRES submission timed out. "
                "Delivery status is unknown, so an "
                "identical retry is blocked to avoid "
                "a duplicate competition submission."
            ),
        ) from e

    except requests.RequestException as e:
        release_submission(
            submission_key,
        )

        raise HTTPException(
            status_code=502,
            detail=str(e),
        ) from e

    try:
        result = r.json()
    except ValueError:
        result = {
            "raw_response": r.text
        }

    dres_processed = (
        dres_submission_was_processed(
            r.ok,
            result,
        )
    )

    if dres_processed:
        mark_submission_sent(
            submission_key,
        )
    else:
        release_submission(
            submission_key,
        )

    return {
        "status": (
            "ok"
            if dres_processed
            else "error"
        ),
        "dres_http_status": r.status_code,
        "task": task_name,
        "submitted": {
            "media_item_name": media_item_name,
            "frame_ids": payload.frame_ids,
            "text": trake_text,
        },
        "dres_response": result
    }