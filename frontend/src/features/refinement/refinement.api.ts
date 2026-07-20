import { apiRequest } from "../../services/apiClient";

import type {
  RefinementRequest,
  RefinementResponse,
} from "./refinement.types";

export function refineSearchResults(
  request: RefinementRequest,
): Promise<RefinementResponse> {
  return apiRequest<RefinementResponse>(
    "/refinements",
    {
      method: "POST",
      body: JSON.stringify(request),
    },
  );
}