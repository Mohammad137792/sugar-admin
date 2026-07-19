---
id: command-optimize-feature
title: Optimize Feature
category: command
version: 1.0.0
status: active
invokes_agent: performance-reviewer
last_updated: 2026-07-18
---

# Command: Optimize Feature

> Improve a feature's runtime performance — but only after measuring, and
> only against a specific, observed cost. Follows the Constitution's
> "Measure first. Optimize second." rule to the letter.

---

## Purpose

The Constitution's Performance Philosophy states plainly: "Performance is
designed. Not optimized afterward," and lists specific anti-patterns to
avoid — premature memoization, unnecessary rerenders, large component trees,
expensive effects, blocking rendering. It closes with the two-line rule this
command exists to enforce:

```
Measure first.
Optimize second.
```

`optimize-feature` is a two-phase command. Phase one (`performance-reviewer`)
measures and produces a report of specific, evidenced costs. Phase two
(`refactor-engineer`) fixes only what phase one found — behavior-preserving,
per `refactor-feature.md`. This command never starts with a fix; it always
starts with a measurement.

---

## When To Invoke

- A feature renders a list of non-trivial size (products, chat messages,
  content items, reports) and there is a concrete complaint or observation
  about scroll jank, slow initial render, or memory growth.
- `review-performance.md` has already produced a report with specific
  findings that need remediation.
- A feature is about to scale (e.g. Products going from a demo dataset to
  real inventory volume) and the team wants a performance baseline before
  that happens.

Do not invoke this command as a matter of routine or "just in case" — that
violates Measure First, Optimize Second. If there is no specific, measured
cost, there is nothing yet for `optimize-feature` to fix.

---

## Required Inputs

The invoker must supply:

1. **Feature name** — the `src/features/*` module in question.
2. **The specific performance concern**, if known (e.g. "ProductListScreen
   feels slow to scroll with 200+ items") — or a request for a fresh
   baseline measurement if no specific concern exists yet.
3. **A `review-performance.md` report**, if one already exists — this command
   can consume that report directly as its measurement phase rather than
   re-measuring from scratch.
4. **Device/context constraints**, if relevant — Sugar Admin is mobile-first
   per the Constitution, and performance goals must consider real device
   constraints (battery, memory, network interruptions), not just a
   simulator.

---

## Procedure

### Phase 1 — Measure (`performance-reviewer`)

1. **Run or consume `review-performance.md`** against the target feature.
   Do not skip this step even if the invoker already has a hypothesis about
   the cause — the hypothesis must be confirmed against actual render/list
   behavior, not assumed.

2. **Produce a ranked list of specific, evidenced costs.** Each item must
   name: the exact component or hook, the exact behavior observed (e.g.
   "re-renders on every keystroke in the unrelated search input because the
   list and the input share one Zustand slice"), and why it matters at
   Sugar Admin's actual scale (mobile device, potentially large product
   catalogs, `handbook/performance.md`'s stated targets).

3. **Stop here if no cost is found.** If measurement finds nothing worth
   fixing, the correct output is "no optimization needed" — not a fix
   invented to justify the exercise. Report this plainly and end the
   command.

### Phase 2 — Fix (`refactor-engineer`, behavior-preserving only)

4. **For each ranked cost, select the smallest fix that addresses it.**
   Preference order, most preferred first:
   - Correct list virtualization / `keyExtractor` / `getItemLayout` usage on
     existing `FlatList` (Sugar Admin does not have `@shopify/flash-list`
     installed yet — see `20-react-native-engineer.md` § 9; do not introduce
     it inside this command without a `chief-architect`-level dependency
     decision).
   - Narrowing Zustand selector usage so components only subscribe to the
     state slice they actually read (see `src/store/uiStore.ts` /
     `authStore.ts` for the existing minimal-slice pattern).
   - Correcting TanStack Query cache configuration (`staleTime`,
     `gcTime`, query key granularity) rather than adding manual caching.
   - `React.memo` / `useMemo` / `useCallback`, applied only to the exact
     component/computation the measurement identified — never applied
     "defensively" across a whole file, which is exactly the "premature
     memoization" anti-pattern the Constitution warns against.
   - Reducing component tree depth or splitting an oversized component,
     if the measurement traces the cost to render-tree size.

5. **Apply each fix as its own behavior-preserving increment**, following
   `refactor-feature.md`'s procedure exactly — establish the behavior
   baseline, apply the fix, re-verify the baseline holds, then move to the
   next fix.

6. **Re-measure after each fix.** Confirm the specific cost identified in
   Phase 1 is actually reduced — do not assume the fix worked because it
   "should" theoretically help.

7. **Do not introduce a new dependency to solve a performance problem**
   without confirming it is already installed (see `package.json`) or
   escalating to `chief-architect` first. Sugar Admin does not have
   `react-native-mmkv`, `@shopify/flash-list`, or `expo-image` installed
   today — do not import them speculatively "because they're faster."

8. **Hand off to `reviewer`** for behavior-preserving confirmation, same as
   any refactor.

---

## Output Format

A two-part report:

```
# Optimization Report: <feature-name>

## Phase 1 — Measurement
Ranked costs found (or "No measured cost found — no optimization performed."):
1. <component/hook> — <observed behavior> — <why it matters at scale>
2. ...

## Phase 2 — Fixes Applied
For each cost fixed:
### Cost: <name>
**Fix:** <smallest fix selected, and why this one over alternatives>
**Verification:** <before/after measurement showing the cost is reduced>
**Behavior preserved:** <confirmation, per refactor-feature.md's method>

## Costs Not Fixed
<any measured cost intentionally left unfixed, with reason — e.g. "fix
requires a dependency not yet approved by chief-architect">

## Handoff
reviewer — confirm behavior-preserving.
```

---

## Example Invocation

> Optimize `reports`. Concern: `ReportsScreen` feels slow when the stats list
> grows. No `review-performance.md` report exists yet — run measurement
> first.

## Example Output

```
# Optimization Report: reports

## Phase 1 — Measurement
1. ReportsScreen — every Stat card re-renders on every 5-second polling
   refetch from TanStack Query, even for cards whose data value is
   unchanged, because the whole `data` array is passed down and mapped
   inline without memoized row components — matters at scale once the
   number of tracked stats grows beyond a handful of cards on a mid-tier
   Android device.
2. staleTime is not set for the reports query — every screen focus
   triggers a full refetch and full re-render, even when data is seconds
   old.

## Phase 2 — Fixes Applied
### Cost: unnecessary re-render of unchanged Stat cards
**Fix:** extracted a StatCard component wrapped in React.memo, keyed by
stat.label, so unchanged stats skip re-render — chosen over restructuring
the whole screen because it directly targets the measured cost with the
smallest change.
**Verification:** confirmed via manual render-count logging that unchanged
cards no longer re-render on refetch; changed cards still update correctly.
**Behavior preserved:** all stat values, trends, and formatting identical
before and after; verified by manual screen walkthrough.

### Cost: missing staleTime
**Fix:** set staleTime: 1000 * 30 on the reports query, matching the
5-second polling interval's actual freshness need without over-caching.
**Verification:** confirmed refetch frequency dropped from every focus to
the intended 30-second window via network call count during manual testing.
**Behavior preserved:** data still refreshes within an acceptable window;
no stale data shown beyond the intended 30 seconds.

## Costs Not Fixed
None — both measured costs were addressed within the smallest-fix
constraint.

## Handoff
reviewer — confirm behavior-preserving; performance re-measured and reduced
per above.
```

---

## Related Agents

- `performance-reviewer` — owns Phase 1 measurement; primary invocation
  target of this command.
- `refactor-engineer` — owns Phase 2 fix application, behavior-preserving
  only.
- `reviewer` — confirms no behavior regressed.
- `chief-architect` — must approve any new dependency a fix would require.

---

## References

- `.claude/constitution.md` — Performance Philosophy ("Measure first.
  Optimize second."), Mobile First (battery, device performance).
- `.claude/handbook/performance.md` — performance targets and measurement
  methodology referenced by `performance-reviewer`.
- `.claude/commands/review-performance.md` — the measurement-only command
  this one builds on.
- `.claude/commands/refactor-feature.md` — the behavior-preserving execution
  model Phase 2 follows.
- `.claude/agents/20-react-native-engineer.md` § 9 — current dependency
  reality (no FlashList, no MMKV, no Expo Image installed).
