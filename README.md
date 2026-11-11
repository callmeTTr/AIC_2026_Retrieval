# AIC 2026 Interactive Video Retrieval

An interactive multimodal video retrieval system prepared for AIC 2026.

## Collected ORIVA edition

This edition combines the original project history with the local ORIVA UI V2
updates. The changes are described in [IntentGuard verification](INTENTGUARD_VERIFICATION.md)
and [ORIVA UI V2](UI_ORIVA_VERIFICATION_CHANGES_V2.md).

The [ORIVA backend notebook](notebooks/kaggle/oriva-intentguard-backend.ipynb)
contains the temporal localization and verification API used by that interface.
Its outputs have been cleared, and its ngrok credential is read from the Kaggle
Secret named `NGROK_AUTH_TOKEN`. The optional `NGROK_DOMAIN` environment variable
selects a reserved tunnel domain. The local `backend/` remains the mock retrieval
backend described below. Dataset mounts, model downloads and GPU execution of the
notebook require the Kaggle environment.

The project currently provides a complete mock retrieval workflow from the React interface to the FastAPI backend. Visual, OCR, and ASR retrieval modules are represented by deterministic adapters so the UI, orchestration, fusion, temporal layer, warning handling, media tools, and submission workflow can be developed before real retrieval modules are connected.

## Current Status

Completed:

- React + TypeScript + Vite frontend
- FastAPI backend with API prefix `/api/v1`
- Multi-scene query builder
- Visual, OCR, and ASR query inputs
- Retrieval adapter registry
- Concurrent search orchestrator
- Deterministic mock retrieval adapters
- Reciprocal Rank Fusion (RRF)
- Temporal reranking contract with a no-op placeholder
- Partial-result warning handling
- Result grid tested with 100 unique results
- Neighbor frame viewer
- Surrounding video player
- Frame lightbox
- Candidate selection tray
- Result submission workflow
- Frontend form accessibility hardening
- Backend unit and integration test suite

Not connected yet:

- Real visual retrieval module
- Real OCR retrieval module
- Real ASR retrieval module
- Real temporal reranking model
- Competition submission server
- Real AIC video dataset and frame storage

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- TanStack React Query
- Lucide React
- React Hook Form
- Zod

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn
- `unittest`

## Project Structure

```text
AIC_2026_Retrieval/
|-- backend/
|   |-- app/
|   |   |-- api/
|   |   |   |-- routes/
|   |   |   |   |-- frames.py
|   |   |   |   |-- health.py
|   |   |   |   |-- search.py
|   |   |   |   |-- submissions.py
|   |   |   |   `-- videos.py
|   |   |   `-- router.py
|   |   |-- config/
|   |   |   `-- settings.py
|   |   |-- retrieval/
|   |   |   |-- adapters/
|   |   |   |   `-- mock.py
|   |   |   |-- bootstrap.py
|   |   |   |-- contracts.py
|   |   |   |-- fusion.py
|   |   |   |-- issues.py
|   |   |   |-- orchestrator.py
|   |   |   |-- registry.py
|   |   |   `-- temporal.py
|   |   |-- schemas/
|   |   |   |-- frame.py
|   |   |   |-- search.py
|   |   |   |-- submission.py
|   |   |   |-- task.py
|   |   |   `-- video.py
|   |   |-- services/
|   |   |   |-- search_service.py
|   |   |   |-- submission_service.py
|   |   |   |-- video_source.py
|   |   |   `-- video_stream.py
|   |   |-- lifespan.py
|   |   `-- main.py
|   |-- tests/
|   |-- .env.example
|   `-- requirements.txt
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- config/
|   |   |-- features/
|   |   |   |-- candidates/
|   |   |   |-- frame-viewer/
|   |   |   |-- header/
|   |   |   |-- health/
|   |   |   |-- neighbors/
|   |   |   |-- query-builder/
|   |   |   |-- results/
|   |   |   |-- search/
|   |   |   |-- submission/
|   |   |   `-- video-player/
|   |   |-- services/
|   |   |-- App.tsx
|   |   |-- index.css
|   |   `-- main.tsx
|   |-- .env.example
|   |-- package.json
|   `-- vite.config.ts
|-- .gitignore
`-- README.md
```

## Architecture

```text
React Frontend
      |
      | HTTP / JSON
      v
FastAPI Search API
      |
      v
Search Service
      |
      +--> Search Orchestrator
      |       |
      |       +--> Visual Adapter
      |       +--> OCR Adapter
      |       `--> ASR Adapter
      |
      +--> Reciprocal Rank Fusion
      |
      +--> Temporal Reranker
      |
      `--> Search Response Formatter
```

The frontend communicates only with the FastAPI backend. Retrieval modules are accessed through adapter contracts and the registry, which allows mock adapters to be replaced by real modules without changing the API or frontend.

## Requirements

Install these tools before starting:

- Git
- Python
- Node.js
- npm

The current development environment uses Python 3.14, but the application should be tested again if a different Python version is used.

## Initial Setup

Open Command Prompt in the project root:

```cmd
cd /d D:\AIC_2026_Retrieval
```

### Backend Setup

```cmd
cd /d D:\AIC_2026_Retrieval\backend

py -m venv .venv
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt

copy .env.example .env
```

### Frontend Setup

```cmd
cd /d D:\AIC_2026_Retrieval\frontend

npm install
copy .env.example .env
```

Do not commit local `.env` files.

## Environment Variables

### Backend

File:

```text
backend/.env
```

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

File:

```text
frontend/.env
```

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

## Run the Application

### Start Backend

Open the first terminal:

```cmd
cd /d D:\AIC_2026_Retrieval\backend

.venv\Scripts\python -m uvicorn app.main:app --reload
```

Backend URLs:

- API root: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health endpoint: `http://127.0.0.1:8000/api/v1/health`

### Start Frontend

Open a second terminal:

```cmd
cd /d D:\AIC_2026_Retrieval\frontend

npm run dev
```

Frontend URL:

- `http://localhost:5173`

## API Endpoints

All application endpoints use the `/api/v1` prefix.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Backend health check |
| POST | `/search` | Multimodal video search |
| GET | `/videos/{video_id}/frames/{frame_index}/neighbors` | Neighbor frame metadata |
| GET | `/videos/{video_id}/clip` | Surrounding clip metadata |
| GET | `/videos/{video_id}/stream` | Video streaming proxy |
| POST | `/submissions` | Submit a selected result |

Open Swagger UI for the current request and response schemas:

```text
http://127.0.0.1:8000/docs
```

## Search Request Example

```json
{
  "task": "task_1",
  "feedback": "",
  "scenes": [
    {
      "scene_id": 1,
      "visual_query": "a person riding a bicycle",
      "ocr_query": "BIKE SHOP",
      "asr_query": "welcome to the show"
    }
  ],
  "options": {
    "top_k_per_modality": 100,
    "display_result_count": 100
  }
}
```

Search rules:

- At least one scene is required.
- Each scene must contain at least one Visual, OCR, or ASR query.
- `scene_id` starts at `1`.
- `top_k_per_modality` must be from `1` to `1000`.
- `display_result_count` must be from `1` to `500`.
- A higher score indicates a better match.

## Retrieval Pipeline

### 1. Adapter Registry

The registry stores one retrieval adapter for each modality:

- `visual`
- `ocr`
- `asr`

Real modules should implement the retrieval adapter contract and be registered during application startup.

### 2. Search Orchestrator

The orchestrator:

- Converts each scene into modality-specific retrieval queries
- Runs active adapters concurrently
- Preserves scene information
- Keeps healthy module results when another adapter fails
- Converts recoverable adapter exceptions into warnings

### 3. Reciprocal Rank Fusion

RRF combines ranked lists using:

```text
weight / (rank_constant + rank)
```

A candidate found by multiple modalities receives the sum of all contributions and is promoted in the final ranking.

The current mock adapters intentionally share some candidates across Visual, OCR, and ASR so RRF behavior can be tested from Swagger and the frontend.

### 4. Temporal Reranker

The temporal layer has a stable contract and context containing:

- Scene order
- Scene IDs
- Temporal window

The current implementation is `NoOpTemporalReranker`, which preserves the RRF order until a real temporal model is connected.

### 5. Warning Handling

A failed adapter does not automatically fail the entire search request.

The backend returns:

- Results from healthy modules
- HTTP 200
- A warning in `SearchResponse.warnings`

The frontend then displays:

- `Partial results`
- A warning banner
- The module and error code

## Mock Failure Testing

The mock adapters include controlled failure queries for development only.

Use one of these exact values:

```text
__fail_visual__
__fail_ocr__
__fail_asr__
```

Example:

```json
{
  "task": "task_1",
  "feedback": "",
  "scenes": [
    {
      "scene_id": 1,
      "visual_query": "__fail_visual__",
      "ocr_query": "BIKE SHOP",
      "asr_query": "welcome to the show"
    }
  ],
  "options": {
    "top_k_per_modality": 8,
    "display_result_count": 20
  }
}
```

Expected behavior:

- Visual retrieval produces a warning.
- OCR and ASR results remain available.
- The request returns HTTP 200.
- The frontend shows `Partial results`.

Remove these mock triggers when real adapters are connected.

## Frontend Features

### Query Builder

- Select Task 1 to Task 4
- Enter optional feedback
- Configure Top-K per modality
- Configure displayed result count
- Add or delete scenes
- Enter independent Visual, OCR, and ASR queries
- Validate empty scenes before submitting

### Result Workspace

- Responsive result grid
- Global ranks
- Video ID, frame index, timestamp, scene, and score
- Independent scrolling for the query sidebar and result list
- Support for 100 displayed results
- Loading, error, empty, ready, and partial-result states

### Result Actions

Each result card supports:

- Open frame lightbox
- Browse neighboring frames
- Play surrounding video
- Submit result
- Add or remove candidate
- Open larger frame view

### Candidate Tray

- Select multiple candidates
- Remove individual candidates
- Clear all candidates
- Submit a selected candidate

## Tests

### Run All Backend Tests

```cmd
cd /d D:\AIC_2026_Retrieval\backend

.venv\Scripts\python -m unittest discover -s tests -v
```

Current expected result:

```text
Ran 27 tests
OK
```

The test suite covers:

- Adapter registry
- Search orchestration
- Multi-modality queries
- RRF behavior
- Mock adapter and fusion integration
- Temporal placeholder behavior
- Search service integration
- Adapter failure recovery
- Warning mapping
- Exactly 100 unique results
- Continuous ranks and descending scores
- Frontend-compatible response serialization

### Compile Backend

```cmd
cd /d D:\AIC_2026_Retrieval\backend

.venv\Scripts\python -m compileall app
```

### Build Frontend

```cmd
cd /d D:\AIC_2026_Retrieval\frontend

npm run build
```

### Lint Frontend

```cmd
cd /d D:\AIC_2026_Retrieval\frontend

npm run lint
```

## Git Safety

Files that must not be committed:

```text
backend/.env
backend/.venv/
frontend/.env
frontend/node_modules/
frontend/dist/
**/__pycache__/
*.pyc
```

Before every commit:

```cmd
cd /d D:\AIC_2026_Retrieval

git status --short
git diff --check
git diff --cached --check
```

After every major step:

```cmd
git commit -m "describe the completed step"
git push
git status
```

The final status should be:

```text
nothing to commit, working tree clean
```

## Connecting Real Retrieval Modules

A real module should:

1. Implement the retrieval adapter contract.
2. Declare its modality.
3. Accept a `RetrievalQuery`.
4. Return ranked `RetrievalCandidate` objects.
5. Be registered in the adapter registry during startup.
6. Preserve the existing API response contract.

Do not place model-specific code directly inside the API route or React application.

Recommended integration points:

```text
backend/app/retrieval/adapters/
backend/app/retrieval/bootstrap.py
backend/app/retrieval/contracts.py
```

## Development Notes

- The current thumbnails use deterministic placeholder image URLs.
- The current surrounding video uses a short demo video source.
- Mock timestamps remain within the demo video duration.
- Submission responses are accepted by a mock backend service.
- The temporal reranker is intentionally a placeholder.
- Retrieval warnings expose safe public messages instead of internal stack traces.

## Roadmap

Completed foundation:

- [x] UI shell and query builder
- [x] Result grid and action buttons
- [x] Neighbor frame viewer
- [x] Surrounding video player
- [x] Candidate selection
- [x] Submission workflow
- [x] Retrieval adapter registry
- [x] Search orchestrator
- [x] Reciprocal Rank Fusion
- [x] Temporal placeholder
- [x] Error and warning handling
- [x] Test 100 results
- [x] Build and accessibility hardening

Next integration work:

- [ ] Connect real visual retrieval
- [ ] Connect real OCR retrieval
- [ ] Connect real ASR retrieval
- [ ] Replace placeholder images with real keyframes
- [ ] Replace demo video with dataset videos
- [ ] Implement real temporal reranking
- [ ] Connect the official competition submission endpoint
- [ ] Run end-to-end tests with the real dataset

## License

No license has been selected yet. Add a license before public distribution.
