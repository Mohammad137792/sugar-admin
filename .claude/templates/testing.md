---
id: template-testing
title: Test Plan Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Test Plan Template

## Purpose

Use this template to plan how a piece of work (a repository, a hook, a screen, a
store) will be verified. Filled out by whichever engineer agent implements the
work, reviewed by `reviewer`.

**Important project fact:** as of this writing, `package.json` has no test
runner, no assertion library, and no React Native testing utilities installed —
no `jest`, no `@testing-library/react-native`, no `detox`, nothing under a
`__tests__` or `*.test.ts` pattern exists anywhere in `src/`. The Constitution's
Definition of Done still lists "Tests are written where appropriate," and
`context.md`'s Folder Philosophy lists `tests` as something every feature owns —
but the infrastructure to make that true does not exist yet. Every test plan
written from this template must therefore start with the **Test Infrastructure
Prerequisite** section below: either confirm infrastructure already landed, or
name it as a blocking dependency before any test in the plan can actually run.

## Instructions

1. **Test Infrastructure Prerequisite** — always fill this in first. If no test
   runner exists yet, say so plainly and name what would need to land (e.g. "Jest
   + `@testing-library/react-native` + `jest-expo` preset, plus a `test` script in
   `package.json`") before this plan's test cases can be executed. Do not write a
   plan that pretends infrastructure exists when it doesn't — that produces a
   document nobody can act on.
2. **Scope** — what is being tested (one repository, one hook, one screen) and
   what is explicitly not (e.g. "not testing the live/axios implementation,
   mock only").
3. **Test Cases** — one row per behavior. Reference the Constitution's Error
   Philosophy states (Loading/Empty/Error/Success/Retry/Offline/Timeout/
   Unauthorized) and the Edge Case Catalog in
   `.claude/agents/10-feature-planner.md` § 13 as the source list for what to
   cover — do not invent an ad hoc list when those already exist.
4. **Out of Scope** — be explicit; a test plan that "just tests everything" tests
   nothing well.
5. **Manual Verification** — until automated infra exists, name the manual steps
   an engineer or reviewer performs instead, so verification isn't skipped
   entirely while waiting on infrastructure.

---

## The Template

```markdown
# Test Plan: <subject>

## Test Infrastructure Prerequisite
<Does a test runner exist yet for this kind of code? If not, name exactly what
must be added before these test cases are executable, and mark this plan
"Blocked on infrastructure" until then.>

## Scope
**In scope:** <what is being tested>
**Out of scope:** <what is explicitly not — and why>

## Test Cases

| # | Behavior | Type (unit/integration) | Given | When | Then |
|---|----------|--------------------------|-------|------|------|
| 1 | <behavior> | <type> | <precondition> | <action> | <expected result> |

## Manual Verification (until automated infra exists)
1. <step>
2. <step>

## Acceptance
<When is this test plan considered satisfied — all automated cases passing, or,
pending infrastructure, all manual steps performed and recorded?>
```

---

## Filled Example: `ProductRepository` Mock Implementation

```markdown
# Test Plan: ProductRepository (mock implementation)

## Test Infrastructure Prerequisite
**Blocked on infrastructure.** `package.json` currently has no test runner
(`jest` is not a dependency), no `@testing-library/react-native`, and no `test`
npm script. Before any test case below can run automatically, the following must
land, as a separate, explicitly-scoped piece of work (not silently bundled into
the Products feature):
- `jest`, `jest-expo` (Expo's recommended preset, matches `expo` 56.x already in
  `package.json`), `@types/jest`
- A `test` script in `package.json` (`"test": "jest"`)
- A `jest.config.js` using the `jest-expo` preset
This test plan's cases are written now so they are ready to execute the moment
that infrastructure lands — they should not block Products development, and they
should not be silently skipped once infrastructure exists either.

## Scope
**In scope:** `ProductRepository.mock.ts` (`src/features/products/repository/
ProductRepository.mock.ts`) — all five methods (`list`, `getById`, `create`,
`update`, `archive`) as specified in `.claude/templates/repository.md`'s filled
example.

**Out of scope:** `ProductRepository.live.ts` (requires a real backend or a
network-mocking layer like `msw`, neither of which exists yet — separate test
plan once a backend is selected); UI-level tests of `ProductListScreen` etc.
(requires `@testing-library/react-native`, covered by a separate screen-level
test plan once infra lands).

## Test Cases

| # | Behavior | Type | Given | When | Then |
|---|----------|------|-------|------|------|
| 1 | `list` returns paginated results | unit | mock seeded with 25 products | `list({ page: 1, pageSize: 20 })` | returns 20 items, `hasMore: true`, `total: 25` |
| 2 | `list` respects `query` filter | unit | mock seeded with products named "Red Shirt", "Blue Hat" | `list({ page: 1, pageSize: 20, query: "shirt" })` | returns only "Red Shirt" |
| 3 | `list` returns empty state correctly | unit | mock seeded, `query` matches nothing | `list({ page: 1, pageSize: 20, query: "zzz" })` | returns `{ items: [], total: 0, hasMore: false }`, not an error |
| 4 | `list` simulates latency | unit | default mock config | `list(...)` | resolves after 150-800ms, not instantly (guards against accidentally stubbing latency away) |
| 5 | `list` simulates failures at the configured rate | unit | mock failure rate forced to 100% via test seed/override | `list(...)` | rejects with `NetworkError` |
| 6 | `getById` returns full product detail | unit | mock seeded with product id "p1" | `getById("p1")` | resolves with full `Product` shape including description/images/categories |
| 7 | `getById` throws `NotFoundError` for unknown id | unit | mock seeded, no product "does-not-exist" | `getById("does-not-exist")` | rejects with `NotFoundError` |
| 8 | `getById` throws `NotFoundError` for archived product | unit | mock seeded, product "p1" archived | `getById("p1")` | rejects with `NotFoundError` (archived products are not gettable) |
| 9 | `create` validates required fields | unit | — | `create({ name: "", price: -1, inventory: 0 })` | rejects with `ValidationError` naming `name` and `price` fields |
| 10 | `create` succeeds with valid input | unit | — | `create({ name: "New Item", price: 10, inventory: 5 })` | resolves with a `Product` including a generated `id` and `createdAt`; a subsequent `getById` on that id succeeds |
| 11 | `create` rejects for `viewer` role | unit | mock simulating an authenticated `viewer` role | `create(validInput)` | rejects with `ValidationError`-shaped `{ message: "Insufficient permission" }` |
| 12 | `update` throws `ConflictError` on stale write | unit | product "p1" fetched, then updated by a second simulated caller | `update("p1", { ...staleInput })` | rejects with `ConflictError` |
| 13 | `update` is idempotent for unchanged repeated input | unit | product "p1" exists | call `update("p1", input)` twice with identical `input` and matching `expectedUpdatedAt` handling | both calls succeed without throwing `ConflictError` against each other |
| 14 | `archive` is safe to call twice | unit | product "p1" exists, archived once | `archive("p1")` called again | second call rejects with `NotFoundError`, does not throw an unhandled exception or corrupt state |

## Manual Verification (until automated infra exists)
1. In a local dev build, call each `ProductRepository.mock.ts` method from a
   temporary debug screen or the Metro/dev console and log the result, confirming
   shapes match `.claude/templates/repository.md`'s filled example.
2. Manually force the failure-rate constant to 100% and confirm `ProductListScreen`
   renders its Error state with Retry (cross-reference
   `.claude/templates/screen.md`'s filled example).
3. Manually seed zero products and confirm `ProductListScreen`'s Empty state
   renders correctly.
4. Record the date and outcome of this manual pass in the PR description until
   automated infra exists.

## Acceptance
Blocked until Jest infrastructure lands. Until then: all four Manual Verification
steps performed and their outcomes recorded in the PR. Once infrastructure lands,
all 14 automated test cases above must pass in CI before this repository
implementation is considered done, per the Constitution's Definition of Done
("Tests are written where appropriate").
```

---

## Checklist

- [ ] Test Infrastructure Prerequisite is filled honestly — never assumes infra that doesn't exist
- [ ] Scope names exactly what is in and out
- [ ] Test cases reference the Constitution's Error Philosophy states and/or the § 13 Edge Case Catalog, not an invented list
- [ ] At least one test case per repository method / hook behavior / screen state
- [ ] Manual Verification steps exist for anything blocked on missing infrastructure
- [ ] Acceptance criteria state exactly when the plan is satisfied

## References

- `.claude/constitution.md` — Definition of Done, Error Philosophy
- `.claude/agents/10-feature-planner.md` § 13 (Edge Case Catalog)
- `.claude/context.md` — Folder Philosophy (`tests` as a feature-owned concern)
- `.claude/templates/repository.md` — source of the contract this test plan verifies
- `package.json` — current dependency list (no test runner present, confirmed 2026-07-18)
