/**
 * Typed environment variables.
 */
export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? "",
  API_V1: import.meta.env.VITE_API_V1_PREFIX ?? "/api/v1",
  APP_NAME: import.meta.env.VITE_APP_NAME ?? "SustainabilityAI",
  DEMO_MODE: import.meta.env.VITE_DEMO_MODE === "true",
} as const;
