import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query client with 30s staleTime as per arch spec.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
