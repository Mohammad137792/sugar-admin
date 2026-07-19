---
id: knowledge-architecture-decisions
title: Architecture Decisions Index
category: knowledge
version: 1.0.0
status: active
owner: Product & Engineering
last_updated: 2026-07-18
---

# Architecture Decisions Index

> An index/summary of architectural decisions — both already-implicit ones from the Constitution and real, observed decisions in the codebase. Full reasoning lives in individual ADRs under `docs/decisions/`.

---

## Table of Contents

1. Purpose
2. Scope
3. How to Use This Index
4. ADR-0001: Feature-First Architecture Over Layer-First
5. ADR-0002: Mock-First Development
6. ADR-0003: Zustand Over Redux for Global State
7. ADR-0004: Hybrid Styling (NativeWind + StyleSheet)
8. ADR-0005: React Navigation Over Expo Router (Observed Drift)
9. Additional Observed Decisions Not Yet Written as ADRs
10. Decision Status Summary Table
11. How New Decisions Get Added
12. References

---

# 1. Purpose

`constitution.md` requires that "every important engineering decision must be documented" and that reviews must ask "alternatives considered?" This document is the single index of Sugar Admin's architectural decisions — some already implicit in the Constitution and `context.md`, some observed directly in the current codebase (including at least one real, notable drift between the stated target stack and what is actually implemented). It exists so an AI agent or engineer can find "why is it built this way" in one place, then follow a link to the full ADR for the complete reasoning.

---

# 2. Scope

In scope: a list of the architectural decisions currently in force for Sugar Admin, each with a one-paragraph summary and a pointer to its full ADR file under `docs/decisions/`. Out of scope: the full alternatives/trade-offs/risk analysis for each decision — that belongs in the ADR itself, written to the Chief Architect's ADR Template (`00-chief-architect.md` §23) and produced as a separate effort. Where an ADR file is referenced but not yet written, this index still names it so the decision is discoverable and the ADR's eventual filename is already fixed.

---

# 3. How to Use This Index

Each entry below states: the decision, why it was made (in brief), and what it replaced or rejected. If you need the complete trade-off analysis, read the linked ADR file at `docs/decisions/<filename>`. If the ADR file does not yet exist, treat the summary here as provisional and escalate to `00-chief-architect.md` before treating the decision as permanently settled.

---

# 4. ADR-0001: Feature-First Architecture Over Layer-First

**Decision:** Organize `src/` by product feature (`src/features/<feature>/...`) rather than by technical layer (a global `components/`, `hooks/`, `services/` split for the entire app).

**Why:** `context.md`'s Architecture Principles and Folder Philosophy both name Feature First Architecture explicitly, and `constitution.md`'s Feature Ownership section requires each feature to own its components, hooks, repository, services, state, types, constants, and tests, with cross-feature imports only through public APIs. This directly serves the Chief Architect's scalability question ("will this still work after 100 features?") — a layer-first structure degrades as the number of features grows because every layer folder becomes a flat list of everything, while a feature-first structure keeps growth localized to one folder per feature.

**Current state in the codebase:** partially realized. `src/features/{auth,content,dashboard,reports,ai-chat}/` exist, but each currently contains only a `screens/` subfolder — not the full feature-owned structure the Constitution describes (no feature-local repository, hooks, or state yet). See `current-limitations.md`.

**Full ADR:** `docs/decisions/adr-0001-feature-first-architecture.md`

---

# 5. ADR-0002: Mock-First Development

**Decision:** Every feature must be fully functional against a mock repository, simulating loading, pagination, latency, authorization, validation, failures, empty states, and server errors, before or independent of a real backend existing.

**Why:** `context.md`'s Current Development Phase states the backend is "Not implemented" and the development strategy is "Backend Agnostic." `constitution.md`'s Mock First Development section is explicit that "mocks are not temporary hacks... mocks are first-class citizens" and "a mock that always succeeds is not realistic." This decision lets feature development (UI, state, navigation) proceed in parallel with backend decisions that have not yet been made, and it is the direct enabler of Backend Independence (ADR reasoning also touches `future-backend-migration.md`).

**Current state in the codebase:** not yet implemented for any existing feature. `src/api/endpoints/{auth,content,reports}.ts` call `client` (axios) directly against a real (currently unreachable in development) `ENV.API_BASE_URL`, with no mock layer in front. See `current-limitations.md`.

**Full ADR:** `docs/decisions/adr-0002-mock-first-development.md`

---

# 6. ADR-0003: Zustand Over Redux for Global State

**Decision:** Use Zustand for the app's minimal global client state (`src/store/authStore.ts`, `src/store/uiStore.ts`), not Redux/Redux Toolkit or an unmanaged Context-only approach.

**Why:** `context.md`'s Technology Stack names Zustand explicitly. `package.json` includes `zustand` (5.0.14) with no Redux dependency anywhere. Zustand's near-zero boilerplate (no actions/reducers/providers ceremony) fits the Constitution's State Philosophy directly: "State is expensive. Only store information that must survive... Avoid global state when local state is sufficient." A Redux-style setup would add structural weight disproportionate to the two small global stores this app actually needs.

**Current state in the codebase:** implemented. `authStore.ts` and `uiStore.ts` exist and match `context.md`'s State Management Rules examples (Authentication, Theme, Language, Session). One notable rough edge: `authStore.ts` bridges its token to `src/api/client.ts`'s axios interceptor via `(globalThis as any).__authToken` rather than a typed getter — see `current-limitations.md`.

**Full ADR:** `docs/decisions/adr-0003-zustand-for-global-state.md`

---

# 6a. Repository Pattern Over Direct API Calls (Not Yet a Numbered ADR)

**Decision (target, not yet formally filed):** Data access for each domain (Products, Auth, Content, etc.) should be exposed through a Repository interface (e.g., `interface ProductRepository { list(...); getById(...); create(...); ... }`) with explicit input/output/error contracts, independent of whether a mock or a real network implementation sits behind it — per the standard defined in `10-feature-planner.md` §10.

**Why:** This is the concrete mechanism that fulfills ADR-0002 (Mock-First) and the Constitution's Backend Independence ("Migration should require changing repositories, not UI"). Without a repository interface, "swap the mock for a real backend" has no clean seam to swap at — every screen that called the mock directly would need to be touched.

**Current state in the codebase:** not implemented. `src/api/endpoints/*.ts` are thin axios wrappers called directly from `src/store/authStore.ts` and (presumably) from feature screens — there is no repository interface layer between UI/state and the network call. The Feature Planner's own standard (§10) explicitly flags this: "Sugar Admin's current `src/api/endpoints/*.ts` files call `client` (axios) directly with no repository interface in front of them... do not perpetuate the direct-axios-call pattern for new features." This is accepted, named technical debt for existing code (per the Constitution's Technical Debt section, which requires the reason and a follow-up plan to be documented — this index and `current-limitations.md` serve as that documentation) but must not be repeated in new feature work.

**Full ADR:** not yet written. This decision is significant and load-bearing enough to warrant one — it is tracked here as a known gap in the ADR log itself. The next sequential slot is `docs/decisions/adr-0006-repository-pattern.md`; `00-chief-architect` or `60-documentation-engineer` should file it before or during the first feature that implements a repository (see `roadmap.md` Phase 0).

---

# 7. ADR-0004: Hybrid Styling (NativeWind + StyleSheet)

**Decision:** Sugar Admin uses NativeWind (Tailwind-style utility classes for React Native) alongside React Native's built-in `StyleSheet.create`, rather than committing exclusively to one styling approach.

**Why:** `context.md`'s Technology Stack names NativeWind as the chosen styling solution. In practice, the codebase shows a hybrid reality: `nativewind` (4.2.5) and `tailwindcss` (3.4.19) are installed dependencies, but observed screen code (e.g., `src/screens/HomeScreen.tsx`) is written with `StyleSheet.create` and a theme-driven `makeStyles(colors)` function, not Tailwind utility className props. This is a real, observed pattern rather than a purely aspirational one: theme-aware styles (light/dark, via `src/context/ThemeContext.tsx` and `src/constants/theme.ts`) are more naturally expressed as functions over a `ThemeColors` object than as static utility classes, while NativeWind may be better suited to simpler, non-theme-dependent layout styling.

**Current state in the codebase:** both approaches coexist; there is no single documented rule yet for when to use which. This is exactly the kind of decision the Constitution's Documentation section requires to be written down rather than left to guesswork ("if future developers must guess why something exists, documentation is missing").

**Full ADR:** `docs/decisions/adr-0004-hybrid-styling-nativewind-and-stylesheet.md`

---

# 8. ADR-0005: React Navigation Over Expo Router (Observed Drift)

**Decision (as currently implemented):** Navigation is built on `@react-navigation/native` + `@react-navigation/native-stack` (see `src/navigation/AppNavigator.tsx`, `AuthNavigator.tsx`, `types.ts`), not Expo Router.

**Why this is flagged as a decision rather than simply "the target stack":** `context.md`'s Technology Stack section states the Navigation choice as "Expo Router." The actual installed dependencies (`package.json`) and actual navigation code use React Navigation's imperative, `NavigationContainer`-based API (`AuthStackParamList`, `AppStackParamList`, `RootStackParamList` defined in `src/navigation/types.ts`) instead — there is no `app/` directory or file-based routing anywhere in the repository. This is a genuine, notable drift between stated intent and implementation, not a documentation typo to silently fix — it must be resolved as an explicit decision (formally adopt React Navigation and update `context.md`, or migrate to Expo Router) rather than left ambiguous, per the Chief Architect's Principle 5 ("Prefer explicit boundaries. Hidden coupling eventually becomes technical debt.") applied to documentation-vs-reality coupling.

**Current state:** open decision, tracked in `technology-stack.md`'s "Open Decision" flag and `roadmap.md` Phase 0. Until resolved, new navigation work should continue to follow the existing React Navigation convention in `src/navigation/types.ts` (`PascalCase` route names, explicit `undefined` for paramless routes, one param list per stack — per `10-feature-planner.md` §12) rather than introducing a second, competing routing approach.

**Full ADR:** `docs/decisions/adr-0005-react-navigation-over-expo-router.md`

---

# 9. Additional Observed Decisions Not Yet Written as ADRs

These are real patterns observed in the codebase that function as de facto decisions but do not yet have a numbered ADR. They are listed here so they are not lost, and so a future ADR author knows they exist.

**TanStack Query for server state.** `@tanstack/react-query` (5.101.0) is installed per `context.md`'s Data Fetching choice, establishing the Server Cache concept used throughout `10-feature-planner.md`'s state classification standard (see `glossary.md`). As of this writing, no screen has been confirmed to actually use TanStack Query hooks yet (screens read from Zustand and direct API calls) — this is a gap to close alongside the Repository Pattern (ADR-0003), since Server Cache and Repository methods are meant to work together (a repository method is what a TanStack Query hook calls).

**In-memory-only auth token (not yet a formal ADR, a flagged gap).** `src/store/authStore.ts` stores the access token via `(globalThis as any).__authToken`, with no MMKV/SecureStore/AsyncStorage persistence. This is not a considered architectural decision — it is an incomplete implementation, tracked as a gap in `current-limitations.md`, not a pattern to replicate.

---

# 10. Decision Status Summary Table

| Decision | Status | ADR File | Codebase Reality |
|---|---|---|---|
| Feature-First Architecture | Adopted, partially realized | `adr-0001-feature-first-architecture.md` | `screens/`-only folders today |
| Mock-First Development | Adopted, not yet implemented | `adr-0002-mock-first-development.md` | Direct axios calls, no mocks |
| Zustand over Redux | Adopted, implemented | `adr-0003-zustand-for-global-state.md` | `authStore`, `uiStore` implemented |
| Hybrid Styling (NativeWind + StyleSheet) | Observed, undocumented rule | `adr-0004-hybrid-styling-nativewind-and-stylesheet.md` | Both present, no usage guideline |
| React Navigation over Expo Router | Open — real drift from `context.md` | `adr-0005-react-navigation-over-expo-router.md` | React Navigation is what's implemented |
| Repository Pattern | Adopted (policy), not yet implemented | Not yet written — proposed `adr-0006-repository-pattern.md` | No repository interfaces exist |
| TanStack Query for server state | Adopted, not yet exercised | Not yet written | Installed, not confirmed in use |
| In-memory auth token | Not a decision — a gap | N/A | See `current-limitations.md` |

---

# 11. How New Decisions Get Added

Per the Chief Architect's authority (`00-chief-architect.md` §4, §8), new architectural decisions are proposed and approved through the Chief Architect's Architectural Decision Process, written up using the ADR Template referenced in `00-chief-architect.md` §23, filed under `docs/decisions/adr-NNNN-<slug>.md`, and then added to this index with a summary paragraph and status. This index should never contain the full reasoning for a decision — only enough to know the decision exists, why (briefly), and where to read more.

---

# 12. References

- `../constitution.md` — Documentation, Reviews, Technical Debt, Replaceability, Backend Independence
- `../context.md` — Architecture Principles, Technology Stack, Folder Philosophy
- `.claude/agents/00-chief-architect.md` §23 (ADR Templates)
- `.claude/agents/10-feature-planner.md` §10 (Repository Contract Standard)
- `./technology-stack.md` — the installed-vs-target stack detail behind ADR-0004 and ADR-0005
- `./current-limitations.md` — the honest gap assessment behind ADR-0002 and ADR-0003's "not yet implemented" status
