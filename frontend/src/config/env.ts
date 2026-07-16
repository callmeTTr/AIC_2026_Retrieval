const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    "Missing VITE_API_BASE_URL. Create frontend/.env from .env.example.",
  );
}

export const env = {
  apiBaseUrl,
} as const;