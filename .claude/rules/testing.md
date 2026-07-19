---
id: rule-testing
title: Testing Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_features
  - all_repositories
  - all_hooks
last_updated: 2026-07-18
---

# Testing Rules

> Tests are written where appropriate. — `../constitution.md`, Definition of Done

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

There is currently no test infrastructure in this repository: no Jest configuration, no `jest.config.js`, no test files anywhere under `src/`, and no `@testing-library/react-native`, `jest-expo`, or any other test dependency in `package.json`'s `devDependencies`.

This file sets the bar for **when** test infrastructure is introduced and **what** gets tested once it exists. It is not a retrofit mandate — it does not require adding tests to every existing file as a precondition for other work. It defines the trigger for introducing testing, and the standard new code meets from that point forward.

---

# 2. Scope

Applies to the decision of when to add test infrastructure, and to all new repository, hook, and business-logic code once that infrastructure exists.

---

# 3. Rules

## Rule 1 — Test infrastructure is introduced the first time a feature has non-trivial business logic worth protecting — not before, not indefinitely deferred after

Sugar Admin's current features (`ai-chat`, `content`, `dashboard`, `reports` screens) are placeholder-level ("Coming soon..." text, or a static mock array rendered directly) — there is no business logic yet that a test would meaningfully protect. `auth`'s `LoginScreen` has a no-op submit handler. None of this justifies test infrastructure today.

**Why not add it speculatively:** per the constitution's Simplicity Wins — "avoid unnecessary configuration... avoid unnecessary dependencies." An empty Jest config with zero real tests is dead weight: a CI step that runs nothing, a `devDependencies` entry nobody references, a false signal of test coverage that doesn't exist. **The trigger:** the first repository mock implementation with real branching logic (pagination edge cases, simulated failure handling), the first non-trivial validation function, or the first Zustand store action with more than one conditional path is the point at which test infrastructure is added — in the same PR as that logic, not a placeholder PR beforehand.

## Rule 2 — When introduced, the stack is `jest-expo` + `@testing-library/react-native`, matching Expo SDK 56's supported tooling

**Why this specific stack, decided now even though not yet installed:** `jest-expo` is Expo's own maintained Jest preset, kept in sync with each Expo SDK release — using a generic `react-native` Jest preset instead risks subtle incompatibilities with Expo-specific modules (`expo-blur`, `expo-linear-gradient`) already in use. `@testing-library/react-native` is chosen over Enzyme-style shallow rendering because it tests components the way a user interacts with them (queries by text/role, not by internal component instance), which fits the constitution's preference for testing behavior over implementation detail. Deciding this now, in this rule file, means the first PR that needs testing doesn't also have to research and justify a testing-library choice from scratch.

## Rule 3 — Business logic (hooks, repository mocks, validation functions) is unit tested; visual/presentational components are not snapshot-tested by default

**Why:** per the constitution's Core Values ordering — Correctness and Maintainability rank above Testability itself, meaning tests exist to protect correctness and enable safe change, not to maximize a coverage percentage. A snapshot test of a purely presentational component (e.g. `Badge.tsx`) breaks on every deliberate style change and provides no signal about whether the component is actually correct — it tests "did this file change," which the diff already tells a reviewer. A unit test of a repository mock's failure-rate/pagination logic, or a hook's derived-state computation, tests something a diff alone cannot verify.

## Rule 4 — Mock repositories are tested for their simulated edge cases, not just their happy path

Per the constitution's Mock First Development — mocks must simulate loading, pagination, latency, authorization, validation, failures, empty states, and server errors. Once a mock exists with these behaviors, its test suite exercises each one: does `list()` actually throw at roughly the configured failure rate over many calls (a statistical/property test, or a seeded-random deterministic test), does pagination return `hasMore: false` correctly at the last page, does an empty result set return `data: []` rather than `null` or throwing.

**Why:** a mock is "first-class," per the constitution — if its edge-case behavior is untested, a refactor of the mock (e.g. changing the pagination math) can silently break the exact scenarios (empty state, error state) the mock exists to let engineers build against, and nothing catches it until a screen visibly breaks.

## Rule 5 — A repository interface and a real (non-mock) implementation, once one exists, share a single contract test suite

Per the Repository Pattern's promise (`repositories.md`) — mock and real implementations fulfill the same interface. A shared, interface-level test suite (parameterized to run against whichever implementation is passed in) is the only way to guarantee this in practice, rather than trusting that TypeScript's structural typing alone means the two behave identically.

**Why:** TypeScript checks *shape* (does `restProductRepository.list()` return the right type), not *behavior* (does it paginate the same way the mock does, does it treat an empty result the same way). A shared contract test catches behavioral drift between mock and real implementations that the type system cannot.

## Rule 6 — Navigation, theme, and language context are not unit tested in isolation; they are exercised through the screens that use them

`ThemeContext` and `LanguageContext` are thin, low-branching wrappers around `useState` and a lookup table. Testing them in isolation (mount the provider, call `toggleTheme`, assert `isDark` flipped) provides low signal relative to its cost. If a screen's behavior depends on theme or language, that dependency is exercised as part of testing the screen, once screens are complex enough to warrant tests per Rule 1.

**Why:** this keeps the test suite's cost proportional to the risk it protects against — matching the constitution's ordering of Simplicity above Testability-for-its-own-sake.

---

# 4. Good Examples

## Good: the first test introduced, alongside the logic that triggered Rule 1

```ts
// src/features/products/repository/mockProductRepository.test.ts (introduced alongside mockProductRepository.ts)
import { mockProductRepository } from "./mockProductRepository";

describe("mockProductRepository.list", () => {
  it("returns hasMore: false on the last page", async () => {
    const result = await mockProductRepository.list({ page: 999, pageSize: 20 });
    expect(result.hasMore).toBe(false);
  });

  it("returns an empty array, not null, when no products match", async () => {
    const result = await mockProductRepository.list({ page: 1, pageSize: 20, query: "no-such-product" });
    expect(result.data).toEqual([]);
  });
});
```

This is good because it tests behavior a diff alone can't verify (pagination boundary, empty-state shape) and it arrives in the same PR as the mock it tests, per Rule 1.

---

# 5. Bad Examples

## Bad: adding Jest configuration and one trivial test as a standalone "add testing infrastructure" PR

```ts
// __tests__/sanity.test.ts — added in isolation, before any feature needs it
it("true is true", () => { expect(true).toBe(true); });
```

**Consequence:** this satisfies nothing — it adds a dependency, a config file, and a CI step for zero actual coverage, and it doesn't establish real conventions (how are mocks tested, how is a screen tested) because there was no real code driving the decisions. Per Rule 1, wait for the actual trigger, then introduce infrastructure and a real test together.

## Bad: snapshot-testing a purely presentational component to "get coverage"

```ts
it("Badge matches snapshot", () => {
  expect(render(<Badge label="New" />)).toMatchSnapshot();
});
```

**Consequence:** the snapshot breaks on the next deliberate color or padding change (a NativeWind migration per `nativewind.md`, for instance), producing review noise ("update snapshot") that trains reviewers to approve snapshot diffs without reading them — which then also hides a genuine regression the one time it matters.

---

# 6. Checklist

- [ ] Test infrastructure is only introduced alongside real, non-trivial logic — not speculatively.
- [ ] When introduced, the stack is `jest-expo` + `@testing-library/react-native`.
- [ ] New unit tests target business logic (hooks, repository mocks, validation), not purely presentational components via snapshot.
- [ ] A new mock repository's tests cover its simulated failure rate, pagination boundaries, and empty-state behavior, not just its happy path.
- [ ] If both a mock and a real implementation of a repository exist, they share one contract test suite.
- [ ] No PR adds test infrastructure with no corresponding real test justifying it.

---

# 7. References

- `../constitution.md` — Definition of Done, Mock First Development, Core Values ordering
- `../context.md` — Quality Standards
- `repositories.md` — the mock behavior this file's test rules apply to
- `state.md` — hook and store logic that becomes test-worthy per Rule 1
- `review-process.md` — how test coverage (or its deliberate absence) is evaluated in review
