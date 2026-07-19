---
id: playbook-writing-tests
title: Writing Tests Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Writing Tests Playbook

> "A mock that always succeeds isn't tested, it's decorated." — `../agents/50-testing-engineer.md`

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Bootstrapping Infrastructure Alongside `mockProductRepository`
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

**Test infrastructure does not exist yet in this repository.** This is not an assessment — it is a verified fact: `package.json`'s `devDependencies` contains exactly `@types/react` and `typescript`. There is no `jest`, no `jest-expo`, no `@testing-library/react-native`, no `jest.config.js`, no `test` script, and no file anywhere under `src/` matching `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or a `__tests__/` directory (`../agents/50-testing-engineer.md` § 9).

This playbook is two things: the procedure for introducing test infrastructure for the first time, at the correct trigger, and the target shape tests take once it exists. It does not treat "add more tests" or "fix the failing tests" as meaningful requests today — there is nothing to add to yet, and nothing can currently fail because nothing currently runs.

---

# 2. When To Use This Playbook

Use this playbook when:

- A piece of work — most often `creating-a-repository.md`'s mock implementation, a validation function, or a multi-branch Zustand store action — has crossed `../rules/testing.md` Rule 1's adoption trigger, and infrastructure needs to be bootstrapped in the same PR.
- Writing test cases (or a Manual Verification plan, if infrastructure genuinely doesn't apply yet) for code that already meets the trigger.
- `replacing-mock-api.md` Step 4 or `fixing-bugs.md` Step 6 sent you here.

Do not use this playbook to install Jest speculatively "to have it ready" before any real logic needs testing — see § 4 Step 1 and § 7.

---

# 3. Prerequisites

- `../agents/50-testing-engineer.md` read in full — this playbook operationalizes its § 9–§ 12.
- `../rules/testing.md` read in full — the six rules this playbook enforces.
- `../templates/testing.md` read — the test plan document every piece of testable work is recorded against, whether infrastructure exists yet or not.
- `../agents/10-feature-planner.md` § 13's Edge Case Catalog — the source list test cases are drawn from; never an invented ad hoc list.

---

# 4. Step-by-Step Workflow

## Step 1 — Confirm the trigger has actually been reached

Per `../rules/testing.md` Rule 1: "the first repository mock implementation with real branching logic (pagination edge cases, simulated failure handling), the first non-trivial validation function, or the first Zustand store action with more than one conditional path." Today's actual codebase state: `ai-chat`, `content`, `reports` are placeholder screens; `dashboard` renders a hardcoded `MOCK_STATS` array inline; `auth`'s `LoginScreen` has a no-op submit handler. None of this currently meets the trigger (`../agents/50-testing-engineer.md` § 9). Do not install infrastructure ahead of a real trigger — an empty Jest config with nothing meaningful to test is dead weight the Constitution's Simplicity Wins explicitly warns against.

## Step 2 — Write the test plan first, using `../templates/testing.md`

Even before infrastructure lands, write the Test Infrastructure Prerequisite section honestly, the Scope, and the Test Cases table — sourced from `../constitution.md`'s Error Philosophy states (Loading/Empty/Error/Success/Retry/Offline/Timeout/Unauthorized) and `../agents/10-feature-planner.md` § 13's Edge Case Catalog. This produces a ready backlog the moment infrastructure lands, instead of a scramble to invent cases under time pressure.

## Step 3 — Propose the exact tooling, ready for `chief-architect` sign-off

Per `../agents/50-testing-engineer.md` § 10, the decision is already made — this step is presenting it, not researching it fresh:

| Package | Role |
|---|---|
| `jest` | Test runner |
| `jest-expo` | Expo's maintained Jest preset, kept in sync with Expo SDK 56 |
| `@testing-library/react-native` | Component testing, queries by user-facing text/role |
| `@types/jest` | Type definitions for Jest globals |
| `"test": "jest"` in `package.json` `scripts` | Entry point |
| `jest.config.js` using the `jest-expo` preset | Test runner configuration |

**Why `jest-expo` specifically:** a generic `react-native` preset risks subtle incompatibilities with Expo-specific modules already in use (`expo-blur`, `expo-linear-gradient`, `expo-status-bar`); `jest-expo` is maintained in lockstep with each Expo SDK release, and Sugar Admin is on Expo SDK 56 today (`package.json`).

**Why `@testing-library/react-native` over an Enzyme-style alternative:** it queries components the way a user or screen reader interacts with them, matching the Constitution's Accessibility mandate.

Installing this list requires `chief-architect` sign-off (`../agents/00-chief-architect.md` § 4 — any new dependency is an architecture-level decision) — `testing-engineer` proposes, it does not install unilaterally (`../agents/50-testing-engineer.md` § 6).

## Step 4 — Land infrastructure in the same PR as the logic that triggered it

Per `../rules/testing.md` Rule 1: never a standalone "add testing infrastructure" PR (§ 7's named Bad Example: a `sanity.test.ts` with `expect(true).toBe(true)` "satisfies nothing"). The first real test file is written against real, shipping logic, in the same diff.

## Step 5 — Classify the test against the target pyramid

```
        Integration (fewest)   — screens driven against mock repositories,
                                  end to end, Loading/Error/Empty/Success
                                  states actually rendered.
        Component              — src/components/ui/* — behavior, not
                                  snapshots.
        Unit (most)             — repository mocks, Zustand store actions,
                                  pure validation/business logic. Cheapest,
                                  highest signal.
```

Business logic (repository mocks, store actions) gets unit tests before components get integration tests — the highest-signal, cheapest-to-write tests come first (`../agents/50-testing-engineer.md` § 7 Principle 5).

## Step 6 — For a mock repository, run the full Mock Realism Verification Standard

Every applicable item from `../agents/50-testing-engineer.md` § 12 needs an actual test case, not a source-code claim: Loading (non-zero delay, not synchronous), Pagination (last page `hasMore: false`, out-of-range page returns empty, not a throw), Latency (randomized within range, not a fixed constant), Authorization (role-gated calls actually reject), Validation (invalid input rejects with a named error type), Failures (rejects at approximately its configured rate, tested via a seeded/statistical test), Empty states (`[]`/`null` per the contract, not `undefined` or a throw), Server errors (a named error type, never a bare `throw new Error("failed")`).

## Step 7 — Test presentational components for behavior, never snapshot them

`Button.tsx` is tested for "does `onPress` fire on tap, does `disabled` suppress it" — not `toMatchSnapshot()`, which breaks on every deliberate style change and verifies nothing about correctness (`../agents/50-testing-engineer.md` § 7 Principle 4; `../rules/testing.md` § 5's named Bad Example).

## Step 8 — Once both a mock and a real implementation exist, share one contract test suite

Per `../rules/testing.md` Rule 5 — TypeScript checks shape, not behavior. A single, interface-parameterized test suite run against both `mock<Feature>Repository` and `http<Feature>Repository` is the only thing that actually catches behavioral drift (see `replacing-mock-api.md` for the full swap procedure this feeds into).

## Step 9 — Hand off

`reviewer` for verdict; `network-engineer`/`refactor-engineer` if a mock's behavior needs to change to pass § 12's realism standard; `chief-architect` if infrastructure adoption itself still needs sign-off.

---

# 5. Worked Example: Bootstrapping Infrastructure Alongside `mockProductRepository`

Continuing the Products thread from `creating-a-repository.md` — its worked example's `ProductRepository.mock.ts` has real branching logic: pagination math, a simulated `viewer`-role rejection on `create`/`update`, a `ConflictError` on stale writes, and an idempotent `archive`.

**Step 1.** Trigger confirmed: `list`'s pagination math and non-zero failure rate, `create`/`update`'s authorization and conflict logic, are exactly the "real branching logic" `../rules/testing.md` Rule 1 names. This is the first such case in the codebase.

**Step 2.** `../templates/testing.md`'s filled `ProductRepository` example (already written into that template) is used directly as the ready-made test case backlog — fourteen cases spanning pagination, empty state, latency, failure rate, `NotFoundError`, validation, authorization, conflict, and idempotency.

**Step 3.** Proposed to `chief-architect`: `jest`, `jest-expo`, `@testing-library/react-native`, `@types/jest`, `"test": "jest"`, `jest.config.js` with the `jest-expo` preset — matching Expo 56.0.11 already in `package.json`.

**Step 4.** Once approved, installed in the same PR as `ProductRepository.mock.ts` itself landing — not a separate infra-only PR beforehand.

**Step 5.** Classified: all fourteen cases are unit tests against `ProductRepository.mock.ts` directly, no rendering involved — correctly the cheapest, highest-signal layer of the pyramid.

**Step 6.** Mock Realism Checklist run against `mockProductRepository`: Loading (jittered 150–800ms, confirmed via a test asserting non-instant resolution), Pagination (`list({ page: 999, pageSize: 20 })` returns `hasMore: false`), Latency (randomized, not fixed), Authorization (`viewer` role rejected on `create`/`update` with a `ValidationError`-shaped message), Validation (empty `name`/negative `price` rejected), Failures (failure rate forced to 100% via a test seed/override, asserts `NetworkError`), Empty states (`query: "no-such-product"` returns `[]`, not `null`), Server errors (a named `NetworkError`/`NotFoundError`, never a bare string throw). All eight applicable items pass — `mockProductRepository` is verified-realistic, not just plausible on read-through.

**Step 7.** N/A for this step — no new presentational component was involved; `Chip.tsx` (from `creating-a-component.md`'s worked example) would be tested for `onPress` firing and `accessibilityState.selected` reflecting the `selected` prop, once it's touched.

**Step 8.** Deferred until `HttpProductRepository` exists — see `replacing-mock-api.md`'s worked example for the shared contract test suite this step produces.

**Step 9.** Handed to `reviewer` to confirm the fourteen cases actually exercise § 12's checklist, not just the happy path.

---

# 6. Checklist

- [ ] The § 9 trigger (real branching mock logic, non-trivial validation, or multi-branch store action) was actually reached — not anticipated speculatively.
- [ ] A test plan (`../templates/testing.md`) was written, sourced from the Constitution's Error Philosophy states and the § 13 Edge Case Catalog.
- [ ] The exact package list and config approach were proposed, with `chief-architect` sign-off obtained before installation.
- [ ] Infrastructure landed in the same PR as the logic that triggered it — never a standalone infra PR.
- [ ] Tests are classified correctly against the pyramid — unit first, component second, integration thinnest.
- [ ] A mock repository's tests cover every applicable item in the § 12 Mock Realism Checklist, not just its happy path.
- [ ] Presentational components are tested for behavior, never snapshotted.
- [ ] A shared contract test suite exists once both a mock and a real implementation exist for the same interface.

---

# 7. Common Mistakes

**Installing Jest before any real logic exists to test.** Adds a CI step that runs nothing, a `devDependencies` entry nobody references, and a false signal of coverage that doesn't exist — `../agents/50-testing-engineer.md` § 14's first named Anti Pattern.

**Claiming coverage exists because a test file exists.** A `sanity.test.ts` with `expect(true).toBe(true)` satisfies nothing (`../rules/testing.md` § 5's Bad Example).

**Snapshot-testing `src/components/ui/*` "for coverage."** Breaks on every deliberate style change and verifies nothing about correctness.

**Testing a mock's happy path only.** A `list()` test with valid params and a shape check, but no failure-rate test, no pagination-boundary test, no empty-state test, has verified the mock compiles — not that it's realistic.

**Writing a test plan that implies infrastructure exists when it doesn't.** Produces "a document nobody can act on" (`../templates/testing.md`'s own stated consequence) — always lead with the Test Infrastructure Prerequisite section, stated honestly.

---

# 8. References

- `../constitution.md` — Testability (Core Values), Definition of Done, Error Philosophy
- `../agents/50-testing-engineer.md` — the full identity, SOP, tooling gap, pyramid, and Mock Realism Verification Standard this playbook operationalizes
- `../rules/testing.md` — the six rules this playbook enforces, including the exact adoption trigger
- `../templates/testing.md` — the test plan document, including its own filled `ProductRepository` example used above
- `../agents/10-feature-planner.md` § 13 — the Edge Case Catalog test cases are sourced from
- `./creating-a-repository.md` — source of this playbook's worked example
- `./replacing-mock-api.md`, `./fixing-bugs.md`, `./refactoring.md` — the playbooks whose steps most often trigger this one
- `package.json` — current dependency list (no test runner present, confirmed 2026-07-18)
