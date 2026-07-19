---
id: rule-naming
title: Naming Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_components
  - all_hooks
  - all_repositories
  - all_features
last_updated: 2026-07-18
---

# Naming Rules

> "Names should communicate intent. Every file should clearly describe its responsibility." — `../context.md`, Naming Philosophy

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

`../context.md`'s Naming Philosophy explicitly bans generic names: `utils`, `helpers`, `manager`, `service1`, `component2`. This file turns that philosophy into per-file-type conventions, grounded in what already exists in `src/`.

---

# 2. Scope

Applies to every file, folder, component, hook, function, type, and constant added to the codebase.

---

# 3. Rules

## Rule 1 — Components are `PascalCase`, named after what they render

`Button.tsx`, `Card.tsx`, `Input.tsx`, `IconButton.tsx`, `Avatar.tsx`, `Badge.tsx`, `GlassCard.tsx`, `Logo.tsx` — every existing component in `src/components/` follows `PascalCase.tsx`, default-exported, filename matching the export name exactly.

**Why:** grep-ability. `Button` the import matches `Button.tsx` the file with zero translation. A mismatch (`button.tsx` exporting `PrimaryButton`) forces every reader to hold two names in their head for one concept.

## Rule 2 — Screens are named `<Noun>Screen.tsx`

`LoginScreen.tsx`, `DashboardScreen.tsx`, `ContentScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx` — every screen in `src/features/*/screens/` ends in `Screen`.

**Why:** it distinguishes a route-level component (owns a `Screen` wrapper, a `ScrollView`, top-level layout) from a reusable presentational component at a glance, without opening the file. It also matches the navigator's `component={XScreen}` wiring in `AppNavigator.tsx` / `AuthNavigator.tsx` directly.

## Rule 3 — Hooks are `camelCase`, prefixed `use`, named after what they return or do

`useTheme()`, `useLanguage()` exist today (as context consumers). A new data hook follows the same shape: `useProducts`, `useProductDetail`, not `useData` or `useFetch`.

**Why:** a hook name is a promise about its return value. `useProducts()` tells the reader what's in scope without opening the file; `useData()` tells the reader nothing and forces a lookup every time it's used.

## Rule 4 — Zustand stores are named `use<Domain>Store`

`useAuthStore`, `useUIStore` — both existing stores in `src/store/` follow this convention, exported from `src/store/index.ts` as a barrel.

**Why:** consistency with Rule 3 (it's still a hook), plus the `Store` suffix makes it visually distinct from a plain data hook when scanning imports — `useAuthStore` is global client state; `useProducts` is server cache. Conflating the two naming patterns would erase a distinction `state.md` depends on.

## Rule 5 — Generic names are banned outright: `utils`, `helpers`, `manager`, `service`, numbered suffixes

Per `../context.md`'s Naming Philosophy, the following are never used as a file, folder, or export name: `utils.ts`, `helpers.ts`, `manager.ts`, `service.ts`, `component1.tsx`, `service2.ts`, or any name suffixed with a number to disambiguate ("I already have a `Card`, so this one is `Card2`").

**Why:** a file named `utils.ts` accumulates unrelated functions over time because it has no responsibility to violate — nothing about the name constrains what goes in it. It becomes exactly the kind of large, unfocused module the constitution's Small Units and Single Responsibility principles forbid. A numbered suffix (`Card2`) signals a naming collision was never resolved — rename to describe the actual difference (`StatCard` vs `Card`), don't count upward.

**Concrete replacement pattern:** instead of `src/features/products/utils.ts` with a grab-bag of functions, write `src/features/products/formatPrice.ts`, `src/features/products/validateSku.ts` — one file, one function family, one clear name. If several small pure functions genuinely belong together, name the file after the shared responsibility (`priceCalculations.ts`), never `utils.ts`.

## Rule 6 — Repository interfaces are named `<Domain>Repository`; implementations are named after their backing strategy

`ProductRepository` (interface), `mockProductRepository` (mock implementation, `camelCase` because it's a value/instance, not a type), `restProductRepository` or `apiProductRepository` (future real implementation).

**Why:** the suffix pattern makes swappability visible in the name itself — anyone reading an import knows immediately whether they're looking at the contract or one specific implementation of it. See `repositories.md` for the full contract.

## Rule 7 — Types and interfaces are `PascalCase`; boolean-returning values read as a question

`User`, `LoginCredentials`, `AuthTokens`, `ApiResponse<T>`, `Toast` — all `PascalCase`, all in `src/types/index.ts` today. Booleans read as predicates: `isLoading`, `isAuthenticated`, `isDark`, `isRTL` — all four exist today in `authStore.ts` / `ThemeContext.tsx` / `LanguageContext.tsx` and follow this convention correctly.

**Why:** `loading: boolean` forces the reader to infer whether `true` means "is loading" or "has finished loading." `isLoading: boolean` has one possible reading.

## Rule 8 — Route names in navigation param lists are `PascalCase` nouns, matching the screen they point to

`Login`, `Register`, `Home`, `Dashboard`, `Content`, `Reports`, `AIChat` in `src/navigation/types.ts` — all `PascalCase`, all nouns, no `Screen` suffix (the suffix belongs on the component name, not the route name).

**Why:** matches the existing convention exactly; a route named `Screen` twice (`DashboardScreen` route pointing at `DashboardScreen` component) is redundant. Keep the route name as the "address" and the component name as the "implementation."

## Rule 9 — File names never abbreviate

`Dashboard`, not `Dash`. `Repository`, not `Repo`. `Configuration`, not `Config` — except where the codebase has already established a short form consistently (`src/config/env.ts` uses `config` as a folder name and `ENV` as the constant; this is accepted as an existing, consistent convention, not a new abbreviation to imitate elsewhere).

**Why:** per `../context.md` — "avoid abbreviations." An abbreviation saves a few keystrokes once and costs every future reader a moment of translation, repeated indefinitely.

---

# 4. Good Examples

```
src/features/products/screens/ProductListScreen.tsx      // Rule 2
src/features/products/hooks/useProducts.ts                // Rule 3
src/features/products/repository/ProductRepository.ts     // Rule 6
src/features/products/repository/mockProductRepository.ts // Rule 6
src/store/authStore.ts → useAuthStore                      // Rule 4
```

Each name states its responsibility without needing the file opened.

---

# 5. Bad Examples

```
src/features/products/utils.ts          // Rule 5 — banned generic name
src/features/products/ProductManager.ts // Rule 5 — "Manager" is a banned generic name
src/features/products/hooks/useData.ts  // Rule 3 — tells the reader nothing
src/components/ui/Card2.tsx             // Rule 5 — numbered disambiguation
```

**Consequence of `utils.ts` specifically:** six months from now this file contains fifteen unrelated functions — price formatting, date parsing, a debounce implementation, a deep-clone helper — because its name never constrained its contents. Splitting it later requires reading and re-categorizing all fifteen functions, then updating every import site. Naming it correctly the first time costs nothing.

---

# 6. Checklist

- [ ] Every component file is `PascalCase.tsx` and the filename matches the default export.
- [ ] Every screen file ends in `Screen.tsx`.
- [ ] Every hook starts with `use` and its name describes its return value.
- [ ] Every Zustand store is named `use<Domain>Store`.
- [ ] No file, folder, or export is named `utils`, `helpers`, `manager`, `service`, or uses a numbered suffix to disambiguate.
- [ ] Repository interfaces are `<Domain>Repository`; implementations are named after their strategy (`mock…`, `rest…`).
- [ ] Booleans read as predicates (`isX`, `hasX`), not bare nouns or adjectives.
- [ ] Route names are `PascalCase` nouns without a redundant `Screen` suffix.
- [ ] No new abbreviation was introduced that isn't already an established convention in this codebase.

---

# 7. References

- `../context.md` — Naming Philosophy
- `../constitution.md` — Single Responsibility, Small Units
- `folders.md` — where named files are expected to live
- `repositories.md` — repository/implementation naming in full
- `state.md` — store naming and Zustand conventions
