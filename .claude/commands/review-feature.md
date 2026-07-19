---
id: command-review-feature
title: Review Feature
category: command
version: 1.0.0
status: active
invokes_agent: reviewer
last_updated: 2026-07-18
---

# Command: Review Feature

> Verify a shipped or in-progress feature against the Constitution, the relevant
> `rules/` files, and the acceptance criteria written by `feature-planner` —
> without reading implementation and plan side by side to reconcile differences
> by hand.

---

## Purpose

Sugar Admin ships features as vertical slices (Authentication, Products, AI
Content, Publishing, Chat Center, Analytics, Dashboard). Each slice is
implemented by multiple specialized agents (`react-native-engineer`,
`ui-engineer`, `state-engineer`, `network-engineer`, `ai-engineer`) working in
parallel against one feature plan. `review-feature` is the gate that confirms
what was actually built matches what was planned and does not violate
`constitution.md`.

This command does not review code style in isolation — style is
`typescript-engineer`'s and `refactor-engineer`'s concern. It reviews
**architecture conformance and completeness**: every screen state present,
every repository contract honored, every navigation entry registered
correctly, no cross-feature leakage, no undocumented technical debt.

---

## When To Invoke

- A feature's implementation agents (`react-native-engineer`, `ui-engineer`,
  `state-engineer`, `network-engineer`, `ai-engineer`) have all reported their
  portion complete and handed off to `reviewer`.
- Before a feature is merged into `main`.
- When re-reviewing a feature after `refactor-engineer` or
  `optimize-feature` has modified it, to confirm no behavior regressed.
- When a human engineer wants a second opinion on whether an existing feature
  (e.g. `auth`, `dashboard`, `content`, `reports`, `ai-chat`) still matches its
  original plan after incremental changes.

Do not invoke this command mid-implementation — it assumes the feature is
functionally complete, not a work-in-progress screen.

---

## Required Inputs

The invoker must supply:

1. **Feature name** — one of the existing modules under `src/features/`
   (`auth`, `dashboard`, `content`, `reports`, `ai-chat`) or a newly proposed
   module (e.g. `products`).
2. **Feature plan document** — the path to the plan this feature was built
   against, e.g. `.claude/docs/examples/products-feature-plan.md`, or the plan
   produced inline by `feature-planner` in the current session. If no written
   plan exists, this command cannot run — a feature without a plan cannot be
   reviewed against acceptance criteria that were never written down; escalate
   to `feature-planner` first via `generate-feature`.
3. **Scope of review** — whole feature, or a named subset (e.g. "just the
   `ProductFormScreen` and `ProductRepository`").
4. **Diff or file list** — the specific files changed or created, if this is a
   pull-request-style review rather than a full-feature audit.

---

## Procedure

1. **Load context.** Read `.claude/constitution.md`, `.claude/context.md`,
   `.claude/agents/00-chief-architect.md`, and `.claude/agents/10-feature-planner.md`
   in that order. Then read the supplied feature plan document in full — do
   not review against a partial memory of the plan.

2. **Confirm plan completeness first.** Before reviewing the code, verify the
   plan itself satisfies `10-feature-planner.md` § 19's "Before handing off a
   feature plan" checklist (every screen has all six states, every repository
   method has an explicit error contract, every state is classified, the Edge
   Case Catalog is completed). If the plan itself is incomplete, stop — the
   review cannot meaningfully proceed against an incomplete contract. Report
   the plan gap back to `feature-planner`.

3. **Screen-by-screen conformance check.** For every screen listed in the
   plan's § 9 Screen Specifications:
   - Confirm the screen file exists at
     `src/features/<feature>/screens/<ScreenName>.tsx`.
   - Confirm every state (Loading, Empty, Error, Offline, Unauthorized,
     Success) has a distinct, reachable render path — not a TODO comment.
     Reference `.claude/agents/20-react-native-engineer.md` § 10's Screen
     Implementation Standard for what "distinct render path" means concretely.
   - Confirm entry points and exit points match the plan (correct navigation
     source, correct destination route and params).
   - Confirm accessibility notes from the plan were applied (see
     `review-ui.md` for the deeper accessibility pass — this step is a
     presence check, not a full audit).

4. **Repository contract conformance check.** For every repository interface
   in the plan's § 10:
   - Confirm the TypeScript interface in code matches the plan's method
     signatures exactly (names, params, return types).
   - Confirm a mock implementation exists that simulates latency, failure,
     and empty states per `constitution.md`'s Mock First Development section
     — "a mock that always succeeds is not realistic."
   - Confirm the real implementation either exists as a stub wrapping
     `src/api/client.ts` or is explicitly flagged as not-yet-built with a
     documented reason (per Constitution's Technical Debt section: reason,
     follow-up plan, understood impact).
   - Flag (do not silently accept) any repository method that was
     implemented by calling `client`/axios directly from a screen or store —
     this violates `20-react-native-engineer.md`'s Principle 5 and is always
     a review finding, never a style nitpick.

5. **State ownership conformance check.** For every state entry in the plan's
   § 11:
   - Confirm the state lives where the plan classified it (Zustand global,
     feature-local, or TanStack Query cache) — not somewhere more convenient
     that was improvised during implementation.
   - Flag any new global Zustand store field that was not justified in the
     plan and not signed off by `chief-architect`, per the plan's own
     Decision Tree in § 16.

6. **Navigation conformance check.** For every route in the plan's § 12:
   - Confirm the route exists in the correct `*ParamList` in
     `src/navigation/types.ts` with the exact param shape.
   - Confirm the route is registered in the correct navigator
     (`AuthNavigator.tsx` vs `AppNavigator.tsx`) with `PascalCase` naming.
   - Confirm no route was added to `RootStackParamList` casually — that list
     currently only contains `Auth` and `App` and any addition is an
     architecture-level change requiring `chief-architect` sign-off.

7. **Edge case conformance check.** Walk the plan's completed § 13 Edge Case
   Catalog line by line. For every "applies" item, confirm there is
   observable code handling it (a retry button, a specific error message, a
   platform-specific branch). An "applies" edge case with no corresponding
   code is a review finding.

8. **Constitution cross-check.** Independent of the plan, verify:
   - Separation of Concerns: no business logic inside screen components
     (Presentation Layer must not decide; see Constitution).
   - Feature Ownership: no cross-feature import that bypasses a public API
     (e.g. `content` importing directly from `reports/screens/...` internals).
   - State Philosophy: no duplicated state, no state stored that could be
     derived.
   - Error Philosophy: all seven states considered (Loading, Empty, Error,
     Success, Retry, Offline, Timeout, Unauthorized) — note the Constitution
     lists eight terms across two enumerations; treat all as required unless
     the plan explicitly marks one "not applicable" with a reason.

9. **Cross-reference other reviewers.** If the feature includes list
   rendering, heavy media, or AI content, note in the report that
   `performance-reviewer` and/or `security-reviewer` and/or
   `accessibility-reviewer` should run their specialized passes — this
   command's general review does not replace theirs.

10. **Produce the review report** in the Output Format below. Every finding
    must cite the specific plan section or Constitution section it violates —
    "this feels off" is not an acceptable finding.

---

## Output Format

A Markdown review report with this structure:

```
# Feature Review: <feature-name>

## Verdict
Pass | Pass with follow-ups | Blocked

## Plan Reference
<path to the feature plan document reviewed against>

## Screen Conformance
- [ ] <ScreenName>: <pass/fail + reason>
  (repeat per screen)

## Repository Conformance
- [ ] <RepositoryName>: <pass/fail + reason>

## State Conformance
- [ ] <state name>: <pass/fail + reason>

## Navigation Conformance
- [ ] <route>: <pass/fail + reason>

## Edge Case Conformance
- [ ] <edge case>: <pass/fail + reason>

## Constitution Findings
<any violations of constitution.md, cited by section name>

## Follow-ups Required
<numbered list, each with owning agent and severity: blocking | non-blocking>

## Cross-Review Recommendations
<which of performance-reviewer / security-reviewer / accessibility-reviewer
should also run, and why>
```

A "Blocked" verdict must always include at least one Follow-up marked
`blocking`. A "Pass" verdict must have zero unchecked boxes above.

---

## Example Invocation

> Review the `content` feature. Plan reference:
> `.claude/docs/examples/products-feature-plan.md` does not apply here — no
> written plan exists yet for `content`; this is a live gap. Instead review
> `content` against `10-feature-planner.md`'s standards directly and report
> the missing plan as a finding, not a blocker for the review itself.

## Example Output

```
# Feature Review: content

## Verdict
Blocked

## Plan Reference
None found. src/features/content/screens/ContentScreen.tsx exists with no
corresponding plan document under .claude/docs/examples/ or
src/features/content/PLAN.md.

## Screen Conformance
- [x] ContentScreen: renders a list; no Loading, Error, or Empty state code
  paths found — src/api/endpoints/content.ts is called directly from
  ContentScreen with no repository boundary, only a Success-path render exists.

## Repository Conformance
- [ ] ContentRepository: does not exist. contentApi in
  src/api/endpoints/content.ts calls `client` (axios) directly with no
  interface, no mock implementation, and no simulated latency/failure per
  constitution.md's Mock First Development section.

## Constitution Findings
- Error Philosophy: Loading/Empty/Error/Offline states are entirely absent
  from ContentScreen.tsx.
- Mock First Development: no mock repository exists; feature depends on a
  live backend that does not exist per context.md's Current Development Phase.

## Follow-ups Required
1. [blocking] feature-planner: write a feature plan for `content` per
   10-feature-planner.md before further implementation continues.
2. [blocking] network-engineer: introduce ContentRepository interface + mock
   implementation per generate-repository.md.
3. [blocking] react-native-engineer: implement missing screen states in
   ContentScreen.tsx.

## Cross-Review Recommendations
performance-reviewer should assess ContentScreen's list rendering once
repository/state work lands — FlatList usage without virtualization tuning
is untested at scale.
```

---

## Related Agents

- `reviewer` — primary owner of this command.
- `feature-planner` — supplies the plan this review checks against; escalate
  here if no plan exists.
- `performance-reviewer`, `security-reviewer`, `accessibility-reviewer` —
  specialized follow-on reviews recommended by this command's output.
- `refactor-engineer` — receives non-blocking follow-ups that require
  behavior-preserving cleanup.

---

## References

- `.claude/constitution.md` — Separation of Concerns, Error Philosophy, Mock
  First Development, Feature Ownership, Definition of Done.
- `.claude/agents/10-feature-planner.md` § 9–13, § 19.
- `.claude/agents/20-react-native-engineer.md` § 10, § 15.
- `.claude/commands/review-ui.md`, `.claude/commands/review-performance.md` —
  companion specialized reviews.
