---
id: rule-folders
title: Folder Structure Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_features
  - all_components
  - all_repositories
last_updated: 2026-07-18
---

# Folder Structure Rules

> Folders communicate architecture. If a contributor has to ask "where does this go," the folder structure has already failed. — `../agents/00-chief-architect.md` § 3

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

The constitution and `../context.md` both declare Feature-First folder ownership: components, hooks, repository, services, state, types, constants, tests, all inside the feature.

The actual `src/features/*/` folders today contain exactly one subfolder: `screens/`. This file states that gap plainly, defines the target shape, and gives the concrete rule for where a new file goes **today**, while the codebase is mid-migration toward the target.

---

# 2. Scope

Applies to every folder under `src/`, with specific rules for `src/features/`, `src/components/`, and the flat top-level folders (`src/constants/`, `src/context/`, `src/store/`, `src/types/`, `src/api/`).

---

# 3. Rules

## Rule 1 — Target feature shape is fixed; do not invent a variant

Every feature folder, once it outgrows a single screen file, takes this shape:

```
src/features/<feature-name>/
  screens/        # route-level screens, one file per screen
  components/     # components used only by this feature (not shared app-wide)
  hooks/          # business logic, data-fetching hooks (wrap TanStack Query + repository)
  repository/     # repository interface + mock implementation + real implementation
  state/          # feature-scoped Zustand store, only if truly needed (see state.md)
  types/          # feature-specific types not shared elsewhere
  constants/      # feature-specific constants (copy strings live in i18n, not here)
  tests/          # unit and integration tests for this feature
  index.ts        # public API — the only things another feature may import
```

**Why:** Predictability, per the constitution — a contributor who learns this shape once can navigate any feature without re-learning conventions per folder. `../agents/10-feature-planner.md` § 10–12 already assumes this shape when it defines Repository Contract, State Shape, and Navigation Entry standards; the folder structure is where those standards physically land.

## Rule 2 — Current reality: only `screens/` exists per feature. State this explicitly in any new plan.

`src/features/{ai-chat,auth,content,dashboard,reports}/` each contain only `screens/<Name>Screen.tsx`. There is no `components/`, `hooks/`, `repository/`, `state/`, `types/`, `constants/`, or `tests/` anywhere in the repo yet.

**Why acknowledging this matters:** silently assuming the target shape already exists leads to new code importing from folders that don't exist, or worse, new code copying the flat `screens/`-only pattern because "that's what's there." State the gap so the next decision is deliberate.

## Rule 3 — Where new files go today

When a feature needs more than a screen file, create the missing subfolder as part of that PR — do not wait for a separate "restructure" PR. Specifically:

- A component used only by one feature → `src/features/<feature>/components/`, not `src/components/`.
- A data-fetching or business-logic hook → `src/features/<feature>/hooks/`.
- A new repository → `src/features/<feature>/repository/`, per `repositories.md`.
- A type used only within one feature → `src/features/<feature>/types/`, not `src/types/index.ts`.
- A Zustand store scoped to one feature → `src/features/<feature>/state/`, per `state.md`.

**Why:** this is how the codebase migrates from flat to Feature-First incrementally, feature by feature, driven by real need — not a risky big-bang rewrite. It matches the constitution's Small Units principle: add structure exactly when a module demands it, not before.

## Rule 4 — `src/screens/HomeScreen.tsx` is legacy; do not add siblings to it

`src/screens/` sits outside `src/features/` entirely and holds one file, `HomeScreen.tsx`. This predates Feature-First adoption in this codebase.

**Why:** two parallel top-level "screen" locations (`src/screens/` vs `src/features/*/screens/`) is exactly the kind of folder ambiguity the constitution's Predictability principle forbids. `HomeScreen.tsx` is documented technical debt (constitution's Technical Debt section: the reason is "predates the current architecture," the follow-up plan is "migrate into a `home` or `landing` feature module when next touched," the impact is "cosmetic — no other code imports it besides `AppNavigator.tsx`"). No new file is added to `src/screens/`.

## Rule 5 — Shared code lives in `src/components/`, `src/constants/`, `src/context/`, `src/types/` only when genuinely shared

`src/components/ui/` (Avatar, Badge, Button, Card, Divider, IconButton, Input, Row, Screen, Spacer, Typography) and `src/components/GlassCard.tsx` / `GlassPill.tsx` / `Logo.tsx` are correctly placed — they are used, or intended to be used, by more than one feature. `src/constants/colors.ts`, `theme.ts`, `typography.ts`, `src/context/ThemeContext.tsx`, `LanguageContext.tsx`, and `src/types/index.ts` are similarly app-wide.

**Why:** per `../context.md`'s Folder Philosophy — "Shared code exists only when it is genuinely reusable." Promoting a feature-specific type or component to a shared folder "just in case" is speculative architecture and is rejected in review (see `architecture.md` Rule 8).

## Rule 6 — `src/types/index.ts` is a known migration target, not a dumping ground for new types

Today `src/types/index.ts` holds `User`, `LoginCredentials`, `AuthTokens`, `ApiResponse<T>`, `PaginatedResponse<T>`, `ContentItem`, `Stat`, `ChatMessage`, `Toast` — a mix of genuinely global types (`ApiResponse`, `PaginatedResponse`, `Toast`) and feature-specific types that should have moved into their feature (`ContentItem` belongs to `content`, `ChatMessage` belongs to `ai-chat`, `Stat` belongs to `dashboard`).

**Why to flag rather than fix immediately:** moving `ContentItem` out of the shared file today would break `src/api/endpoints/content.ts` and any other import without a coordinated PR. New feature-specific types are added to the new feature's own `types/` folder going forward (Rule 3); existing entries in `src/types/index.ts` are migrated feature-by-feature as those features are next touched, per the constitution's Technical Debt section — not all at once, and not as a side effect of unrelated work.

## Rule 7 — One repository owns one domain; one repository file does not span features

A repository interface named `ProductRepository` lives inside `src/features/products/repository/`. It never grows a method for an unrelated domain (e.g. a `sendChatMessage` method bolted onto `ProductRepository` because "it was convenient").

**Why:** the constitution's Single Responsibility principle: "every repository should represent one domain." A repository that spans domains cannot be swapped, mocked, or tested independently of the domain it wasn't meant to own.

---

# 4. Good Examples

## Good: introducing a repository for a new feature

```
src/features/products/
  screens/
    ProductListScreen.tsx
  repository/
    ProductRepository.ts        # interface
    mockProductRepository.ts    # mock implementation
  hooks/
    useProducts.ts
  types/
    Product.ts
  index.ts                      # exports ProductListScreen, useProducts (public API)
```

This is good because every new concern (data, business logic, types) got its own subfolder immediately, instead of being crammed into `ProductListScreen.tsx`.

## Bad: growing a feature by adding to the screen file

```
src/features/products/screens/ProductListScreen.tsx
// now contains: the screen component, a hand-rolled fetch call,
// a Product type definition, and a formatPrice() helper — 340 lines, one file.
```

**Consequence:** mirrors the current `dashboard`/`content`/`reports`/`ai-chat` screens, which is acceptable at "coming soon" placeholder size but becomes unmaintainable the moment real logic is added. Once a screen file needs a type, a data call, or a non-trivial helper, split it per Rule 3 in the same PR.

---

# 5. Bad Examples

## Bad: a shared component that is actually feature-specific

```
src/components/ui/ProductCard.tsx   // only ever used by the products feature
```

**Consequence:** every other feature's engineer now sees `ProductCard` in the shared `ui/` barrel and either uses it somewhere it doesn't belong, or has to read its implementation to confirm it's safe to ignore. It belongs in `src/features/products/components/ProductCard.tsx`.

---

# 6. Checklist

- [ ] New feature-specific components live in `src/features/<feature>/components/`, not `src/components/`.
- [ ] No new file added to `src/screens/`.
- [ ] New repository interfaces live in `src/features/<feature>/repository/`.
- [ ] New feature-specific types live in `src/features/<feature>/types/`, not appended to `src/types/index.ts`.
- [ ] A repository file represents exactly one domain.
- [ ] If a screen file has grown past a single clear responsibility, it has been split into `hooks/`, `repository/`, and/or `components/` in this same PR.
- [ ] Nothing was promoted to a shared folder (`src/components/`, `src/constants/`, `src/types/`) without being genuinely used by more than one feature.

---

# 7. References

- `../constitution.md` — Feature Ownership, Single Responsibility, Predictability, Technical Debt
- `../context.md` — Folder Philosophy
- `architecture.md` — layering rules this folder shape exists to support
- `repositories.md` — what goes inside `repository/`
- `state.md` — what goes inside `state/`
- `naming.md` — how files inside each folder are named
- `../agents/10-feature-planner.md` § 10–12 — contracts that assume this folder shape
