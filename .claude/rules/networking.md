---
id: rule-networking
title: Networking Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_repositories
  - all_api_endpoints
last_updated: 2026-07-18
---

# Networking Rules

> Networking should assume every response may fail. — `../context.md`, Security Goals

---

# Table of Contents

1. Purpose
2. Scope
3. Rules
4. Good Examples
5. Bad Examples
6. Checklist
7. References

---

# 1. Purpose

`src/api/client.ts` is a single axios instance (`axios@1.18.0`) with one request interceptor (attaches a bearer token) and one response interceptor (detects `401`). This file states the existing conventions precisely, including the parts that are incompletely wired, and defines the rules new networking code follows.

---

# 2. Scope

Applies to `src/api/client.ts`, `src/api/endpoints/*.ts`, and any future repository implementation that performs a network call.

---

# 3. Rules

## Rule 1 — All HTTP calls go through the single `client` instance in `src/api/client.ts`; no ad-hoc `axios.get(...)` or `fetch(...)` calls

```ts
// src/api/client.ts — existing, correct
const client = axios.create({
  baseURL: ENV.API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
```

**Why:** the interceptors (auth header injection, 401 handling) only run for requests made through this instance. A raw `axios.get()` or `fetch()` call bypasses both — it silently ships unauthenticated, and a 401 from it never triggers the logout flow. Every `endpoints/*.ts` file already imports `client` for this reason; keep doing so, and route any new repository's real implementation through it too.

## Rule 2 — The default timeout is 15000ms; a shorter timeout is chosen deliberately per-call, not globally reduced

`client`'s `timeout: 15000` (15 seconds) is the default for every request today.

**Why 15s, and why not lower it without reason:** mobile networks are unreliable (per the constitution's Mobile First — "network interruptions" is explicitly listed as a condition every feature must consider), and 15 seconds gives a slow-but-working connection a real chance to complete before failing. A specific call that should fail faster (e.g. a typeahead search where a stale, slow response is worse than a quick failure) can override `timeout` per-request via axios's per-request config — but the global default stays 15000ms unless `chief-architect` changes it deliberately, since lowering it globally would make every feature more failure-prone on marginal connections, not just the one call that needed a faster timeout.

## Rule 3 — The request interceptor's token source is `globalThis.__authToken`; this is documented, narrow, and not extended to carry other cross-cutting state

```ts
client.interceptors.request.use((config) => {
  // Token injected at runtime from authStore
  const token = (globalThis as any).__authToken as string | undefined;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**Why this exists and its limits:** see `imports.md` Rule 6 for the full circular-import rationale. The rule here is narrower — this `globalThis` bridge carries exactly one value (the auth token) for exactly one reason (breaking a specific import cycle). It is not a general-purpose channel; a new cross-cutting concern (a request ID, a feature flag, a locale header) is passed through axios's own per-request `headers`/`params` config or a properly-typed context, not bolted onto `globalThis` because "it's already there."

## Rule 4 — A `401` response triggers `globalThis.__onUnauthorized?.()`; verify this callback is actually assigned before relying on it

```ts
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      (globalThis as any).__onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);
```

**Why this must be flagged, not assumed working:** a full search of `src/` finds no assignment of `globalThis.__onUnauthorized` anywhere — not in `authStore.ts`, not in `App.tsx`, not in any provider. The optional-call syntax (`?.()`) means this currently no-ops silently on every 401; nothing actually triggers logout when a session expires. Any feature that depends on "expired sessions redirect to login" does not work as built today. This is the single highest-priority networking gap in the codebase — wiring `globalThis.__onUnauthorized = () => useAuthStore.getState().logout()` (e.g. in `App.tsx`'s root component, on mount) is a prerequisite for any auth-gated feature work, not an incidental fix bundled elsewhere.

## Rule 5 — Every network call site handles at minimum three outcomes: success, a typed/expected failure, and an unexpected failure

```ts
try {
  const { data } = await authApi.login(credentials);
  // success
} catch (e) {
  if (axios.isAxiosError(e) && e.response?.status === 401) {
    // expected: bad credentials
  } else {
    // unexpected: network failure, 5xx, malformed response
  }
}
```

**Why:** per the constitution's Error Philosophy, every feature defines Loading / Empty / Error / Success / Retry / Offline / Timeout / Unauthorized states before implementation. A `catch` block that only does `set({ error: "Login failed" })` for every possible failure (as `authStore.login()` does today) conflates all of these into one generic message, which is a reasonable minimum for a first pass but not the target — new repository implementations distinguish at least "expected domain error" (wrong password, validation failure) from "unexpected/transport error" (timeout, no connectivity, 500) so the UI can offer the right recovery action (retry vs. re-enter credentials).

## Rule 6 — Retries are explicit and bounded; no request retries indefinitely or silently

TanStack Query's `QueryClient` in `App.tsx` is configured with `retry: 2, staleTime: 1000 * 60 * 5` (5 minutes) — this is the project default for query retries and cache freshness.

**Why 2, not more:** each retry compounds the 15-second timeout (Rule 2) — a worst case of three attempts at 15s each is 45 seconds before a query definitively fails, which is already a long time for a mobile user to wait. Increasing the retry count without also reconsidering the timeout makes worst-case failure feel even slower. Mutations (writes — `useMutation`) default to **no** automatic retry unless explicitly configured per-mutation, because retrying a non-idempotent write (e.g. "create product") risks a duplicate side effect — this must be evaluated per mutation, per `../agents/10-feature-planner.md` § 10's "whether the method is safe to retry."

## Rule 7 — `ENV.API_BASE_URL`'s fallback value is a real risk; treat a missing `EXPO_PUBLIC_API_URL` as a build-time failure to catch, not a silent default to rely on

```ts
// src/config/env.ts — current
API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.sugar-admin.com/v1",
```

**Why this is a networking rule and not just a config rule:** every request the app makes goes to whatever `ENV.API_BASE_URL` resolves to. If `EXPO_PUBLIC_API_URL` is unset in a given build (a misconfigured CI job, a missing `.env` file, an EAS Build profile without the variable set), the app silently sends every request to `https://api.sugar-admin.com/v1` — a domain that may not be provisioned, may point somewhere unintended, or may simply 404 every request with no clear signal to the developer about *why*. New code should not add a second fallback URL elsewhere reproducing this pattern; see `expo.md` Rule 5 for the target fix (fail loudly on a missing required variable).

## Rule 8 — API response shapes are typed against `src/types/index.ts`'s `ApiResponse<T>` / `PaginatedResponse<T>` envelopes; a new endpoint does not invent a third envelope shape

```ts
export interface ApiResponse<T>       { data: T; message: string; success: boolean; }
export interface PaginatedResponse<T> { data: T[]; total: number; page: number; limit: number; hasMore: boolean; }
```

**Why:** `authApi`, `contentApi`, `reportsApi` all consistently wrap single-resource responses in `ApiResponse<T>` and list responses in `PaginatedResponse<T>`. A third response shape for a new endpoint (e.g. a raw unwrapped array, or a differently-named pagination field like `hasNext` instead of `hasMore`) forces every consumer to special-case that one endpoint. If a real backend's actual response shape differs from these envelopes, the mismatch is handled by a mapping function inside the repository implementation (see `repositories.md`) — the app-internal type stays consistent regardless of what a specific backend returns.

---

# 4. Good Examples

## Good: distinguishing expected vs. unexpected failure

```ts
async function login(credentials: LoginCredentials) {
  try {
    const { data } = await authApi.login(credentials);
    return { status: "success" as const, ...data.data };
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      return { status: "invalid-credentials" as const };
    }
    return { status: "unexpected-error" as const, message: e instanceof Error ? e.message : "Unknown error" };
  }
}
```

This is good because the caller can render a specific "wrong password" message vs. a generic "something went wrong, retry" state — matching the constitution's Error Philosophy states.

---

# 5. Bad Examples

## Bad: assuming `__onUnauthorized` is wired up

```ts
// A feature built assuming expired sessions auto-redirect to Login.
// Nothing in the codebase currently assigns globalThis.__onUnauthorized — this silently does nothing.
```

**Consequence:** a user whose token expires mid-session sees every subsequent request fail with a generic error (or the raw 401 surfaces as an "unexpected error," per Rule 5) instead of being redirected to log in again. This is a real, currently-unaddressed gap — verify the callback is wired (Rule 4) before building a feature that depends on it.

## Bad: a new endpoint inventing its own pagination shape

```ts
// New endpoint, ignoring PaginatedResponse<T>
client.get<{ items: Product[]; nextCursor: string | null }>("/products");
```

**Consequence:** every hook consuming this endpoint needs bespoke pagination-handling logic that the rest of the app's `PaginatedResponse<T>`-based list screens don't need, and a shared "infinite list" hook (if one is built later) can't be reused across this endpoint and the existing ones without an adapter.

---

# 6. Checklist

- [ ] All HTTP calls go through `src/api/client.ts`'s `client` instance.
- [ ] No global timeout reduction was made without `chief-architect` sign-off; per-call overrides are used instead for calls that need a faster failure.
- [ ] No new cross-cutting concern was added to the `globalThis.__authToken`/`__onUnauthorized` bridge.
- [ ] If this PR depends on 401-triggers-logout behavior, `globalThis.__onUnauthorized` was verified to be assigned somewhere reachable, not assumed.
- [ ] Network call sites distinguish at least one expected-failure case from the generic unexpected-failure case.
- [ ] Mutations do not enable automatic retry without confirming the operation is idempotent.
- [ ] No second, undocumented fallback base URL was introduced elsewhere in the codebase.
- [ ] New endpoint responses conform to `ApiResponse<T>` / `PaginatedResponse<T>`, or a mapping function normalizes them at the repository boundary.

---

# 7. References

- `../constitution.md` — Security Philosophy, Error Philosophy, Mobile First
- `../context.md` — Security Goals
- `imports.md` § Rule 6 — the `globalThis` bridge's circular-import rationale
- `repositories.md` — where real backend calls will eventually live, wrapping `client`
- `security.md` — token handling and the in-memory-only session risk
- `expo.md` § Rule 5 — the `EXPO_PUBLIC_API_URL` fallback risk and its target fix
