# AIC 2026 Interactive Video Retrieval

Interactive multimodal video retrieval system for AIC 2026.

## Tech Stack

- Frontend: React, TypeScript, Vite
- Backend: FastAPI, Python
- Architecture: Modular monolith
- API prefix: `/api/v1`

## Project Structure

```text
AIC_2026_Retrieval/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── config/
│   │   └── main.py
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## Requirements

- Node.js
- npm
- Python
- Git

## Initial Setup

### Backend

Create and activate the virtual environment:

```cmd
cd backend
py -m venv .venv
.venv\Scripts\activate
```

Install dependencies:

```cmd
python -m pip install -r requirements.txt
```

Create the local environment file:

```cmd
copy .env.example .env
```

### Frontend

Install dependencies:

```cmd
cd frontend
npm install
```

Create the local environment file:

```cmd
copy .env.example .env
```

## Run Backend

From the project root:

```cmd
cd backend
.venv\Scripts\activate
python -m uvicorn app.main:app --reload
```

Backend URLs:

- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`

Expected health response:

```json
{
  "status": "ok",
  "service": "aic-2026-backend"
}
```

## Run Frontend

Open another terminal:

```cmd
cd frontend
npm run dev
```

Frontend URL:

- `http://localhost:5173`

## Environment Variables

### Backend

File: `backend/.env`

Example:

```env
APP_NAME=AIC 2026 Retrieval API
ENVIRONMENT=development
API_PREFIX=/api/v1
FRONTEND_ORIGIN=http://localhost:5173

MAX_TOP_K=1000
MAX_DISPLAY_RESULTS=500
```

### Frontend

File: `frontend/.env`

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Do not commit `.env` files. Only commit `.env.example`.

## Core Conventions

- `video_id` is a string, for example `L01_V003`.
- `frame_index` starts at `0`.
- `timestamp_seconds` is a non-negative floating-point number.
- Higher retrieval scores indicate better matches.
- `scene_id` starts at `1`.
- At least one query scene is required.
- Each scene must contain at least one non-empty Visual, OCR, or ASR query.
- `top_k_per_modality` must be between `1` and `1000`.
- `display_result_count` must be between `1` and `500`.
- The frontend communicates only with the backend API.
- Visual, OCR, and ASR outputs are normalized through backend adapters.
- A failed retrieval module should not crash the entire search request.

## Planned Modules

- Visual retrieval
- OCR retrieval
- ASR retrieval
- Multimodal fusion
- Temporal multi-scene search
- Neighboring-frame browsing
- Surrounding-video playback
- Result submission
- Feedback and composed image retrieval

## Modular Architecture

```text
Frontend
    |
    | HTTP / JSON
    v
FastAPI Backend
    |
    +-- Search Orchestrator
    +-- Fusion Service
    +-- Temporal Service
    +-- Result Formatter
    |
    +-- Visual Adapter --> Visual Module
    +-- OCR Adapter ----> OCR Module
    +-- ASR Adapter ----> ASR Module
```

New retrieval functionality should be added as a separate module or adapter instead of being hard-coded across the application.

## Current Status

- [x] React frontend initialized
- [x] FastAPI backend initialized
- [x] Backend health endpoint created
- [x] Frontend connected to backend health endpoint
- [ ] Search request and response schemas
- [ ] Query builder UI
- [ ] Result grid
- [ ] Retrieval adapters
- [ ] Multimodal fusion
- [ ] Neighbor frame viewer
- [ ] Video player
- [ ] Submission workflow
