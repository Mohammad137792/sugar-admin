import axios from "axios";
import ENV from "../config/env";

const client = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach token on every request
client.interceptors.request.use((config) => {
  // Token injected at runtime from authStore
  const token = (globalThis as any).__authToken as string | undefined;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      // Trigger logout via event; avoids circular import with store
      (globalThis as any).__onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export default client;
