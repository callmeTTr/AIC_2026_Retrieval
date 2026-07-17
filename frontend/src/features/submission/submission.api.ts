import { apiRequest } from "../../services/apiClient";

import type {
  SubmissionRequest,
  SubmissionResponse,
} from "./submission.types";

export function submitResult(
  request: SubmissionRequest,
): Promise<SubmissionResponse> {
  return apiRequest<SubmissionResponse>(
    "/submissions",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}