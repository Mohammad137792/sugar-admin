---
id: rule-architecture
title: Architecture Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_features
  - all_repositories
  - all_screens
  - all_agents
last_updated: 2026-07-18
---

# Architecture Rules

> The constitution defines the philosophy. This file defines what a reviewer checks in a diff.

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

`../constitution.md` establishes Feature-First architecture, the Repository Pattern, Backend Independence, and three-layer Separation of Concerns (presentation / business / data) as non-negotiable principles.

This file makes those principles enforceable. It tells an engineer, in concrete terms, where a new file belongs, which imports are legal, and which pattern a new module must follow — grounded in the actual state of `src/` today, not an idealized one.

Sugar Admin's codebase is young. Some of what exists today (`src/screens/HomeScreen.tsx`, direct-axios `src/api/endpoints/*.ts`, no `AuthNavigator` wiring in `App.tsx`) predates or violates these rules. This document distinguishes **what new code must do** from **what old code happens to do**. Old code is not a model to copy.

---

# 2. Scope

Applies to every new screen, component, hook, store, repository, and service added to `src/`. Applies to any refactor that touches module boundaries. Does not mandate an immediate rewrite of existing violations — those are tracked as technical debt per the constitution's Technical Debt section, not silently copied forward.

---

# 3. Rules

## Rule 1 — Every feature is a vertical slice under `src/features/<feature-name>/`

New product capability (Products, Publishing, Customer Management, Chat Center, Analytics, etc.) gets its own folder under `src/features/`. It owns its screens, components, hooks, repository, state, types, and constants, per the constitution's Feature Ownership section.

**Why:** predictability. An engineer who needs to find or add code for "Publishing" should never have to search `src/components/`, `src/screens/`, or `src/store/` first. The folder name is the answer.

## Rule 2 — `src/screens/` is legacy. No new screens go there.

`src/screens/HomeScreen.tsx` exists outside `src/features/` and predates Feature-First adoption. It is a known violation, not a pattern.

**Why:** two competing locations for "where does a screen live" destroys predictability — the exact failure mode the constitution's Predictability principle warns against. New screens belong in `src/features/<feature>/screens/`. `HomeScreen.tsx` is tracked debt (see `folders.md` § 4) — migrate it in a dedicated PR, not as a drive-by in an unrelated feature change.

## Rule 3 — UI components never import a repository, axios client, or Zustand store directly for data

Presentation-layer code (`src/components/`, `src/features/*/screens/`, `src/features/*/components/`) reads data through hooks (React Query hooks wrapping a repository call, or a Zustand selector). It never calls `src/api/client.ts`, `client.get(...)`, or an `endpoints/*.ts` function inline inside a component body.

**Why:** this is the constitution's Separation of Concerns applied literally. Presentation must not contain business logic; if a component imports `client` directly, business/data concerns leak into render code, and the component becomes untestable and unreplaceable independent of the network layer.

**Current violation to be aware of:** `src/features/dashboard/screens/DashboardScreen.tsx` defines `MOCK_STATS` inline in the screen file rather than sourcing it from a repository. `src/features/auth/screens/LoginScreen.tsx`'s Sign In button (`onPress={() => {}}`) is wired to nothing at all — no repository call, no store dispatch. Neither is a pattern to replicate; both are gaps to close when those features are next touched.

## Rule 4 — All new data access is written against a Repository interface (see `repositories.md`)

A new feature's data layer starts with a TypeScript interface (the contract), then a mock implementation, then — later — a real implementation. Screens and hooks depend on the interface, never on `axios`, `fetch`, or a specific endpoint module.

**Why:** Backend Independence, per the constitution, is not aspirational — it is the reason Sugar Admin can ship against Mock APIs today and swap in REST/GraphQL/gRPC later without touching a single component. `src/api/endpoints/*.ts` (direct axios calls, no interface) predates this rule. It is not extended for new features — see `repositories.md` for the full contract.

## Rule 5 — Cross-feature imports go through a feature's public API only

If `features/content` needs something from `features/dashboard`, it imports from `features/dashboard/index.ts` (or an explicitly exported module), never `features/dashboard/screens/DashboardScreen.tsx` or any other internal file by deep path.

**Why:** the constitution's Feature Ownership section is explicit — "cross-feature imports should happen through public APIs only." A deep import couples two features' internals; renaming an internal file in one feature then silently breaks another. See `imports.md` Rule 4 for the enforcement detail.

**Current gap:** no feature in `src/features/` currently exports an `index.ts` public API. Until one exists, a feature has no legal public surface to import from — which in practice means **do not cross-import between features yet**. If a second feature genuinely needs shared logic, promote that logic to `src/components/`, `src/constants/`, or `src/types/` instead of reaching into another feature's folder.

## Rule 6 — Global app wiring lives in `App.tsx`; it is not implicit

Providers, navigation roots, and query client configuration are composed once, visibly, in `App.tsx`. A new global concern (analytics, error boundary, notifications) is added as an explicit provider in the existing composition tree, not injected via a side effect buried in a component.

**Why:** `App.tsx` is the one file every engineer reads to understand "what wraps the whole app." Hidden global wiring (e.g. a `useEffect` in a random screen that mutates `globalThis`) makes that understanding unreliable. `src/api/client.ts` already relies on `globalThis.__authToken` and `globalThis.__onUnauthorized` as a deliberate, narrow exception to this rule (see Rule 7) — it is not a precedent for adding more `globalThis` wiring elsewhere.

**Current gap to know about:** `App.tsx` renders `AppNavigator` unconditionally inside `NavigationContainer`. `AuthNavigator` is never mounted, and `useAuthStore.isAuthenticated` is never read to decide which navigator to show. The `Auth` vs `App` split declared in `src/navigation/types.ts` (`RootStackParamList`) is not actually wired up. Any engineer touching auth-gated navigation must fix this, not build further on top of it silently.

## Rule 7 — Circular-import workarounds are a last resort, and must be documented inline where they occur

`src/store/authStore.ts` and `src/api/client.ts` share the auth token via `(globalThis as any).__authToken` specifically to avoid `authStore.ts` importing `client.ts` while `client.ts`'s interceptor needs to read the current token — a real circular dependency (store needs the API layer; the API layer's interceptor needs the store's state). This is an accepted, narrow trade-off, not a general pattern.

**Why:** the constitution demands Explicit Beats Implicit and warns against hidden coupling. A `globalThis` bridge is implicit by nature — acceptable only when the alternative (circular import, or a heavier DI abstraction) is worse, and only when documented at the point of use. See `imports.md` § Circular Imports for the full discussion and the comment convention required at each `globalThis` read/write site.

## Rule 8 — A new abstraction must solve a problem that exists today

Do not add a service locator, a generic `utils/` module, a plugin system, or a dependency-injection container speculatively. Per the constitution's Simplicity Wins and the Chief Architect's Principle 4 ("every abstraction must solve a real problem"), new architecture is justified by a concrete, current requirement.

**Why:** Sugar Admin is in the Foundation phase (per `../context.md`). Speculative abstraction here is pure cost — it adds indirection future engineers must learn, for a benefit that may never materialize.

## Rule 9 — The three-layer split (presentation / business / data) applies inside a feature folder too

Within `src/features/<feature>/`, `screens/` and `components/` are presentation. `hooks/` (or a `services/` file) hold business logic — decisions, validation, workflows. `repository/` is data. A screen file must not contain validation rules or workflow branching that a hook should own.

**Why:** this is the constitution's Separation of Concerns, scoped down to feature size. It keeps a feature testable in isolation — a hook's business logic can be unit tested without rendering a screen.

---

# 4. Good Examples

## Good: a new feature's data flow (target pattern, no current 1:1 example in the repo)

```ts
// src/features/products/repository/ProductRepository.ts
export interface ProductRepository {
  list(params: { page: number; pageSize: number }): Promise<PaginatedResponse<Product>>;
  create(input: CreateProductInput): Promise<Product>;
}

// src/features/products/repository/mockProductRepository.ts
export const mockProductRepository: ProductRepository = { /* simulates latency, failures */ };

// src/features/products/hooks/useProducts.ts
export function useProducts(page: number) {
  return useQuery({
    queryKey: ["products", page],
    queryFn: () => mockProductRepository.list({ page, pageSize: 20 }),
  });
}

// src/features/products/screens/ProductListScreen.tsx
export default function ProductListScreen() {
  const { data, isLoading, error } = useProducts(1);
  // presentation only: render loading / error / empty / success
}
```

This is good because the screen never imports axios, the repository is swappable behind one interface, and business logic (pagination defaults, retry policy) lives in the hook, not the screen.

## Bad: the current `src/api/endpoints/*.ts` pattern extended to a new feature

```ts
// DO NOT extend this pattern to new features.
// src/api/endpoints/products.ts
import client from "../client";
export const productsApi = {
  list: (page = 1) => client.get(`/products?page=${page}`),
};

// src/features/products/screens/ProductListScreen.tsx
import { productsApi } from "../../../api/endpoints/products";

export default function ProductListScreen() {
  const [data, setData] = useState(null);
  useEffect(() => { productsApi.list().then(r => setData(r.data)); }, []);
  // ...
}
```

This is bad because the screen is now coupled to axios and to the exact shape of one endpoint module. Swapping the backend, adding retry, or unit-testing the screen without a live `client` all become hard. This is exactly the pattern `src/api/endpoints/auth.ts` uses today — acceptable as inherited debt, not acceptable as a template for new work.

---

# 5. Bad Examples

Covered paired with each Good Example above. One additional standalone case:

## Bad: business logic inside a screen component

```tsx
export default function CheckoutScreen() {
  const { data: cart } = useCart();
  // validation and pricing rules embedded in render code
  const total = cart.items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const isEligibleForDiscount = total > 100 && cart.items.length >= 3;
  const finalTotal = isEligibleForDiscount ? total * 0.9 : total;
  return <Text>{finalTotal}</Text>;
}
```

**Consequence:** the discount rule cannot be unit tested without rendering the component, cannot be reused if a second screen needs it, and silently drifts if another engineer implements the "same" rule elsewhere. Move it to a hook (`useCheckoutTotals(cart)`) or a pure function in the feature's business layer.

---

# 6. Checklist

- [ ] New screen lives under `src/features/<feature>/screens/`, not `src/screens/`.
- [ ] No component imports `axios`, `client`, or an `endpoints/*.ts` module directly.
- [ ] New data access is defined as a repository interface before any implementation is written.
- [ ] No deep import reaches into another feature's internal files.
- [ ] Any new `globalThis` bridge is documented inline and justified against Rule 7.
- [ ] No speculative abstraction was added without a current, cited requirement.
- [ ] Business logic (validation, pricing, workflow decisions) lives in a hook or service, not inside a screen's render body.
- [ ] If this PR touches navigation or auth gating, it does not silently build on top of the known `App.tsx` / `AuthNavigator` wiring gap without flagging it.

---

# 7. References

- `../constitution.md` — Separation of Concerns, Feature Ownership, Backend Independence, Replaceability
- `../context.md` — Architecture Principles, Folder Philosophy
- `folders.md` — concrete target folder shape vs. current flat shape
- `repositories.md` — repository contract standard
- `imports.md` — cross-feature import and circular-import rules
- `state.md` — where state is allowed to live
- `../agents/00-chief-architect.md` — architectural authority and decision process
- `../agents/10-feature-planner.md` — repository contract standard used by feature plans
