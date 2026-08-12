import { env } from "../config/env";

export class ApiError extends Error {
  public readonly status: number;

  public constructor(
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Chuẩn hóa URL do backend trả về.
 *
 * Backend có thể trả:
 * - URL tuyệt đối:
 *   https://example.ngrok-free.dev/images/...
 *
 * - URL tương đối:
 *   /images/...
 *   /api/v1/videos/L21_V002/stream
 */
export function resolveBackendUrl(
  value: string | null | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    const apiBaseUrl = new URL(
      env.apiBaseUrl,
    );

    return new URL(
      value,
      apiBaseUrl.origin,
    ).toString();
  }
}
function resolveApiRequestUrl(
  pathOrUrl: string,
): string {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const baseUrl =
      env.apiBaseUrl.replace(/\/+$/, "");

    const relativePath =
      pathOrUrl.replace(/^\/+/, "");

    return `${baseUrl}/${relativePath}`;
  }
}
export async function apiRequest<T>(
  pathOrUrl: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    resolveApiRequestUrl(pathOrUrl),
    {
      ...options,

      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
  );

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}`;

    try {
      const body =
        (await response.json()) as {
          detail?: string;
          error?: {
            message?: string;
          };
        };

      message =
        body.error?.message ??
        body.detail ??
        message;
    } catch {
      // Response không nhất thiết luôn là JSON.
    }

    throw new ApiError(
      message,
      response.status,
    );
  }

  return (await response.json()) as T;
}