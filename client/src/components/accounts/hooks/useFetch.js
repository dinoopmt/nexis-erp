import { useRef, useCallback } from "react";
import { API_URL } from "../../../config/config";

/**
 * Custom hook for managing fetch requests with automatic cancellation
 * Prevents memory leaks by canceling pending requests when dependencies change
 */
export function useFetch() {
  const controllerRef = useRef(null);

  const fetchData = useCallback(async (endpoint, options = {}) => {
    // Cancel any pending request
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // Create new controller for this request
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${API_URL}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        signal: controller.signal
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }

      // Validate response status
      if (!response.ok) {
        const errorMsg = data.message || `HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      return {
        success: true,
        data,
        status: response.status
      };
    } catch (error) {
      // Silently ignore aborted requests (these are expected from deduplication)
      if (error.name === "AbortError") {
        return {
          success: false,
          data: null,
          error: "Request cancelled",
          isAborted: true
        };
      }

      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }, []);

  // Cleanup function to abort pending requests
  const abort = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }, []);

  return { fetchData, abort };
}

/**
 * Custom hook for GET requests
 */
export function useFetchGet() {
  const { fetchData, abort } = useFetch();

  const get = useCallback(
    async (endpoint) => {
      return fetchData(endpoint, {
        method: "GET"
      });
    },
    [fetchData]
  );

  return { get, abort };
}

/**
 * Custom hook for POST/PUT/DELETE requests
 */
export function useFetchMutation() {
  const { fetchData, abort } = useFetch();

  const mutate = useCallback(
    async (endpoint, data, method = "POST") => {
      return fetchData(endpoint, {
        method,
        body: JSON.stringify(data)
      });
    },
    [fetchData]
  );

  return { mutate, abort };
}
