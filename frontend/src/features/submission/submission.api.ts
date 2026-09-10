import {
  submitToDres,
} from "../dres/dres.api";

import {
  getDresBridgeToken,
  getDresRunId,
} from "../dres/dres.session";

import type {
  SubmissionRequest,
  SubmissionResponse,
} from "./submission.types";

export async function submitResult(
  request: SubmissionRequest,
): Promise<SubmissionResponse> {
  const evaluationId =
    getDresRunId().trim();

  const bridgeToken =
    getDresBridgeToken().trim();

  if (!evaluationId) {
    throw new Error(
      "DRES Run ID is missing. Open DRES and configure a run.",
    );
  }

  if (!bridgeToken) {
    throw new Error(
      "DRES is not connected. Open DRES and connect first.",
    );
  }

  const response = await submitToDres(
    evaluationId,
    bridgeToken,
    {
      media_item_name: request.video_id,
      timestamp_seconds:
        request.timestamp_seconds,
    },
  );

  const accepted =
    response.status === "ok" &&
    response.dres_http_status >= 200 &&
    response.dres_http_status < 300 &&
    response.dres_response.status === true;

  const dresResult =
    response.dres_response.submission ??
    "UNKNOWN";

  const message =
    response.dres_response.description ??
    (accepted
      ? "Submission sent to DRES."
      : "DRES rejected the submission.");

  return {
    status: accepted
      ? "accepted"
      : "rejected",
    task: request.task,
    search_id: request.search_id,
    video_id: request.video_id,
    frame_index: request.frame_index,
    timestamp_seconds:
      request.timestamp_seconds,
    dres_result: dresResult,
    message,
  };
}