---
id: playbook-creating-a-repository
title: Creating A Repository Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Creating A Repository Playbook

> Migration should require changing repositories, not UI. — `../constitution.md`, Backend Independence

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Building ProductRepository From Scratch
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

**Sugar Admin has no repository layer today.** `src/api/endpoints/auth.ts`, `content.ts`, and `reports.ts` each call `client` (the axios singleton from `src/api/client.ts`) directly, with no interface, no mock/live split, and no simulated latency or failure — despite `../constitution.md`'s Mock First Development section requiring every feature to simulate "loading, pagination, latency, authorization, validation, failures, empty states, server errors." `src/store/authStore.ts` calls `authApi.login(...)` directly, coupling global state to axios.

This is named, acknowledged debt (`../rules/architecture.md` Rule 4, `../agents/10-feature-planner.md` § 10), not a pattern to copy. This playbook describes the **target** repository pattern every new feature adopts, using the `products` feature — which has no repository at all yet — as the reference build.

---

# 2. When To Use This Playbook

Use this playbook when a feature plan defines a Repository Contract (`../agents/10-feature-planner.md` § 10) and no implementation exists yet. This is the normal path for every new feature's first repository.

Do not use this playbook to retrofit `auth`, `content`, `dashboard`, or `reports`'s existing direct-axios calls as a side effect of unrelated work — a retrofit is its own explicitly-approved migration, covered by `replacing-mock-api.md`, not a drive-by fix.

---

# 3. Prerequisites

- A completed Repository Contract from the feature plan, per `../agents/10-feature-planner.md` § 10 and filled out using `../templates/repository.md`: interface name, every method's input/return/error/pagination/retry-safety, and mock behavior (latency, failure rate, empty-state data).
- `../templates/architecture-proposal.md`'s filled example ("Introduce a Repository Layer in Front of `src/api/endpoints`") read in full — it defines the exact target file layout this playbook implements.
- Confirmation of the feature's folder: `src/features/<feature>/repository/` (create this subfolder now if it doesn't exist, per `../rules/folders.md` Rule 3 — additive, done as part of this PR).
- `src/api/client.ts` read and understood — this is the only networking primitive the real implementation is allowed to depend on; no new HTTP library is introduced.

---

# 4. Step-by-Step Workflow

## Step 1 — Define the interface (the contract)

File: `src/features/<feature>/repository/<Domain>Repository.ts`. Contains only the TypeScript interface and its input/return types — zero implementation, zero axios/fetch types leaking into the signatures (`../templates/repository.md` Instruction 4).

```ts
// src/features/products/repository/ProductRepository.ts
export interface ProductRepository {
  list(params: ListProductsInput): Promise<Paginated<ProductSummary>>;
  getById(id: string): Promise<Product>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  archive(id: string): Promise<void>;
}

export interface ListProductsInput {
  page: number;
  pageSize: number;
  query?: string;
  categoryId?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
```

## Step 2 — Write the mock implementation first

File: `src/features/<feature>/repository/<Domain>Repository.mock.ts`. Per `../constitution.md`'s Mock First Development — "mocks are first-class citizens," "a mock that always succeeds is not realistic" — every method simulates:

- **Latency**: 150–800ms jitter for reads is the project default (`../agents/10-feature-planner.md` § 16); writes run slower, 300–800ms.
- **Failure rate**: non-zero. Reads around 5%, writes around 8% (writes fail more often by convention, to exercise error-state UI more).
- **Authorization**: simulate role-based rejection where the plan calls for it (e.g. a `viewer` role rejected on create/update/archive — see `src/types/index.ts`'s `User.role: "admin" | "editor" | "viewer"`).
- **Validation**: field-level `ValidationError` for bad input.
- **Empty states**: explicit, deterministic empty-result data, not just "returns nothing."

```ts
// src/features/products/repository/ProductRepository.mock.ts
import type { ProductRepository, ListProductsInput, Paginated } from "./ProductRepository";
import type { Product, ProductSummary } from "../types/Product";

const jitter = (min: number, max: number) =>
  new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)));

let PRODUCTS: Product[] = [/* seed data */];

export const mockProductRepository: ProductRepository = {
  async list(params: ListProductsInput): Promise<Paginated<ProductSummary>> {
    await jitter(150, 800);
    if (Math.random() < 0.05) throw new NetworkError("Simulated network failure");

    const filtered = PRODUCTS.filter((p) =>
      params.query ? p.name.toLowerCase().includes(params.query.toLowerCase()) : true
    );
    const start = (params.page - 1) * params.pageSize;
    const items = filtered.slice(start, start + params.pageSize);

    return {
      items: items.map(toSummary),
      page: params.page,
      pageSize: params.pageSize,
      total: filtered.length,
      hasMore: start + params.pageSize < filtered.length,
    };
  },

  async getById(id: string): Promise<Product> {
    await jitter(150, 500);
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) throw new NotFoundError(`Product ${id} not found`);
    return product;
  },

  // create, update, archive follow the same shape: jitter, simulated
  // failure/validation/permission checks, then mutate the in-memory array.
};
```

Name every thrown error type explicitly (`NetworkError`, `NotFoundError`, `ValidationError`, `ConflictError`) — matching exactly what the contract in Step 1 and the feature plan promised. "Throws on failure" with no named type is rejected per `../agents/10-feature-planner.md` § 18's Bad Example.

## Step 3 — Write the live implementation

File: `src/features/<feature>/repository/<Domain>Repository.live.ts`. This is the **only** file in the feature allowed to import `src/api/client.ts` (`../templates/architecture-proposal.md`'s Proposed Architecture) — keeping axios detail out of presentation and business layers, per `../constitution.md`'s Separation of Concerns.

```ts
// src/features/products/repository/ProductRepository.live.ts
import client from "../../../api/client";
import type { ProductRepository, ListProductsInput, Paginated } from "./ProductRepository";
import type { Product, ProductSummary } from "../types/Product";

export const liveProductRepository: ProductRepository = {
  async list(params: ListProductsInput): Promise<Paginated<ProductSummary>> {
    const { data } = await client.get("/products", { params });
    return data;
  },

  async getById(id: string): Promise<Product> {
    const { data } = await client.get(`/products/${id}`);
    return data.data;
  },

  // create, update, archive map to client.post/put/delete respectively.
};
```

Even with no backend selected yet (`../context.md`'s Backend Strategy), this file is written now against the shape `src/api/client.ts` already exposes — it simply won't be reachable via `ENV.USE_MOCK_API` until a backend exists. Writing it early keeps the interface honest: if the live implementation can't satisfy the interface cleanly, the interface was wrong.

## Step 4 — Write the composition point

File: `src/features/<feature>/repository/index.ts`. The single place that decides mock vs. live — screens and hooks depend on this exported constant, never on `.mock.ts` or `.live.ts` directly.

```ts
// src/features/products/repository/index.ts
import ENV from "../../../config/env";
import { mockProductRepository } from "./ProductRepository.mock";
import { liveProductRepository } from "./ProductRepository.live";
import type { ProductRepository } from "./ProductRepository";

export const productRepository: ProductRepository =
  ENV.USE_MOCK_API ? mockProductRepository : liveProductRepository;
```

Note `src/config/env.ts` does not currently define `USE_MOCK_API` — add it there as part of this step (`API_BASE_URL`, `AI_API_URL`, `APP_NAME`, `APP_VERSION` are the current fields; extend the same object, do not create a second env module).

## Step 5 — Wire a hook on top (owned jointly with `state-engineer`)

Screens never import `productRepository` directly either — they consume a TanStack Query hook that wraps it, per `../rules/architecture.md` Rule 3:

```ts
// src/features/products/hooks/useProducts.ts
import { useQuery } from "@tanstack/react-query";
import { productRepository } from "../repository";

export function useProducts(page: number) {
  return useQuery({
    queryKey: ["products", "list", page],
    queryFn: () => productRepository.list({ page, pageSize: 20 }),
  });
}
```

## Step 6 — Hand off and flag the swap point

Confirm with `reviewer` (via `../commands/review-feature.md`'s Repository Conformance check) that no screen or hook imports `client`/axios directly, and that the mock implementation genuinely simulates failure — not just latency.

---

# 5. Worked Example: Building ProductRepository From Scratch

Using the Products feature plan's Repository Contracts section (`../templates/feature-proposal.md`'s filled example) as the source of truth:

**Step 1.** `src/features/products/repository/ProductRepository.ts` — the five-method interface shown above, matching the plan exactly: `list`, `getById`, `create`, `update`, `archive`.

**Step 2.** `ProductRepository.mock.ts` — per the plan's mock behavior notes: `list` at 150–800ms/5% failure; `getById` at 150–500ms/5% failure with deterministic `NotFoundError`; `create`/`update` at 300–800ms/8% failure, simulating `viewer` role rejection with `ValidationError`-shaped `{ message: "Insufficient permission" }`; `update` also simulates `ConflictError` via an `expectedUpdatedAt` comparison; `archive` at 200–500ms/5% failure, idempotent (archiving an already-archived product throws `NotFoundError` rather than double-archiving, making retry safe).

**Step 3.** `ProductRepository.live.ts` — five methods mapped to `client.get("/products", ...)`, `client.get(\`/products/${id}\`)`, `client.post("/products", input)`, `client.put(\`/products/${id}\`, input)`, `client.delete(\`/products/${id}\`)`.

**Step 4.** `index.ts` exports `productRepository`, switched on `ENV.USE_MOCK_API` (added to `src/config/env.ts`).

**Step 5.** `state-engineer` builds `useProducts(page)` and `useProductDetail(id)` in `src/features/products/hooks/`, consumed by `ProductListScreen` and `ProductDetailScreen` from `building-a-screen.md`'s worked example.

**Step 6.** `reviewer` confirms via `../commands/review-feature.md`'s Repository Conformance check: interface matches the plan exactly, mock simulates latency/failure/permission/empty states, live implementation exists (even though unreachable until a backend is chosen), and no screen imports `client` directly.

---

# 6. Checklist

- [ ] Interface file contains only the contract — no axios/fetch types, no implementation.
- [ ] Mock implementation simulates latency, a non-zero failure rate, authorization, validation, and explicit empty-state data — not just a happy-path resolve.
- [ ] Every thrown error is a named type matching the feature plan's contract, not a bare `throw new Error(...)`.
- [ ] Live implementation exists and is the only file importing `src/api/client.ts` for this repository.
- [ ] Composition point (`index.ts`) is the single mock/live switch; nothing imports `.mock.ts`/`.live.ts` directly outside it.
- [ ] `ENV.USE_MOCK_API` (or equivalent) added to `src/config/env.ts` if not already present.
- [ ] A TanStack Query hook wraps the repository; no screen calls the repository directly.
- [ ] `reviewer` confirmed no screen/hook/store bypasses the repository for this feature's data.

---

# 7. Common Mistakes

**Copying `src/api/endpoints/*.ts`'s direct-axios pattern for a new feature.** This is documented debt, not a template — see `../rules/architecture.md` Rule 4's Bad Example, which shows exactly this mistake extended to a hypothetical `products.ts` endpoint file.

**Writing the live implementation first, or skipping the mock entirely.** Violates Mock First Development directly — the mock is what lets the feature ship and be reviewed before any backend exists.

**A mock that always succeeds.** `../constitution.md` is explicit: "A mock that always succeeds is not realistic." Every method needs a non-zero simulated failure rate.

**Letting a screen or hook import `.mock.ts` or `.live.ts` directly.** Defeats the entire purpose of the composition point — the backend can no longer be swapped without touching consumer code. This is exactly the risk `../templates/architecture-proposal.md`'s filled example names and asks `reviewer` to check.

**One repository spanning multiple domains.** `ProductRepository` never grows an unrelated method (e.g. a chat-sending method) because it was convenient — `../rules/naming.md` Rule 6 and the Constitution's Single Responsibility principle both forbid this.

---

# 8. References

- `../constitution.md` — Backend Independence, Mock First Development, Separation of Concerns
- `../context.md` — Mock API Strategy, Architecture Principles
- `../agents/10-feature-planner.md` § 10 — Repository Contract Standard
- `../rules/architecture.md` Rules 3–4 — presentation/data boundary rules
- `../rules/folders.md` Rule 3, Rule 7 — where repository files live, one domain per repository
- `../templates/repository.md` — the per-method contract template and full filled `ProductRepository` example
- `../templates/architecture-proposal.md` — the filled proposal that defines this exact target file layout
- `src/api/client.ts`, `src/api/endpoints/auth.ts` — the current direct-axios pattern this playbook deliberately does not copy
- `./replacing-mock-api.md` — swapping mock for live incrementally once a backend exists
- `./connecting-backend.md` — selecting and wiring the real backend this repository's live implementation targets
