---
id: command-review-performance
title: Review Performance
category: command
version: 1.0.0
status: active
invokes_agent: performance-reviewer
last_updated: 2026-07-18
---

# Command: Review Performance

> Measure a feature's render cost, list virtualization readiness, and
> TanStack Query cache configuration against the handbook's performance
> standard. This is the measurement-only command; it never applies fixes.

---

## Purpose

This command is the "measure" half of the Constitution's "Measure first.
Optimize second." rule. It exists as a standalone command (separate from
`optimize-feature.md`, which chains this measurement into a fix phase)
because a measurement is useful on its own — to establish a baseline before
a feature scales, to verify a fix in `optimize-feature.md`'s Phase 2 worked,
or simply to answer "is this feature's performance a problem right now?"
without committing to changing anything.

---

## When To Invoke

- Before `optimize-feature.md` runs its Phase 2 fix — this command supplies
  Phase 1.
- As a standalone health check on any feature that renders lists (`content`,
  `reports`, and any future `products`, `ai-chat` message history) or heavy
  media.
- As part of `review-feature.md`'s cross-review recommendation when a
  feature has list rendering or non-trivial interaction patterns.
- Periodically, as a regression check, independent of any specific
  complaint.

---

## Required Inputs

The invoker must supply:

1. **Feature name or file path(s)** — the screen(s)/hook(s) to measure.
2. **Whether this is a fresh baseline or a re-measurement** after a fix (in
   which case the prior report should be supplied for comparison).

---

## Procedure

1. **Read `.claude/handbook/performance.md`** for the project's stated
   performance targets and measurement methodology before evaluating
   anything — this command checks against that document's standard, not
   against a generic React Native performance checklist.

2. **Render cost check.** For the target screen(s):
   - Identify every component that re-renders on state changes unrelated to
     what it displays (e.g. a list item re-rendering because a sibling
     search input's state lives in the same store slice).
   - Check for `React.memo` / `useMemo` / `useCallback` usage that is either
     missing where a measured cost justifies it, or present without any
     measured justification (over-memoization is also a finding — it adds
     complexity the Constitution's Simplicity Wins principle doesn't permit
     without a real cost behind it).
   - Check `useEffect` dependency arrays for effects that re-run more often
     than the data they depend on actually changes.

3. **List virtualization readiness check.** For every `FlatList` (Sugar
   Admin has no `@shopify/flash-list` installed — see
   `20-react-native-engineer.md` § 9 — so `FlatList` is the only list
   primitive in scope today):
   - Confirm `keyExtractor` uses a stable, unique key (entity `id`, not
     array index) — index keys break `FlatList`'s recycling and cause
     unnecessary re-mounts on reorder/filter.
   - Confirm `renderItem` is not an inline arrow function recreated every
     render when the list is large enough to matter — extract to a
     memoized component or a stable `useCallback` once a real cost is
     measured (not preemptively, per Measure First).
   - Check for `getItemLayout` opportunities where row height is fixed or
     computable, which lets `FlatList` skip layout measurement.
   - Flag (do not silently accept) any list rendering with `ScrollView` +
     `.map()` instead of `FlatList` once the mapped data can realistically
     exceed roughly 20–30 items on a mobile screen — `ScrollView` renders
     everything eagerly with no virtualization at all.

4. **TanStack Query cache configuration check.** For every `useQuery`/
   `useMutation` in the target:
   - Confirm `staleTime` is set deliberately, not left at the library
     default (`0`, meaning "always stale," which triggers a refetch on
     every mount/focus) — check against the query's actual data freshness
     need (see `App.tsx`'s global `QueryClient` default:
     `staleTime: 1000 * 60 * 5`, `retry: 2` — per-query overrides should be
     justified relative to this global default, not arbitrary).
   - Confirm query keys are granular enough that a mutation's
     `invalidateQueries` call doesn't over-invalidate unrelated cached data.
   - Confirm polling (`refetchInterval`), if used, has a justified interval
     — matching real data change frequency, not an arbitrary short interval
     that wastes battery per the Constitution's Mobile First section.

5. **Component tree size check.** Flag any single screen file whose JSX
   nesting depth or component count suggests it should be decomposed —
   per the Constitution's "Large component trees" anti-pattern and Small
   Units principle. This is a structural finding for `refactor-engineer`,
   not something this command fixes.

6. **Battery/network-awareness check**, per the Constitution's Mobile First
   section: confirm the feature doesn't poll aggressively while
   backgrounded, doesn't re-fetch on every focus when data is unlikely to
   have changed, and degrades reasonably under low connectivity (does it
   show cached data, or does it block on a spinner indefinitely?).

7. **Rank findings by actual impact**, not by category — a single
   unnecessary re-render on a rarely-visited screen ranks below a real
   virtualization gap on a screen users scroll constantly (e.g. a future
   `ai-chat` message history or `products` catalog).

8. **Produce the report.** Do not include a "Fixes Applied" section — that
   belongs to `optimize-feature.md`'s Phase 2, a separate command. This
   command's output is measurement only.

---

## Output Format

```
# Performance Review: <feature-name / file path(s)>

## Handbook Reference
.claude/handbook/performance.md — targets checked against.

## Render Cost Findings
- <finding>: <component/hook> — <observed behavior> — <impact ranking>

## List Virtualization Findings
- <finding>: <FlatList usage location> — <what's missing> — <impact ranking>

## Query Cache Findings
- <finding>: <query/mutation> — <current config> — <recommended config> —
  <impact ranking>

## Component Tree Findings
- <finding>: <file> — <structural concern>

## Mobile-Awareness Findings
- <finding>: <battery/network concern>

## Verdict
No measured cost found | Findings present, no fix applied (see
optimize-feature.md for remediation)

## Recommended Next Step
optimize-feature.md, scoped to: <specific findings above, if any>
```

---

## Example Invocation

> Review performance for `src/features/reports/screens/ReportsScreen.tsx`.
> Fresh baseline, no prior report exists.

## Example Output

```
# Performance Review: src/features/reports/screens/ReportsScreen.tsx

## Handbook Reference
.claude/handbook/performance.md.

## Render Cost Findings
- Stat cards re-render on every query refetch regardless of whether their
  individual value changed — component: inline-mapped Stat rows inside
  ReportsScreen's render body, no per-row memoization exists — impact:
  medium (affects every 5-second poll cycle while the screen is focused).

## List Virtualization Findings
- ReportsScreen currently renders its stat list via ScrollView + .map()
  rather than FlatList — at today's data volume (a handful of Stat objects
  per context.md's Dashboard/Analytics scope) this is not yet a real cost,
  but flagged now since Analytics is expected to grow (context.md's
  Analytics section lists Business performance, Post performance, Customer
  growth, Publishing statistics, Engagement — five categories, likely more
  than a handful of stat rows once fully built) — impact: low today,
  escalating.

## Query Cache Findings
- reportsApi-backed query has no staleTime override, inheriting the global
  QueryClient default of 5 minutes (App.tsx) — but ReportsScreen appears to
  poll or refetch on every focus based on observed behavior, which
  contradicts that default and suggests an explicit (and shorter) staleTime
  or refetchInterval was intended but never configured — impact: medium,
  causes both stale-data risk and unnecessary refetch churn depending on
  which behavior was actually intended.

## Component Tree Findings
None — ReportsScreen's component tree is currently shallow enough not to
warrant decomposition.

## Mobile-Awareness Findings
No explicit offline/cached-data fallback observed if the reports query
fails while the device has no connectivity — screen behavior in that case
is unclear from a static read and should be verified manually.

## Verdict
Findings present, no fix applied.

## Recommended Next Step
optimize-feature.md, scoped to: Stat card re-render (medium), query cache
staleTime/refetchInterval clarification (medium). List virtualization
finding deferred until Analytics scope grows per context.md — re-measure
after that work lands rather than fixing preemptively.
```

---

## Related Agents

- `performance-reviewer` — primary owner of this command.
- `optimize-feature.md`'s Phase 2 (`refactor-engineer`) — consumes this
  command's findings as its fix scope.
- `reviewer` — folds this command's verdict into overall feature review.

---

## References

- `.claude/constitution.md` — Performance Philosophy, Mobile First.
- `.claude/handbook/performance.md` — the specific targets and methodology
  this command checks against.
- `.claude/commands/optimize-feature.md` — the fix-phase command this one
  feeds.
- `App.tsx` — the global `QueryClient` default (`staleTime: 1000 * 60 * 5`,
  `retry: 2`) that per-query configuration should be evaluated against.
- `.claude/agents/20-react-native-engineer.md` § 9 — confirms `FlashList` is
  not installed; `FlatList` is the only list primitive in scope.
