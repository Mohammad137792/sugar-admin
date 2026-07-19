---
id: adr-0002-mock-first-development
title: Mock-First Development
category: decision
status: Accepted
date: 2026-07-18
deciders: Engineering
---

# ADR-0002: Mock-First Development

## Status

Accepted as policy. This ADR formalizes a decision `constitution.md` and `context.md` already state explicitly; it is honestly **not yet implemented** anywhere in the current codebase (see Context). The policy is not in question — the gap between policy and code is.

## Context

`context.md`'s Current Development Phase states the backend is "Not implemented" and the development strategy is "Backend Agnostic." Its Backend Strategy section adds: "No backend has been selected... No frontend implementation may depend on one backend framework." `constitution.md`'s Mock First Development section is unambiguous: "Every feature must be fully functional using mock repositories. Mock implementations are not temporary hacks. Mocks are first-class citizens. Mocks should simulate: loading, pagination, latency, authorization, validation, failures, empty states, server errors. A mock that always succeeds is not realistic."

This is a real constraint, not a hypothetical one: with no backend selected, any feature built against real HTTP calls is unbuildable, undemoable, and untestable today. Mock-first is the only strategy that lets UI, state, and navigation work proceed in parallel with a backend decision that has not been made.

**Current, verified codebase state — the honest gap:** `src/api/endpoints/auth.ts`, `content.ts`, and `reports.ts` all call the shared axios instance (`src/api/client.ts`) directly:

```ts
// src/api/endpoints/auth.ts — current, real, entire file
export const authApi = {
  login: (credentials: LoginCredentials) =>
    client.post<ApiResponse<{ user: User; tokens: AuthTokens }>>("/auth/login", credentials),
  logout: () => client.post("/auth/logout"),
  refreshToken: (refreshToken: string) =>
    client.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),
  me: () => client.get<ApiResponse<User>>("/auth/me"),
};
```

`src/api/client.ts` points at `ENV.API_BASE_URL`, which defaults (`src/config/env.ts`) to `https://api.sugar-admin.com/v1` — a host with, per `context.md`, no real backend behind it. `src/store/authStore.ts`'s `login()`, `logout()`, and `hydrate()` actions call `authApi` directly, with no mock layer, no repository interface, and no simulated latency, failure, or empty-state path anywhere in between. Checked item-by-item against the Constitution's mandatory simulation list (loading, pagination, latency, authorization, validation, failures, empty states, server errors): **none of the eight are satisfied.** This is not a partial mock — it is a real HTTP client aimed at a URL with nothing behind it, meaning login cannot actually succeed in the current build. `.claude/handbook/mock-api.md` § 5 documents this exact gap in full.

## Decision

Sugar Admin adopts Mock-First Development as binding policy for all feature work: every feature must be fully functional against a mock repository — simulating loading, pagination, latency, authorization, validation, failures, empty states, and server errors — independent of whether a real backend exists. This is **Accepted as policy**, effective immediately for all new feature work (starting with Products, per `context.md`'s Primary Features), and is **not reversed or weakened** by the fact that the three existing endpoint modules (`auth.ts`, `content.ts`, `reports.ts`) do not yet comply with it.

The existing gap is named, accepted technical debt (per `constitution.md`'s Technical Debt section, which requires the reason, a follow-up plan, and the impact to be documented — this ADR, `.claude/handbook/mock-api.md`, and `.claude/agents/24-network-engineer.md` §§ 9–10 jointly serve as that documentation), not evidence the policy should be abandoned. `24-network-engineer.md` owns building mock-first from day one for new repositories; `40-refactor-engineer.md` owns migrating the three existing endpoint modules into the same shape, feature-by-feature, as each is next substantially touched — never as a single unrelated retrofit PR.

## Consequences

**Positive:**
- Feature development (UI, navigation, state) is fully decoupled from backend availability — a feature can be built, demoed, and reviewed with zero real network dependency, which is the direct, practical requirement of `context.md`'s Backend Agnostic strategy.
- Every Loading/Empty/Error/Retry state the Constitution's Error Philosophy requires gets built and reviewed against realistic conditions (jittered latency, a non-zero failure rate) rather than discovered for the first time once a real backend exists, per `.claude/handbook/mock-api.md` § 4.
- Swapping a mock repository for a real one later is a one-file change (the repository's `index.ts` factory, per `24-network-engineer.md` § 10), not a UI rewrite — this is the concrete mechanism that makes `constitution.md`'s Backend Independence promise ("migration should require changing repositories, not UI") actually true rather than aspirational.

**Negative / accepted debt:**
- Today, the app cannot actually complete a login or load content — `authApi.login()` resolves against a URL with nothing behind it. This is a real, user-facing gap, not a cosmetic one. Follow-up plan: `24-network-engineer.md` and `40-refactor-engineer.md` jointly own migrating `auth.ts` first (it has the only real, working caller — `authStore.ts`), then `content.ts` and `reports.ts`, one module at a time, mock-first within each, per `40-refactor-engineer.md` § 9's sequencing rule. No date is committed here; the trigger is "the next time that feature is substantially touched," per the same section.
- Until the migration lands, any manual testing or demo of Sugar Admin's auth/content/reports flows will fail or hang (up to `client.ts`'s 15-second timeout) rather than degrade gracefully — there is no mock fallback today. This is a known, not hidden, limitation.
- Mock-first adds real, ongoing engineering cost per feature: every repository needs a mock implementation built to the full standard in `.claude/handbook/mock-api.md` § 4 (jittered 150–800ms latency, 5–10% failure rate, pagination honored against seed data, authorization/validation simulation, empty-state paths) before the real implementation is even started. This is accepted deliberately — the Constitution states plainly that "a mock that always succeeds is not realistic," ruling out a cheaper, always-succeeding stub as compliant.

## Alternatives Considered

- **Wait for a backend decision before building any feature UI** — rejected. `context.md`'s Backend Strategy states no backend is selected and lists REST, GraphQL, gRPC, and Serverless Functions as open possibilities; blocking all feature work on that decision would stall the entire Foundation phase indefinitely, directly contradicting the project's stated Backend Agnostic strategy.
- **Build against a real backend now, using a minimal placeholder API (e.g. a throwaway Express server)** — rejected. This still couples feature development to one specific (even if temporary) backend implementation, violating `constitution.md`'s Backend Independence ("the frontend must never depend on a specific backend implementation"), and does nothing to guarantee failure/empty/latency states are actually exercised, since a developer-controlled placeholder server tends toward always succeeding.
- **Treat `src/api/endpoints/*.ts`'s direct axios calls as "good enough" mocking because the code is simple** — rejected explicitly in `.claude/handbook/mock-api.md` § 8: simplicity is a virtue only when it satisfies the requirement, and direct axios calls against a nonexistent host satisfy none of the Constitution's eight mandatory simulations.

## Sign-off

Engineering (retroactive documentation of policy already stated in force via `constitution.md` and `context.md`). The implementation gap this ADR names remains open; closing it is tracked under `24-network-engineer.md` and `40-refactor-engineer.md`, not resolved by this ADR itself.

## Related Decisions

- **ADR-0001 (Feature-First Architecture)** — provides the folder each feature's mock/real/factory repository trio lives in (`src/features/<feature>/repository/`); this ADR's policy has nowhere principled to be implemented without ADR-0001's structure already in place.
- This ADR is the direct policy basis for `.claude/docs/examples/auth-repository-migration-example.md`, which is a complete, worked demonstration of exactly what "closing the gap" looks like for one real file (`src/api/endpoints/auth.ts`) — read that document for the concrete mechanics this ADR only states as policy.
- `.claude/docs/examples/products-feature-plan.md`'s Repository Contracts section is written under this ADR's policy from the start — it never proposes a direct-axios-call shape for the new `ProductRepository`, unlike the three pre-existing endpoint modules this ADR's gap analysis covers.
- A future ADR-0003-equivalent for "Repository Pattern Over Direct API Calls" is referenced by `.claude/knowledge/architecture-decisions.md` § 6 as a related but distinct decision — that decision is about the *shape* data access takes (an interface with a mock/real seam) whereas this ADR is about the *policy* that every feature must be demoable without a real backend. The two are complementary, not duplicates: Mock-First is the requirement, the Repository Pattern is the mechanism that satisfies it.

## References

- `.claude/constitution.md` — Mock First Development, Backend Independence, Technical Debt
- `.claude/context.md` — Current Development Phase, Backend Strategy, Mock API Strategy
- `.claude/agents/24-network-engineer.md` — § 9 (Current Codebase Reality — The Repository Gap), § 10 (Target Repository Pattern), § 11 (Mock Implementation Standard)
- `.claude/agents/40-refactor-engineer.md` — § 9 (Migration Target A — Repository Pattern)
- `.claude/handbook/mock-api.md` — full simulation checklist and gap analysis
- `.claude/docs/examples/auth-repository-migration-example.md` — worked before/after example of closing this exact gap for `auth.ts`
- `.claude/knowledge/architecture-decisions.md` — § 5 (ADR-0002 summary)
