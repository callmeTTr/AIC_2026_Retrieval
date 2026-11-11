# ORIVA Verification UI V2

This patch fixes the missing wiring of the paper-facing ORIVA verification detail view.

## What changed

1. Completed result cards now show **Review verification** instead of a disabled **Verified** button.
2. Clicking **Review verification** opens the full `VerificationModal`.
3. The verification queue now has an **Open ORIVA detail** button for completed jobs.
4. The existing compact queue expansion remains available as **Quick details**.
5. The full detail modal displays:
   - selected anchor frame `c_i` with a highlighted anchor border;
   - fixed original intent `q_o` and current search query `q_s` side-by-side;
   - localized segment `S_i` as a temporal strip;
   - anchor frame and VLM evidence-frame markings;
   - overall SUPPORTED / CONFLICT / UNKNOWN decision;
   - atomic claim-level judgments;
   - visual / OCR / ASR evidence and timestamps;
   - optional cached explanation.

## Files changed

- `frontend/src/features/results/ResultsWorkspace.tsx`
- `frontend/src/features/results/ResultCard.tsx`
- `frontend/src/features/verification/VerificationQueuePanel.tsx`

The existing `VerificationModal.tsx` / CSS from V1 is now actually connected to the application.

## Backend

No backend change is required for this UI wiring. It uses the existing:

- `POST /temporal/localize`
- `POST /verification/submit`
- `GET /verification/{job_id}`
- `POST /verification/status-batch`

## Expected UI after verification completes

- Result card: `Review verification`
- Queue: `Open ORIVA detail` + `Quick details`
- Full modal: Anchor + q_o/q_s + localized segment + claim-level verification.
