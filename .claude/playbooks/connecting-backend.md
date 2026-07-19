---
id: playbook-connecting-backend
title: Connecting Backend Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Connecting Backend Playbook

> "Migration should require changing repositories, not UI." — `../constitution.md`, Backend Independence

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Selecting a Backend and Connecting Auth First
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

`../context.md`'s Backend Strategy states plainly: "No backend has been selected... Possible future options: Express, NestJS, Supabase, Firebase, Custom REST API, GraphQL." `../context.md`'s Current Development Phase confirms it again: "Backend: Not implemented."

This playbook is what happens the day a backend technology is finally chosen — the one-time architectural decision, and the repeatable per-feature mechanics of wiring `src/config/env.ts` and `src/api/client.ts` to a real service without ever touching a screen, hook, or store's public shape. It is the seam-level counterpart to `replacing-mock-api.md`, which covers swapping one already-built feature's mock for real once this playbook's groundwork exists.

---

# 2. When To Use This Playbook

Use this playbook when:

- `../agents/00-chief-architect.md` has selected (or is actively selecting, via `../templates/architecture-proposal.md`) a real backend technology for the first time.
- A previously-selected backend's connection details (base URL, auth scheme) are changing.

Do not use this playbook to swap an individual feature's mock repository for real once the backend groundwork already exists — that incremental, feature-by-feature swap is `replacing-mock-api.md`. This playbook is the one-time seam; that one is the repeatable procedure per feature.

---

# 3. Prerequisites

- Backend technology selection is a `chief-architect`-level decision (`../agents/00-chief-architect.md` § 4) — confirm it has actually been made, via an accepted `../templates/adr.md`, not assumed or decided unilaterally by whichever engineer happens to be touching `src/api/client.ts` that day.
- `src/config/env.ts` and `src/api/client.ts` read in full — these are the only two files any backend connection touches directly.
- `../rules/networking.md` read in full — it documents the real, current gaps in the networking layer (see Step 4 below) that must be closed before a real backend can be relied on safely.
- `../rules/repositories.md` and `../handbook/repository-pattern.md` read — this playbook assumes every feature being connected already has (or is gaining, via `creating-a-repository.md`) a repository interface in front of its data access. A feature still on the direct-axios `src/api/endpoints/*.ts` pattern is migrated first (`40-refactor-engineer.md` § 9), not connected directly.

---

# 4. Step-by-Step Workflow

## Step 1 — Confirm the backend decision is real and recorded

An ADR (`../templates/adr.md`) exists, `Accepted`, naming the chosen technology (REST/GraphQL/NestJS/Express/Supabase/Firebase) and why. If no ADR exists yet, this playbook does not proceed — write and get sign-off on `../templates/architecture-proposal.md` first.

## Step 2 — Update `src/config/env.ts` with the real connection details

Today, `ENV` has exactly four fields: `API_BASE_URL`, `AI_API_URL`, `APP_NAME`, `APP_VERSION`. It does **not** have a `USE_MOCK_API` flag — `creating-a-repository.md` Step 4 already names this gap and adds it as part of building any new repository's `index.ts`. Connecting a real backend is the point at which this flag actually starts controlling something real for the first time:

```ts
// src/config/env.ts — extend the same object, never create a second env module
const ENV = {
  API_BASE_URL:  process.env.EXPO_PUBLIC_API_URL ?? "https://api.sugar-admin.com/v1",
  AI_API_URL:    process.env.EXPO_PUBLIC_AI_URL  ?? "https://ai.sugar-admin.com/v1",
  APP_NAME:      "Sugar Admin",
  APP_VERSION:   "1.0.0",
  USE_MOCK_API:  process.env.EXPO_PUBLIC_USE_MOCK_API !== "false", // defaults to mock
} as const;

export default ENV;
```

Per `../rules/networking.md` Rule 7, treat a missing `EXPO_PUBLIC_API_URL` in a real build as a failure to catch loudly, not a silent fallback to rely on — the current `?? "https://api.sugar-admin.com/v1"` default is a known risk, not a safety net.

## Step 3 — Verify `src/api/client.ts`'s assumptions match the chosen backend's auth scheme

`client.ts` currently assumes bearer-token auth via `globalThis.__authToken`, injected on every request (`../rules/networking.md` Rule 3). If the chosen backend uses a different scheme (cookie/session auth, a Supabase/Firebase SDK's own client instead of raw axios), that is itself an architecture-level change — escalate to `chief-architect`, do not patch `client.ts`'s interceptor ad hoc to support two auth schemes at once.

If the scheme is unchanged (bearer JWT over REST, the assumption the codebase already has), `client.ts` itself needs no change — it was written to be reused as-is underneath real repository implementations (`../handbook/repository-pattern.md` § 4, point 3; § 13.5 FAQ: "It stays. It becomes an implementation detail used only inside `Http*Repository` files").

## Step 4 — Close the two real, currently-open networking gaps before relying on them

Both are documented, both are real, and both matter the moment requests actually reach a live backend:

1. **`globalThis.__onUnauthorized` is never assigned anywhere in the codebase** (`../rules/networking.md` Rule 4). A `401` from a real backend currently no-ops silently — nothing redirects to login. Wire it (typically `globalThis.__onUnauthorized = () => useAuthStore.getState().logout()`, on mount in `App.tsx`) before shipping any feature that depends on "expired session redirects to login."
2. **`ENV.API_BASE_URL`'s fallback** (Step 2) — confirm the real build pipeline (EAS Build profile, CI) actually sets `EXPO_PUBLIC_API_URL`; do not ship a production build relying on the placeholder default.

## Step 5 — For each feature being connected, implement its `Http<Feature>Repository`

Per `creating-a-repository.md` § 4 Step 3 and `../handbook/repository-pattern.md` § 4 point 3 — same interface as the mock, wrapping `client` (or the backend's official SDK, if the chosen backend is Supabase/Firebase rather than a REST API `client.ts` can call). If the interface doesn't cleanly fit what the real backend returns, that's a contract problem: escalate to `feature-planner`, do not silently widen the interface or leak a backend-specific response envelope into it (`../rules/networking.md` Rule 8 — normalize inside the `Http*` implementation, never invent a second envelope shape).

## Step 6 — Flip the switch for that one feature, never globally on day one

`productRepository`'s (or any feature's) `index.ts` factory decides mock vs. real based on `ENV.USE_MOCK_API` — flip it feature by feature as each `Http*Repository` is built, verified, and reviewed. See `replacing-mock-api.md` for the full incremental-swap procedure, including rollback.

## Step 7 — Migrate `src/api/endpoints/*.ts` in coordination with `refactor-engineer`

`auth.ts`, `content.ts`, `reports.ts` are pre-repository-pattern debt (`../agents/40-refactor-engineer.md` § 9) — connecting a real backend is a natural moment to prioritize this migration, starting with `auth.ts` (the only one with a real, working caller today). This is `refactor-engineer`'s Migration Target A, not something this playbook does inline — hand off explicitly.

## Step 8 — Record the decision

Update or confirm the ADR from Step 1 reflects what was actually implemented; note any deviation from the original proposal.

---

# 5. Worked Example: Selecting a Backend and Connecting Auth First

**Step 1.** `chief-architect` accepts an ADR: "Adopt a Node/Express REST backend, matching the existing `ApiResponse<T>`/`PaginatedResponse<T>` envelope shapes already assumed in `src/types/index.ts`, to minimize changes to `client.ts` and every existing `endpoints/*.ts` file's response typing."

**Step 2.** `src/config/env.ts` gains `USE_MOCK_API`, defaulting to `true` until each feature is individually verified against the new backend. `EXPO_PUBLIC_API_URL` is set in the real EAS Build profile to the actual deployed Express service's URL.

**Step 3.** The Express backend issues bearer JWTs — `client.ts`'s existing `Authorization: Bearer ${token}` interceptor needs no change.

**Step 4.** `globalThis.__onUnauthorized = () => useAuthStore.getState().logout();` is added to `App.tsx`'s root component on mount, closing `../rules/networking.md` Rule 4's gap before any auth-gated feature ships against the real backend.

**Step 5.** Per `../handbook/repository-pattern.md` § 6's already-worked-out target shape, `src/features/auth/repository/AuthRepository.ts` (interface), `MockAuthRepository.ts` (already exists conceptually as the target for `authApi`'s replacement), and `HttpAuthRepository.ts` (new, wraps `client.post("/auth/login", ...)` etc., matching `authApi.login`'s existing endpoint shape) are built. `authStore.ts`'s `login()` action is updated to call `authRepository.login()` instead of `authApi.login()` directly — exactly the before/after `../handbook/repository-pattern.md` § 6 already documents.

**Step 6.** `authRepository`'s `index.ts` factory is flipped to `HttpAuthRepository` only after manual verification of valid- and invalid-credential login against the real, deployed Express backend, per `replacing-mock-api.md`'s procedure.

**Step 7.** `content.ts` and `reports.ts` remain on direct axios calls for now — `refactor-engineer` is looped in to sequence their migration separately, per Migration Target A's "one endpoint module at a time" rule.

**Step 8.** The ADR is updated with a note: "Auth is the first feature connected to the real backend, 2026-07-18. Content and Reports remain mock-only pending their own repository migrations."

---

# 6. Checklist

- [ ] An `Accepted` ADR names the chosen backend technology and its rationale.
- [ ] `ENV.USE_MOCK_API` exists in `src/config/env.ts`, defaulting to mock.
- [ ] `client.ts`'s auth-scheme assumptions were verified against the real backend, or an architecture-level change was escalated if they don't match.
- [ ] `globalThis.__onUnauthorized` is wired before any auth-gated feature relies on 401-triggered logout.
- [ ] The real build pipeline actually sets `EXPO_PUBLIC_API_URL`; the fallback default is not relied upon in production.
- [ ] Each feature's `Http<Feature>Repository` implements the exact same interface as its mock — no widened types, no leaked response envelope.
- [ ] The mock-vs-real switch is flipped one feature at a time, never globally in one PR.
- [ ] `src/api/endpoints/*.ts` migration is explicitly handed to `refactor-engineer`, not silently rewritten inline.

---

# 7. Common Mistakes

**Deciding the backend technology without a `chief-architect`-approved ADR.** Backend selection is explicitly named in `../context.md` as a decision the frontend must never be silently coupled to — treating it as an implementation detail one engineer can decide defeats the entire premise of Backend Independence.

**Flipping `ENV.USE_MOCK_API` to `false` globally, for every feature, in one PR.** Every feature not yet verified against the real backend breaks silently. Flip it per feature, per `replacing-mock-api.md`.

**Assuming `client.ts` needs a rewrite.** It was deliberately built to be reusable underneath any real REST-shaped repository implementation — see `../handbook/repository-pattern.md` § 13.5. Only change it if the chosen backend's auth scheme genuinely differs from bearer JWT.

**Shipping without wiring `globalThis.__onUnauthorized`.** A silent no-op on every 401 is a real, currently-existing gap (`../rules/networking.md` Rule 4) — closing it is a prerequisite for any backend connection, not an optional hardening step.

**Treating `src/api/endpoints/*.ts` as ready to point at the real backend as-is.** It has no mock, no interface, and no swappability — connecting it directly perpetuates exactly the coupling this playbook exists to avoid. Migrate to the repository pattern first (`creating-a-repository.md`, `../agents/40-refactor-engineer.md` § 9).

---

# 8. References

- `../constitution.md` — Backend Independence, Mock First Development
- `../context.md` — Backend Strategy, Current Development Phase
- `../rules/networking.md` — the real, current gaps (`globalThis.__onUnauthorized`, `API_BASE_URL` fallback) this playbook requires closing
- `../rules/repositories.md`, `../handbook/repository-pattern.md` — the target pattern every connected feature must already follow
- `../agents/24-network-engineer.md` — owns `src/api/client.ts` and the target repository pattern
- `../agents/40-refactor-engineer.md` § 9 — the `src/api/endpoints/*.ts` migration this playbook coordinates with, not performs
- `src/config/env.ts`, `src/api/client.ts` — the two real files this playbook edits
- `./creating-a-repository.md` — prerequisite pattern every connected feature must already have
- `./replacing-mock-api.md` — the repeatable per-feature swap procedure this playbook's groundwork enables
- `../templates/adr.md`, `../templates/architecture-proposal.md` — the decision-recording process this playbook depends on
