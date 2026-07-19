---
id: command-generate-repository
title: Generate Repository
category: command
version: 1.0.0
status: active
invokes_agent: network-engineer
last_updated: 2026-07-18
---

# Command: Generate Repository

> Produce a feature's repository layer — interface, mock implementation, and
> real implementation stub — following `10-feature-planner.md` § 10's
> Repository Contract Standard and the Constitution's Mock First Development
> principle.

---

## Purpose

Sugar Admin's Backend Independence principle requires that "the frontend
must never depend on a specific backend implementation" and that "migration
should require changing repositories, not UI." Today, no repository pattern
exists anywhere in `src/api` — `src/api/endpoints/auth.ts`, `content.ts`, and
`reports.ts` are plain objects whose methods call `client` (axios) directly,
with no interface, no mock, and no simulated failure. This is a real,
current gap between the Constitution's stated architecture and the actual
codebase (see
`.claude/docs/decisions/adr-0002-mock-first-development.md`).

`generate-repository` is how every *new* feature closes that gap from day
one: it produces three artifacts — the contract, the mock, and the real
stub — so a feature never ships depending on a specific network
implementation, and so a feature is fully usable and testable before any
backend exists.

---

## When To Invoke

- A feature plan (from `generate-feature.md`) specifies a repository
  contract in its § 10 section that has not yet been implemented.
- An existing direct-axios `*Api` object (e.g. `contentApi`, `reportsApi`)
  is being migrated to the repository pattern via `refactor-feature.md` —
  in that case this command supplies the target shape, and
  `refactor-feature.md` supplies the migration discipline.
- A feature needs a new repository method added to an existing repository
  interface.

---

## Required Inputs

The invoker must supply:

1. **Repository name and owning feature** — e.g. `ProductRepository` for the
   `products` feature.
2. **Method list with signatures**, sourced from the feature plan's § 10
   Repository Contract section — this command does not invent method
   signatures; it implements ones already decided by `feature-planner`. If
   no plan section exists yet, stop and route to `generate-feature` first.
3. **Data shape / entity types** — the TypeScript types the repository
   returns (e.g. `Product`, `Paginated<Product>`), either already defined in
   `src/types/index.ts` or to be added as part of this command's output.
4. **Existing repository to mirror**, if any, for latency/failure-rate
   conventions (per `10-feature-planner.md` § 16's Decision Tree: "mirror
   its latency, failure-rate, and pagination conventions for consistency").
   Since no repository exists yet in the codebase, the first one generated
   sets the project's baseline convention — 150–800ms jitter, non-zero
   simulated failure rate, per § 16's fallback rule.

---

## Procedure

1. **Confirm the contract source.** Read the feature plan's § 10 Repository
   Contract section for this repository. Every method's input shape, success
   return shape, named error cases, pagination behavior, and retry-safety
   must already be decided there — this command implements, it does not
   design. If any method lacks one of these, stop and return to
   `feature-planner`.

2. **Place the repository in the feature folder**, not in `src/api/`. Per
   the Constitution's Feature Ownership section, each feature owns its
   repository: `src/features/<feature>/repository/<Name>Repository.ts` for
   the interface, `Mock<Name>Repository.ts` for the mock, and
   `Real<Name>Repository.ts` for the real implementation. This is a
   deliberate departure from the existing flat `src/api/endpoints/` layout
   — new features do not add to that folder (see
   `20-react-native-engineer.md` § 9: feature folders are flat today but
   that is not a rule to preserve).

3. **Write the interface first**, exactly matching the plan's method
   signatures. Every method must be documented with its error cases as
   named types or documented thrown-error names — never a bare `Promise<any>`
   or an unannotated `throws`. See `10-feature-planner.md` § 18's Good/Bad
   examples for the standard.

4. **Write the mock implementation** satisfying the Constitution's Mock
   First Development section in full — it must simulate:
   - loading (artificial latency, 150–800ms jitter as the project default
     absent a reason to deviate)
   - pagination (if the contract includes list/paginated methods)
   - a non-zero simulated failure rate (never 100% success — "a mock that
     always succeeds is not realistic")
   - authorization (reject calls when no valid mock session/token context
     is present, if the method is auth-gated)
   - validation (reject malformed input with the same error shape the real
     backend would use)
   - empty states (a method like `list` must be able to return zero results,
     not just a fixed non-empty fixture)
   - server errors (simulate a 500-equivalent failure path distinct from
     validation failure)

5. **Write the real implementation** as a thin wrapper around
   `src/api/client.ts` (the existing axios instance) — same interface,
   different transport. If the backend endpoint does not exist yet
   (true for nearly everything beyond `/auth/*` today, per `context.md`'s
   Current Development Phase: "Backend: Not implemented"), write the real
   implementation as a stub that compiles and matches the interface exactly,
   with a clearly marked `// TODO(network-engineer): backend endpoint not
   yet implemented` and a thrown `NotImplementedError` at runtime — do not
   silently fall back to the mock inside the "real" implementation, since
   that hides which one is actually running.

6. **Wire selection between mock and real** at the feature's composition
   root (e.g. a small factory or environment-driven switch), never inside a
   screen or store — per the Constitution's Backend Independence: "The UI
   must never know whether the repository is using mock data or a real
   backend."

7. **Add or confirm the entity types** in `src/types/index.ts` if they don't
   already exist, following the existing convention there (flat exported
   interfaces, grouped by domain comment headers like `// ── Content
   ──────`).

8. **Hand off to `state-engineer`** (to wire TanStack Query hooks around the
   repository) and `react-native-engineer` (to consume those hooks in
   screens) — never let a screen call the repository directly without a
   query-hook layer in between, matching the intent of
   `20-react-native-engineer.md`'s Data Wiring responsibility.

---

## Output Format

Three TypeScript files plus a short manifest:

```
src/features/<feature>/repository/
  <Name>Repository.ts        (interface)
  Mock<Name>Repository.ts    (mock implementation)
  Real<Name>Repository.ts    (real implementation / stub)

# Repository Manifest: <Name>Repository

## Contract Source
<feature plan document + section reference>

## Methods
- <method>: <input> -> <return> | errors: <named errors> | retry-safe: yes/no

## Mock Behavior
Latency: <range>
Failure rate: <percentage, per method if it varies>
Empty state: <how triggered>

## Real Implementation Status
<implemented against live endpoint | stub pending backend, with reason>

## Handoff
state-engineer, react-native-engineer
```

---

## Example Invocation

> Generate the repository layer for `ProductRepository`, per
> `.claude/docs/examples/products-feature-plan.md` § Repository Contracts.

## Example Output

```
src/features/products/repository/
  ProductRepository.ts
  MockProductRepository.ts
  RealProductRepository.ts

# Repository Manifest: ProductRepository

## Contract Source
.claude/docs/examples/products-feature-plan.md, Repository Contracts section.

## Methods
- list(params: { page, pageSize, query?, categoryId?, status? }) ->
  Promise<Paginated<Product>> | errors: none thrown, empty Paginated on no
  match | retry-safe: yes
- getById(id: string) -> Promise<Product> | errors: ProductNotFoundError |
  retry-safe: yes
- create(input: CreateProductInput) -> Promise<Product> | errors:
  ProductValidationError | retry-safe: no (side-effecting)
- update(id, input: UpdateProductInput) -> Promise<Product> | errors:
  ProductNotFoundError, ProductValidationError, ProductConflictError
  (concurrent edit) | retry-safe: no
- archive(id: string) -> Promise<void> | errors: ProductNotFoundError |
  retry-safe: yes (idempotent)
- search(query: string, params) -> Promise<Paginated<Product>> | errors:
  none thrown, empty Paginated on no match | retry-safe: yes

## Mock Behavior
Latency: 150-800ms jitter, matching project default (first repository in
the codebase; no prior repository exists to mirror).
Failure rate: 6% simulated server error on list/search, 10% on
create/update (to exercise ProductFormScreen's error state), 0% on archive
(idempotent, treated as safe to always simulate success once found).
Empty state: list/search return `{ data: [], total: 0, page, limit,
hasMore: false }` when the in-memory mock dataset is filtered to zero
results.

## Real Implementation Status
Stub. No `/products` backend endpoint exists per context.md's Current
Development Phase ("Backend: Not implemented"). RealProductRepository.ts
compiles against the same interface and throws NotImplementedError at
runtime, with a TODO comment naming the expected endpoint shape
(`GET/POST/PUT /products`) for when a backend is selected.

## Handoff
state-engineer — wrap in TanStack Query hooks (useProducts, useProduct,
useCreateProduct, etc.).
react-native-engineer — consume those hooks in ProductListScreen,
ProductDetailScreen, ProductFormScreen.
```

---

## Related Agents

- `network-engineer` — primary owner of this command.
- `feature-planner` — supplies the contract this command implements against.
- `state-engineer` — consumes the repository via query hooks.
- `react-native-engineer` — consumes query hooks in screens, never the
  repository directly.
- `ai-engineer` — owns repository methods whose implementation depends on an
  AI provider call (this command defers those methods to `ai-engineer`
  rather than implementing them generically).

---

## References

- `.claude/constitution.md` — Backend Independence, Mock First Development,
  Replaceability.
- `.claude/agents/10-feature-planner.md` § 10, § 16, § 18.
- `.claude/docs/decisions/adr-0002-mock-first-development.md`.
- `.claude/docs/examples/auth-repository-migration-example.md` — worked
  before/after example of migrating an existing endpoint file to this exact
  pattern.
- `src/api/client.ts` — the axios instance real implementations wrap.
