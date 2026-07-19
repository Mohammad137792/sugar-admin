---
id: knowledge-current-limitations
title: Current Limitations
category: knowledge
version: 1.0.0
status: active
owner: Product & Engineering
last_updated: 2026-07-18
---

# Current Limitations

> The most important honest-assessment document in this workspace. Every real gap between the stated architecture/product vision and the actual codebase, framed as current state → why it matters → what closes the gap.

---

## Table of Contents

1. Purpose
2. Scope
3. How to Read This Document
4. Gap: No Repository/Mock Pattern
5. Gap: No Test Infrastructure At All
6. Gap: Only 5 of 9 Planned Features Have Even Placeholder Screens
7. Gap: No Data Persistence (In-Memory-Only Auth Token)
8. Gap: Feature Folders Are Flat (`screens/` Only)
9. Gap: Legacy Screen Outside the Feature-First Structure
10. Gap: Navigation Stack Doesn't Match `context.md`
11. Additional Smaller Gaps
12. Severity & Priority Summary Table
13. Checklist: Before Claiming a Gap Is Closed
14. References

---

# 1. Purpose

Every other document in `.claude/knowledge/` describes where Sugar Admin is going. This document describes, without softening, where it actually is today — verified directly against the codebase, not inferred from `context.md`'s aspirational descriptions. Its purpose is to prevent any AI agent or engineer from assuming a capability exists (a repository layer, persisted auth, a built-out feature) simply because `context.md` or `constitution.md` describes it as the target architecture.

This document should be updated whenever a gap listed here is closed, and new gaps should be added here as they are discovered — an out-of-date limitations document is worse than none, because it creates false confidence.

---

# 2. Scope

In scope: gaps between stated architecture/product vision (`constitution.md`, `context.md`) and the current, verified state of the codebase. Out of scope: future feature requests that were never promised (those belong in `roadmap.md` and `future-modules.md`, not here) — this document only covers things that are supposed to already be true, in principle, but are not yet true in practice.

---

# 3. How to Read This Document

Each gap follows a fixed structure:

- **Current state:** what is actually implemented, cited to specific files.
- **Why it matters:** the concrete consequence, tied back to a Constitution principle or product goal.
- **What closes the gap:** the concrete next step, and which knowledge file or agent owns driving that work.

---

# 4. Gap: No Repository/Mock Pattern

**Current state:** `src/api/endpoints/auth.ts`, `content.ts`, and `reports.ts` are thin wrappers that call `client` (an axios instance from `src/api/client.ts`) directly — e.g., `authApi.login()` calls `client.post("/auth/login", credentials)` directly, and `src/store/authStore.ts`'s `login` action calls `authApi.login()` directly. There is no `ProductRepository`-style interface anywhere (compare to the standard defined in `10-feature-planner.md` §10), and there is no mock implementation layer — every API call in the app targets `ENV.API_BASE_URL` (`https://api.sugar-admin.com/v1` by default, per `src/config/env.ts`), a real network endpoint, not a mock.

**Why it matters:** `constitution.md`'s Mock First Development and Backend Independence sections, and `context.md`'s Mock API Strategy, all require the UI to "never know whether the repository is using mock data or a real backend." Today, the UI is directly coupled to axios and a specific base URL — there is no seam to swap a mock in for local development, and no seam to swap the backend later without touching every call site. This also means the app cannot currently be developed or demoed offline, or without a live backend running at that URL, which contradicts the stated Foundation-phase strategy of being backend-agnostic.

**What closes the gap:** define Repository interfaces per domain (Auth, Content, Reports today; Products and others as they're built), each with a mock implementation that simulates latency, failures, empty states, and validation per `constitution.md`'s Mock First Development list. This is `roadmap.md` Phase 0 work, and the interface standard to follow is `10-feature-planner.md` §10. See `architecture-decisions.md` ADR-0003 for the full decision framing.

---

# 5. Gap: No Test Infrastructure At All

**Current state:** no test framework (Jest, `@testing-library/react-native`, or any other) appears in `package.json`'s `devDependencies`, and no test files (`*.test.ts`, `*.test.tsx`, `__tests__/` directories) exist anywhere in the repository.

**Why it matters:** `constitution.md`'s Core Values rank Testability 5th of 9, above Scalability, Performance, and Developer Experience — it is not an afterthought in the stated priority order. The Definition of Done explicitly requires "tests are written where appropriate," and Feature Ownership lists "tests" as one of the eight things every feature must own. Today, zero of that is possible — there is no way to write a test even if an engineer wanted to, until a framework is installed and configured.

**What closes the gap:** install and configure a test framework (Jest is the conventional default for React Native/Expo projects) during `roadmap.md` Phase 0, before Phase 1 feature work accelerates — see `technology-stack.md` §4, "Test Framework," for the specific adoption trigger and reasoning.

---

# 6. Gap: Only 5 of 9 Planned Features Have Even Placeholder Screens

**Current state:** `src/features/` contains exactly five folders — `ai-chat`, `auth`, `content`, `dashboard`, `reports` — each with a single screen. Of `context.md`'s nine Primary Features (Authentication, Dashboard, Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, Analytics), only Authentication (`LoginScreen.tsx` — Login only, no Register), Dashboard, AI Content (`ContentScreen.tsx`), Analytics (`ReportsScreen.tsx`), and a Chat Center placeholder (`AIChatScreen.tsx`, which literally renders "Coming soon...") exist at all. **Products, AI Images, Publishing, and Customer Management have zero code anywhere in the repository.**

**Why it matters:** these are named as required for "the first production release" in `context.md`. Products in particular is a blocking dependency for nearly every other feature (see `roadmap.md` §6) — without it, AI Content has nothing concrete to generate captions for, Publishing has nothing to publish, and Customer Management's purchase history has nothing to reference.

**What closes the gap:** build the missing features in the phased order proposed in `roadmap.md` (Products in Phase 1; Publishing in Phase 2; Customer Management and a real Chat Center in Phase 3; AI Images in Phase 4), each preceded by a full feature plan from `10-feature-planner.md`.

---

# 7. Gap: No Data Persistence (In-Memory-Only Auth Token)

**Current state:** `src/store/authStore.ts` stores the access token via `(globalThis as any).__authToken = tokens.accessToken` — a plain in-memory JavaScript global, not MMKV, SecureStore, or AsyncStorage. `src/api/client.ts`'s request interceptor reads the token from the same global. There is no persistence mechanism anywhere in the codebase.

**Why it matters:** every app restart (including a simple app-switch-and-return on some platforms, or any JS engine reload during development) loses the session entirely, forcing the user to log in again. This directly contradicts a basic, expected mobile-app behavior and undermines the product vision's "Fast" and "Reliable" goals (`product-vision.md` §7, §9) — an app that forgets who you are every time you reopen it fails the "fast to resume" requirement described there. It is also a Constitution Security Philosophy concern in the making: once persistence is added, it must not simply move the problem to insecure storage ("never trust... local storage" is about validation, but storing a raw token in plain AsyncStorage without encryption is a related risk to design against from the start).

**What closes the gap:** adopt MMKV (already the target per `context.md`'s Technology Stack, see `technology-stack.md` §4) to persist the token securely and hydrate `authStore` from it on app start, replacing the `globalThis.__authToken` pattern entirely. This is `roadmap.md` Phase 0's single highest-priority item.

---

# 8. Gap: Feature Folders Are Flat (`screens/` Only)

**Current state:** every existing feature folder (`src/features/{ai-chat,auth,content,dashboard,reports}/`) contains only a `screens/` subfolder. None has a `components/`, `hooks/`, `repository/`, `services/`, `state/`, `types/`, or `constants/` subfolder, despite `constitution.md`'s Feature Ownership section listing all of these as things "each feature owns."

**Why it matters:** this is the concrete, current-day symptom of the Repository Pattern gap (§4) and the general Feature-First Architecture being only partially realized (see `architecture-decisions.md` ADR-0001). Screens today reach directly into `src/api/`, `src/store/`, `src/constants/`, and `src/context/` at the top level rather than through feature-owned modules, which is the layer-first pattern the Feature-First decision was meant to avoid.

**What closes the gap:** as each feature gains real functionality (repository methods, feature-local state, feature-specific components) per `roadmap.md`'s phases, its folder should grow the missing subfolders rather than continuing to add code to shared top-level folders. This is a "grow into it as needed" gap, not a "go restructure everything today" gap — per the Chief Architect's Principle 4 ("every abstraction must solve a real problem"), empty subfolders should not be created speculatively ahead of actual feature-local code needing them.

---

# 9. Gap: Legacy Screen Outside the Feature-First Structure

**Current state:** `src/screens/HomeScreen.tsx` exists as a standalone screen at `src/screens/`, entirely outside `src/features/`. It is a landing/marketing-style screen (app branding, feature highlights, links to Dashboard and Reports) that predates the feature-first reorganization implied by the current `src/features/` layout.

**Why it matters:** its existence is a direct, visible violation of the Feature-First Architecture principle (`context.md`, `architecture-decisions.md` ADR-0001) and sets a bad precedent — a new engineer copying an existing pattern might reasonably (and incorrectly) conclude that top-level `src/screens/` is still a valid place to add new screens.

**What closes the gap:** either retire `HomeScreen.tsx` if its landing-page purpose is superseded by the Dashboard (per `roadmap.md` Phase 1, where Dashboard becomes the real "first screen" experience), or relocate it into a proper feature folder (e.g., `src/features/home/screens/HomeScreen.tsx`) if it should be kept. This decision belongs to the Chief Architect, tracked as `roadmap.md` Phase 0 work.

---

# 10. Gap: Navigation Stack Doesn't Match `context.md`

**Current state:** `context.md`'s Technology Stack names "Expo Router" under Navigation. The actual codebase (`src/navigation/AppNavigator.tsx`, `AuthNavigator.tsx`, `types.ts`) implements navigation with `@react-navigation/native` + `@react-navigation/native-stack`, using `AuthStackParamList` / `AppStackParamList` / `RootStackParamList` type definitions and a `NavigationContainer`-based setup. There is no `app/` directory and no file-based routing anywhere.

**Why it matters:** this is a direct contradiction between the project's own stated source of truth (`context.md`) and its implementation — exactly the kind of undocumented drift `constitution.md`'s Documentation section warns against ("if future developers must guess why something exists, documentation is missing"). Left unresolved, it creates ambiguity for any AI agent or engineer trying to follow `context.md` literally when planning new navigation work.

**What closes the gap:** an explicit Chief-Architect-level decision to either (a) formally adopt React Navigation and update `context.md` to match reality, or (b) plan and execute a deliberate migration to Expo Router. See `architecture-decisions.md` ADR-0005 and `technology-stack.md` §5 for the full framing of both options. This is `roadmap.md` Phase 0 work and should be resolved before further navigation surface area (new stacks for Products, Publishing, etc.) is added on top of either choice.

---

# 11. Additional Smaller Gaps

**No linting configuration observed.** No ESLint or Prettier configuration file or dependency was found in `package.json`. Given `constitution.md`'s emphasis on Simplicity, Readability, and Predictability as Core Values, the absence of enforced formatting/lint rules means these values currently rely entirely on manual review discipline rather than tooling.

**`Register` screen does not exist.** `context.md`'s Authentication feature lists Login, Register, Logout, Token management. Only Login (`LoginScreen.tsx`) and a `logout` action in `authStore.ts` exist; there is no Register screen or corresponding repository/API method beyond what's implied by `authApi`.

**AI provider integration does not exist yet.** `ContentScreen.tsx` (AI Content) and `AIChatScreen.tsx` (Chat Center placeholder) contain no AI provider calls — see `ai-provider-strategy.md` for the target abstraction, which has no implementation counterpart in the codebase today.

---

# 12. Severity & Priority Summary Table

| Gap | User-Visible Today? | Blocks Future Phases? | Roadmap Phase to Close |
|---|---|---|---|
| No Repository/Mock pattern | Indirectly (app requires live backend) | Yes — blocks nearly everything | Phase 0 |
| No test infrastructure | No | Yes — quality risk compounds with every phase | Phase 0 |
| Missing Products/Publishing/Customer Mgmt/AI Images | Yes | Yes — these are the roadmap itself | Phases 1–4 |
| In-memory-only auth token | Yes — session lost on restart | No, but degrades trust immediately | Phase 0 |
| Flat feature folders | No (structural only) | Grows worse as features are added without correction | Ongoing, grow-as-needed |
| Legacy `HomeScreen.tsx` | Minor (cosmetic/structural) | No | Phase 0 |
| Navigation stack vs. `context.md` mismatch | No (functions correctly) | Yes — ambiguity for all future navigation work | Phase 0 |
| No linting config | No | Minor, compounds slowly | Phase 0 (opportunistic) |
| No Register screen | Yes | No | Phase 1 |
| No AI provider integration | Yes (AI Content/Chat are placeholders) | Yes — blocks Phase 2 | Phase 2 |

---

# 13. Checklist: Before Claiming a Gap Is Closed

- [ ] The change is verified directly in the codebase, not assumed from a plan or PR description.
- [ ] This document is updated to move the gap out of the "open" list (or explicitly marked closed with the closing commit/PR referenced).
- [ ] Any knowledge file that referenced the gap as a reason for a decision (e.g., `roadmap.md`, `architecture-decisions.md`) is checked for consistency.

---

# 14. References

- `../constitution.md` — Mock First Development, Backend Independence, Feature Ownership, Testability, Documentation
- `../context.md` — Primary Features, Technology Stack, Mock API Strategy, Current Development Phase
- `./roadmap.md` — Phase 0, where most of these gaps are scheduled to close
- `./architecture-decisions.md` — ADR-0001, ADR-0003, ADR-0005, directly tied to gaps §4, §8, §10
- `./technology-stack.md` — MMKV and test-framework adoption triggers tied to gaps §5, §7
- `./ai-provider-strategy.md` — the design behind the AI integration gap noted in §11
