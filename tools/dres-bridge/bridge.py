from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import secrets

app = FastAPI(title="AIC DRES Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-Bridge-Token",
    ],
)

DRES_BASE_URL = "http://127.0.0.1:8080"

# Bridge token -> DRES sessionId
sessions = {}


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
                "password": payload.password
            },
            timeout=10
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))

    if r.status_code != 200:
        raise HTTPException(
            status_code=r.status_code,
            detail="DRES login failed"
        )

    data = r.json()
    session_id = data.get("sessionId")

    if not session_id:
        raise HTTPException(
            status_code=502,
            detail="DRES returned no sessionId"
        )

    bridge_token = secrets.token_urlsafe(32)
    sessions[bridge_token] = session_id

    return {
        "status": "ok",
        "username": data.get("username"),
        "role": data.get("role"),
        "access_token": bridge_token
    }
@app.post("/logout")
def logout(
    x_bridge_token: str = Header(...)
):
    removed_session = sessions.pop(
        x_bridge_token,
        None
    )

    return {
        "status": "ok",
        "session_removed": removed_session is not None
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
class TrakeEvent(BaseModel):
    media_item_name: str
    timestamp_seconds: float
    media_item_collection_name: str = "aic-test2"
    segment_duration_seconds: float = 0.5


class TrakeSubmitRequest(BaseModel):
    events: list[TrakeEvent]
class SubmitRequest(BaseModel):
    media_item_name: str
    timestamp_seconds: float
    media_item_collection_name: str = "aic-test2"
    segment_duration_seconds: float = 0.5


@app.post("/submit/{evaluation_id}")
def submit(
    evaluation_id: str,
    payload: SubmitRequest,
    x_bridge_token: str = Header(...)
):
    session_id = get_dres_session(x_bridge_token)

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

    # 2. Convert giây -> milliseconds
    start_ms = round(payload.timestamp_seconds * 1000)
    end_ms = round(
        (payload.timestamp_seconds + payload.segment_duration_seconds) * 1000
    )

    dres_body = {
        "answerSets": [
            {
                "taskName": task_name,
                "answers": [
                    {
                        "mediaItemName": payload.media_item_name,
                        "mediaItemCollectionName": payload.media_item_collection_name,
                        "start": start_ms,
                        "end": end_ms
                    }
                ]
            }
        ]
    }

    # 3. Submit sang DRES
    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/submit/{evaluation_id}",
            params={"session": session_id},
            json=dres_body,
            timeout=10
        )
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=str(e))

    try:
        result = r.json()
    except ValueError:
        result = {"raw_response": r.text}

    return {
        "status": "ok" if r.ok else "error",
        "dres_http_status": r.status_code,
        "task": task_name,
        "submitted": {
            "media_item_name": payload.media_item_name,
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
                        "text": payload.answer
                    }
                ]
            }
        ]
    }

    # 3. Submit to DRES.
    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/submit/{evaluation_id}",
            params={"session": session_id},
            json=dres_body,
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

    return {
        "status": "ok" if r.ok else "error",
        "dres_http_status": r.status_code,
        "task": task_name,
        "submitted": {
            "answer": payload.answer
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

    if not payload.events:
        raise HTTPException(
            status_code=400,
            detail="TRAKE submission requires at least one event"
        )

    # 1. Get current task from DRES.
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

    # 2. Preserve event order while converting to DRES temporal answers.
    answers = []
    submitted_events = []

    for index, event in enumerate(payload.events):
        start_ms = round(
            event.timestamp_seconds * 1000
        )

        end_ms = round(
            (
                event.timestamp_seconds +
                event.segment_duration_seconds
            ) * 1000
        )

        answers.append(
            {
                "mediaItemName":
                    event.media_item_name,
                "mediaItemCollectionName":
                    event.media_item_collection_name,
                "start": start_ms,
                "end": end_ms
            }
        )

        submitted_events.append(
            {
                "index": index,
                "media_item_name":
                    event.media_item_name,
                "start_ms": start_ms,
                "end_ms": end_ms
            }
        )

    dres_body = {
        "answerSets": [
            {
                "taskName": task_name,
                "answers": answers
            }
        ]
    }

    # 3. Submit all ordered temporal answers
    #    in one DRES answerSet.
    try:
        r = requests.post(
            f"{DRES_BASE_URL}/api/v2/submit/{evaluation_id}",
            params={"session": session_id},
            json=dres_body,
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

    return {
        "status": "ok" if r.ok else "error",
        "dres_http_status": r.status_code,
        "task": task_name,
        "submitted": {
            "events": submitted_events
        },
        "dres_response": result
    }