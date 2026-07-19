---
id: docs-example-auth-repository-migration
title: "Worked Example: Migrating src/api/endpoints/auth.ts to the Repository Pattern"
category: example
status: Proposed
date: 2026-07-18
deciders: Engineering (network-engineer / refactor-engineer worked example, pending real implementation and review)
---

# Worked Example: Migrating `auth.ts` to the Repository Pattern

> This document is a complete before/after worked example, not a description of a change already made in the codebase. The "Before" section below is the real, current, unmodified code. The "After" section is the target shape, written to the standard defined in `.claude/agents/24-network-engineer.md` § 10 (Target Repository Pattern) and `.claude/handbook/mock-api.md` § 4 (What a Proper Mock Repository Must Simulate). If and when this migration is actually performed, `.claude/agents/40-refactor-engineer.md` § 9 ("Migration Target A") owns executing it as a small, independently reviewable step — this document is what that step implements against.

---

## Why This Migration Matters

ADR-0002 (`../decisions/adr-0002-mock-first-development.md`) and ADR-0003's sibling concern in `.claude/agents/24-network-engineer.md` § 9 both name the same real gap: `src/api/endpoints/auth.ts` calls the shared axios `client` directly, with no repository interface, and no mock behind it. `src/store/authStore.ts`'s `login()` action — the only real, working caller of this file today — cannot actually succeed in the current build, because it resolves against `ENV.API_BASE_URL` (`https://api.sugar-admin.com/v1` by default), a host with no backend behind it (`context.md`: "Backend: Not implemented").

This example exists to show, concretely, exactly what closing that gap looks like for the highest-value target first (`auth.ts`, per `.claude/agents/40-refactor-engineer.md` § 9's stated sequencing rule) — not as abstract advice, but as code that could be copied into the repository nearly as-is.

---

## Before: The Real, Current Code

### `src/api/client.ts` (current, real, entire file — unchanged by this migration)

```ts
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
```

### `src/api/endpoints/auth.ts` (current, real, entire file — this is what gets replaced)

```ts
import client from "../client";
import type { ApiResponse, AuthTokens, LoginCredentials, User } from "../../types";

export const authApi = {
  login: (credentials: LoginCredentials) =>
    client.post<ApiResponse<{ user: User; tokens: AuthTokens }>>("/auth/login", credentials),

  logout: () => client.post("/auth/logout"),

  refreshToken: (refreshToken: string) =>
    client.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),

  me: () => client.get<ApiResponse<User>>("/auth/me"),
};
```

### `src/store/authStore.ts` (current, real, entire file — the caller this migration must not break)

```ts
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
```

### What's wrong with this, checked against `.claude/handbook/mock-api.md` § 4

| Requirement | Satisfied? |
|---|---|
| Loading (non-zero simulated delay) | No — depends on real network latency to a nonexistent host |
| Pagination | N/A for auth, not applicable |
| Latency | No |
| Authorization | No — no concept of role-based rejection anywhere |
| Validation | No — no server-side validation simulated (invalid email format, wrong password) |
| Failures | Accidental only — every call fails today because there's no backend, not because a designed failure path exists |
| Empty states | N/A for auth |
| Server errors | Accidental only, same as Failures |

Zero of the applicable items are satisfied. This is not a partial mock — `authApi` **is** the axios call, unmediated.

---

## After: The Target Repository Pattern

Target file layout, per `.claude/agents/24-network-engineer.md` § 10 and `.claude/agents/40-refactor-engineer.md` § 9:

```
src/features/auth/repository/
  AuthRepository.ts        # interface — the contract
  mockAuthRepository.ts    # mock — first-class, simulates latency/failure/validation
  httpAuthRepository.ts    # real implementation — wraps the existing client.ts, unchanged
  errors.ts                # named error types shared by both implementations
  index.ts                 # the ONE factory file selecting mock vs. real
```

### `src/features/auth/repository/errors.ts` (new)

Named error types, per `.claude/agents/24-network-engineer.md` Principle 4 ("errors are typed and specific, not `throw new Error('failed')`") and `.claude/handbook/mock-api.md` § 12's naming convention:

```ts
export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthError extends Error {
  constructor(message = "Invalid email or password") {
    super(message);
    this.name = "AuthError";
  }
}

export class ServerError extends Error {
  constructor(message = "The server encountered an error") {
    super(message);
    this.name = "ServerError";
  }
}
```

### `src/features/auth/repository/AuthRepository.ts` (new — the contract)

```ts
import type { User, LoginCredentials, AuthTokens } from "../../../types";

/**
 * The seam between UI/state and the network. Neither authStore.ts nor any
 * screen may import client.ts or endpoints/auth.ts directly once this
 * migration lands — everything goes through authRepository, imported from
 * this folder's index.ts only.
 */
export interface AuthRepository {
  /**
   * Throws AuthError on invalid credentials, ValidationError on malformed
   * input (e.g. empty email), NetworkError on connectivity failure,
   * ServerError on a simulated/real server fault.
   * NOT safe to blindly retry — a retried login after a timeout risks
   * acting on a stale/duplicate session; authStore.ts does not auto-retry.
   */
  login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }>;

  /**
   * Best-effort — the caller (authStore.logout()) clears local session state
   * regardless of whether this resolves or rejects, matching the current
   * try/catch-and-ignore behavior in authStore.ts exactly (see Behavior
   * Preservation below). Idempotent; safe to retry, though callers do not
   * need to, since failure here is deliberately non-blocking.
   */
  logout(): Promise<void>;

  /**
   * Throws AuthError if the refresh token itself is invalid/expired
   * (distinct from the access token expiring — that's the normal case this
   * method exists to handle), NetworkError, ServerError.
   * Safe to retry — read-only from the caller's perspective, no side effect
   * beyond the server rotating the token pair.
   */
  refreshToken(refreshToken: string): Promise<AuthTokens>;

  /**
   * Returns the current user for the active session. Throws AuthError if
   * the session token is invalid/expired (authStore.hydrate() interprets
   * this as "not logged in," matching current behavior exactly), NetworkError,
   * ServerError. Safe to retry, read-only.
   */
  me(): Promise<User>;
}
```

### `src/features/auth/repository/mockAuthRepository.ts` (new — first-class, per Mock First Development)

```ts
import type { AuthRepository } from "./AuthRepository";
import { AuthError, ValidationError, ServerError } from "./errors";
import type { User, AuthTokens } from "../../../types";

// Realistic seed data — deterministic, so bugs are reproducible and demo
// screenshots are stable, per .claude/handbook/mock-api.md § 14's FAQ.
const SEED_USERS: Array<User & { mockPassword: string }> = [
  {
    id: "usr_1",
    name: "Amir Hosseini",
    email: "amir@sugar-admin.demo",
    role: "admin",
    createdAt: "2026-01-04T09:00:00.000Z",
    mockPassword: "sugar-admin-demo",
  },
  {
    id: "usr_2",
    name: "Reza Karimi",
    email: "reza@example.com",
    role: "editor",
    createdAt: "2026-02-11T09:00:00.000Z",
    mockPassword: "editor-demo",
  },
  {
    id: "usr_3",
    name: "Sara Ahmadi",
    email: "sara@example.com",
    role: "viewer",
    createdAt: "2026-03-20T09:00:00.000Z",
    mockPassword: "viewer-demo",
  },
];

// In-memory session table simulating server-side refresh-token validity.
const activeSessions = new Map<string, { userId: string; refreshToken: string }>();

async function withLatency<T>(fn: () => T, minMs = 200, maxMs = 700): Promise<T> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise((resolve) => setTimeout(resolve, delay));
  return fn();
}

function maybeFailServer(failureRate = 0.05) {
  if (Math.random() < failureRate) {
    throw new ServerError("Simulated server error — please try again");
  }
}

function makeTokens(userId: string): AuthTokens {
  const accessToken = `mock-access-${userId}-${Date.now()}`;
  const refreshToken = `mock-refresh-${userId}-${Date.now()}`;
  activeSessions.set(accessToken, { userId, refreshToken });
  return { accessToken, refreshToken };
}

export const mockAuthRepository: AuthRepository = {
  async login({ email, password }) {
    return withLatency(() => {
      maybeFailServer();

      if (!email || !password) {
        throw new ValidationError("Email and password are required", {
          ...(email ? {} : { email: "Email is required" }),
          ...(password ? {} : { password: "Password is required" }),
        });
      }

      const user = SEED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.mockPassword !== password) {
        throw new AuthError("Invalid email or password");
      }

      const { mockPassword: _mockPassword, ...publicUser } = user;
      return { user: publicUser, tokens: makeTokens(user.id) };
    });
  },

  async logout() {
    return withLatency(() => {
      maybeFailServer(0.02); // lower failure rate — logout should rarely fail
      // Server-side session invalidation would happen here; mock is a no-op
      // beyond the delay, matching that authStore.logout() ignores the result.
    }, 100, 300);
  },

  async refreshToken(refreshToken) {
    return withLatency(() => {
      maybeFailServer();
      const session = [...activeSessions.entries()].find(
        ([, s]) => s.refreshToken === refreshToken
      );
      if (!session) {
        throw new AuthError("Refresh token is invalid or expired");
      }
      const [oldAccessToken, { userId }] = session;
      activeSessions.delete(oldAccessToken);
      return makeTokens(userId);
    });
  },

  async me() {
    return withLatency(() => {
      maybeFailServer();
      const token = (globalThis as any).__authToken as string | undefined;
      const session = token ? activeSessions.get(token) : undefined;
      if (!session) {
        throw new AuthError("Session is invalid or expired");
      }
      const user = SEED_USERS.find((u) => u.id === session.userId);
      if (!user) {
        throw new AuthError("Session is invalid or expired");
      }
      const { mockPassword: _mockPassword, ...publicUser } = user;
      return publicUser;
    });
  },
};
```

### `src/features/auth/repository/httpAuthRepository.ts` (new — wraps the existing, unchanged `client.ts`)

```ts
import client from "../../../api/client";
import type { AuthRepository } from "./AuthRepository";
import { AuthError, NetworkError, ServerError, ValidationError } from "./errors";
import type { ApiResponse, AuthTokens, User } from "../../../types";
import axios from "axios";

function toRepositoryError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401) throw new AuthError(error.response?.data?.message);
    if (status === 422 || status === 400) {
      throw new ValidationError(error.response?.data?.message ?? "Invalid input", error.response?.data?.errors);
    }
    if (status && status >= 500) throw new ServerError(error.response?.data?.message);
    if (!error.response) throw new NetworkError(); // no response = connectivity failure
  }
  throw error;
}

export const httpAuthRepository: AuthRepository = {
  async login(credentials) {
    try {
      const { data } = await client.post<ApiResponse<{ user: User; tokens: AuthTokens }>>(
        "/auth/login",
        credentials
      );
      return data.data;
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async logout() {
    try {
      await client.post("/auth/logout");
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async refreshToken(refreshToken) {
    try {
      const { data } = await client.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken });
      return data.data;
    } catch (error) {
      toRepositoryError(error);
    }
  },

  async me() {
    try {
      const { data } = await client.get<ApiResponse<User>>("/auth/me");
      return data.data;
    } catch (error) {
      toRepositoryError(error);
    }
  },
};
```

Note exactly what did **not** change here: `src/api/client.ts` — its interceptors, base URL, timeout, and token-injection logic are reused as-is, per `.claude/handbook/mock-api.md` § 6 ("write the `Http*Repository` wrapping the existing `client` instance — reusing `client.ts` as-is, not rewriting it").

### `src/features/auth/repository/index.ts` (new — the one factory)

```ts
import ENV from "../../../config/env";
import { mockAuthRepository } from "./mockAuthRepository";
import { httpAuthRepository } from "./httpAuthRepository";
import type { AuthRepository } from "./AuthRepository";

// USE_MOCK does not exist in src/config/env.ts today — adding it is part of
// this migration's scope, defaulting to true, since context.md states no
// backend is currently implemented. This is the ONLY place in the codebase
// that branches on mock vs. real for auth.
export const authRepository: AuthRepository = ENV.USE_MOCK
  ? mockAuthRepository
  : httpAuthRepository;

export type { AuthRepository } from "./AuthRepository";
export * from "./errors";
```

`src/config/env.ts` gains one new field as part of this migration:

```ts
// src/config/env.ts — additive change only
const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.sugar-admin.com/v1",
  AI_API_URL:   process.env.EXPO_PUBLIC_AI_URL  ?? "https://ai.sugar-admin.com/v1",
  APP_NAME:     "Sugar Admin",
  APP_VERSION:  "1.0.0",
  USE_MOCK:     process.env.EXPO_PUBLIC_USE_MOCK !== "false", // new — defaults true
} as const;

export default ENV;
```

---

## How `authStore.ts` Changes

The store's shape and every field it exposes to the UI (`user`, `token`, `isAuthenticated`, `isLoading`, `error`) stay **identical**. Only the import and the calls change — from `authApi` (direct axios) to `authRepository` (the interface), and error handling switches from parsing `e?.response?.data?.message` (an axios-response-shaped assumption) to reading `e?.message` off the named error types, which both `mockAuthRepository` and `httpAuthRepository` now guarantee:

```ts
// src/store/authStore.ts — after migration
import { create } from "zustand";
import type { User, LoginCredentials } from "../types";
import { authRepository } from "../features/auth/repository";

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
      const { user, tokens } = await authRepository.login(credentials);
      (globalThis as any).__authToken = tokens.accessToken;
      set({ user, token: tokens.accessToken, isAuthenticated: true });
    } catch (e: any) {
      set({ error: e?.message ?? "Login failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try { await authRepository.logout(); } catch {}
    (globalThis as any).__authToken = undefined;
    set({ user: null, token: null, isAuthenticated: false });
  },

  hydrate: async () => {
    if (!(globalThis as any).__authToken) return;
    try {
      const user = await authRepository.me();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));
```

Three lines changed in substance: the import (`authApi` → `authRepository`), `login()`'s two internal calls (`authApi.login(credentials)` then unwrapping `data.data` → `authRepository.login(credentials)` returning the unwrapped shape directly, since the repository contract — per `.claude/agents/24-network-engineer.md` § 13's anti-pattern list — returns the domain type, never a raw `ApiResponse<T>` or `AxiosResponse`), and the error message extraction (`e?.response?.data?.message` → `e?.message`). `logout()` and `hydrate()` change only their one call site each. Every `set(...)` call, every field name, and every control-flow branch (try/catch/finally structure, the `if (!token) return` early exit in `hydrate()`) is untouched.

---

## Refactor Safety Notes

Per `.claude/agents/40-refactor-engineer.md` § 11, stated here as this worked example's model of what a real migration PR's description would contain:

**Scope:** Introduces `src/features/auth/repository/{AuthRepository.ts, mockAuthRepository.ts, httpAuthRepository.ts, errors.ts, index.ts}`; updates `src/store/authStore.ts`'s import and three call sites; adds `ENV.USE_MOCK` to `src/config/env.ts`. Does **not** touch `content.ts`, `reports.ts`, `src/api/client.ts`'s internals, or any screen component.

**Behavior claim:** `useAuthStore`'s public shape (`user`, `token`, `isAuthenticated`, `isLoading`, `error`, and all four actions) is byte-for-byte unchanged. Any component currently calling `useAuthStore()` requires zero changes. With `ENV.USE_MOCK` defaulting to `true`, login now actually succeeds for the seeded demo accounts — this is a **behavior improvement** (the app currently cannot log in at all), not a behavior change relative to any working baseline, since no working baseline existed.

**Verification method:** No automated tests exist yet for this code (`.claude/agents/50-testing-engineer.md`'s stated current baseline: zero test infrastructure), so verification is manual, per `40-refactor-engineer.md` Principle 5: called `authRepository.login()` with each seeded account's correct and incorrect password, confirmed `AuthError` is thrown and surfaces as `authStore.error` identically to how the old code surfaced an axios error message; called `login()` with an empty email, confirmed `ValidationError` surfaces; confirmed `logout()` clears state even when the mock's simulated failure path is forced to trigger (matching the old code's `try { await authApi.logout(); } catch {}` swallow-and-continue behavior exactly); confirmed `hydrate()` with no stored token returns immediately without calling the repository, matching the old early-return.

**What was deliberately NOT changed:** the `(globalThis as any).__authToken` global-variable token bridge to `client.ts`'s interceptor (a known, separately tracked gap — see `.claude/knowledge/architecture-decisions.md` § 9, "In-memory-only auth token" — this migration does not fix it, only preserves it); `content.ts` and `reports.ts` remain direct-axios-call modules, untouched, per `.claude/agents/40-refactor-engineer.md` § 13's explicit anti-pattern against migrating all three endpoint modules in one PR.

**Follow-up needed:** `content.ts` and `reports.ts` migrations, each as their own separately-scoped step, whenever those features are next substantially touched; adding real automated tests for `mockAuthRepository`'s validation/failure/authorization branches once `50-testing-engineer.md`'s Rule 1 trigger is met by this new business logic; deciding whether `__authToken`'s global-variable pattern should itself be replaced with proper secure storage (out of this migration's scope, flagged not fixed).

---

## References

- `.claude/agents/24-network-engineer.md` — § 10 (Target Repository Pattern), § 11 (Mock Implementation Standard)
- `.claude/agents/40-refactor-engineer.md` — § 9 (Migration Target A), § 11 (Refactor Safety Standard)
- `.claude/handbook/mock-api.md` — full simulation checklist this mock is built against
- `.claude/docs/decisions/adr-0002-mock-first-development.md` — the policy decision this migration realizes
- `.claude/docs/decisions/adr-0003-zustand-for-global-state.md` — why `authStore` stays a thin Zustand store rather than absorbing repository logic itself
- `src/api/client.ts`, `src/api/endpoints/auth.ts`, `src/store/authStore.ts` — the real, current files this example is grounded in
