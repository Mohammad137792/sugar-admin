---
id: rule-imports
title: Import Rules
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

# Import Rules

> Dependencies should never point upward. Every dependency should have one direction. — `../agents/00-chief-architect.md` § 5, Principle 3

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

Sugar Admin has no path aliases configured (`tsconfig.json` extends `expo/tsconfig.base` with no `paths` override) and no `eslint-plugin-import` or boundary-enforcing lint config in the repo today. Import discipline is therefore entirely convention-driven — this file is the convention, and the thing a reviewer checks by hand until tooling exists to check it automatically.

---

# 2. Scope

Applies to every `import` statement written in `src/` and `App.tsx`.

---

# 3. Rules

## Rule 1 — All internal imports are relative; there are no path aliases

Every existing internal import in the codebase uses a relative path (`"../../../constants/colors"`, `"../../context/ThemeContext"`, `"../types"`). There is no `@/` or `~/` alias configured.

**Why:** introducing an alias now, without updating `tsconfig.json`'s `paths` and a corresponding Babel/Metro resolver config, would create imports that work in some tools and not others. If path aliases are adopted later, it is a deliberate `chief-architect`-approved change applied repo-wide in one PR — not introduced piecemeal per file.

## Rule 2 — Import order: external packages, then internal absolute-from-`src` concepts (relative), then types, then styles

```ts
// 1. External packages (react, react-native, third-party)
import { useState } from "react";
import { View, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";

// 2. Internal modules (relative), roughly outside-in: context/store → api → components
import { useTheme } from "../../context/ThemeContext";
import { authApi } from "../../api";
import { Button, Input } from "../../components/ui";

// 3. Types (grouped, using `import type`)
import type { User, LoginCredentials } from "../../types";
```

**Why:** a consistent scan order means a reviewer can tell what a file depends on (framework? app internals? types only?) from the first few lines without reading the whole import block. `src/store/authStore.ts` already mostly follows this shape (`zustand` → local types → local api).

## Rule 3 — Use `import type` for type-only imports

```ts
import type { AuthStackParamList } from "./types";
```

**Why:** it tells the reader (and the bundler) that this import has zero runtime cost and cannot participate in a runtime circular-import failure — only in a type-level one, which TypeScript already catches at compile time. `src/navigation/AppNavigator.tsx` already does this correctly (`import type { AppStackParamList } from "./types"`); keep it consistent as new navigators and stores are added.

## Rule 4 — Cross-feature imports go through a feature's public `index.ts` only

```ts
// Legal, once features export a public API:
import { useProducts } from "../products";

// Illegal, always:
import { useProducts } from "../products/hooks/useProducts";
import ProductCard from "../products/components/ProductCard";
```

**Why:** per `../constitution.md`'s Feature Ownership section and `architecture.md` Rule 5, a feature's internals are free to change as long as its public surface doesn't. A deep import defeats that guarantee — renaming `useProducts.ts` to `useProductList.ts` now silently breaks an unrelated feature's build.

**Current state:** no feature exports an `index.ts` yet, so there is currently no legal way to cross-import between `src/features/*` folders. Treat this as "cross-feature imports are not possible yet" rather than reaching for a deep import as a workaround — surface the missing barrel file as a blocker instead.

## Rule 5 — Never import a screen component from anywhere except its owning navigator

`src/navigation/AppNavigator.tsx` importing `DashboardScreen` is correct — a navigator's whole job is wiring screens to routes. A different feature or a shared component importing a screen directly is not.

**Why:** a screen assumes it is the root of a navigation stack (it may read route params, call `navigation.navigate`, own a `Screen` wrapper with `StatusBar` config). Importing it as a sub-component elsewhere breaks those assumptions and couples unrelated code to routing concerns.

## Rule 6 — Avoid circular imports; where genuinely unavoidable, document the workaround at both ends

`src/api/client.ts` and `src/store/authStore.ts` have a real circular dependency: the axios interceptor in `client.ts` needs to read the current auth token, but `authStore.ts` needs to call `authApi` (built on `client.ts`) to perform the login request. A direct import cycle (`client.ts → authStore.ts → api/index.ts → client.ts`) is resolved today via `globalThis`:

```ts
// src/store/authStore.ts
(globalThis as any).__authToken = tokens.accessToken;

// src/api/client.ts
const token = (globalThis as any).__authToken as string | undefined;
```

**Why this is documented as an accepted trade-off, not banned outright:** the alternative — a dependency-injection layer, or restructuring `client.ts` to accept the token as a parameter on every call — is a larger architectural change than the problem justifies at this stage (constitution's Simplicity Wins). The cost of the current approach is real and specific: it uses `any` twice (see `typescript.md` Rule 2), it is invisible to TypeScript's module graph, and it means the token exists nowhere except a single in-memory global with no type safety. Any new `globalThis` bridge must include a comment at both the write site and the read site explaining which two modules it decouples and why a normal import was not possible — `client.ts`'s existing comment ("Token injected at runtime from authStore") is the minimum bar; new instances should also name the specific cycle avoided.

**Do not treat this as a general escape hatch.** If a genuine circular dependency does not exist — if the "cycle" is actually just "feature A wants something from feature B and vice versa" — the fix is to extract the shared concept to a third module both can depend on downward, not to reach for `globalThis`.

## Rule 7 — Barrel files (`index.ts`) re-export only, no logic

`src/store/index.ts` (`export { useAuthStore } from "./authStore"; export { useUIStore } from "./uiStore";`) and `src/components/ui/index.ts` are correct examples: pure re-export, zero logic, zero side effects.

**Why:** a barrel file with side effects (e.g. instantiating a singleton on import) makes import order matter in ways that are invisible from the call site — a classic source of "works on my machine" bugs. Keep barrels mechanical.

---

# 4. Good Examples

## Good: import order and type-only imports in a new hook

```ts
import { useQuery } from "@tanstack/react-query";

import { mockProductRepository } from "../repository/mockProductRepository";

import type { Product } from "../types/Product";

export function useProducts(page: number) {
  return useQuery<Product[]>({
    queryKey: ["products", page],
    queryFn: () => mockProductRepository.list({ page, pageSize: 20 }),
  });
}
```

## Good: existing barrel export pattern

```ts
// src/api/index.ts
export { authApi }    from "./endpoints/auth";
export { contentApi } from "./endpoints/content";
export { reportsApi } from "./endpoints/reports";
export { default as client } from "./client";
```

This is good because it is purely mechanical re-export — no logic, safe import order.

---

# 5. Bad Examples

## Bad: deep cross-feature import

```ts
// src/features/dashboard/screens/DashboardScreen.tsx
import { ContentRepository } from "../../content/repository/ContentRepository"; // illegal deep import
```

**Consequence:** `dashboard` is now coupled to `content`'s internal folder layout. If `content`'s repository is renamed or moved during a refactor, `dashboard` breaks with no warning until the type-checker or a runtime error surfaces it.

## Bad: new circular dependency introduced casually

```ts
// src/features/products/repository/mockProductRepository.ts
import { useUIStore } from "../../../store/uiStore"; // repository reaching into a Zustand store

// src/store/uiStore.ts
import { mockProductRepository } from "../features/products/repository/mockProductRepository"; // and back again
```

**Consequence:** an actual circular import, which Metro will sometimes resolve incorrectly (one module sees the other as `undefined` depending on evaluation order) and which is far harder to reason about than the documented `globalThis` bridge in Rule 6. A repository has no business importing a UI store in the first place — this also violates `architecture.md` Rule 9 (data layer must not know about presentation-layer state).

---

# 6. Checklist

- [ ] No path alias was introduced; all internal imports remain relative.
- [ ] Import order follows external → internal → types.
- [ ] Type-only imports use `import type`.
- [ ] No deep import reaches into another feature's internal folders.
- [ ] No component imports a screen from outside its owning navigator.
- [ ] Any new `globalThis` bridge is commented at both the read and write site, naming the specific cycle avoided.
- [ ] No new barrel file contains logic beyond re-export statements.
- [ ] No new circular import was introduced between unrelated modules (repository ↔ store, feature ↔ feature).

---

# 7. References

- `../constitution.md` — Feature Ownership, Dependency Management (via `../agents/00-chief-architect.md`)
- `architecture.md` — layering rules these import rules enforce
- `typescript.md` — `any` usage in the `globalThis` bridge, discriminated unions
- `naming.md` — file naming that makes import statements self-explanatory
- `../agents/00-chief-architect.md` § 5 — "dependencies should never point upward"
