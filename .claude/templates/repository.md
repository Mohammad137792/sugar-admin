---
id: template-repository
title: Repository Contract Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Repository Contract Template

## Purpose

Use this template to define a single feature repository's interface before any
mock or live implementation is written. This is filled out by `10-feature-planner`
as part of a feature plan (see `.claude/templates/feature-proposal.md` → Repository
Contracts section) and implemented against, unmodified, by `network-engineer`
(mock first, per the Constitution's Mock First Development) and later
`ai-engineer` for any AI-touching method.

This template matches `.claude/agents/10-feature-planner.md` § 10 (Repository
Contract Standard) exactly. Do not improvise a shape not covered by that section.

Today's codebase has **no repository layer** — `src/api/endpoints/auth.ts` calls
`client` (axios, from `src/api/client.ts`) directly, and `src/store/authStore.ts`
calls `authApi.login(...)` directly. This is a known, named gap (§ 10 flags it
explicitly). Any repository contract written from this template targets the
**intended** pattern — see `.claude/templates/architecture-proposal.md`'s filled
example for the concrete file layout (`repository/<Name>Repository.ts`,
`.mock.ts`, `.live.ts`, `index.ts`) a contract from this template plugs into.

## Instructions

1. Name the interface `<Domain>Repository` — one repository per domain concept
   (Single Responsibility: constitution.md — "every repository should represent
   one domain"). Do not create one repository per screen, and do not create one
   giant repository for the whole app.
2. For **every** method specify, in this order:
   - **Input shape** — a named type, not inline `any`.
   - **Success return shape** — a named type; wrap paginated results in a shared
     `Paginated<T>` shape, not an ad hoc `{ items, count }` per repository.
   - **Error cases** — name the error types the caller must handle. "May throw" is
     not acceptable (§ 10, § 18 Bad Example).
   - **Pagination behavior** — if applicable: page/pageSize semantics, whether
     `hasMore`/`total` is returned.
   - **Retry-safety** — is the method idempotent / safe for TanStack Query or a
     caller to retry automatically, or does a retry risk a duplicate side effect?
3. Mock behavior is defined here in prose (this is a contract, not an
   implementation) — see the Mock Repository Behavior decision tree in
   `.claude/agents/10-feature-planner.md` § 16: mirror an existing mock's latency
   and failure-rate conventions if one exists (150–800ms jitter is the project
   default), otherwise define both explicitly plus explicit empty-state data.
4. Never let a repository interface leak axios/fetch types (`AxiosResponse`,
   `Response`, etc.) into its signatures — the interface must be implementable by
   a mock that has never heard of HTTP.

---

## The Template

```markdown
### Repository: <Domain>Repository

**Owned by feature:** <feature name>

**File (target layout):** `src/features/<feature>/repository/<Domain>Repository.ts`

```ts
// Contract only. Implementation belongs to network-engineer / ai-engineer.
interface <Domain>Repository {
  <method>(<params>: <InputType>): Promise<<ReturnType>>;
}
```

#### Method: `<method>`
- **Input:** <shape, named type>
- **Success return:** <shape, named type>
- **Error cases:** <NamedError1> — <when>; <NamedError2> — <when>
- **Pagination:** <n/a | page/pageSize semantics, hasMore/total>
- **Retry-safe:** yes | no — <why>
- **Mock behavior:** latency <Xms–Yms jitter>, simulated failure rate <N%>,
  empty-state data: <what the mock returns for an empty result>

<repeat "#### Method:" block for every method>
```

---

## Filled Example: `ProductRepository`

```markdown
### Repository: ProductRepository

**Owned by feature:** products

**File (target layout):** `src/features/products/repository/ProductRepository.ts`

```ts
// Contract only. Implementation belongs to network-engineer.
interface ProductRepository {
  list(params: ListProductsInput): Promise<Paginated<ProductSummary>>;
  getById(id: string): Promise<Product>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  archive(id: string): Promise<void>;
}

interface ListProductsInput {
  page: number;
  pageSize: number;
  query?: string;
  categoryId?: string;
}

interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}
```

#### Method: `list`
- **Input:** `ListProductsInput` — `page` (1-based), `pageSize`, optional `query`
  (case-insensitive name search), optional `categoryId` filter
- **Success return:** `Paginated<ProductSummary>` — `ProductSummary` is the
  list-card shape (id, name, price, thumbnailUrl, stockStatus), deliberately
  smaller than the full `Product` type returned by `getById`
- **Error cases:** `NetworkError` — timeout or no connectivity; caller shows the
  ProductListScreen Error state with Retry
- **Pagination:** 1-based `page`; `hasMore` is authoritative for "load more,"
  `total` is for display only and may be approximate under high write concurrency
- **Retry-safe:** yes — a read with no side effects, safe for TanStack Query's
  automatic retry
- **Mock behavior:** latency 150–800ms jitter (project default, matches other
  mock reads); simulated failure rate 5%; empty-state data: `{ items: [], page: 1,
  pageSize, total: 0, hasMore: false }` when `query` matches nothing

#### Method: `getById`
- **Input:** `id: string`
- **Success return:** `Product` — full detail shape (adds description, full image
  list, categories, inventory count, timestamps on top of `ProductSummary`)
- **Error cases:** `NotFoundError` — product does not exist or was archived;
  ProductDetailScreen shows its Error state ("Product not found or failed to
  load")
- **Pagination:** n/a
- **Retry-safe:** yes — read-only
- **Mock behavior:** latency 150–500ms jitter; simulated failure rate 5%;
  `NotFoundError` thrown deterministically for any id not present in the mock's
  in-memory product list, so tests can rely on it

#### Method: `create`
- **Input:** `CreateProductInput` — name (required, 1–120 chars), price (required,
  >= 0), description (optional), categoryIds (optional array), initial inventory
  count (required, >= 0)
- **Success return:** `Product` — the created record, including server-assigned
  `id` and `createdAt`
- **Error cases:** `ValidationError` — field-level messages keyed by input field
  name, shown inline on ProductFormScreen
- **Pagination:** n/a
- **Retry-safe:** no — retrying a failed create without confirming it didn't
  already succeed risks a duplicate product; caller must not auto-retry
- **Mock behavior:** latency 300–800ms jitter (writes are slower than reads by
  convention); simulated failure rate 8% (writes fail more often than reads to
  exercise error-state UI); also simulates the `viewer` role being rejected with
  `ValidationError`-shaped `{ message: "Insufficient permission" }` (see the
  products feature plan's Auth edge cases)

#### Method: `update`
- **Input:** `id: string`, `UpdateProductInput` (same shape as `CreateProductInput`,
  all fields optional — partial update)
- **Success return:** `Product` — the updated record
- **Error cases:** `NotFoundError` — id doesn't exist; `ValidationError` —
  field-level; `ConflictError` — the product was modified since the caller last
  fetched it (mock simulates this via a version/updatedAt check)
- **Pagination:** n/a
- **Retry-safe:** conditionally — safe to retry only if the caller resends the
  exact same input unchanged (the operation is then idempotent); not safe to retry
  with different input
- **Mock behavior:** latency 300–800ms jitter; simulated failure rate 8%;
  `ConflictError` simulated by comparing a client-supplied `expectedUpdatedAt`
  against the mock's stored value

#### Method: `archive`
- **Input:** `id: string`
- **Success return:** `void`
- **Error cases:** `NotFoundError` — id doesn't exist or is already archived
- **Pagination:** n/a
- **Retry-safe:** yes — archiving an already-archived product throws
  `NotFoundError` rather than double-archiving, so a retry after a timeout is safe
- **Mock behavior:** latency 200–500ms jitter; simulated failure rate 5%
```

---

## Checklist

- [ ] Interface name is `<Domain>Repository`, one domain concept per interface
- [ ] Every method has a named input type (no bare `any`)
- [ ] Every method has a named success return type (no bare `any`)
- [ ] Every method lists explicit, named error cases — not "may throw"
- [ ] Pagination behavior is stated (or explicitly "n/a") for every method
- [ ] Retry-safety is stated for every method, with a one-line reason
- [ ] Mock behavior (latency, failure rate, empty-state data) is defined for every method
- [ ] No axios/fetch/HTTP types appear anywhere in the interface

## References

- `.claude/agents/10-feature-planner.md` § 10 (Repository Contract Standard), § 16 (Mock repository behavior decision tree), § 18 (Good/Bad examples)
- `.claude/constitution.md` — Backend Independence, Mock First Development, Separation of Concerns
- `.claude/templates/architecture-proposal.md` — target file layout this contract plugs into
- `src/api/client.ts`, `src/api/endpoints/auth.ts` — the current direct-axios pattern this template deliberately does not copy
