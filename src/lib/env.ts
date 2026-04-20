export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  API_V1: import.meta.env.VITE_API_V1_PREFIX || "/api/v1",
};