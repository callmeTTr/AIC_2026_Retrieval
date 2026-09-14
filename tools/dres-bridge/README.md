# AIC 2026 — DRES Bridge

Local bridge between the AIC frontend and DRES.

## Current architecture

Frontend  
→ DRES Bridge  
→ DRES

Default endpoints:

- Frontend: `http://localhost:5173`
- Bridge: `http://127.0.0.1:8765`
- DRES: `http://127.0.0.1:8080`

## Setup

Run from this folder:

```cmd
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Start

```cmd
start-bridge.cmd
```

The bridge must currently run with exactly one worker.

Reason:

Bridge sessions are stored in an in-memory Python dictionary:

```python
sessions = {}
```

Multiple Uvicorn workers would create separate session registries and can cause valid bridge tokens to fail depending on which worker receives the request.

Do not remove `--workers 1` until session storage is moved to a shared store.

## Security

Do not commit:

- passwords
- bridge tokens
- DRES session IDs
- `.env`
- virtual environments
- backup bridge files

Participant passwords are entered at runtime and are not stored in this repository.

## Current limitation

The bridge is currently bound to:

`127.0.0.1`

Therefore it is local-machine only.

Do not change it to `0.0.0.0` until network access, CORS, firewall rules and team deployment have been reviewed.

## Session behavior

Bridge tokens map to DRES session IDs in memory.

Disconnecting one frontend account removes only that account's bridge-token mapping.

Restarting the bridge clears all active bridge sessions and users must log in again.
