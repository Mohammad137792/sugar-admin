---
id: handbook-testing-strategy
title: Testing Strategy Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Testing Strategy Handbook

> "A mock that always succeeds isn't tested, it's decorated." — adapted from constitution.md, Mock First Development, via `.claude/agents/50-testing-engineer.md`

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Honest Baseline: Zero Test Infrastructure
5. The Target Pyramid, Explained
6. Concrete Tooling: What Gets Installed, and Why That Combination
7. Recognizing the Adoption Trigger
8. What a Mock's "Realism" Actually Means
9. Good Examples
10. Bad Examples
11. Decision Trees
12. Real Project Examples
13. Common Mistakes
14. Best Practices
15. Checklist
16. References

---

# 1. Purpose

`.claude/rules/testing.md` states the enforceable rules (when infrastructure is introduced, what stack, what gets unit-tested vs. not, mock realism, contract tests). `.claude/agents/50-testing-engineer.md` owns the role end to end — the SOP, the honest-reporting requirement, the Mock Realism Verification Standard. This handbook exists to state, once more and without qualification, the single fact every other testing document in this workspace also states: **there is no test infrastructure in Sugar Admin today.** Beyond restating that fact for completeness, this handbook explains the target pyramid's reasoning and gives an engineer enough grounding to recognize the adoption trigger correctly when it actually arrives, rather than either jumping the gun or missing it.

---

# 2. Scope

In scope: the current, verified state of test infrastructure (none), the reasoning behind the target test pyramid's shape, the reasoning behind the specific tooling choice, and how to recognize the real adoption trigger in practice.

Out of scope: the enforceable rule list (`.claude/rules/testing.md`), the testing-engineer role's authority and SOP (`.claude/agents/50-testing-engineer.md`), and the Mock Realism Verification Standard's full checklist (owned by `.claude/agents/50-testing-engineer.md` § 12, referenced here, not reproduced).

---

# 3. Principles

Grounded in:

- **Definition of Done** (constitution.md) — "Tests are written where appropriate" is a completion requirement, not optional polish, but "where appropriate" is doing real work in that sentence — this handbook's § 7 is about determining what "appropriate" means concretely.
- **Core Values ordering** (constitution.md) — Testability ranks fifth of nine, above Scalability, Performance, and Developer Experience — a real, deliberate priority — but below Correctness, Simplicity, Maintainability, Readability. Testing exists to protect those higher-ranked values, not to maximize a coverage percentage for its own sake.
- **Mock First Development** (constitution.md) — mocks must simulate loading, pagination, latency, authorization, validation, failures, empty states, server errors; "a mock that always succeeds is not realistic." § 8 below is this principle made testable.
- **Simplicity Wins** (constitution.md) — "avoid unnecessary configuration... avoid unnecessary dependencies" — the direct argument against installing test infrastructure before it has anything real to protect.

---

# 4. The Honest Baseline: Zero Test Infrastructure

Stated with the same directness `.claude/agents/50-testing-engineer.md` § 9 uses, because softening this fact even slightly produces documents that mislead whoever reads them next: `package.json`'s `devDependencies` contains exactly `@types/react` and `typescript`. There is no `jest`, no `jest-expo`, no `@testing-library/react-native`, no `detox`, no `vitest`, and no assertion library beyond what TypeScript's own compiler provides. There is no `jest.config.js`. There is no `test` script in `package.json`'s `scripts` block. A search across `src/` for `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or a `__tests__/` directory returns nothing.

This is greenfield bootstrapping, not "improving existing coverage" — there is no existing coverage to improve, and no existing test to point to as a pattern to follow. Any instruction to "add more tests" or "fix the failing tests" is, today, based on a false premise: nothing can currently fail because nothing currently runs. Every section below describes what will need to be true once infrastructure is introduced, not a description of a partially-working system today.

---

# 5. The Target Pyramid, Explained

`.claude/agents/50-testing-engineer.md` § 11 draws the target shape — thin at the top (integration), thicker in the middle (component), thickest at the base (unit). The reasoning worth internalizing, rather than just the shape:

**Unit tests (repositories, stores) are cheapest and highest-signal, so they come first and stay thickest.** A mock repository's `list()` method, tested in isolation, requires no React rendering, no navigation context, no theme provider — just a function call and an assertion. It's also the layer where the actual business rules live (pagination boundaries, simulated failure rates, validation logic) — exactly the logic constitution's Mock First Development requires to be realistic. Cheap to write, high-value to have: the correct combination for the base of a pyramid.

**Component tests (`src/components/ui/*`) sit in the middle, and are about behavior, not appearance.** `.claude/rules/testing.md` Rule 3 and its Bad Example are explicit: a snapshot test of `Badge.tsx` breaks on every deliberate style change and verifies only "did this file change," which the diff already shows a reviewer directly. A behavior test — does `Button` call `onPress` when tapped, does it suppress that call when `disabled`, does `Input` render its `error` text when an `error` prop is passed — verifies something a diff alone cannot. This is why the target pyramid explicitly excludes snapshot testing as the default component-testing strategy, even though snapshots are often the *easiest* first thing to reach for.

**Integration tests (screens driven against mock repositories) are deliberately thinnest, because they're the most expensive and the least precise at catching any single bug.** An integration test exercises many layers at once (screen, hook, repository, mock) — when it fails, it doesn't immediately tell you which layer broke, unlike a focused unit test. Its value is different: it's the layer that actually proves a mock's simulated realism (§ 8) reaches the user-visible states (`constitution.md`'s Error Philosophy: Loading, Empty, Error, Success, Offline, Unauthorized) correctly wired end to end — a kind of bug unit tests structurally can't catch, because unit tests never render a screen at all.

---

# 6. Concrete Tooling: What Gets Installed, and Why That Combination

`.claude/rules/testing.md` Rule 2 and `.claude/agents/50-testing-engineer.md` § 10 both specify `jest-expo` + `@testing-library/react-native`. The reasoning, worked through rather than asserted:

**Why `jest-expo` over a generic React Native Jest preset.** Sugar Admin already depends on several Expo-specific native modules — `expo-blur` (`GlassCard.tsx`), `expo-linear-gradient` (`Button.tsx`), `expo-status-bar`. A generic `react-native` Jest preset has no knowledge of how to mock or transform these modules correctly; `jest-expo` is maintained by the Expo team in lockstep with each SDK release specifically to handle this. Choosing the generic preset would mean discovering, ad hoc, exactly which Expo-specific mocking gaps exist the first time a test tries to render a component that uses one of these modules — an entirely avoidable category of setup friction.

**Why `@testing-library/react-native` over an Enzyme-style shallow-rendering alternative.** `@testing-library/react-native` queries by what a user (or a screen reader) can actually perceive — visible text, accessible role, accessible label — rather than by internal component instance structure. This isn't just a testing-style preference; it directly reinforces `accessibility.md`'s entire premise: a test written by querying `getByRole("button", { name: "Sign In" })` only passes if the button is actually discoverable the way a real assistive-technology user would discover it, meaning accessibility regressions become test regressions almost for free, as a side effect of how the testing library is designed to be used at all.

**Deciding this now, before it's installed, is deliberate.** `.claude/agents/50-testing-engineer.md` § 4 states the reasoning: having the exact package list and justification ready means the first PR that actually needs testing isn't also blocked on researching and justifying a testing-library choice from scratch — the decision and its reasoning are already made, only the `chief-architect` sign-off (§ 6 below applies to installation, not to this reasoning) and the actual `npm install` remain.

---

# 7. Recognizing the Adoption Trigger

This is the section worth reading most carefully, because getting the trigger wrong in either direction has a real, named cost, per `.claude/rules/testing.md` Rule 1 and `.claude/agents/50-testing-engineer.md` § 7 Principle 2.

**Too early:** installing Jest today, against `ai-chat`'s "Coming soon" placeholder and `content`'s static mock array, produces a CI step that runs nothing, a `devDependencies` entry nobody references, and — worse than simply wasted effort — a false signal that test coverage exists when it protects nothing real. This directly contradicts constitution's Simplicity Wins ("avoid unnecessary configuration... avoid unnecessary dependencies").

**Too late:** waiting past the point where real logic exists — the first mock repository with genuine branching (pagination edge cases, a simulated failure path), the first non-trivial validation function, the first Zustand store action with more than one conditional branch — means that logic accumulates with no automated protection, and retrofitting tests onto already-complex logic is measurably more expensive and error-prone than building the tests alongside the logic from the start.

**The trigger, precisely, per `.claude/rules/testing.md` Rule 1:** the first repository mock implementation with real branching logic, the first non-trivial validation function (§ 6 of `security.md`'s `validateLoginInput` sketch would qualify the moment it's actually implemented with more than a placeholder check), or the first Zustand store action with more than one conditional path. None of the current codebase's logic crosses this line yet — `authStore.ts`'s `login()` has a `try/catch/finally`, which is closer to the line than anything else in the repo today, but it's not yet backed by a real, branching mock repository (it still calls a live `authApi` pointed at an unprovisioned URL) — the moment `authStore.ts`'s calls are migrated to a `mockAuthRepository` with real simulated failure/latency branching (`refactoring.md` § 6), that migration is the trigger, and infrastructure adoption belongs in the same PR, not a follow-up.

**What "in the same PR" means practically:** per `.claude/rules/testing.md` Rule 1's own reasoning, a standalone "add testing infrastructure" PR with no real logic behind it produces exactly the "too early" failure mode above, even if the trigger has technically been reached elsewhere in a parallel, not-yet-merged PR. Infrastructure and its first real test case land together.

---

# 8. What a Mock's "Realism" Actually Means

`.claude/agents/50-testing-engineer.md` § 12's Mock Realism Verification Standard is the authoritative, full checklist (Loading, Pagination, Latency, Authorization, Validation, Failures, Empty states, Server errors) — this section explains, briefly, why "realistic" is a testable property at all rather than a subjective judgment call.

A mock repository's source code can *claim* to simulate an 8% failure rate in a comment while never actually exercising that branch in any test — `.claude/agents/50-testing-engineer.md` § 15's own example names this precisely. The claim and the verified behavior are different things, and only a test that actually forces the failure branch (a seeded/deterministic `Math.random()` override, or a statistical test over enough iterations) distinguishes "this mock's code mentions failure simulation" from "this mock's failure simulation actually works and actually throws the right error type when triggered." Reading the mock's source and concluding "looks realistic" is not verification — it's the same category of unverified claim `refactoring.md` § 5 warns against for behavior-preservation claims generally: assertion without evidence.

---

# 9. Good Examples

**Good: the first test, arriving with the logic that triggered it**, reproduced from `.claude/rules/testing.md` § 4:

```ts
// src/features/products/repository/mockProductRepository.test.ts
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

Tests behavior a diff can't verify on its own (a pagination boundary, an empty-state shape), and arrives in the same PR as the mock it protects.

---

# 10. Bad Examples

**Bad: infrastructure with no real test behind it.**

```ts
// __tests__/sanity.test.ts — added before any feature needs it
it("true is true", () => { expect(true).toBe(true); });
```

Adds a dependency, a config file, and a CI step for zero actual coverage — the exact "too early" failure mode of § 7, named explicitly in `.claude/rules/testing.md` § 5.

**Bad: a mock realism claim with no test to back it.**

"`mockProductRepository.list()` simulates an 8% failure rate" — stated in a comment, in a PR description, or in this very kind of document — with no test that ever actually forces `Math.random()` into the failure branch and asserts the correct error type is thrown. Per § 8, this is an unverified claim, not a tested property.

---

# 11. Decision Trees

## Has the adoption trigger actually been reached?

```
Does this PR introduce a mock repository with genuine branching logic
(pagination edge cases, a real simulated-failure path), a non-trivial
validation function, or a multi-conditional Zustand store action?
  → Yes: propose infrastructure adoption in this same PR, per § 6/§ 7.
  → No: write a test plan marked "Blocked on infrastructure" with manual
    verification steps (per .claude/templates/testing.md), but do not
    install Jest yet.
```

## Should this component get a unit, component, or integration test, once infrastructure exists?

```
Is it pure logic with no React rendering involved (a repository mock
method, a store action, a validation function)?
  → Unit test — cheapest, highest signal, per § 5.
Is it a presentational component in src/components/ui/*?
  → Component test, behavior-focused (queries by role/label), never
    a snapshot — per § 5, § 6.
Does it require rendering a full screen against a mock repository to
verify a wired-together user-visible state (Loading/Error/Success)?
  → Integration test — deliberately thin, reserved for wiring-level bugs
    unit tests structurally cannot catch.
```

---

# 12. Real Project Examples

- **`package.json`** — verified, current absence of any test dependency, § 4.
- **`src/store/authStore.ts`'s `login()`** — the closest-to-the-trigger existing logic in the codebase today, discussed in § 7.
- **`.claude/agents/50-testing-engineer.md` § 12** — the full Mock Realism Verification Standard § 8 explains the reasoning behind rather than reproduces.
- **`.claude/templates/testing.md`** — the test plan template used for "Blocked on infrastructure" cases per § 11's decision tree.

---

# 13. Common Mistakes

- Installing Jest or any test dependency speculatively, before real branching logic exists to protect.
- Waiting past the actual trigger (§ 7) because "there's no rush," letting untested business logic accumulate.
- Writing a snapshot test for a presentational component to "get coverage," rather than a behavior-focused test.
- Claiming a mock is "realistic" based on reading its source code, without a test that actually exercises the claimed behavior.
- Treating a test plan (`.claude/templates/testing.md`) written while infrastructure is absent as if its test cases are currently runnable — always lead with the Test Infrastructure Prerequisite section, stated honestly.

---

# 14. Best Practices

- State plainly, every time, whether test infrastructure exists for the code in question — never imply otherwise, even by omission.
- Recognize the adoption trigger precisely (§ 7) — propose infrastructure in the same PR as the logic that triggers it, not before, not after.
- Default new business logic tests to the unit layer; reserve integration tests for genuinely wiring-level concerns.
- Query components by role/label/text in any future component test, never by snapshot or internal instance structure.
- Verify a mock's claimed realism with an actual test that forces the relevant branch, not a read-through.

---

# 15. Checklist

- [ ] Every test-related document or response states plainly whether infrastructure currently exists (today: it does not).
- [ ] Infrastructure adoption, when proposed, is tied to a real trigger (§ 7) and lands in the same PR as that trigger's logic.
- [ ] New unit tests target business logic (repository mocks, store actions, validation functions), not presentational components.
- [ ] No presentational component is snapshot-tested for coverage.
- [ ] Any claim that a mock is "realistic" is backed by a test that actually exercises the claimed behavior, once infrastructure exists.
- [ ] Test plans written before infrastructure exists include the Test Infrastructure Prerequisite section, stated honestly.

---

# 16. References

- [constitution.md](../constitution.md) — Definition of Done, Core Values ordering, Mock First Development, Simplicity Wins.
- [context.md](../context.md) — Quality Standards.
- [.claude/rules/testing.md](../rules/testing.md) — the enforceable rule list this handbook explains.
- [.claude/agents/50-testing-engineer.md](../agents/50-testing-engineer.md) — role authority, SOP, Mock Realism Verification Standard (§ 12), current-state findings (§ 9).
- [.claude/templates/testing.md](../templates/testing.md) — test plan structure referenced in § 11.
- [refactoring.md](./refactoring.md) — § 5, the "verification without a test net" reasoning this handbook's § 7 builds on.
- [security.md](./security.md) — § 6, the `validateLoginInput` example referenced in § 7 as a near-trigger case.
- [../../package.json](../../package.json) — the real, current dependency list grounding § 4.
