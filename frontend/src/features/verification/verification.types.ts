export type VerificationDecision =
  | "SUPPORTED"
  | "CONFLICT"
  | "UNKNOWN";

export type VerificationJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface TemporalEvidenceFrame {
  frame_ref: string;
  timestamp_seconds: number;
  shot_id: number | null;
  is_anchor: boolean;
  score: number | null;
  thumbnail_url?: string;
  image_url?: string;
}

export interface TemporalSegment {
  video_id: string;
  anchor_timestamp: number;
  start_time: number;
  end_time: number;
  duration: number;
  anchor_shot?: number | null;
  left_shot?: number | null;
  right_shot?: number | null;
  threshold?: number | null;
  frame_count: number;
  video_available: boolean;
  video_url: string | null;
  frames: TemporalEvidenceFrame[];
}

export interface TemporalLocalizeRequest {
  search_id: string;
  frame_ref: string;
  query_override?: string;
  radius_frames?: number;
  max_seconds_from_anchor?: number;
  max_shots_each_side?: number;
  max_duration?: number;
}

export interface TemporalLocalizeResponse {
  status: "success";
  search_id: string;
  frame_ref: string;
  query: string;
  cache_hit: boolean;
  processing_time_ms: number;
  segment: TemporalSegment;
}

export interface VerificationSubmitRequest
  extends TemporalLocalizeRequest {
  original_query: string;
  max_frames?: number;
  include_ocr?: boolean;
  include_asr?: boolean;
}

export interface VerificationSubmitResponse {
  status: VerificationJobStatus;
  job_id: string;
  search_id: string;
  frame_ref: string;
  original_query: string;
  search_query: string;
  stage: string;
  deduplicated: boolean;
  poll_url: string;
}

export interface OcrVerificationEvidence {
  text: string;
  text_recall?: string | null;
  timestamp: number;
  frame_index?: number | null;
  shot_id?: number | null;
  frame?: string;
  is_anchor: boolean;
}

export interface AsrVerificationEvidence {
  start_time: number;
  end_time: number;
  text: string;
  segment_index?: number;
}

export interface VerificationClaim {
  claim: string;
  status: VerificationDecision;
  sources: Array<"visual" | "ocr" | "asr">;
  evidence_frames: number[];
  evidence_text: string[];
  reason: string;
}

export interface VerificationEvidence {
  frame_id: number;
  timestamp: number;
  shot_id: number | null;
  score?: number | null;
  frame_ref?: string;
  thumbnail_url?: string;
  image_url?: string;
}

export interface VerificationEvidenceContext {
  ocr: OcrVerificationEvidence[];
  asr: AsrVerificationEvidence[];
  collection_time_ms?: number | null;
}

export interface VerificationResult {
  status: VerificationDecision;
  confidence: number;
  original_query?: string;
  search_query?: string;
  claims: VerificationClaim[];
  modalities_used?: {
    visual?: boolean;
    ocr?: boolean;
    asr?: boolean;
  };
  ocr_evidence: OcrVerificationEvidence[];
  asr_evidence: AsrVerificationEvidence[];
  num_frames_sent: number;
  latency_ms?: number | null;
  peak_gpu1_memory_gb?: number | null;
  has_explanation: boolean;
  explanation?: string;
  evidence: VerificationEvidence[];
  segment?: {
    video_id: string;
    start_time?: number | null;
    end_time?: number | null;
    anchor_time?: number | null;
    video_url?: string | null;
  };
}

export interface VerificationJobResponse {
  job_id: string;
  status: VerificationJobStatus;
  stage?: string | null;
  search_id?: string | null;
  frame_ref?: string | null;
  original_query?: string | null;
  search_query?: string | null;
  localization_query?: string | null;
  max_frames?: number | null;
  include_ocr?: boolean | null;
  include_asr?: boolean | null;
  temporal_cache_hit?: boolean | null;
  localization_models?: string[] | null;
  submitted_at?: number | null;
  started_at?: number | null;
  evidence_ready_at?: number | null;
  vlm_started_at?: number | null;
  finished_at?: number | null;
  error?: string | null;
  evidence_context?: VerificationEvidenceContext | null;
  segment?: TemporalSegment;
  verification?: VerificationResult;
}

export interface VerificationSummary {
  status: VerificationDecision;
  confidence: number;
  jobId: string;
  numFramesSent: number;
  latencyMs?: number | null;
}


export interface VerificationStatusBatchResponse {
  status: "success";
  jobs: VerificationJobResponse[];
}
