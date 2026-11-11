import {
  apiRequest,
  resolveBackendUrl,
} from "../../services/apiClient";

import type {
  TemporalEvidenceFrame,
  TemporalLocalizeRequest,
  TemporalLocalizeResponse,
  TemporalSegment,
  VerificationEvidence,
  VerificationJobResponse,
  VerificationResult,
  VerificationSubmitRequest,
  VerificationSubmitResponse,
  VerificationStatusBatchResponse,
} from "./verification.types";

function normalizeTemporalFrame(
  frame: TemporalEvidenceFrame,
): TemporalEvidenceFrame {
  return {
    ...frame,
    thumbnail_url: resolveBackendUrl(frame.thumbnail_url),
    image_url: resolveBackendUrl(frame.image_url),
  };
}

function normalizeSegment(
  segment: TemporalSegment,
): TemporalSegment {
  return {
    ...segment,
    video_url: resolveBackendUrl(segment.video_url) ?? null,
    frames: (segment.frames ?? []).map(normalizeTemporalFrame),
  };
}

function normalizeEvidence(
  evidence: VerificationEvidence,
): VerificationEvidence {
  return {
    ...evidence,
    thumbnail_url: resolveBackendUrl(evidence.thumbnail_url),
    image_url: resolveBackendUrl(evidence.image_url),
  };
}

function normalizeVerification(
  verification: VerificationResult,
): VerificationResult {
  return {
    ...verification,
    claims: verification.claims ?? [],
    ocr_evidence: verification.ocr_evidence ?? [],
    asr_evidence: verification.asr_evidence ?? [],
    evidence: (verification.evidence ?? []).map(normalizeEvidence),
    segment: verification.segment
      ? {
          ...verification.segment,
          video_url:
            resolveBackendUrl(
              verification.segment.video_url,
            ) ?? null,
        }
      : undefined,
  };
}

export async function localizeTemporalEvidence(
  request: TemporalLocalizeRequest,
): Promise<TemporalLocalizeResponse> {
  const response =
    await apiRequest<TemporalLocalizeResponse>(
      "/temporal/localize",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(request),
      },
    );

  return {
    ...response,
    segment: normalizeSegment(response.segment),
  };
}

export async function submitVerification(
  request: VerificationSubmitRequest,
): Promise<VerificationSubmitResponse> {
  return apiRequest<VerificationSubmitResponse>(
    "/verification/submit",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify(request),
    },
  );
}

export async function getVerificationJob(
  jobId: string,
  includeExplanation = false,
): Promise<VerificationJobResponse> {
  const response =
    await apiRequest<VerificationJobResponse>(
      `/verification/${encodeURIComponent(
        jobId,
      )}?include_explanation=${
        includeExplanation ? "true" : "false"
      }`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      },
    );

  return {
    ...response,
    segment: response.segment
      ? normalizeSegment(response.segment)
      : undefined,
    verification: response.verification
      ? normalizeVerification(response.verification)
      : undefined,
  };
}


export async function getVerificationJobs(
  jobIds: string[],
): Promise<VerificationJobResponse[]> {
  if (jobIds.length === 0) {
    return [];
  }

  const response =
    await apiRequest<VerificationStatusBatchResponse>(
      "/verification/status-batch",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          job_ids: jobIds,
          include_explanation: false,
        }),
      },
    );

  return response.jobs.map((job) => ({
    ...job,
    segment: job.segment
      ? normalizeSegment(job.segment)
      : undefined,
    verification: job.verification
      ? normalizeVerification(job.verification)
      : undefined,
  }));
}
