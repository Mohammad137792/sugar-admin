---
id: handbook-state-management
title: State Management Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# State Management Handbook

> "State is expensive. Only store information that must survive." — constitution.md, State Philosophy

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Three Kinds of State
5. Zustand in This Repo
6. TanStack Query in This Repo
7. The globalThis Token Bridge, In Depth
8. Good Examples
9. Bad Examples
10. Decision Trees
11. Real Project Examples
12. Common Mistakes
13. Best Practices
14. Checklist
15. FAQ
16. References

---

# 1. Purpose

Sugar Admin uses three different tools for three different kinds of state, and mixing them up is the single most common way a feature's data flow becomes hard to reason about. This handbook draws the line between them precisely, using the two real Zustand stores and the one `QueryClient` that already exist in this codebase, and gives a full explanation of the most unusual piece of state-adjacent code in the repo: the `globalThis` auth token bridge.

---

# 2. Scope

In scope: when to use Zustand, when to use TanStack Query, when to use local component state, the exact shape of `authStore.ts` and `uiStore.ts`, and the `globalThis.__authToken` / `__onUnauthorized` pattern.

Out of scope: repository method design (`repository-pattern.md`), where state files live inside a feature folder (`feature-structure.md`), and offline persistence of cached state (`offline-strategy.md`).

---

# 3. Principles

Grounded in:

- **State Philosophy** (constitution.md) — state is expensive; only store what must survive; derived values should be computed; avoid duplicated state; avoid global state when local state is sufficient.
- **State Management Rules** (context.md) — global state should be minimal; examples are authentication, theme, language, session; feature-specific state belongs inside each feature; never create global state for convenience.
- **State Shape Standard** (`10-feature-planner.md` § 11) — classify every piece of state as Global (Zustand), Local (component), or Server Cache (TanStack Query), with explicit justification; promoting to a new global store is the exception, not the default.

---

# 4. The Three Kinds of State

**Local (component) state** — `useState`/`useReducer`, scoped to one component tree, discarded on unmount. Default choice for anything not proven to need wider scope. Example: `Input.tsx`'s `hidden` boolean (password visibility toggle) — no other component will ever need to know whether one input's secure-text is currently revealed.

**Global (Zustand) state** — survives navigation, readable from anywhere, backed by one of exactly two stores today: `useAuthStore`, `useUIStore`. Reserved for state that is genuinely cross-cutting: authentication, UI-wide loading/toast state. A third global store is a significant, deliberate decision (`10-feature-planner.md` § 11), not a convenience default.

**Server cache (TanStack Query)** — state whose source of truth is a backend (or, today, a mock/direct-axios call standing in for one). Configured once in `App.tsx`:

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } },
});
```

This is currently configured and provided at the root, but **not yet used anywhere in the codebase** — no screen or hook calls `useQuery`/`useMutation` today. `DashboardScreen.tsx` uses a hardcoded `MOCK_STATS` array instead of a query. This is a real, current gap: the infrastructure for server-cache state exists, wired at the composition root, and is unused. See `repository-pattern.md` § 6 for what the first real `useQuery` call in this codebase should look like once a repository exists to back it.

---

# 5. Zustand in This Repo

Both stores are intentionally small. `uiStore.ts`, in full:

```ts
export const useUIStore = create<UIState>((set) => ({
  isLoading: false,
  toast:     null,
  setLoading: (isLoading) => set({ isLoading }),
  showToast: (message, type = "info") =>
    set({ toast: { id: Date.now().toString(), message, type } }),
  hideToast: () => set({ toast: null }),
}));
```

Three fields, three actions, no derived state, no side effects beyond `set()`. This is the model for what a Zustand store should look like: pure state and the minimal actions needed to change it.

`authStore.ts` is larger because it owns real business sequencing (login → set token → set user → clear loading, in that order, with error handling at each step) — see § 7 for why that sequencing lives here instead of a separate service, and the risk of that choice.

Neither store persists to disk. Closing the app resets `uiStore` (correct — toasts and loading flags should never survive a restart) and resets `authStore` (a real UX cost — every app restart requires re-login; see § 7 and `offline-strategy.md`).

---

# 6. TanStack Query in This Repo

The `QueryClient` defaults (`retry: 2`, `staleTime: 5 minutes`) are documented in depth in `performance.md` § 5 — the short version: `retry: 2` absorbs transient mobile-network blips without the user noticing, and `staleTime: 5min` means a screen the user returns to within five minutes doesn't show a loading spinner and refetch for data that almost certainly hasn't changed.

Once repositories exist (`repository-pattern.md`), the target usage pattern inside a feature's `hooks/` folder is:

```ts
// src/features/content/hooks/useContentList.ts (target, doesn't exist yet)
import { useQuery } from "@tanstack/react-query";
import { contentRepository } from "../repository";

export function useContentList(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ["content", "list", params],
    queryFn: () => contentRepository.list(params),
  });
}
```

The screen consumes `useContentList()`, never `contentRepository` or `useQuery` directly — this keeps the query-key convention and repository wiring in one place per data type, matching `feature-structure.md` § 6's worked example.

---

# 7. The globalThis Token Bridge, In Depth

This is the single most important piece of state-adjacent code to understand in this codebase. Full, real code, both sides:

```ts
// src/store/authStore.ts (excerpt)
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
```

```ts
// src/api/client.ts (excerpt)
client.interceptors.request.use((config) => {
  // Token injected at runtime from authStore
  const token = (globalThis as any).__authToken as string | undefined;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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
```

**Why this exists.** `client.ts` needs to read the current token on every outgoing request. `authStore.ts` already imports `authApi` from `src/api`. If `client.ts` also imported `useAuthStore` to read the token, the two files would import each other — `store → api → store` — a circular import. Metro (React Native's bundler) can sometimes tolerate circular imports depending on evaluation order, but the resulting behavior is fragile and load-order-dependent, exactly the kind of "hidden coupling" `00-chief-architect.md` § 5 Principle 5 warns against. Writing the token to `globalThis` instead of importing the store breaks the cycle: `client.ts` depends on nothing from `store/`, only on a loosely-typed runtime global.

**Why it's risky.** Three concrete costs:

1. `(globalThis as any).__authToken` is untyped. Nothing stops a typo (`__authtoken`, wrong case) from silently compiling and failing at runtime with no auth header ever attached, no error thrown.
2. `__onUnauthorized` is read by `client.ts` (`(globalThis as any).__onUnauthorized?.()`) but is **never assigned anywhere in the current codebase** — grep confirms no file writes to `globalThis.__onUnauthorized`. The optional-chaining call (`?.()`) means this silently no-ops today: a 401 response never actually triggers logout. This is a live, functional gap, not a hypothetical one — see `error-handling.md` § 5.
3. Nothing scopes the global to the app's lifecycle explicitly — it is a property on the JS global object for as long as the JS engine instance lives, which in practice matches the app session, but this is an implicit consequence of the platform, not a designed guarantee.

**Alternatives, and why they weren't chosen (yet).**

*A dedicated token-holder module* — `src/auth/tokenStore.ts`, exporting `getToken()`/`setToken()`/`onUnauthorized(cb)`, imported by both `client.ts` and `authStore.ts`, containing no business logic of its own. This breaks the same circular-import risk (neither `client.ts` nor `authStore.ts` import each other, both import a third, dependency-free module) while making the contract typed and explicit. This is the recommended fix — see the ADR in `architecture.md` § 14.7.

*A React Context bridge* — rejected for this specific problem, because `client.ts` is a plain module-scope object (`axios.create(...)`), not a component, and cannot call `useContext()`. A Context can't reach into a non-React module.

*Passing the token as an argument to every `client` call* — rejected as a much larger, more invasive change (every `authApi`/`contentApi`/`reportsApi` call site would need a token parameter), and it doesn't solve the equivalent problem for the response interceptor's `onUnauthorized` callback.

**When to fix it.** Before any feature with long-lived background operations (Publishing's scheduled posts, Chat Center's live inbox) is built — those features will make requests well after the screen that triggered login has unmounted, and an untyped, unverified global is the wrong foundation to build request authentication on at that scale.

---

# 8. Good Examples

**Good: `uiStore.ts`'s minimal shape** (§ 5) — no field exists that isn't read by at least one component, no action does more than `set()` one thing.

**Good: classifying `draftCaption` as local state**, from `10-feature-planner.md` § 18:

```
Kind: Local (component)
Justification: only exists while the user is composing a single post;
does not need to survive navigating away, and no other screen reads it.
```

---

# 9. Bad Examples

**Bad: promoting state to global "in case we need it later."**

```
Kind: Global (Zustand)
Justification: "in case we need it elsewhere later"
```

Rejected per `10-feature-planner.md` § 18 — this is speculative architecture, directly against constitution's Simplicity Wins.

**Bad: reading `client.data.data` inside a store action** — see `repository-pattern.md` § 6's before/after; the store action currently knows the axios response envelope shape, a Data-layer detail that should not leak into a Business-layer store.

---

# 10. Decision Trees

## Global, local, or server cache?

Reproduced from `10-feature-planner.md` § 16, the authoritative version:

```
Does the data need to be read by more than one feature module,
or must it survive across the whole app session (e.g. auth, theme,
language)?
  → Yes: candidate for a global Zustand store. Confirm no existing
    store already owns this concern.
  → No: does it need to persist across screens within one feature only?
      → Yes: feature-scoped Zustand store or Context, colocated in
        the feature folder.
      → No: local component state.
Is the data owned by a server and fetched over the network?
  → Yes, regardless of the above: it belongs in TanStack Query cache,
    not in Zustand.
```

## Does this state need a new global store, or does it belong in `authStore`/`uiStore`?

```
Is it about who the user is, or whether they're logged in?
  → authStore.
Is it about an app-wide UI concern with no domain meaning
(loading overlay, toast queue)?
  → uiStore.
Neither?
  → It almost certainly belongs to one feature — feature-scoped state,
    not a new top-level store. Escalate to chief-architect only if truly
    cross-feature and not server data.
```

---

# 11. Real Project Examples

- **`src/store/authStore.ts`** — global state done mostly right (small, justified, matches context.md's named example of "Authentication" as global state), with the `globalThis` bridge as its one significant open risk. See § 7.
- **`src/store/uiStore.ts`** — the cleanest example of correctly-scoped global state in the codebase.
- **`src/features/dashboard/screens/DashboardScreen.tsx`** — `MOCK_STATS` is currently component-local hardcoded data standing in for what should be TanStack Query server-cache state once `reportsApi`/`ReportsRepository` is wired to a `useQuery` hook.
- **`App.tsx`** — `QueryClient` instantiated and provided, unused by any current screen. The infrastructure is ahead of the features that should consume it.

---

# 12. Common Mistakes

- Creating a third global Zustand store for a feature-specific concern instead of a feature-scoped store or local state.
- Storing server data (anything a repository would fetch) in Zustand instead of TanStack Query — Zustand is for client state, not server state, per `10-feature-planner.md` § 16.
- Assuming `__onUnauthorized` works today. It does not — nothing assigns it. See § 7.
- Adding a new field to `authStore`/`uiStore` "because it's related to auth/UI" without checking whether it actually needs to be global.

---

# 13. Best Practices

- Default every new piece of state to local. Promote only when § 10's tree gives an explicit "yes."
- When building the first real `useQuery` call in this codebase, mirror § 6's `queryKey` convention (`[domain, operation, params]`) so it stays consistent across all nine future features.
- Treat the `globalThis` token bridge as documented debt (§ 7), not as a pattern to extend — do not add more `globalThis.__*` bridges for new cross-module state without the same circular-import justification, and prefer the typed-module alternative for anything new.
- Wire `__onUnauthorized` (or replace the whole bridge with the typed-module alternative) before shipping any feature that depends on session-expiry handling actually working.

---

# 14. Checklist

- [ ] New state classified as Global/Local/Server Cache with explicit justification (`10-feature-planner.md` § 11).
- [ ] No new global Zustand store created without confirming `authStore`/`uiStore` don't already cover the concern.
- [ ] No server-owned data stored in Zustand.
- [ ] Any code depending on `__onUnauthorized` actually firing is flagged as blocked until § 7's fix lands.
- [ ] `queryKey` for any new `useQuery` call follows the `[domain, operation, params]` shape.

---

# 15. FAQ

**Does `hydrate()` in `authStore.ts` restore a session after app restart?**

No — it checks `globalThis.__authToken`, which is reset to `undefined` on every fresh JS engine start. `hydrate()` only matters within a single running session (e.g. after a silent token refresh), not across restarts. See `offline-strategy.md` and `security.md` § 3 for the persistence trade-off this implies.

**Should `toast` in `uiStore` support multiple simultaneous toasts?**

Not today — it's a single nullable `Toast`, meaning a new toast overwrites an in-flight one. This is a reasonable simplicity trade-off for the current feature set; revisit if a feature needs stacked notifications.

**Can a component read `useAuthStore` directly instead of through a hook?**

Yes — `useAuthStore` is already the hook. There's no additional wrapping hook layer for global stores in this codebase, unlike repository-backed data, which should go through a feature hook (§ 6).

---

# 16. References

- [constitution.md](../constitution.md) — State Philosophy.
- [context.md](../context.md) — State Management Rules.
- [10-feature-planner.md](../agents/10-feature-planner.md) — § 11 State Shape Standard, § 16 decision tree.
- [architecture.md](./architecture.md) — § 14.7 ADR for the `globalThis` bridge decision.
- [repository-pattern.md](./repository-pattern.md) — § 6, the `data.data` leak this handbook's § 9 references.
- [security.md](./security.md) — § 3, the security implications of in-memory-only tokens.
- [error-handling.md](./error-handling.md) — § 5, the dead `__onUnauthorized` wiring.
- [offline-strategy.md](./offline-strategy.md) — persistence gap for both auth and query cache.
