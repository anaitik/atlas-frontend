/**
 * Core API Client using native fetch.
 * Automatically injects the stored JWT.
 */
import { useAuthStore } from "../store/auth";
import { env } from "./env";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function ensureLeadingSlash(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

function buildBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return trimTrailingSlash(import.meta.env.VITE_API_URL);
  }

  const apiBaseUrl = trimTrailingSlash(env.API_BASE_URL);
  const apiV1 = ensureLeadingSlash(env.API_V1);
  return apiBaseUrl ? `${apiBaseUrl}${apiV1}` : apiV1;
}

const BASE_URL = buildBaseUrl();

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    super(data?.error?.message || "An API Error occurred");
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${endpoint}`;
  console.log(`[apiClient] ${options.method || "GET"} ${url}`);
  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError(0, {
      error: {
        message: `Could not reach the API at ${url}. Start the backend or configure VITE_API_URL/VITE_API_BASE_URL.`,
      },
    });
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: { message: response.statusText } };
    }
    
    if (response.status === 401) {
      useAuthStore.getState().logout();
    }
    
    throw new ApiError(response.status, errorData);
  }

  const json = await response.json();
  if (json && typeof json === "object" && "data" in json) {
    if ("pagination" in json) {
      return json as T;
    }
    return json.data as T;
  }
  return json as T;
}
