import { create } from "zustand";
import type { User, LoginCredentials } from "../types";
import { authApi } from "../api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login:  (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:            null,
  token:           null,
  isAuthenticated: false,
  isLoading:       false,
  error:           null,

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.login(credentials);
      const { user, tokens } = data.data;
      (globalThis as any).__authToken = tokens.accessToken;
      set({ user, token: tokens.accessToken, isAuthenticated: true });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? "Login failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try { await authApi.logout(); } catch {}
    (globalThis as any).__authToken = undefined;
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: async () => {
    if (!(globalThis as any).__authToken) return;
    try {
      const { data } = await authApi.me();
      set({ user: data.data, isAuthenticated: true });
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
