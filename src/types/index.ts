// ── User ──────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  avatarUrl?: string;
  createdAt: string;
}

// ── Auth ──────────────────────────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ── API ───────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ── Content ───────────────────────────────────────────────────────────
export interface ContentItem {
  id: string;
  title: string;
  titleFa?: string;
  body: string;
  status: "draft" | "published" | "archived";
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Stats ─────────────────────────────────────────────────────────────
export interface Stat {
  label: string;
  labelFa?: string;
  value: string | number;
  change?: number;
  trend: "up" | "down" | "neutral";
}

// ── AI ────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ── UI ────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
