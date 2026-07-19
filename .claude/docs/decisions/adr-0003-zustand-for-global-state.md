---
id: adr-0003-zustand-for-global-state
title: Zustand for Global State Over Redux, MobX, or Plain Context
category: decision
status: Accepted
date: 2026-07-18
deciders: Engineering
---

# ADR-0003: Zustand for Global State Over Redux, MobX, or Plain Context

## Status

Accepted. Implemented and in active use.

## Context

`context.md`'s Technology Stack section names Zustand for state management. `context.md`'s State Management Rules add: "Global state should be minimal. Global state examples: Authentication, Theme, Language, Session. Feature-specific state belongs inside each feature. Never create global state for convenience." `constitution.md`'s State Philosophy is equally direct: "State is expensive. Only store information that must survive. Derived values should be computed. Avoid duplicated state. Avoid synchronization problems. Avoid global state when local state is sufficient."

Any React Native application needs a small amount of genuinely cross-cutting state — in Sugar Admin's case, the authenticated user/session and app-wide UI concerns like loading and toast notifications. The realistic choices for that state were Redux (with or without Redux Toolkit), MobX, plain React Context plus `useReducer`, or Zustand.

**Current, verified codebase state:** exactly two global stores exist, matching `context.md`'s own examples almost exactly:

```ts
// src/store/authStore.ts — current, real, entire store shape
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
export const useAuthStore = create<AuthState>((set) => ({ /* ... */ }));
```

```ts
// src/store/uiStore.ts — current, real, entire store shape
interface UIState {
  isLoading: boolean;
  toast: Toast | null;
  setLoading: (loading: boolean) => void;
  showToast:  (message: string, type?: ToastType) => void;
  hideToast:  () => void;
}
export const useUIStore = create<UIState>((set) => ({ /* ... */ }));
```

`package.json` lists `zustand` (5.0.14) and has no Redux, Redux Toolkit, or MobX dependency anywhere. `useAuthStore` and `useUIStore` are the entire global-state surface of the app today — no other Zustand store exists, and no feature-local Zustand store exists either (consistent with ADR-0001's observation that the five feature folders have no `state/` subfolder yet).

## Decision

Sugar Admin uses Zustand as its sole global state management library. `authStore` (session/auth) and `uiStore` (app-wide loading + toast) are the two stores in force today, matching `context.md`'s own named examples of legitimate global state (Authentication, Theme is handled separately via `ThemeContext`, Language via `LanguageContext`, Session is part of `authStore`). Redux, Redux Toolkit, and MobX are explicitly not used and not to be introduced without a new ADR superseding this one.

## Consequences

**Positive:**
- Minimal boilerplate directly serves `constitution.md`'s Core Values ordering (Simplicity ranks above Scalability and Performance): `create<AuthState>((set) => ({ ... }))` defines an entire store — state shape and actions together — in one file, with no action-type constants, no reducer switch statement, and no dispatch indirection to trace through, unlike Redux.
- No provider wrapping is required at the component tree root — `useAuthStore()` and `useUIStore()` are called directly from any component, unlike plain Context (which requires a `<Provider>` ancestor and forces every consuming subtree to re-render on any context value change unless carefully split). `App.tsx`'s actual provider tree (`QueryClientProvider` → `ThemeProvider` → `LanguageProvider`) shows exactly this cost already being paid for the two providers Sugar Admin *does* need (theme, language) — not adding a third and fourth for auth and UI state is a real, measured simplification.
- Selective subscription is built in: a component can read `useAuthStore((s) => s.user)` and re-render only when `user` changes, without the manual `useMemo`/`useSelector` ceremony Redux typically requires to achieve the same, and without needing `React.memo` scaffolding to work around Context's whole-value re-render behavior.
- Aligns directly with `constitution.md`'s State Philosophy ("state is expensive; only store what must survive") — Zustand's flat, un-normalized store shape makes it easy to see at a glance everything that survives navigation (`authStore`'s five fields, `uiStore`'s two), rather than a Redux-style normalized state tree that invites storing more than necessary because the infrastructure to do so is already there.
- TypeScript inference is direct — `create<AuthState>(...)` gives every consumer full type safety on both state and actions with no separate action-creator or selector-type boilerplate to keep in sync, supporting `21-typescript-engineer.md`'s strong-typing mandate with less code than Redux Toolkit's slice + thunk types would require for the same store.

**Negative / accepted debt:**
- Zustand has no built-in middleware ecosystem as mature as Redux's (time-travel debugging, the Redux DevTools extension, well-established persistence middleware) — if Sugar Admin later needs sophisticated state-change auditing or replay debugging, Zustand's simpler primitives would need to be supplemented (Zustand does have a devtools middleware and a persist middleware, but they are thinner than Redux's equivalents). No follow-up plan exists because no requirement has surfaced yet; this is accepted as a low-probability future cost, not a currently active gap.
- `authStore.ts`'s access token is currently held via `(globalThis as any).__authToken` (a global variable, read by `src/api/client.ts`'s request interceptor) rather than as MMKV/SecureStore-backed persisted state inside the store itself — the token does not survive an app restart. This is not a consequence of choosing Zustand (any of the alternatives would have the same gap unless deliberately built with persistence), so it is called out here as a related but distinct, already-tracked gap (`.claude/knowledge/architecture-decisions.md` § 9, "In-memory-only auth token") rather than reopened as part of this ADR.
- Because Zustand makes adding a new global store almost frictionless (no reducer, no provider, no action types to wire up), the barrier to inappropriately promoting local state to global state for convenience is lower than it would be with Redux's higher setup cost acting as a natural deterrent. `10-feature-planner.md` § 11 and § 16 compensate for this directly: promoting to a new global store requires explicit justification and is treated as "the exception, not the default."

## Alternatives Considered

- **Redux Toolkit** — rejected. Even with Redux Toolkit's reduced boilerplate relative to classic Redux, it still requires slices, a configured store, typed hooks (`useAppSelector`/`useAppDispatch`), and a `<Provider>` wrapping the app — meaningfully more ceremony than Zustand for the two small, simple stores Sugar Admin's State Management Rules actually call for. `constitution.md`'s Simplicity Wins ("avoid unnecessary abstraction... avoid unnecessary dependencies") argues directly against adopting Redux's heavier infrastructure for a minimal global-state footprint.
- **MobX** — rejected. MobX's observable/reactive model is powerful but introduces implicit reactivity (`constitution.md`'s Explicit Beats Implicit principle: "avoid hidden side effects... avoid magical utilities") — a component re-rendering because an observable it never explicitly subscribed to changed is exactly the kind of surprising behavior the Constitution asks engineers to avoid. Zustand's explicit selector functions (`useAuthStore((s) => s.user)`) make the re-render dependency visible in the calling code.
- **Plain React Context + `useReducer`, no library** — rejected as the default for this use case, specifically because of the re-render cost noted above (Positive, bullet 2) and because a Context-based reducer store re-implements, by hand, a subset of what Zustand already provides (selector-based subscriptions, no forced provider wrapping) — `constitution.md`'s Simplicity Wins favors the smaller, already-solved dependency over hand-rolling the same capability. Context remains the right tool for `ThemeContext` and `LanguageContext` specifically, because those genuinely need provider-scoped values with infrequent updates and simple boolean/enum shapes — this ADR does not argue Context should never be used, only that it is not the right tool for `authStore`'s and `uiStore`'s update-frequency and selector needs.
- **TanStack Query for auth/session state** — rejected as the wrong layer. Session/auth state is client state (who is currently logged in on this device), not server-owned cache data — `10-feature-planner.md` § 16's decision tree is explicit that "Zustand is for client state, not server state." TanStack Query is already the project's chosen tool for actual server-owned data (`context.md`'s Data Fetching choice), and using it for `authStore`'s concerns would blur that boundary.

## Sign-off

Engineering (retroactive documentation of a decision already implemented and in force via `src/store/authStore.ts` and `src/store/uiStore.ts`, and already named in `context.md`'s Technology Stack).

## Related Decisions

- **ADR-0001 (Feature-First Architecture)** — establishes the boundary this ADR relies on: `authStore` and `uiStore` are correctly global (outside `src/features/`) precisely because their concerns — session and app-wide UI feedback — are not owned by any single feature, whereas a future feature-scoped Zustand store (e.g. a `productsUiStore`, if one is ever justified) would live inside that feature's own `state/` subfolder instead, per `10-feature-planner.md` § 11's default-to-local guidance.
- **ADR-0002 (Mock-First Development)** — `authStore.ts`'s `login()`/`logout()`/`hydrate()` actions are the concrete call sites that ADR-0002's migration (worked through in full in `.claude/docs/examples/auth-repository-migration-example.md`) updates; this ADR's finding that `authStore`'s shape barely needs to change during that migration (three call sites, not a rewrite) is itself evidence that Zustand's flat, simple store shape decouples cleanly from how the data underneath it is fetched — a store built on a heavier framework with more ceremony between state and data-fetching (e.g. Redux Toolkit's `createAsyncThunk` lifecycle actions) would have made that same migration touch more surface area.
- No other global Zustand store exists today. Any proposal to add a third one should be checked first against `10-feature-planner.md` § 16's decision tree ("does the data need to be read by more than one feature module, or must it survive across the whole app session?") before being accepted — this ADR's Accepted status covers Zustand as the *library* choice, not a blanket license to add global stores freely.

## References

- `.claude/constitution.md` — State Philosophy
- `.claude/context.md` — Technology Stack, State Management Rules
- `.claude/agents/10-feature-planner.md` — § 11 (State Shape Standard), § 16 (Global store or local state? decision tree)
- `src/store/authStore.ts`, `src/store/uiStore.ts` — the real, current implementation this ADR documents
- `.claude/knowledge/architecture-decisions.md` — § 9 (Additional Observed Decisions Not Yet Written as ADRs — "Zustand over Redux for global state")
