import { apiRequest } from "../../services/apiClient";

import type {
  SearchRequest,
  SearchResponse,
} from "./search.types";

export function searchVideos(
  request: SearchRequest,
): Promise<SearchResponse> {
  return apiRequest<SearchResponse>("/search", {
    method: "POST",
    body: JSON.stringify(request),
  });
}