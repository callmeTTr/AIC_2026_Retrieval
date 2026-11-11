# IntentGuard verification update

This build separates **search intent** from **original verification intent**.

## User flow

1. Paste the unchanged original task/query into **Original verification intent**.
2. Refine Visual/OCR/ASR search fields freely and search as usual.
3. Click **Queue verification** on promising candidate frames.
4. The candidate is immediately placed in the independent Verification Queue.
5. Background evidence workers:
   - localize the candidate's temporal region using the search-oriented visual query,
   - collect OCR metadata from localized frame names using the existing OCR SQLite DB,
   - collect overlapping ASR transcript segments using the already-loaded transcript list.
6. One GPU-1 VLM worker verifies candidates sequentially against the unchanged original intent.
7. Search stays usable while VLM jobs are pending/running.

## Backend pipeline

`POST /api/v1/verification/submit`

Required fields:

```json
{
  "search_id": "...",
  "frame_ref": "...",
  "original_query": "the unchanged original task query",
  "max_frames": 3,
  "include_ocr": true,
  "include_asr": true
}
```

Stages:

`queued -> localizing -> collecting_metadata -> queued_for_vlm -> verifying -> completed`

For efficient polling the UI uses one request for all active jobs:

`POST /api/v1/verification/status-batch`

## GPU / latency design

- GPU 0: normal retrieval + short temporal-localization query encoding.
- CPU / SQLite: OCR and ASR evidence lookup; no OCR/ASR inference is rerun.
- GPU 1: Qwen verifier, max one inference at a time.
- Evidence preparation uses one background worker by default: it prepares the next candidate while GPU 1 verifies the current candidate, without creating a GPU-0 localization backlog that could delay new searches.
- Duplicate verification clicks for the same candidate + original intent are deduplicated by the backend.

## Verification semantics

The VLM receives both queries but is explicitly instructed that:

- `original_query` = the only verification criterion.
- `search_query` = retrieval context only.

The VLM decomposes the original intent into atomic claims and returns claim-level `SUPPORTED / CONFLICT / UNKNOWN` decisions plus an overall decision.
