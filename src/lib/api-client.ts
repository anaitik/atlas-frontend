import axios, { AxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  code?: string;
  details?: Array<{ field?: string; issue: string }>;

  constructor(message: string, code?: string, details?: Array<{ field?: string; issue: string }>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

// Extended config to allow body property
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  body?: any;
}

export const apiClient = async <T = any>(
  url: string,
  config?: ExtendedAxiosRequestConfig
): Promise<T> => {
  try {
    // Convert 'body' to 'data' for axios compatibility
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      url: `${API_BASE_URL}${url}`,
      headers: {
        "Content-Type": "application/json",
        ...config?.headers,
      },
    };

    // Handle body -> data conversion
    if (config?.body !== undefined) {
      axiosConfig.data = config.body;
    }

    const response = await axios(axiosConfig);

    // Handle API envelope structure
    if (response.data && typeof response.data === "object" && "success" in response.data) {
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new ApiError(
          response.data.error?.message || "API request failed",
          response.data.error?.code,
          response.data.error?.details
        );
      }
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiError(
        error.response?.data?.error?.message || error.message,
        error.response?.data?.error?.code,
        error.response?.data?.error?.details
      );
    }
    throw error;
  }
};