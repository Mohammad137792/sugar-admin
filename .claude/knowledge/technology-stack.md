---
id: knowledge-technology-stack
title: Technology Stack
category: knowledge
version: 1.0.0
status: active
owner: Product & Engineering
last_updated: 2026-07-18
---

# Technology Stack

> A precise, honest split between what is currently installed and in use versus what `context.md` targets but has not yet been adopted.

---

## Table of Contents

1. Purpose
2. Scope
3. Currently Installed & In Use
4. Target Stack Not Yet Installed
5. Open Decision: Navigation
6. Version Notes and Risks
7. Summary Table
8. Checklist: Before Adding a New Dependency
9. References

---

# 1. Purpose

`context.md`'s Technology Stack section states the intended stack in aspirational terms (React Native, Expo, TypeScript, Zustand, TanStack Query, React Hook Form, Zod, NativeWind, Expo Router, MMKV, Expo Notifications, Expo Image, FlashList). This document reconciles that list against `package.json` as it actually exists today, so that any engineer or AI agent can answer "is this dependency actually available right now?" without having to check `package.json` themselves every time. It also states, for every not-yet-installed item, why `context.md` targets it and what should trigger adopting it.

---

# 2. Scope

In scope: every dependency named in `context.md`'s Technology Stack section, cross-checked against `package.json`, plus the navigation open decision (see `architecture-decisions.md` ADR-0005). Out of scope: transitive dependencies not directly named by `context.md`, and backend-side technology (see `future-backend-migration.md`).

---

# 3. Currently Installed & In Use

Verified directly from `package.json` at the time of writing:

| Package | Version | Role |
|---|---|---|
| `react-native` | 0.85.3 | Core mobile framework |
| `expo` | 56.0.11 | Managed React Native tooling/runtime |
| `react` | 19.2.3 | UI library |
| `typescript` | 5.9.3 (devDependency) | Static typing |
| `@react-navigation/native` | 7.3.1 | Navigation container |
| `@react-navigation/native-stack` | 7.17.3 | Stack navigator — see §5, Open Decision |
| `zustand` | 5.0.14 | Global client state (`authStore`, `uiStore`) |
| `@tanstack/react-query` | 5.101.0 | Server state / data fetching cache |
| `axios` | 1.18.0 | HTTP client (`src/api/client.ts`) |
| `nativewind` | 4.2.5 | Tailwind-style utility styling for React Native |
| `tailwindcss` | 3.4.19 | Utility CSS engine backing NativeWind |
| `react-native-reanimated` | 4.3.1 | Animation engine |
| `react-native-worklets` | 0.8.3 | Reanimated 4's required worklets runtime |
| `react-native-svg` | 15.15.5 | SVG rendering (used by `Logo.tsx` and icon-style components) |
| `expo-blur` | 56.0.3 | Blur view effects |
| `expo-linear-gradient` | 56.0.4 | Gradient rendering (used in `HomeScreen.tsx` buttons/accents) |
| `expo-status-bar` | 56.0.4 | Status bar control |
| `react-native-safe-area-context` | ~5.7.0 | Safe-area-aware layout |
| `react-native-screens` | 4.25.2 | Native screen optimization for navigation |
| `@types/react` | 19.2.0 (devDependency) | React type definitions |
| `babel-preset-expo` | 56.0.15 (dependency) | Expo's Babel preset |

**Notably absent from `devDependencies`:** any test framework, any linter package (no ESLint/Prettier config or dependency observed), and any form/validation library.

---

# 4. Target Stack Not Yet Installed

Each item below is named in `context.md`'s Technology Stack section but is not present in `package.json` today. For each: why `context.md` targets it, and what should trigger adopting it.

## React Hook Form

**Target reason:** `context.md` names React Hook Form under "Forms," paired with Zod. Form-heavy features (Authentication's Register, Products' create/update, Customer Management's profile editing) all need consistent, performant form state handling with minimal re-renders, which is React Hook Form's specific strength in a React Native context (uncontrolled-style field registration vs. re-rendering on every keystroke).

**Adoption trigger:** the first feature plan requiring a non-trivial form (more than one or two fields, or requiring validation) should introduce it — Login (`LoginScreen.tsx`) may currently use ad hoc `useState` field handling; the next form-bearing feature (Register, or Products' create form in Phase 1 per `roadmap.md`) is the natural adoption point.

## Zod

**Target reason:** paired with React Hook Form for schema-based validation. Per `constitution.md`'s Security Philosophy, "input validation should never rely solely on UI" — Zod schemas provide a single, typed, reusable validation definition that can run both at the form layer and, ideally, be shared with repository-layer validation (mock repositories are required to simulate validation per `constitution.md`'s Mock First Development).

**Adoption trigger:** same as React Hook Form — introduce together, at the first non-trivial form, and reuse the same Zod schema for the corresponding repository contract's input validation (see `10-feature-planner.md` §10).

## MMKV

**Target reason:** `context.md` names MMKV under "Storage." MMKV is a fast, synchronous, encryptable key-value store appropriate for persisting the auth token and other small pieces of state that must survive an app restart — directly solving the gap named in `current-limitations.md` where `authStore` currently persists nothing.

**Adoption trigger:** Phase 0 of `roadmap.md` ("give `authStore` real persistence") is the concrete trigger — this is the single highest-priority not-yet-installed dependency, since session persistence is a basic, expected behavior of any authenticated mobile app and its absence is actively user-visible today.

## Expo Notifications

**Target reason:** `context.md` names Expo Notifications under "Notifications." Needed for time-sensitive product surfaces — new Chat Center messages (Phase 3), scheduled Publishing confirmations/failures (Phase 2), and eventually Marketing Automation triggers (`future-modules.md` §10) all benefit from push notifications reaching the owner even when the app is backgrounded, which matters given the response-time-sensitive workflows documented in `target-users.md`.

**Adoption trigger:** Phase 2 (Publishing) or Phase 3 (Chat Center) per `roadmap.md`, whichever ships first — a "your post failed to publish" or "you have a new customer message" notification is core to both features' reliability promise (see `product-vision.md` §9, "What Reliable Means").

## Expo Image

**Target reason:** `context.md` names Expo Image under "Images." React Native's built-in `Image` component lacks the caching, placeholder, and performance characteristics Expo Image provides, which matters heavily for Sugar Admin given how image-dense the product is (Products' product photos, AI Images' generated/edited images, Chat Center's attachments).

**Adoption trigger:** Phase 1 (Products, which introduces the first real image-heavy list/grid UI) per `roadmap.md` — deferring this to Phase 4 (AI Images) would mean Phase 1's product image UI is built against the wrong component and needs rework.

## FlashList

**Target reason:** `context.md` names FlashList under "Lists." React Native's built-in `FlatList` has known performance ceilings for long, frequently-updating lists; FlashList is the higher-performance alternative, aligned with `constitution.md`'s Performance Philosophy ("efficient lists" is explicitly named in `context.md`'s Performance Goals).

**Adoption trigger:** the first feature with a genuinely long, scrollable list of records — most likely Products' list/search view (Phase 1) or Chat Center's message list (Phase 3). Small, bounded lists (e.g., a Dashboard's Quick Actions row) do not need it.

## Test Framework

**Target reason:** not explicitly named in `context.md`'s Technology Stack section, but required by `constitution.md`'s Definition of Done ("Tests are written where appropriate") and Feature Ownership (every feature owns "tests" as a listed responsibility). No test framework (Jest, `@testing-library/react-native`, or otherwise) is installed, and no test files exist anywhere in the repository. See `current-limitations.md` for the full gap assessment.

**Adoption trigger:** should be adopted during Phase 0 (`roadmap.md`), before Phase 1 feature work begins in earnest — introducing a test framework after several features already exist untested is a much larger retrofit than establishing it as a foundation-phase task.

---

# 5. Open Decision: Navigation

`context.md`'s Technology Stack names "Expo Router" under Navigation. The actual installed and implemented navigation is `@react-navigation/native` + `@react-navigation/native-stack`, configured imperatively in `src/navigation/AppNavigator.tsx`, `AuthNavigator.tsx`, and `types.ts` — there is no `app/` directory and no file-based routing anywhere in the repository.

This is flagged here as an **open decision**, not a settled fact in either direction:

- **If React Navigation is formally adopted:** `context.md` should be updated to reflect reality, and `docs/decisions/adr-0005-react-navigation-over-expo-router.md` should record why (e.g., React Navigation's more mature TypeScript param-list typing, which `types.ts` already leans on, or team familiarity).
- **If Expo Router is adopted instead:** this would require migrating `src/navigation/*` into a file-based `app/` structure, which is a non-trivial rewrite touching every existing screen's navigation entry points, and should not be undertaken without a Chief-Architect-approved migration plan given how much of the existing codebase (all five feature screens plus `HomeScreen.tsx`) already depends on the current `types.ts` param-list convention.

See `architecture-decisions.md` ADR-0005 for the full framing of this as a real, notable drift worth resolving deliberately rather than by default.

---

# 6. Version Notes and Risks

- `expo` 56.x and `react-native` 0.85.3 are recent major versions as of this writing — dependency choices for any new library should be checked for React Native 0.85 / Expo 56 / React 19 compatibility before adoption, since some ecosystem libraries lag behind the latest Expo SDK release.
- `react-native-reanimated` 4.x requires `react-native-worklets` as a peer, which is already correctly installed (0.8.3) — any new animation-heavy feature work should confirm this pairing stays in sync on future upgrades.
- No lockfile behavior or package manager is asserted here beyond what's visible in `package.json` — engineers should verify the actual package manager in use (npm/yarn/pnpm) via the presence of a lockfile before adding dependencies.

---

# 7. Summary Table

| Category | Installed & In Use | Target, Not Yet Installed |
|---|---|---|
| Core mobile | React Native, Expo, TypeScript, React | — |
| Navigation | React Navigation (native + native-stack) | Expo Router (open decision, §5) |
| State | Zustand | — |
| Data fetching | TanStack Query | — |
| Forms | — | React Hook Form, Zod |
| Styling | NativeWind, StyleSheet (hybrid, see ADR-0004) | — |
| Storage | — (in-memory only) | MMKV |
| Notifications | — | Expo Notifications |
| Images | `expo-linear-gradient`, `expo-blur`, `react-native-svg` (visual effects) | Expo Image (list/grid image rendering) |
| Lists | — (implied `FlatList` or manual `ScrollView`) | FlashList |
| Testing | — | Jest / `@testing-library/react-native` (unnamed in `context.md`, required by `constitution.md`) |
| Networking | axios | — |
| Animation | react-native-reanimated + worklets | — |

---

# 8. Checklist: Before Adding a New Dependency

- [ ] Confirm the dependency is either already named in `context.md`'s Technology Stack, or get Chief Architect sign-off if it is not (`00-chief-architect.md` §4, "dependency management").
- [ ] Confirm React Native 0.85 / Expo 56 / React 19 compatibility.
- [ ] Confirm it does not duplicate an existing installed dependency's responsibility (e.g., do not add a second HTTP client alongside axios, a second animation library alongside Reanimated).
- [ ] Update this document's §3/§4 tables when the dependency lands in `package.json`.

---

# 9. References

- `../context.md` — Technology Stack section (source of the target list)
- `../../package.json` — ground truth for what's actually installed
- `./architecture-decisions.md` — ADR-0004 (Hybrid Styling), ADR-0005 (Navigation open decision)
- `./current-limitations.md` — the user-visible consequences of missing MMKV, test framework, etc.
- `./roadmap.md` — Phase 0/1/2/3 adoption triggers referenced throughout §4
