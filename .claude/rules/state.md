---
id: rule-state
title: State Management Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_stores
  - all_hooks
  - all_screens
last_updated: 2026-07-18
---

# State Management Rules

> State is expensive. Only store information that must survive. — `../constitution.md`, State Philosophy

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

Sugar Admin uses three, and only three, places for state: Zustand (`zustand@5.0.14`) for minimal global client state, TanStack Query (`@tanstack/react-query@5.101.0`) for server data, and local `useState`/`useReducer` for ephemeral UI state. This file defines the boundary between them, grounded in the two stores that exist today: `src/store/authStore.ts` and `src/store/uiStore.ts`.

---

# 2. Scope

Applies to every new store, hook, and screen that holds state of any kind.

---

# 3. Rules

## Rule 1 — Global state exists for exactly four things: authentication, theme, language, session. Nothing else, without justification.

Per `../context.md`'s State Management Rules: "Global state examples: Authentication, Theme, Language, Session... Never create global state for convenience." Today's stores map to this directly — `authStore` (auth/session), `uiStore` (a thin global loading flag + toast queue, arguably UI-chrome-adjacent global state). `ThemeContext` and `LanguageContext` cover theme and language via React Context rather than Zustand — both are legitimate global-state mechanisms; the codebase simply uses Context for these two because they're read by nearly every component and rarely written.

**Why:** the constitution's State Philosophy is explicit — "avoid global state when local state is sufficient." A third, new Zustand store is the exception, and it needs a stated justification (mirroring `../agents/10-feature-planner.md` § 11's "Justification" field), not a default reached for out of convenience.

## Rule 2 — A new Zustand store must answer: does this survive navigation, and is it read by more than one feature?

If the answer to both is "no," it's local `useState` inside the screen or a feature-scoped store colocated in that feature's `state/` folder (see `folders.md` Rule 3) — not a new top-level entry in `src/store/`.

**Why:** `authStore` and `uiStore` are both read from multiple, unrelated parts of the app (auth gates navigation everywhere; toasts can be triggered from any screen) and both must survive navigating between screens. That's the actual bar for "global." A store that only one feature's screens ever read fails this test and belongs feature-scoped instead.

## Rule 3 — Server data (anything from `src/api/` / a repository) is TanStack Query cache, never copied into Zustand

```ts
// Correct: server data stays in React Query's cache
const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchStats });

// Wrong: mirroring server data into a Zustand store
useDashboardStore.setState({ stats: response.data });
```

**Why:** `../agents/10-feature-planner.md`'s decision tree is explicit — "Is the data owned by a server and fetched over the network? → Yes, regardless of the above: it belongs in TanStack Query cache, not in Zustand." Copying server data into Zustand creates two sources of truth that can silently diverge (the Query cache refetches and updates; the Zustand copy doesn't, unless someone remembers to re-sync it manually) — exactly the "synchronization problems" the constitution's State Philosophy warns against.

**Current gap to note:** `authStore.login()` stores `user` and `token` directly in Zustand state after an API call, rather than through TanStack Query. This is accepted for auth specifically — the user/session object is genuinely global, long-lived, and mutated by explicit actions (`login`, `logout`) rather than refetched on a cache-invalidation basis, which is a legitimate reason to keep it in Zustand instead of Query. It is not a precedent for storing other server data (products, content, reports) the same way — those belong in Query.

## Rule 4 — Ephemeral UI state (form input values, a toggle, "is this accordion expanded") is local `useState`, always

```tsx
// src/components/ui/Input.tsx — existing, correct pattern
const [hidden, setHidden] = useState(secure);
```

**Why:** `Input.tsx`'s password-visibility toggle is a textbook example of state that (a) is irrelevant to any other component, (b) does not need to survive navigation, and (c) would be pure overhead to route through a global store. Promoting state like this to Zustand "in case it's needed elsewhere" is explicitly rejected — see `../agents/10-feature-planner.md` § 18's Bad Example, which rejects exactly this justification for a `draftCaption` field.

## Rule 5 — A Zustand store's actions own their own async lifecycle; components never manage a store's loading/error state independently

`authStore.login()` sets `isLoading: true` before the request, and `isLoading: false` in a `finally` block after — the loading state lives entirely inside the store's action, not duplicated as a separate `useState` in `LoginScreen.tsx`.

**Why:** if a component also tracked its own `isSubmitting` state alongside the store's `isLoading`, the two could desync (e.g. the component's local flag resets on unmount/remount while the store's doesn't), producing a UI that shows a stale spinner or misses one. One flag, owned by the code that performs the async operation, is the only safe source of truth.

## Rule 6 — Prefer a discriminated union over independent boolean/nullable fields for a store's async state (see `typescript.md` Rule 5), when a store is next changed

`authStore`'s current shape (`isLoading: boolean`, `error: string | null`, `isAuthenticated: boolean`, all independent) permits representing impossible combinations. New stores use a discriminated union for their primary async operation's state instead:

```ts
type AuthStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "authenticated"; user: User; token: string }
  | { kind: "error"; message: string };
```

**Why:** repeated from `typescript.md` because it applies specifically and concretely to Zustand store shape — this is the exact class of file (`authStore.ts`) that rule was written about.

## Rule 7 — Derived values are computed, never stored

`ThemeContext`'s `isDark: mode === "dark"` and `LanguageContext`'s `isRTL: lang === "fa"` are both correctly derived at render time from the single source of truth (`mode`, `lang`), not stored as independent state fields that could drift from it.

**Why:** per the constitution's State Philosophy — "derived values should be computed... avoid duplicated state." If `isDark` were its own `useState`, calling `toggleTheme()` would need to update *two* fields in lockstep (`mode` and `isDark`) instead of one, and a bug that updates only one of them produces an internally inconsistent theme state that's hard to reproduce and debug.

## Rule 8 — `useAuthStore`'s token is not currently persisted; do not build a feature that assumes the session survives an app restart

`authStore.login()` sets the token only in memory (component state + `globalThis.__authToken`). There is no `expo-secure-store`, `MMKV`, or any persistence layer in `package.json`. `hydrate()` checks `globalThis.__authToken`, which is itself reset to `undefined` on every cold start — meaning `hydrate()` is effectively dead code today; it can never find a token to hydrate from after an app restart.

**Why this belongs in `state.md` and not just `security.md`:** any feature that assumes "the user stays logged in between app launches" will not work as built today. See `security.md` for the full token-persistence discussion; this rule exists here to prevent a feature plan from silently assuming persisted session state exists.

---

# 4. Good Examples

## Good: `uiStore.ts` as a minimal, justified global store

```ts
// src/store/uiStore.ts — existing, correct
interface UIState {
  isLoading: boolean;
  toast: Toast | null;
  setLoading: (loading: boolean) => void;
  showToast:  (message: string, type?: ToastType) => void;
  hideToast:  () => void;
}
```

This is good because it is small, its two fields are genuinely read/written from anywhere in the app, and it holds no server data.

## Good: server data via TanStack Query, none of it duplicated into Zustand

```ts
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => mockDashboardRepository.getStats(),
    staleTime: 1000 * 60, // matches App.tsx's QueryClient defaults pattern (5 min staleTime, 2 retries)
  });
}
```

---

# 5. Bad Examples

## Bad: promoting local state to global "in case it's needed elsewhere"

```ts
// Rejected pattern — mirrors ../agents/10-feature-planner.md § 18's Bad Example
interface ContentStore {
  draftCaption: string;
  setDraftCaption: (text: string) => void;
}
export const useContentStore = create<ContentStore>(/* ... */);
```

**Consequence:** if `draftCaption` is only ever read and written by one compose screen, this store adds a permanent global dependency, a permanent import surface, and a permanent "why does this exist" question for every future reader — for a value that `useState` inside the screen would have handled with zero downside. If a second screen genuinely needs it later, promote it then, with the actual justification in hand.

## Bad: mirroring server data into Zustand

```ts
const { data } = useQuery({ queryKey: ["products"], queryFn: fetchProducts });
useEffect(() => {
  useProductsStore.setState({ products: data });
}, [data]);
```

**Consequence:** two sources of truth for the same data. When `fetchProducts` refetches in the background (React Query's default behavior on window/app focus), the Zustand copy is now stale until the `useEffect` fires again — a race condition that produces intermittent, hard-to-reproduce bugs where a screen reading from the store shows outdated data while a screen reading from `useQuery` directly shows fresh data.

---

# 6. Checklist

- [ ] Any new Zustand store answers "survives navigation?" and "read by more than one feature?" with yes to both — otherwise it's local or feature-scoped state instead.
- [ ] No server-fetched data is copied into a Zustand store; it stays in TanStack Query's cache.
- [ ] Ephemeral UI state (toggles, form fields, expand/collapse) is local `useState`, not promoted to a store.
- [ ] A store's async action owns its own loading/error state; no component duplicates it separately.
- [ ] New store async state prefers a discriminated union over independent boolean/nullable fields.
- [ ] No derived value is stored as its own state field; it's computed from the source of truth at render/read time.
- [ ] No feature assumes the auth session persists across an app restart (see Rule 8 and `security.md`).

---

# 7. References

- `../constitution.md` — State Philosophy, Feature Ownership
- `../context.md` — State Management Rules
- `typescript.md` — discriminated unions for async state
- `repositories.md` — where server data comes from before it reaches TanStack Query
- `security.md` — token persistence gap in `authStore.ts`
- `../agents/10-feature-planner.md` § 11 — State Shape Standard and its decision tree
