import { env } from "../config/env";

export class ApiError extends Error {
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const body = (await response.json()) as {
        detail?: string;
        error?: {
          message?: string;
        };
      };

      message = body.error?.message ?? body.detail ?? message;
    } catch {
      // Response không nhất thiết luôn là JSON.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}