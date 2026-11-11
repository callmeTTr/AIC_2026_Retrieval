# ORIVA verification UI update

Updated the verification detail view to better illustrate Section 3.3 of the paper.

## Added to VerificationModal

- Strong green outline around the selected anchor frame `c_i`.
- Side-by-side display of fixed original intent `q_o` and current search query `q_s`.
- Clear "Localized segment S_i" timeline with anchor and VLM-evidence legend.
- Overall verification decision with confidence, evidence count, and latency.
- Claim-level verification cards for `SUPPORTED`, `CONFLICT`, and `UNKNOWN`.
- Modality chips (`Visual`, `OCR`, `ASR`) and referenced evidence-frame IDs per claim.
- Compact OCR and ASR evidence excerpts with timestamps.
- VLM evidence frames labeled as F1, F2, ...

## Backend

No backend change is required for `paper-aic-testing (8).ipynb`: the current verification job payload already exposes `claims`, `ocr_evidence`, `asr_evidence`, `evidence`, `original_query`, and `search_query`, which the revised frontend now renders.

## Build note

A full Vite build could not be completed in the artifact environment because dependency installation timed out. A TypeScript parse pass reached only missing-module/type-resolution errors (React/lucide dependencies), with no syntax errors reported for the edited TSX itself.
