---
id: knowledge-future-backend-migration
title: Future Backend Migration Strategy
category: knowledge
version: 1.0.0
status: active
owner: Product & Engineering
last_updated: 2026-07-18
---

# Future Backend Migration Strategy

> Deepening `context.md`'s Backend Strategy: concretely, what changes and what doesn't when moving from Mock → REST → possibly GraphQL/NestJS/Supabase/Firebase.

---

## Table of Contents

1. Purpose
2. Scope
3. The Current State (Ground Truth)
4. The Integration Seam: `client.ts` and `env.ts`
5. What Changes When the Backend Changes
6. What Must Never Change
7. Migration Path: Mock → REST
8. Migration Path: REST → GraphQL
9. Migration Path: REST → Supabase / Firebase (BaaS)
10. The Repository Pattern as the Safety Mechanism
11. A Concrete Worked Example: Swapping Auth's Backend
12. Risks and Anti-Patterns
13. Summary Table
14. Checklist: Before Starting a Backend Migration
15. References

---

# 1. Purpose

`context.md`'s Backend Strategy section states: "No backend has been selected... the application must assume that backend technology may change... No frontend implementation may depend on one backend framework." This is a principle, not a mechanism. This document makes it concrete: exactly which files are the integration seam today, exactly what changes when a migration happens, and exactly what must stay untouched for the migration to be considered successful.

---

# 2. Scope

In scope: the mechanics of backend migration for Sugar Admin specifically, grounded in the real files that currently exist (`src/api/client.ts`, `src/config/env.ts`, `src/api/endpoints/*.ts`) and the target Repository Pattern that does not yet exist (see `current-limitations.md`, `architecture-decisions.md` ADR-0003). Out of scope: choosing a specific backend technology (that remains an open, unmade decision per `context.md`) and non-technical vendor/cost considerations.

---

# 3. The Current State (Ground Truth)

Today, exactly two files form the entire "backend configuration" of the app:

- `src/config/env.ts` — defines `ENV.API_BASE_URL` (default `"https://api.sugar-admin.com/v1"`, overridable via `process.env.EXPO_PUBLIC_API_URL`) and `ENV.AI_API_URL` (default `"https://ai.sugar-admin.com/v1"`, overridable via `process.env.EXPO_PUBLIC_AI_URL`).
- `src/api/client.ts` — a single axios instance configured with `baseURL: ENV.API_BASE_URL`, a 15-second timeout, a request interceptor that attaches a Bearer token read from `globalThis.__authToken`, and a response interceptor that triggers a global `__onUnauthorized` callback on HTTP 401.

Every endpoint file (`src/api/endpoints/auth.ts`, `content.ts`, `reports.ts`) imports this single `client` and calls REST-shaped methods on it directly (`client.post("/auth/login", ...)`, `client.get("/auth/me")`, etc.) — there is currently **no Repository interface** between these endpoint files and the Zustand stores/screens that call them (see `current-limitations.md` §4 and `architecture-decisions.md` ADR-0003). This matters for this document specifically: today, "the backend" and "the shape of the API calls in the codebase" are the same thing, because there is no abstraction layer decoupling them yet.

---

# 4. The Integration Seam: `client.ts` and `env.ts`

These two files are, today, the *only* place backend identity is expressed. `env.ts` says *where* the backend lives (the URL). `client.ts` says *how* to talk to it (axios, REST conventions, headers, timeout, error handling). Any future backend migration that does not require changes outside these two files (plus, once it exists, the repository implementation layer — see §10) is a successful migration by this document's definition. Any migration that requires touching `src/store/authStore.ts`, any feature screen, or any component is a failed migration — it means the abstraction leaked.

---

# 5. What Changes When the Backend Changes

- **`env.ts`**: the base URL(s) change to point at the new backend. If the new backend requires additional identifying configuration (an API key, a project ID for a BaaS provider), it is added here, not scattered across call sites.
- **`client.ts`** (or its replacement): the low-level transport changes if the protocol changes — e.g., swapping axios's REST-shaped calls for a GraphQL client's query/mutation calls, or a BaaS SDK's method calls. The *interface this file exposes to the rest of the app* should stay stable even if what happens inside it changes completely.
- **`src/api/endpoints/*.ts`** (or, once the Repository Pattern lands, the repository implementations under each feature's `repository/` folder): the actual request/response shape mapping changes here — new field names, new pagination conventions, new error response shapes all get translated into Sugar Admin's stable internal types at this layer.
- **Authentication mechanics**: if moving to a BaaS provider like Supabase or Firebase, the token/session model may change shape entirely (e.g., Firebase's ID tokens and refresh mechanics differ from a custom JWT REST API) — this is absorbed at the `authApi`/`AuthRepository` layer, translated into the same `AuthTokens`/`User` types `authStore.ts` already expects.

---

# 6. What Must Never Change

- **The Zustand store interfaces** (`authStore.ts`'s `login`, `logout`, `hydrate` method signatures and the shape of `AuthState`) — these are the contract screens depend on.
- **The domain types** in `src/types/index.ts` (`User`, `AuthTokens`, `LoginCredentials`, `ApiResponse<T>`, etc.) — these represent Sugar Admin's own vocabulary, not any particular backend's response shape. A backend migration should only ever require changes to the *mapping into* these types, not the types themselves, unless the domain model itself is genuinely changing (a product decision, not a backend decision).
- **Screen and component code** — no screen should ever import `axios`, a GraphQL client, or a BaaS SDK directly. Every screen should only ever talk to a Zustand store, a TanStack Query hook, or (once it exists) a repository — never to the transport layer.

---

# 7. Migration Path: Mock → REST

This is the migration Sugar Admin's Foundation phase is explicitly built around (`context.md`'s Current Development Phase: backend "Not implemented," strategy "Mock API"). Once the Repository Pattern (§10) exists:

1. A mock implementation of each repository (e.g., `MockProductRepository`) exists first and is what screens/stores are built and tested against, per `constitution.md`'s Mock First Development.
2. When a real REST backend becomes available, a parallel `RestProductRepository` implementation is written against the same interface, using `client.ts`/`env.ts` as described in §3–5.
3. A single composition point (wherever repositories are instantiated and provided to the app — a dependency-injection point, context provider, or simple factory function) swaps `MockProductRepository` for `RestProductRepository`. No screen, store, or component code changes.
4. Mocks are not deleted after this migration — per `constitution.md`, "mocks are not temporary hacks... mocks are first-class citizens" — they remain available for local development, testing, and Storybook-style isolated UI work even after a real backend exists.

This is the migration path every feature built during `roadmap.md` Phases 1–4 should already be structured for, from day one, precisely because the Repository Pattern is meant to be adopted before those features ship (`architecture-decisions.md` ADR-0003).

---

# 8. Migration Path: REST → GraphQL

If a future backend decision moves to GraphQL (one of the options `context.md`'s Backend Strategy explicitly lists):

- `client.ts` is replaced or supplemented with a GraphQL client (e.g., a lightweight `graphql-request`-style client, or Apollo/urql if the query-caching needs grow — that specific choice is a future Chief Architect decision, not asserted here).
- Repository implementations change their internals from `client.get("/products")` REST calls to GraphQL queries/mutations, but the repository *interface* (`list`, `getById`, `create`, etc.) stays the same, because the interface was defined in terms of Sugar Admin's domain operations, not REST verbs, per the Repository Contract Standard (`10-feature-planner.md` §10).
- TanStack Query's role does not change — it remains the Server Cache layer regardless of what protocol the repository uses underneath to actually fetch data (per `glossary.md`'s Server Cache definition, TanStack Query is agnostic to REST vs. GraphQL vs. anything else).

---

# 9. Migration Path: REST → Supabase / Firebase (BaaS)

If a future backend decision moves to a Backend-as-a-Service provider (Supabase or Firebase, both explicitly listed in `context.md`'s Backend Strategy):

- This is the migration most likely to affect Authentication specifically, since BaaS providers typically bundle their own auth system with a different token/session model than a custom JWT REST API.
- The repository implementation layer absorbs the BaaS SDK's specific method calls (e.g., Supabase's `supabase.auth.signInWithPassword()` or Firebase's `signInWithEmailAndPassword()`) and translates the result into Sugar Admin's own `User`/`AuthTokens` types before returning from the repository method — exactly as described in §6.
- Real-time subscription capabilities that BaaS providers often offer (e.g., Supabase real-time, Firestore listeners) are a genuine opportunity for Chat Center (Phase 3, per `roadmap.md`) specifically, since a unified inbox benefits from live-updating conversations — but adopting this should be a deliberate Chief Architect decision weighed against the Replaceability principle, not an assumption baked into Chat Center's design before a BaaS decision is made.

---

# 10. The Repository Pattern as the Safety Mechanism

Every migration path above depends on the Repository Pattern (`architecture-decisions.md` ADR-0003) existing first — it is explicitly named as not yet implemented in `current-limitations.md` §4. Until it exists, "swap the backend" for Sugar Admin literally means "go find and edit every `client.post(...)`/`client.get(...)` call across every endpoint file and every store that calls them directly," which is exactly the coupling `context.md`'s Backend Strategy forbids ("no frontend implementation may depend on one backend framework"). This document's migration paths (§7–§9) are the target state; they are not fully achievable today, and closing that gap is `roadmap.md` Phase 0 work.

---

# 11. A Concrete Worked Example: Swapping Auth's Backend

To make §5–§6 concrete, here is what changes and what doesn't for a hypothetical future swap of the Auth backend from a custom REST API to Supabase, assuming the Repository Pattern is in place:

**Changes:**
- `env.ts` gains Supabase project URL/anon key configuration.
- A new `SupabaseAuthRepository implements AuthRepository` is written, using the Supabase client SDK internally.
- The composition point that wires up `AuthRepository` swaps `RestAuthRepository` for `SupabaseAuthRepository`.

**Does not change:**
- `authStore.ts`'s `login(credentials)`, `logout()`, `hydrate()` method signatures.
- `LoginScreen.tsx` — it calls `useAuthStore().login(...)`, exactly as before.
- `src/types/index.ts`'s `User` and `AuthTokens` types — `SupabaseAuthRepository` is responsible for mapping Supabase's session/user shape into these existing types.
- Any other feature that reads `useAuthStore().user` or `.isAuthenticated`.

This worked example is the concrete test of whether a migration was done correctly: if `LoginScreen.tsx` needed to change at all, the Repository Pattern's abstraction leaked somewhere.

---

# 12. Risks and Anti-Patterns

**Leaking backend-specific types into domain types.** If a REST response shape or a Supabase row type gets used directly as `User` instead of being mapped into Sugar Admin's own `User` type, every future migration has to touch every consumer of that type — exactly the coupling this document exists to prevent.

**Skipping the mock when a real backend "is right there."** Per `constitution.md`'s Mock First Development, even once a real backend exists, new features should still be built and tested against a mock repository first — the mock is not a stepping stone to be abandoned once a real backend is available.

**Treating the migration as a rewrite instead of a swap.** If a backend migration requires touching more than the repository implementation layer and `client.ts`/`env.ts`, that is a signal the Repository Pattern was not correctly applied to whatever surface needed to change — the fix is to correct the abstraction, not to accept broad changes as inevitable.

---

# 13. Summary Table

| Layer | Changes on Backend Migration? | Why |
|---|---|---|
| `env.ts` | Yes | Backend location/credentials are backend-specific by definition |
| `client.ts` / transport layer | Yes (internals) | Protocol (REST/GraphQL/BaaS SDK) is backend-specific |
| Repository implementations | Yes (new implementation per backend) | This is the layer designed to absorb backend differences |
| Repository interfaces | No | Interface is defined by Sugar Admin's domain needs, not backend shape |
| Domain types (`src/types/`) | No (usually) | Represent Sugar Admin's vocabulary, not the backend's |
| Zustand stores | No | Depend on repository interfaces and domain types only |
| Screens/components | No | Depend on stores/TanStack Query/repositories only, never transport directly |

---

# 14. Checklist: Before Starting a Backend Migration

- [ ] The Repository Pattern (`architecture-decisions.md` ADR-0003) is fully in place for the affected feature(s) — if not, that is the actual prerequisite work, not the migration itself.
- [ ] A new repository implementation is written and tested against the same interface as the existing (mock or prior real) implementation.
- [ ] No screen, component, or Zustand store required a code change as a result of the migration (§11's worked example is the test).
- [ ] Mock implementations remain available and are not deleted.
- [ ] `env.ts` is the only place new backend configuration/credentials are introduced.

---

# 15. References

- `../context.md` — Backend Strategy, Mock API Strategy, Architecture Principles
- `../constitution.md` — Backend Independence, Mock First Development, Replaceability
- `../../src/api/client.ts`, `../../src/config/env.ts` — the real integration seam described in §3–4
- `./architecture-decisions.md` — ADR-0002 (Mock-First), ADR-0003 (Repository Pattern)
- `./current-limitations.md` §4 — the current gap that must close before §7–§9 are fully achievable
- `./ai-provider-strategy.md` — the analogous provider-swap problem applied to AI capabilities instead of backends
