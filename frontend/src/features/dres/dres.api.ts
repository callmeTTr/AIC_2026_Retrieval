import { env } from "../../config/env";

export interface DresLoginResponse {
  status: string;
  username: string | null;
  role: string | null;
  access_token: string;
}

export interface DresCurrentTask {
  name?: string;
  [key: string]: unknown;
}

export interface DresSubmitRequest {
  media_item_name: string;
  timestamp_seconds: number;
  media_item_collection_name?: string;
  segment_duration_seconds?: number;
}

export interface DresSubmitResponse {
  status: string;
  dres_http_status: number;
  task: string;
  submitted: {
    media_item_name: string;
    start_ms: number;
    end_ms: number;
  };
  dres_response: {
    status?: boolean;
    submission?: string;
    description?: string;
    [key: string]: unknown;
  };
}

interface DresErrorResponse {
  detail?: string;
}

function buildDresUrl(path: string): string {
  const baseUrl =
    env.dresBridgeUrl.replace(/\/+$/, "");

  const relativePath =
    path.replace(/^\/+/, "");

  return `${baseUrl}/${relativePath}`;
}

async function dresRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    buildDresUrl(path),
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
      `DRES request failed with status ${response.status}`;

    try {
      const body =
        (await response.json()) as DresErrorResponse;

      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Response may not be JSON.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function loginToDres(
  username: string,
  password: string,
): Promise<DresLoginResponse> {
  return dresRequest<DresLoginResponse>(
    "/login",
    {
      method: "POST",
      body: JSON.stringify({
        username,
        password,
      }),
    },
  );
}

export function getCurrentDresTask(
  evaluationId: string,
  bridgeToken: string,
): Promise<DresCurrentTask> {
  return dresRequest<DresCurrentTask>(
    `/current-task/${encodeURIComponent(
      evaluationId,
    )}`,
    {
      method: "GET",
      headers: {
        "X-Bridge-Token": bridgeToken,
      },
    },
  );
}

export function submitToDres(
  evaluationId: string,
  bridgeToken: string,
  request: DresSubmitRequest,
): Promise<DresSubmitResponse> {
  return dresRequest<DresSubmitResponse>(
    `/submit/${encodeURIComponent(
      evaluationId,
    )}`,
    {
      method: "POST",
      headers: {
        "X-Bridge-Token": bridgeToken,
      },
      body: JSON.stringify(request),
    },
  );
}