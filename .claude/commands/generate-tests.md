---
id: command-generate-tests
title: Generate Tests
category: command
version: 1.0.0
status: active
invokes_agent: testing-engineer
last_updated: 2026-07-18
---

# Command: Generate Tests

> Bootstrap test infrastructure if it does not already exist, then generate
> tests for a feature's repository, store, and screen logic.

---

## Purpose

Sugar Admin's `package.json` currently declares no test framework, no test
runner, and no test-related scripts — `devDependencies` contains only
`@types/react` and `typescript`; `scripts` contains only `start`,
`android`, `ios`, `web`. There is no `jest.config.js`, no `*.test.ts` file,
and no `__tests__/` directory anywhere in the repository as of this
writing. This is a real, current gap, not a hypothetical.

The Constitution lists "Tests are written where appropriate" as part of the
Definition of Done and treats Testability as the fifth core value (above
Scalability, Performance, and Developer Experience). `generate-tests`
cannot honor that priority without first solving the infrastructure gap —
so, uniquely among these commands, this one has a mandatory bootstrap phase
that must complete before any actual test is written.

---

## When To Invoke

- A feature's repository, store, or screen has been implemented and needs
  test coverage before `review-feature.md` can consider it fully done.
- `refactor-feature.md` or `optimize-feature.md` needs an automated
  behavior baseline instead of a manual walkthrough.
- The project has no test infrastructure yet and a human or `chief-architect`
  wants it bootstrapped, independent of any specific feature.

---

## Required Inputs

The invoker must supply:

1. **Target** — a feature name, a specific file (repository, store, or
   screen), or "infrastructure only" if bootstrapping is the whole task.
2. **Confirmation of current infrastructure state** — this command re-checks
   it regardless (Step 1 below), but the invoker should say whether they
   already know infrastructure exists, to avoid redundant bootstrap work.
3. **Test priorities**, if the target is large — e.g. "prioritize
   `ProductRepository`'s mock failure/empty-state paths over
   `ProductFormScreen`'s render output" — since Testability is a stated
   priority but not the highest one, this command should not block an
   entire feature on 100% coverage before shipping.

---

## Procedure

### Phase 0 — Infrastructure Check (mandatory, every invocation)

1. **Check `package.json` for a test framework.** As of this workspace's
   creation, none exists. If this is still true, proceed to Phase 1
   (Bootstrap). If a framework has since been added, skip to Phase 2.

2. **Do not silently assume Jest, Vitest, or any other framework is
   present.** Re-verify every time — infrastructure state can change
   between invocations of this command as the project evolves.

### Phase 1 — Bootstrap (only if Phase 0 found no infrastructure)

3. **Select a framework appropriate to the actual stack**: React Native
   0.85.3, Expo SDK 56, React 19.2.3, TypeScript 5.9.3 strict mode (per
   `20-react-native-engineer.md` § 1). The project-appropriate default is
   `jest-expo` (Expo's maintained Jest preset, which correctly mocks
   `expo-*` native modules) plus `@testing-library/react-native` for
   component/screen tests. Do not select a framework requiring a native
   test runner or a browser DOM (e.g. plain `jsdom`-based setups) without
   confirming `expo-linear-gradient`, `react-native-reanimated`, and
   `react-native-svg` (all real dependencies with native code) are properly
   mocked — `jest-expo` handles this out of the box.

4. **Add the minimum dependency set** to `package.json` `devDependencies`:
   `jest-expo`, `jest`, `@testing-library/react-native`, `@types/jest`.
   Justify each addition against the Constitution's Simplicity Wins
   principle — "avoid unnecessary dependencies" — do not add snapshot-testing
   add-ons, coverage-badge generators, or additional matcher libraries
   beyond what `@testing-library/react-native` already provides, unless a
   specific need arises later.

5. **Add a `jest.config.js`** using the `jest-expo` preset, with
   `transformIgnorePatterns` tuned for the actual native dependency list in
   `package.json` (`react-native-reanimated`, `react-native-svg`,
   `react-native-screens`, `react-native-safe-area-context`,
   `expo-linear-gradient`, `expo-blur`, `expo-status-bar`).

6. **Add a `test` script** to `package.json`: `"test": "jest"`. Do not
   silently overwrite the existing `start`/`android`/`ios`/`web` scripts.

7. **Add one smoke test** (e.g. rendering `App.tsx` or a trivial component)
   to prove the infrastructure actually works end to end before any
   feature-specific test is written on top of it. If the smoke test fails,
   stop — do not layer feature tests on broken infrastructure.

8. **Document the bootstrap** as a technical decision — this is exactly the
   kind of "major engineering decision" the Constitution's Documentation
   section requires be recorded. Flag `documentation-engineer` to write an
   ADR (e.g. `adr-0006-test-infrastructure-jest-expo.md`) if one does not
   already exist for this decision.

### Phase 2 — Test Generation (runs whether or not Phase 1 was needed)

9. **Prioritize by layer, in this order**, matching the Constitution's
   layering (Data → Business → Presentation) and where bugs are cheapest to
   catch:
   - **Repository tests** (highest priority): for every mock repository
     method generated via `generate-repository.md`, test the success path,
     the simulated failure path, the empty-result path, and (if
     pagination applies) the pagination boundary. Mock repositories are
     pure logic with simulated timers — the cheapest, highest-value tests
     in the codebase.
   - **Store tests**: for every Zustand store action generated via
     `generate-store.md`, test that `set()` calls produce the expected
     state transitions, especially the loading/error/finally pattern from
     `authStore.login`'s shape.
   - **Screen tests** (lowest priority, highest cost): for every required
     state in a screen's spec, test that the correct render path is reached
     given the corresponding hook return values (mocked), using
     `@testing-library/react-native`'s `render`/`screen` queries. Do not
     test implementation details (internal state, function calls) — test
     what a user or screen reader would observe, per Testability's actual
     purpose.

10. **Never test the mock's random jitter/failure timing directly** — inject
    a seed or a test-mode flag into the mock repository so failure/latency
    behavior is deterministic in tests. A flaky test that fails 6% of the
    time because it accidentally hit the mock's real random failure rate is
    worse than no test.

11. **Do not chase 100% coverage.** Per the Constitution's priority order
    (Correctness > Simplicity > Maintainability > Readability > Testability
    > ...), a small number of well-chosen tests covering real failure modes
    outranks exhaustive coverage of trivial getters.

12. **Hand off to `reviewer`** with a summary of what is covered and,
    explicitly, what is not covered and why (e.g. "AI-provider-dependent
    methods in `ai-engineer`'s repositories are out of scope for this pass").

---

## Output Format

```
(if Phase 1 ran)
package.json                (updated devDependencies, scripts)
jest.config.js               (new)
__tests__/smoke.test.tsx     (new)

# Test Bootstrap Report
Framework selected: jest-expo + @testing-library/react-native
Reason: <matches Step 3's reasoning>
Smoke test status: pass/fail

(always)
<feature>/**/*.test.ts(x)    (new test files, colocated or in __tests__/)

# Test Generation Report: <target>

## Coverage Summary
- Repository: <methods covered / methods total>
- Store: <actions covered / actions total>
- Screens: <states covered / states total, per screen>

## Explicitly Not Covered
<what was skipped and why>

## Handoff
reviewer
```

---

## Example Invocation

> No test infrastructure exists yet. Generate tests for the newly built
> `ProductRepository` (`MockProductRepository.ts`), prioritizing the mock's
> failure and empty-state paths.

## Example Output

```
package.json           (+ jest-expo, jest, @testing-library/react-native,
                          @types/jest; + "test": "jest" script)
jest.config.js          (new, jest-expo preset)
__tests__/smoke.test.tsx (new — renders App.tsx, asserts no throw)

# Test Bootstrap Report
Framework selected: jest-expo + @testing-library/react-native.
Reason: project uses Expo SDK 56 with native-dependent packages
(react-native-reanimated, expo-linear-gradient, react-native-svg) that
require jest-expo's preset for correct mocking; @testing-library/react-native
is the standard React Native component-testing library and pairs directly
with it.
Smoke test status: pass.

src/features/products/repository/MockProductRepository.test.ts (new)

# Test Generation Report: ProductRepository

## Coverage Summary
- Repository: 6/6 methods covered (list, getById, create, update, archive,
  search) — success path, simulated failure path, and empty-result path
  each tested for list/search; not-found path tested for getById/update/
  archive; validation failure tested for create/update.
- Store: not yet generated for products, out of scope for this pass.
- Screens: not yet generated for products, out of scope for this pass.

## Explicitly Not Covered
Concurrent-edit conflict (ProductConflictError) is stubbed in the mock but
not yet exercised by a test — flagged as a follow-up once the concurrent-edit
simulation logic is finalized in MockProductRepository.

## Handoff
reviewer — repository test coverage ready for review; store and screen
tests to follow once generate-store.md and generate-screen.md run for
products.
```

---

## Related Agents

- `testing-engineer` — primary owner of this command.
- `network-engineer`, `state-engineer`, `react-native-engineer` — supply the
  implementations under test.
- `documentation-engineer` — records the bootstrap decision as an ADR.
- `reviewer` — consumes the coverage summary as part of feature review.

---

## References

- `.claude/constitution.md` — Core Values (Testability), Definition of Done.
- `package.json` — current absence of test framework, verified fresh every
  invocation.
- `.claude/commands/generate-repository.md`, `.claude/commands/generate-store.md`
  — the artifacts this command generates tests against.
- `.claude/docs/decisions/` — where a bootstrap ADR should be filed once
  written.
