---
id: handbook-architecture
title: Architecture Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Architecture Handbook

> "Will this still work after 100 features?" — Chief Architect, `00-chief-architect.md` § 3

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The System Today
5. The Layering Model
6. How the Pillars Compose
7. Scaling to 9 Feature Modules and 5 Platforms
8. Good Examples
9. Bad Examples
10. Decision Trees
11. Real Project Examples
12. Common Mistakes
13. Best Practices
14. Checklist
15. References

---

# 1. Purpose

This handbook explains how Sugar Admin is actually put together, today, in this repository — and how that structure is meant to grow. `constitution.md` states the values (Simplicity Wins, Separation of Concerns, Backend Independence, Replaceability). This document is the bridge between those values and the specific files in `src/`.

Every other handbook in this workspace (`repository-pattern.md`, `feature-structure.md`, `folder-structure.md`, `navigation.md`, `state-management.md`) is a zoomed-in view of one part of the picture drawn here. Read this one first.

---

# 2. Scope

In scope: the whole-app composition root (`App.tsx`), the layering model (Presentation / Business / Data), how the four architectural pillars — Feature-First, Repository Pattern, Backend Independence, Mock-First — are meant to compose in this specific codebase, and how the current seven feature folders are expected to grow to the nine features named in `context.md` (Auth, Dashboard, Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, Analytics) across five publishing platforms (Instagram, Telegram, Bale, Rubika, Eita).

Out of scope: the internal shape of a single feature folder (see `feature-structure.md`), the exact repository interface syntax (see `repository-pattern.md`), navigation param lists (see `navigation.md`), and state classification rules (see `state-management.md`).

---

# 3. Principles

This handbook is grounded in these constitution sections:

- **Separation of Concerns** (constitution.md § "Separation of Concerns") — Presentation renders, Business decides, Data persists. Sugar Admin currently only has two of these three layers cleanly separated; see § 4.
- **Backend Independence** (constitution.md § "Backend Independence") — the frontend must never depend on a specific backend. Today's `src/api/endpoints/*.ts` violates this by calling `axios` directly (see § 8, § 9).
- **Feature Ownership** (constitution.md § "Feature Ownership") — every feature owns its own components, hooks, repository, services, state, types, constants, and tests. Cross-feature imports go through public APIs only.
- **Replaceability** (constitution.md § "Replaceability") — backend, AI provider, storage, and auth mechanism must each be swappable in isolation.
- **Predictability** (constitution.md § "Predictability") — a new contributor should be able to guess where code belongs without asking.

---

# 4. The System Today

`App.tsx` is the composition root. Reading it top to bottom tells you the entire dependency order of the app:

```tsx
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <Root />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

Reading this nesting outward-in tells you what each inner layer can assume exists above it:

- `QueryClientProvider` is outermost — server-cache access (TanStack Query) is available to literally everything, including theme/language providers if they ever needed it (they don't, today).
- `ThemeProvider` wraps `LanguageProvider` — theme does not depend on language, but language-aware components (screens use `isRTL` for text alignment) render inside both.
- `Root` reads `useLanguage()` for `isRTL` and `useTheme()` for `colors`/`isDark`, and builds the React Navigation theme object (`navTheme`) by merging `DarkTheme`/`DefaultTheme` with the sugar palette's `bg`/`surface`. This is the one place navigation theme and app theme are stitched together.
- `NavigationContainer` wraps `AppNavigator` — and this is the first architectural gap worth naming honestly: **`Root` renders `AppNavigator` unconditionally.** There is no `RootNavigator` that switches between `AuthNavigator` and `AppNavigator` based on `useAuthStore().isAuthenticated`, even though `src/navigation/types.ts` defines a `RootStackParamList` with `Auth` and `App` members specifically for that purpose. `AuthNavigator.tsx` exists, is fully wired to `LoginScreen`, and is never mounted anywhere. This is real, current technical debt — flagged here and in `navigation.md`, not fixed silently by this handbook.

The `QueryClient` itself is configured once, at module scope, outside any component:

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } },
});
```

This is intentional: a `QueryClient` must be a stable singleton for the lifetime of the app, not re-created on render. See `performance.md` § 5 for why `retry: 2` and `staleTime: 5min` were chosen.

---

# 5. The Layering Model

The constitution defines three layers: Presentation, Business, Data. Mapping them onto this repository:

**Presentation layer** — `src/features/*/screens/*.tsx`, `src/screens/HomeScreen.tsx`, `src/components/**`. Owns rendering, `TouchableOpacity` handlers, `StyleSheet` objects, `useTheme()`/`useLanguage()` reads. Every screen file read during grounding (`LoginScreen.tsx`, `DashboardScreen.tsx`, `ContentScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx`) respects this today — none of them contain a `fetch`/`axios` call or business validation logic inline. That discipline must hold as features grow.

**Business layer** — this is the layer Sugar Admin does **not** yet have a dedicated home for. Today, the closest thing to "business logic" is the try/catch/set-state sequencing inside `src/store/authStore.ts`'s `login`/`logout`/`hydrate` actions — decisions like "on 401, clear the token and flip `isAuthenticated` to false" live inside the Zustand store, not a separate service. For a two-store app this is acceptable (see `state-management.md` § 6). As features like Publishing (multi-platform retry/fallback logic) and AI Content (provider selection, fallback-on-timeout) are added, business logic that doesn't belong in a component and isn't pure data-fetching should live in a feature's `services/` folder (see `feature-structure.md` § 4) — not inline in a screen, and not smuggled into a repository method.

**Data layer** — `src/api/client.ts` (the shared axios instance) and `src/api/endpoints/*.ts` (per-domain endpoint callers) today. This layer is supposed to be hidden behind repository interfaces per the constitution's Repository Pattern principle (`context.md` § "Architecture Principles"), but currently is not — see `repository-pattern.md` for the full gap analysis and migration plan.

```
Presentation  (screens, components)
     │  reads/calls
     ▼
Business      (store actions, feature services — thin today)
     │  reads/calls
     ▼
Data           (repositories — target; axios endpoints — current)
```

A dependency must never point upward. A repository must never import a screen. A screen must never import `axios` or `client` directly (see § 9 for a violation of this rule that already exists).

---

# 6. How the Pillars Compose

The four architecture principles from `context.md` § "Architecture Principles" are not independent — they reinforce each other:

- **Feature-First** decides *where* code lives (inside `src/features/<name>/`).
- **Repository Pattern** decides *how* a feature talks to data (`FeatureRepository` interface, mock/real implementations behind it).
- **Backend Independence** is the *outcome* you get when Feature-First and Repository Pattern are both followed correctly — swap the repository implementation, the feature folder and every component inside it are untouched.
- **Mock-First Development** is the *default state* every repository is built in before Backend Independence is ever tested against a real backend. If a feature ships without a working mock, Backend Independence was never actually verified — only assumed.

Concretely: when `network-engineer` (per `10-feature-planner.md` handoff rules) implements a `ProductRepository`, they write `MockProductRepository` first, feature-complete, simulating latency/failure/pagination (see `mock-api.md`). The `RealProductRepository` (axios or otherwise) is written against the exact same interface, later, without touching a single component in `src/features/products/`. That is Backend Independence, demonstrated rather than asserted.

---

# 7. Scaling to 9 Feature Modules and 5 Platforms

`context.md` names nine primary features: Authentication, Dashboard, Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, Analytics. Today, `src/features/` has seven folders, and they map unevenly onto that list:

| context.md feature | src/features/ folder today | Status |
|---|---|---|
| Authentication | `auth/` | Screens only (`LoginScreen.tsx`); no repository, no register flow |
| Dashboard | `dashboard/` | Screen with hardcoded `MOCK_STATS` array, no repository |
| Products | *(none yet)* | Not started |
| AI Content | `content/` | Placeholder screen only ("Coming soon...") — name overlap risk, see below |
| AI Images | *(none yet)* | Not started |
| Publishing | *(none yet)* | Not started |
| Customer Management | *(none yet)* | Not started |
| Chat Center | `ai-chat/` | Placeholder screen only |
| Analytics | `reports/` | Placeholder screen, naming diverges from context.md's "Analytics" |

Two naming risks worth flagging now, before more code is written on top of them: `content/` reads as "AI Content" today but a future "Content" feature and "AI Content" feature could be conflated — when the AI Content feature is actually built, confirm with `chief-architect` whether `content/` is renamed or whether AI Content becomes its own module (per `10-feature-planner.md` § 16 "new feature module" decision tree). Likewise `reports/` vs. context.md's "Analytics" naming should be reconciled in one direction, not left to drift.

Scaling to five publishing platforms (Instagram, Telegram, Bale, Rubika, Eita) is a Publishing-feature concern, not a whole-app architecture concern — but it has one whole-app implication: no shared component or type should assume "one platform." `ContentItem` in `src/types/index.ts` today has no platform field at all; when Publishing is built, per-platform status (e.g. "published on Instagram, failed on Telegram") must be modeled as a first-class shape, not bolted onto `ContentItem` as an afterthought. See `10-feature-planner.md` § 13 "Platform" edge case catalog.

---

# 8. Good Examples

**Good: a screen that stays purely presentational.**

```tsx
// src/features/dashboard/screens/DashboardScreen.tsx (current, real)
export default function DashboardScreen() {
  const { isRTL } = useLanguage();
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "خلاصه وضعیت" : "Overview"}
      </Text>
      {/* ...renders MOCK_STATS, no fetch call, no business decision */}
    </ScrollView>
  );
}
```

This is good, structurally — the screen makes zero networking or business decisions. The only debt is that `MOCK_STATS` is hardcoded in the screen file rather than coming from a repository (see `repository-pattern.md` § 6 for the fix).

**Good: a single composition root, no duplicated providers.**

Every provider (`QueryClientProvider`, `ThemeProvider`, `LanguageProvider`) is instantiated exactly once, in `App.tsx`, and nowhere else in the tree. No screen or component re-wraps itself in a redundant provider "just in case."

---

# 9. Bad Examples

**Bad: a data layer that isn't isolated (this exists in the repo today).**

```ts
// src/api/endpoints/content.ts — current, real
import client from "../client";
export const contentApi = {
  list: (page = 1, limit = 20) =>
    client.get<PaginatedResponse<ContentItem>>("/content", { params: { page, limit } }),
  // ...
};
```

This is bad relative to the target architecture (not "wrong for its era" — it is exactly what Mock-First and Repository Pattern development is supposed to prevent): `contentApi` is a thin axios wrapper with a real `baseURL` pointed at `https://api.sugar-admin.com/v1` (`src/config/env.ts`), no mock implementation behind an interface, and every consumer that imports `contentApi` is implicitly coupled to "this data comes from REST over axios." Swapping to GraphQL or a mock-only development mode means editing every call site, not one repository file. This is the exact gap `repository-pattern.md` exists to close.

**Bad: an unauthenticated route stack that's silently unreachable.**

`AuthNavigator.tsx` and `RootStackParamList` exist, fully coded, and are never mounted. A new contributor reading `src/navigation/types.ts` would reasonably assume the app gates `AppNavigator` behind `useAuthStore().isAuthenticated` — it does not. This is the kind of hidden coupling (here, hidden *disconnection*) that `00-chief-architect.md` § 5 Principle 5 ("prefer explicit boundaries") warns against. Documented as known debt; see `navigation.md` § 6 for the concrete fix.

---

# 10. Decision Trees

## Where does new code belong?

```
Does the code render UI or handle a user gesture?
  → Yes: Presentation layer — src/features/<feature>/screens or components.
  → No: does it make a decision, apply a business rule,
        or orchestrate multiple data calls?
      → Yes: Business layer — a store action (if truly global) or a
        feature-local service (src/features/<feature>/services/, target
        shape — see feature-structure.md).
      → No: does it fetch, persist, or serialize data?
          → Yes: Data layer — a repository method (target) or, today,
            an endpoints/*.ts function (current, being migrated).
```

## Does this belong in a new feature module?

See `10-feature-planner.md` § 16 — reproduced here because it is an architecture-level decision, not just a planning-level one:

```
Does the work primarily serve an existing feature's users
and reuse its data?
  → Yes: add to the existing feature module.
  → No: does it introduce a new domain concept
        (e.g. "Chat" vs "Products")?
      → Yes: propose a new feature module, confirm with chief-architect.
      → No: it is a shared component/hook, not a feature.
```

---

# 11. Real Project Examples

- **`App.tsx`** — the entire provider composition. Read this file before touching any provider-level concern. It is short (40 lines) by design (constitution's Simplicity Wins) — do not add a fifth provider without asking whether it truly needs to wrap the whole app or can be feature-scoped.
- **`src/store/authStore.ts`** — the sharpest example in the codebase of Business logic (login/logout/401-handling decisions) living inside what is nominally a "state" file. Discussed in depth in `state-management.md` § 5 and `security.md` § 3.
- **`src/api/client.ts`** — the single axios instance every endpoint file shares. Notice it imports nothing from `src/store` — the `(globalThis as any).__authToken` / `__onUnauthorized` bridge exists specifically to keep this file's dependency direction pointing only *downward* (config → client), never upward into state. See § 9 and `state-management.md` § 7 for the full trade-off discussion.
- **`src/navigation/AppNavigator.tsx`** vs **`src/navigation/AuthNavigator.tsx`** — two fully-built, never-connected navigators. A concrete, current example of the "Bad Example" in § 9.

---

# 12. Common Mistakes

- Adding a new top-level provider to `App.tsx` for a concern that only one feature needs. Scope it to that feature's screen tree instead.
- Importing `axios`/`client` directly inside a new feature's screen because "the repository isn't built yet." Write the mock repository first — that is what Mock-First means, not a suggestion to skip it under time pressure.
- Treating `src/screens/HomeScreen.tsx` as a template for new screens. It predates Feature-First and lives outside `src/features/` — see `folder-structure.md` § 5 for why it's a flagged exception, not a pattern to copy.
- Assuming `AuthNavigator` is live because it exists and is well-written. It is not mounted. Verify by reading `App.tsx`, not by reading `src/navigation/*.ts` in isolation.

---

# 13. Best Practices

- Read `App.tsx` first when onboarding — it is the map of the whole app's dependency order in 40 lines.
- When a new feature is proposed, run it through § 6's four-pillar composition before writing a single component: where's the folder, where's the repository interface, is the mock complete, does the UI actually depend on backend specifics anywhere.
- When you find a gap like § 4's unmounted `AuthNavigator`, document it in the relevant handbook (as done here) rather than silently fixing it inside an unrelated PR — per constitution's Technical Debt section, undocumented debt is prohibited, but so is scope creep that fixes it without review.
- Keep the composition root boring. `App.tsx` should stay readable top-to-bottom in under a minute for the life of the project.

---

# 14. Checklist

- [ ] New code placed using § 10's decision tree, not by copying the nearest existing file.
- [ ] New feature module confirmed against § 7's table — no accidental overlap with an existing `src/features/` folder.
- [ ] No new top-level provider added to `App.tsx` without confirming it's truly app-wide.
- [ ] No direct `axios`/`client` import inside a screen or component.
- [ ] Any newly discovered architectural gap (like § 4, § 9) is documented, not silently patched.

---

# 14.5 Why These Four Pillars and Not Others

It is worth explaining, once, why Sugar Admin standardized on Feature-First + Repository Pattern + Backend Independence + Mock-First instead of alternatives, because a new contributor will eventually ask "why not just use a service layer" or "why not co-locate everything by technical type (all screens together, all hooks together)."

**Why not a technical-layer folder structure (`src/screens/`, `src/hooks/`, `src/services/` at the top level)?** This is what `src/screens/HomeScreen.tsx` is a leftover fragment of. It optimizes for "find all screens" and pessimizes for "understand one feature." Constitution's Predictability principle asks: can a new contributor guess where Publishing code lives? Under a technical-layer structure, Publishing code is scattered across five top-level folders. Under Feature-First, it's in `src/features/publishing/`. Sugar Admin chose the latter and is actively migrating away from the former (see `folder-structure.md` § 5).

**Why a Repository Pattern instead of calling `axios` from a custom hook per screen?** A custom hook per screen (`useProducts()`, `useProductDetail()`) is a common React pattern and is not wrong on its own — but it still hard-codes "data comes from HTTP" into the hook. A repository interface separates "what data does this feature need" (the interface) from "how is it fetched today" (the implementation). The hook can — and should — still exist, but it calls the repository, not `axios` directly. See `repository-pattern.md` § 4 for the full three-layer shape (component → hook → repository).

**Why Mock-First instead of "build against a real backend once one exists"?** There is no backend yet (`context.md` § "Current Development Phase": Backend — Not implemented). Waiting for a backend to exist before building UI would block all feature work indefinitely. Mock-First turns that blocker into a design forcing-function: every repository interface must be fully specified — including failure and empty states — before any real backend exists, which produces a *better* interface than one designed against a single backend's happy-path shape.

**Why is Backend Independence a top-level architectural pillar rather than an implementation detail?** Because `context.md` explicitly states the backend technology is undecided and may become Express, NestJS, Supabase, Firebase, a custom REST API, or GraphQL. An architecture that leaks backend assumptions into UI code would need to be partially rewritten every time that decision changes. Backend Independence is the insurance policy against that rewrite.

---

# 14.6 Cross-Cutting Concerns That Don't Fit One Layer

Some concerns genuinely span Presentation, Business, and Data, and pretending they fit one layer creates worse architecture than acknowledging the overlap:

**Theming.** `ThemeContext` is consumed directly by Presentation components (`useTheme()` inside `Button.tsx`, `Card.tsx`, every screen) — that's correct, theming is fundamentally a rendering concern. But the *decision* of which mode is active (`system === "light" ? "light" : "dark"`, later a user override) is arguably Business-layer reasoning currently living inside `ThemeProvider` itself. For a two-state toggle this is fine. If theming grows more rules (e.g. scheduled dark mode, per-organization branding), extract the mode-selection logic out of the component and into a plain function that the provider calls, so it can be tested without rendering React.

**Internationalization.** Same shape as theming: `LanguageContext` mixes a Presentation concern (which strings render) with a Data concern (the `fa`/`en` dictionaries in `src/i18n/translations.ts` are effectively static data). This is acceptable at 16 translation keys. It will not scale cleanly to hundreds of keys across nine features — when that happens, translation *content* should move to per-feature files (`src/features/products/i18n.ts`) while `LanguageContext` remains the single Presentation-facing hook. Do not let every feature reach directly into a monolithic `translations.ts`.

**Error presentation.** The constitution's Error Philosophy (Loading/Empty/Error/Success/Retry/Offline/Timeout/Unauthorized) spans all three layers: Data layer produces the error (an axios rejection, a repository throw), Business layer decides what it means (retryable? session-ending?), Presentation layer renders the right state. `client.ts`'s 401 interceptor is the clearest existing example of Data-layer code making a Business-layer decision (session is over, trigger logout) — see `error-handling.md` § 4 for why that specific placement is defensible and where the line is.

---

# 14.7 Architecture Decision Record — Worked Example

To make § 23 of `00-chief-architect.md` concrete, here is what an ADR for an already-made decision in this codebase looks like, written retroactively so future decisions have a template to follow.

## ADR: Bridge auth token to axios via `globalThis`, not a store import

**Status:** Accepted, current implementation.

**Context:**

`src/api/client.ts` needs the current auth token on every request.

The token lives in `src/store/authStore.ts`, a Zustand store.

A Zustand store module could import nothing and be imported freely.

But `authStore.ts` already imports `authApi` from `src/api`.

If `client.ts` also imported `authStore`, the two modules would import each other.

That is a circular import.

**Decision:**

`client.ts` reads `(globalThis as any).__authToken` instead of importing the store.

`authStore.ts` writes to `(globalThis as any).__authToken` after login and on logout.

**Alternatives considered:**

A dedicated token-holder module (`src/auth/tokenStore.ts`) that both `client.ts` and `authStore.ts` import, with no logic of its own.

Rejected only in the sense that it was not chosen for the current implementation — it is the recommended fix, not a rejected idea. See `state-management.md` § 7 and `security.md` § 3.

**Consequences:**

The token is untyped at the boundary (`as any`).

The token is not persisted, so authentication does not survive an app restart.

The circular import is avoided without adding a new file.

**Follow-up:**

Tracked as technical debt per constitution's Technical Debt section: reason documented (this ADR), impact understood (`state-management.md` § 7), follow-up plan exists (extract a typed token module before Publishing or Chat Center — features with long-lived background operations — are built).

---

# 14.8 Glossary

**Composition root** — `App.tsx`. The one place providers are assembled.

**Feature module** — one folder under `src/features/`. Owns its own screens, and eventually components, hooks, repository, services, state, types, constants, tests.

**Repository** — the target abstraction between a feature and its data source. Not yet present in this codebase; `endpoints/*.ts` is the current stand-in. See `repository-pattern.md`.

**Backend Independence** — the property that swapping REST for GraphQL, or a real backend for a mock, requires changing only repository implementations, never UI code.

**Global state** — state held in `useAuthStore` or `useUIStore`, readable from anywhere, surviving navigation. Currently exactly two stores exist. A third is a significant decision, not a default. See `state-management.md`.

**Server cache** — state owned by TanStack Query, not Zustand. Represents data whose source of truth is a backend, not the client.

---

# 15. References

- [constitution.md](../constitution.md) — Separation of Concerns, Backend Independence, Feature Ownership, Replaceability.
- [context.md](../context.md) — Architecture Principles, Primary Features, Supported Platforms.
- [00-chief-architect.md](../agents/00-chief-architect.md) — § 8 Architectural Decision Process, § 20 Decision Trees.
- [10-feature-planner.md](../agents/10-feature-planner.md) — § 16 new-module decision tree.
- [repository-pattern.md](./repository-pattern.md) — full migration plan for the Data layer gap in § 9.
- [feature-structure.md](./feature-structure.md) — target internal shape of a feature module.
- [folder-structure.md](./folder-structure.md) — whole-repo top-level layout.
- [navigation.md](./navigation.md) — the unmounted `AuthNavigator` gap, in full.
- [state-management.md](./state-management.md) — the `authStore` business-logic discussion.
