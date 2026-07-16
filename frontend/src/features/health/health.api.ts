import { apiRequest } from "../../services/apiClient";

export interface HealthResponse {
  status: string;
  service: string;
}

export function getHealthStatus(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health");
}