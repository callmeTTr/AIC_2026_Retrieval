import { env } from "../../config/env";

export interface DresLoginResponse {
  status: string;
  username: string | null;
  role: string | null;
  access_token: string;
}
export interface DresLogoutResponse {
  status: string;
  session_removed: boolean;
}
export interface DresEvaluation {
  id: string;
  name?: string;
  type?: string;
  status?: string;
  [key: string]: unknown;
}

export interface DresEvaluationListResponse {
  status: string;
  evaluations: DresEvaluation[];
  active_evaluations: DresEvaluation[];
}
export interface DresCurrentTask {
  name: string;
  taskGroup: string;
  taskType: string;
  duration: number | null;
}

export type DresSubmissionMode =
  | "KIS"
  | "QA"
  | "TRAKE"
  | "UNKNOWN";

export type DresSubmissionModeSetting =
  | "AUTO"
  | "KIS"
  | "QA"
  | "TRAKE";

export function getDresSubmissionMode(
  task: DresCurrentTask | null | undefined,
): DresSubmissionMode {
  if (!task) {
    return "UNKNOWN";
  }

  const taskType =
    task.taskType.trim();

  if (
    taskType ===
    "Textual Known Item Search"
  ) {
    return "KIS";
  }

  if (
    taskType ===
    "LSC Question & Answer Text"
  ) {
    return "QA";
  }

  const taskDescriptor = [
    task.name,
    task.taskGroup,
    task.taskType,
  ]
    .join(" ")
    .toUpperCase();

  if (
    taskDescriptor.includes(
      "TRAKE",
    )
  ) {
    return "TRAKE";
  }

  return "UNKNOWN";
}

export function resolveDresSubmissionMode(
  task: DresCurrentTask | null | undefined,
  setting: DresSubmissionModeSetting,
): DresSubmissionMode {
  if (setting !== "AUTO") {
    return setting;
  }

  return getDresSubmissionMode(task);
}
export interface DresStartTaskResponse {
  status: string;
  dres_http_status: number;
  dres_response: {
    status?: boolean;
    description?: string;
    [key: string]: unknown;
  };
}
export interface DresTrakeSubmitRequest {
  media_item_name: string;
  frame_ids: number[];
}

export interface DresTrakeSubmitResponse {
  status: string;
  dres_http_status: number;
  task: string;
  submitted: {
    media_item_name: string;
    frame_ids: number[];
    text: string;
  };
  dres_response: {
    status?: boolean;
    submission?: string;
    description?: string;
    [key: string]: unknown;
  };
}
export interface DresQaSubmitRequest {
  answer: string;
  media_item_name: string;
  timestamp_ms: number;
}

export interface DresQaSubmitResponse {
  status: string;
  dres_http_status: number;
  task: string;
  submitted: {
    answer: string;
    media_item_name: string;
    timestamp_ms: number;
    text: string;
  };
  dres_response: {
    status?: boolean;
    submission?: string;
    description?: string;
    [key: string]: unknown;
  };
}
export interface DresSubmitRequest {
  media_item_name: string;

  // Official competition submission unit.
  timestamp_ms?: number;

  // Temporary legacy compatibility while older
  // submission flows are being migrated.
  timestamp_seconds?: number;

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
  detail?: unknown;
}

function getDresErrorMessage(
  status: number,
  detail: string,
): string {
  if (status === 401) {
    return (
      "DRES session expired or is no longer valid. " +
      "Reconnect to DRES before submitting."
    );
  }

  if (status === 403) {
    return (
      "DRES rejected access for this session. " +
      "Reconnect to DRES and verify the active evaluation."
    );
  }

  if (status === 404) {
    return (
      detail ||
      (
        "The active DRES evaluation or task was not found. " +
        "Reconnect or refresh the active evaluation."
      )
    );
  }

  if (status === 409) {
    return (
      detail ||
      "Duplicate submission blocked."
    );
  }

  if (status === 504) {
    return (
      detail ||
      (
        "DRES submission timed out. Delivery status is unknown, " +
        "so do not retry the identical answer automatically."
      )
    );
  }

  if (status === 502) {
    return (
      detail ||
      (
        "DRES is currently unreachable through the Bridge. " +
        "Check the Bridge connection and try again."
      )
    );
  }

  if (detail) {
    return detail;
  }

  return `DRES request failed with status ${status}.`;
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
  let response: Response;

  try {
    response = await fetch(
      buildDresUrl(path),
      {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      },
    );
  } catch {
    throw new Error(
      (
        "Unable to reach the DRES Bridge. " +
        "Check the Bridge/Tailscale connection and try again."
      ),
    );
  }

  if (!response.ok) {
    let detail = "";

    try {
      const rawBody =
        await response.text();

      if (rawBody) {
        try {
          const body =
            JSON.parse(
              rawBody,
            ) as DresErrorResponse;

          if (
            typeof body.detail ===
            "string"
          ) {
            detail =
              body.detail.trim();
          } else if (
            body.detail !==
              undefined &&
            body.detail !== null
          ) {
            detail =
              JSON.stringify(
                body.detail,
              );
          } else {
            detail =
              rawBody.trim();
          }
        } catch {
          detail =
            rawBody.trim();
        }
      }
    } catch {
      // Keep the fallback message below.
    }

    throw new Error(
      getDresErrorMessage(
        response.status,
        detail,
      ),
    );
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
export function logoutFromDres(
  bridgeToken: string,
): Promise<DresLogoutResponse> {
  return dresRequest<DresLogoutResponse>(
    "/logout",
    {
      method: "POST",
      headers: {
        "X-Bridge-Token": bridgeToken,
      },
    },
  );
}
export function getDresEvaluations(
  bridgeToken: string,
): Promise<DresEvaluationListResponse> {
  return dresRequest<DresEvaluationListResponse>(
    "/evaluations",
    {
      method: "GET",
      headers: {
        "X-Bridge-Token": bridgeToken,
      },
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
export function startDresTask(
  evaluationId: string,
  bridgeToken: string,
): Promise<DresStartTaskResponse> {
  return dresRequest<DresStartTaskResponse>(
    `/start-task/${encodeURIComponent(
      evaluationId,
    )}`,
    {
      method: "POST",
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
export function submitQaToDres(
  evaluationId: string,
  bridgeToken: string,
  request: DresQaSubmitRequest,
): Promise<DresQaSubmitResponse> {
  return dresRequest<DresQaSubmitResponse>(
    `/submit-qa/${encodeURIComponent(
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
export function submitTrakeToDres(
  evaluationId: string,
  bridgeToken: string,
  request: DresTrakeSubmitRequest,
): Promise<DresTrakeSubmitResponse> {
  return dresRequest<DresTrakeSubmitResponse>(
    `/submit-trake/${encodeURIComponent(
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