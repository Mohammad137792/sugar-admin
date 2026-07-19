---
id: rule-repositories
title: Repository Pattern Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_repositories
  - all_features
last_updated: 2026-07-18
---

# Repository Pattern Rules

> Migration should require changing repositories, not UI. — `../constitution.md`, Backend Independence

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

The Repository Pattern is named as a core architecture principle in `../context.md` and detailed as a contract standard in `../agents/10-feature-planner.md` § 10. No repository interface exists anywhere in `src/` today. `src/api/endpoints/auth.ts`, `content.ts`, and `reports.ts` each export a plain object of functions that call the axios `client` directly, with no interface in front of them and no mock layer behind them.

This file defines the target pattern **every new feature's data access must follow**, and states plainly that `src/api/endpoints/*.ts` is not that pattern — it is inherited debt from before this rule existed, not a template.

---

# 2. Scope

Applies to all new data access for any feature. Does not mandate rewriting `src/api/endpoints/*.ts` as a prerequisite for other work — see Rule 6 for the migration stance.

---

# 3. Rules

## Rule 1 — Every feature's data access starts as a TypeScript interface, written before any implementation

```ts
// src/features/products/repository/ProductRepository.ts
export interface ProductRepository {
  list(params: { page: number; pageSize: number; query?: string }): Promise<PaginatedResponse<Product>>;
  getById(id: string): Promise<Product>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  archive(id: string): Promise<void>;
}
```

**Why:** per `../agents/10-feature-planner.md` § 10 — "the contract is the promise. Mock and real implementations both fulfill the same promise." Writing the interface first forces every method's input shape, return shape, and error behavior to be decided deliberately, once, rather than discovered incrementally inside a component as `src/api/endpoints/*.ts` was.

## Rule 2 — Every repository interface has a mock implementation before it has a real one, and the mock is a first-class citizen

Per the constitution's Mock First Development: "Mocks are first-class citizens... a mock that always succeeds is not realistic." A mock implementation simulates:

```ts
// src/features/products/repository/mockProductRepository.ts
const LATENCY_MS = () => 150 + Math.random() * 650; // 150–800ms jitter, project default per feature-planner § 16
const FAILURE_RATE = 0.08; // non-zero, deliberate

export const mockProductRepository: ProductRepository = {
  async list({ page, pageSize }) {
    await delay(LATENCY_MS());
    if (Math.random() < FAILURE_RATE) throw new ServerError("Failed to load products");
    return paginate(MOCK_PRODUCTS, page, pageSize);
  },
  // ...
};
```

**Why:** a mock that resolves instantly and never fails trains every screen built against it to assume network calls are instant and infallible — the loading, error, and retry UI never actually gets exercised during development, and ships broken or missing. Simulating latency and failure is how loading/error states get built and tested honestly, before a real backend even exists.

## Rule 3 — Repository methods return typed data or throw typed errors; never `any`, never a bare `Promise<any>`

Every method signature states its exact return type and documents (in a comment, since no runtime schema validation exists — see Rule 7) what error conditions the caller must handle, per `../agents/10-feature-planner.md` § 10: "input shape, success return shape, error cases the caller must handle... whether the method is safe to retry."

**Why:** see `typescript.md` Rule 1 and `../agents/10-feature-planner.md` § 18's Bad Example — `Promise<any>` return types force every caller to guess the shape, and every guess can differ from the next caller's guess.

## Rule 4 — Repositories are consumed through hooks (typically wrapping TanStack Query), never called directly from a screen's render body

```ts
// src/features/products/hooks/useProducts.ts
export function useProducts(page: number) {
  return useQuery({
    queryKey: ["products", page],
    queryFn: () => mockProductRepository.list({ page, pageSize: 20 }),
  });
}
```

**Why:** this is `architecture.md` Rule 3 restated at the repository boundary specifically — a screen calling `mockProductRepository.list()` directly inside a `useEffect` reimplements caching, retry, and loading-state tracking that TanStack Query already provides, and couples the screen to one specific repository instance instead of a swappable hook.

## Rule 5 — Swapping a mock repository for a real one changes exactly one line: which implementation an environment-driven factory returns

```ts
// src/features/products/repository/index.ts (target shape)
import { mockProductRepository } from "./mockProductRepository";
// import { restProductRepository } from "./restProductRepository"; // future

export const productRepository: ProductRepository = mockProductRepository;
// later: ENV.USE_MOCKS ? mockProductRepository : restProductRepository;
```

**Why:** this is the literal mechanism behind the constitution's "the UI must never know whether the repository is using mock data or a real backend" (`../context.md`, Mock API Strategy). If every hook imports `productRepository` from this one file, swapping the underlying implementation touches this file alone — no hook, no screen, no component changes.

## Rule 6 — `src/api/endpoints/*.ts` is not extended for new features; it is a known migration target

`authApi`, `contentApi`, `reportsApi` in `src/api/endpoints/` call `client.get/post/put/delete` directly, with response types (`ApiResponse<T>`, `PaginatedResponse<T>`) but no repository interface, no mock, and no swappability — the UI (`authStore.ts`) imports `authApi` directly, coupling it permanently to axios.

**Why this is documented as debt, not fixed retroactively here:** per the constitution's Technical Debt section — "technical debt may be accepted only if: the reason is documented, a follow-up plan exists, the impact is understood." The reason: this pattern predates the Repository Pattern's adoption as a stated architecture principle. The follow-up plan: each of `auth`, `content`, `reports` is migrated to a `<Feature>Repository` interface + mock + (eventually) real implementation the next time that feature is substantially touched, not as a standalone refactor PR that risks destabilizing working auth/content/reports code for no functional gain. The impact: new code built against `authApi` today inherits axios coupling and zero mock realism (no simulated latency/failure) — acceptable short-term for auth specifically because login is simple and already partially handles errors, not acceptable as the starting point for a new feature's data layer.

## Rule 7 — Without `zod` installed, a repository's mock implementation is the closest thing to a runtime contract; keep it honest

No schema validation library is installed (`networking.md` covers this in full). A repository's TypeScript interface is checked at compile time only — nothing currently guarantees a real backend's actual JSON response matches `ProductRepository`'s declared return type once a real implementation exists.

**Why this matters for the mock specifically:** until `zod` (or an equivalent) is adopted, the mock implementation's hand-written fixture data is the de facto specification of what "correct" data looks like for that feature. Keep mock fixtures realistic and complete (every optional field exercised at least once across the fixture set, not just the happy-path minimum) so that a future real implementation has something concrete to validate against.

---

# 4. Good Examples

## Good: full repository contract, mock implementation, and consumption chain for a hypothetical new feature

```ts
// Contract
export interface ContentRepository {
  list(page: number): Promise<PaginatedResponse<ContentItem>>;
  publish(id: string): Promise<ContentItem>; // throws PublishError if platform rejects
}

// Mock
export const mockContentRepository: ContentRepository = {
  async list(page) {
    await delay(150 + Math.random() * 650);
    if (Math.random() < 0.05) throw new ServerError("Could not load content");
    return paginateMock(MOCK_CONTENT, page, 20);
  },
  async publish(id) {
    await delay(300);
    if (Math.random() < 0.1) throw new PublishError("Platform rejected publish");
    return { ...findMock(id), status: "published" };
  },
};

// Hook
export function useContentList(page: number) {
  return useQuery({ queryKey: ["content", page], queryFn: () => mockContentRepository.list(page) });
}
```

This is good because the interface documents both methods' error behavior in comments (per Rule 3), the mock simulates realistic failure (per Rule 2), and the hook is the only thing a screen touches (per Rule 4).

---

# 5. Bad Examples

## Bad: treating `src/api/endpoints/content.ts` as the pattern for a new feature

```ts
// DO NOT copy this shape for a new feature — see Rule 6.
export const contentApi = {
  list: (page = 1, limit = 20) => client.get<PaginatedResponse<ContentItem>>("/content", { params: { page, limit } }),
};
```

**Consequence:** no interface to mock against, so this feature can never be built or tested without a live (or at minimum, running) backend — directly violating Mock First Development. No abstraction to swap later — a backend migration (REST → GraphQL, or even just a URL/auth scheme change) means editing every call site that imports `contentApi`, not one factory file.

## Bad: a repository interface with an untyped return

```ts
export interface ProductRepository {
  list(): Promise<any>; // rejected — see typescript.md Rule 1 and feature-planner § 18
}
```

**Consequence:** every hook and screen built against this repository has to guess the shape of `list()`'s resolved value, and TypeScript provides zero protection against a mismatch between what the mock returns and what a screen destructures from it.

---

# 6. Checklist

- [ ] A new feature's data access starts with a `<Domain>Repository` TypeScript interface, written before any implementation.
- [ ] A mock implementation exists and simulates latency (150–800ms jitter default) and a non-zero failure rate.
- [ ] No repository method returns `Promise<any>`; every method's success and error shapes are explicit.
- [ ] Screens and components consume the repository only through a hook, never by calling it directly in render code or a raw `useEffect`.
- [ ] A single factory/index file selects which implementation (mock vs. real) a hook actually receives.
- [ ] No new feature was built directly against `src/api/endpoints/*.ts`'s pattern.
- [ ] If `src/api/endpoints/*.ts` was touched, the change is scoped to that migration explicitly, not bundled into an unrelated feature PR.

---

# 7. References

- `../constitution.md` — Backend Independence, Mock First Development
- `../context.md` — Architecture Principles, Mock API Strategy
- `architecture.md` — layering rules the Repository Pattern implements
- `networking.md` — the axios `client` a real repository implementation would eventually wrap
- `state.md` — how repository data reaches TanStack Query
- `../agents/10-feature-planner.md` § 10 — Repository Contract Standard in full
