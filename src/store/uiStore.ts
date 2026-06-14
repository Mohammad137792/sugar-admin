import { create } from "zustand";
import type { Toast, ToastType } from "../types";

interface UIState {
  isLoading: boolean;
  toast: Toast | null;

  setLoading: (loading: boolean) => void;
  showToast:  (message: string, type?: ToastType) => void;
  hideToast:  () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  toast:     null,

  setLoading: (isLoading) => set({ isLoading }),

  showToast: (message, type = "info") =>
    set({ toast: { id: Date.now().toString(), message, type } }),

  hideToast: () => set({ toast: null }),
}));
