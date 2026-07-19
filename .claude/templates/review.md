---
id: template-review
title: Code/Design Review Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Code / Design Review Template

## Purpose

Use this template to record a review of a change — a pull request, a feature
implementation against its plan, or a proposed architecture. Filled out by a
reviewer, intended to be the `30-reviewer` agent once it exists in
`.claude/agents/` (following the `00-chief-architect`, `10-feature-planner`
numbering convention already established in this repo).

**A note on current repo state:** as of this writing, `.claude/agents/30-reviewer.md`
and a `.claude/rules/review-process.md` have not yet been added to this repository
— only `00-chief-architect.md` and `10-feature-planner.md` exist under
`.claude/agents/`. This template is written against the Constitution's Reviews
section directly (the only review authority that currently exists) and anticipates
the numbering/content convention those future files will likely follow. When
`30-reviewer.md` and `rules/review-process.md` are added, reconcile this template's
field names against them and update this file's References section.

## Instructions

The Constitution's Reviews section states every pull request should answer five
questions — this template's five body sections are exactly those five questions,
in the same order, plus a verdict and follow-up section:

1. **What changed?** — factual, not evaluative. What files, what behavior.
2. **Why?** — the motivation; link back to the feature plan, ADR, or bug report
   that justified the change, if one exists.
3. **Alternatives considered?** — what the author (or you, as reviewer) considered
   and why the shipped approach won. If the PR description doesn't say, this is a
   review finding, not something to invent on the author's behalf.
4. **Risks?** — what could break, degrade, or become harder to change later.
5. **Future impact?** — does this make the next feature easier or harder to build?
   (Constitution's Final Principle: "make future work easier, not harder.")
6. **Verdict** — Approve / Approve with comments / Request changes / Reject, plus
   the specific line items driving that verdict.

Per the Constitution's closing line of the Reviews section: "Reviewers should
challenge architecture, not coding style alone." A review that only comments on
formatting or naming without touching Requirements/Constraints/State ownership
questions has not done its job.

---

## The Template

```markdown
# Review: <change title>

**Reviewer:** <name/role>
**Date:** <YYYY-MM-DD>
**Scope:** <PR link, or feature/file(s) reviewed>
**Related plan/ADR/bug report:** <link, or "none — flag if one should exist">

## What changed?
<Factual summary of the change. Files touched, behavior added/removed/modified.>

## Why?
<The motivation. Does it trace back to an approved feature plan, ADR, or bug
report? If not, is that a problem?>

## Alternatives considered?
<What the author documented as alternatives, or what the reviewer thinks should
have been considered but wasn't.>

## Risks?
<What could break, degrade, or become harder to change later. Include
architectural risk, not just implementation bugs.>

## Future impact?
<Does this make the next feature/change easier or harder to build?>

## Checklist
- [ ] Follows the approved architecture/feature plan (no silent deviation)
- [ ] Every state (Loading/Empty/Error/Offline/Unauthorized/Success) is handled, if UI-facing
- [ ] No direct axios/`client.ts` import outside a repository's `.live.ts` file
- [ ] No new global Zustand store without explicit justification
- [ ] Naming is specific, not generic (constitution.md Naming Philosophy)
- [ ] Accessibility considered (labels, touch targets, dynamic type)
- [ ] Any accepted technical debt is documented with a follow-up plan
- [ ] Mock behavior (latency, failure rate) present for any new repository method

## Verdict
Approve | Approve with comments | Request changes | Reject

<Line-item list of what must change before approval, if not a clean Approve.>
```

---

## Filled Example: Reviewing a New `Button` Variant

```markdown
# Review: Add `outline` variant to Button

**Reviewer:** reviewer (acting per constitution.md Reviews section)
**Date:** 2026-07-18
**Scope:** `src/components/ui/Button.tsx` — adding a fourth variant, `outline`, to
the existing `Variant` union
**Related plan/ADR/bug report:** none on file — this is a hypothetical small change
used to demonstrate the review template; in real use, a change like this would
ideally trace back to a `.claude/templates/component.md` update or a screen spec
that needed the new variant.

## What changed?
`Button.tsx`'s `Variant` type changes from `"primary" | "secondary" | "ghost" |
"danger"` to add `"outline"`. A new branch is added to the non-primary render path
(the second `<TouchableOpacity>` block) applying `borderWidth: 1, borderColor:
colors.violet, backgroundColor: "transparent"`, and `labelBase` color set to
`colors.violet` for this variant. No changes to the `primary` gradient path, no
changes to `Props`.

## Why?
The PR description says a "Cancel" action on a to-be-built confirmation dialog
needs a less visually heavy option than `secondary` (which already has a border +
fill) and less visually recessive than `ghost` (fully transparent, no border) —
`outline` (border, no fill) is meant to sit between them.

## Alternatives considered?
The PR description does not mention any alternative considered — e.g. reusing
`ghost` with a manually-added `style` override at each call site instead of adding
a fourth variant to the shared component. That is a gap: per this template's
Instructions, an unstated alternative is a review finding, not something to
silently accept. **Finding:** ask the author whether a one-off `style` prop
override on the existing `ghost` variant was considered and rejected, and why.

## Risks?
- Low implementation risk — the change is additive (new union member, new
  conditional branch), does not touch the `primary` gradient path most existing
  callers use.
- Naming risk: `outline` and `ghost` will look visually similar to future
  engineers reading the `Variant` type without seeing the rendered result
  (`ghost` = no border, no fill; `outline` = border, no fill) — worth a one-line
  comment in the type definition to avoid future confusion, matching the
  Constitution's principle that "if code requires explanation, improve the code
  before improving the comments" — in this case, a short type-level comment is a
  reasonable, low-cost improvement, not a crutch.
- No test coverage risk beyond what already doesn't exist — see
  `.claude/templates/testing.md` for the project's current test infrastructure gap.

## Future impact?
Makes future work easier: a fourth well-named variant on the existing shared
`Button` is exactly the "small, focused, reusable" shape the Constitution favors,
and avoids every future screen inventing its own one-off cancel-button styling.

## Checklist
- [x] Follows the approved architecture/feature plan (no silent deviation) —
      n/a, no formal plan existed for this small change; acceptable given the
      change's scope, but flagged above as a gap for anything larger
- [x] Every state handled, if UI-facing — `disabled`/`loading` states already
      handled by the shared `isDisabled` logic Button.tsx already has; unaffected
      by this change
- [x] No direct axios/`client.ts` import — n/a, presentational-only change
- [x] No new global Zustand store — n/a
- [x] Naming is specific, not generic — `outline` is a real, standard UI term, acceptable
- [ ] Accessibility considered — **not addressed in the PR**: does `outline`'s
      border-only style still meet color-contrast guidelines against every
      background it might sit on? Reviewer requests this be checked before
      approval, per constitution.md Accessibility ("accessibility bugs are
      functional bugs").
- [x] Any accepted technical debt documented — n/a, no debt introduced
- [x] Mock behavior present for any new repository method — n/a, no repository touched

## Verdict
Approve with comments.

1. Add a one-line comment distinguishing `outline` from `ghost` in the `Variant`
   type definition.
2. Confirm color contrast of `colors.violet` text/border on both light and dark
   theme backgrounds (`useTheme()` — check both `light` and `dark` palettes in
   `src/constants/theme.ts`) before merge.
3. (Non-blocking) Consider documenting this addition via
   `.claude/templates/component.md` for future reference, since `Button` is a
   widely-reused shared component.
```

---

## Checklist

- [ ] Reviewer, Date, Scope filled in
- [ ] What changed? is factual, not evaluative
- [ ] Why? traces to a plan/ADR/bug report, or explicitly notes none exists
- [ ] Alternatives considered? is filled — if the author gave none, that itself is called out as a finding
- [ ] Risks? includes at least one architectural-level risk, not only implementation bugs
- [ ] Future impact? answered directly, not skipped
- [ ] Verdict is one of the four allowed values with concrete line items if not a clean Approve

## References

- `.claude/constitution.md` — Reviews section (the five questions this template is built from)
- `.claude/agents/30-reviewer.md` — not yet present in this repo; reconcile once added
- `.claude/rules/review-process.md` — not yet present in this repo; reconcile once added
- `.claude/agents/10-feature-planner.md` § 19 (Checklists) — source for several review checklist items
- `src/components/ui/Button.tsx` — subject of the filled example above
