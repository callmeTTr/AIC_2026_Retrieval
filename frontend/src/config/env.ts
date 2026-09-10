const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL;

const dresBridgeUrl =
  import.meta.env.VITE_DRES_BRIDGE_URL;

if (!apiBaseUrl) {
  throw new Error(
    "Missing VITE_API_BASE_URL. Create frontend/.env from .env.example.",
  );
}

if (!dresBridgeUrl) {
  throw new Error(
    "Missing VITE_DRES_BRIDGE_URL. Add it to frontend/.env.",
  );
}

export const env = {
  apiBaseUrl,
  dresBridgeUrl,
} as const;