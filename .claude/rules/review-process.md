---
id: rule-review-process
title: Review Process Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_pull_requests
  - all_diffs
last_updated: 2026-07-18
---

# Review Process Rules

> Every pull request should answer: What changed? Why? Alternatives considered? Risks? Future impact? Reviewers should challenge architecture, not coding style alone. — `../constitution.md`, Reviews

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

`constitution.md`'s Reviews section is five sentences. `.claude/agents/30-reviewer.md` turns it into a role with authority and an SOP. `.claude/handbook/code-review.md` explains the reasoning behind how that role actually operates in this codebase. This file is the missing piece between the two: the enforceable, checklist-driven rule set a reviewer (or an AI agent acting as one) checks a diff against, mechanically, every time — including the exact triggers for pulling in `.claude/agents/31-performance-reviewer.md`, `32-security-reviewer.md`, and `33-accessibility-reviewer.md`, stated here as binding rules, not general guidance.

---

# 2. Scope

Applies to every pull request and every diff submitted for review in this repository, regardless of size or which agent/engineer authored it.

---

# 3. Rules

## Rule 1 — Every PR description answers the constitution's five questions explicitly, not implicitly

```
## What changed?
## Why?
## Alternatives considered?
## Risks?
## Future impact?
```

**Why:** `constitution.md`'s Reviews section states this exact five-question standard as the bar every PR must clear. A PR description that only says "adds product list screen" answers "what changed" and leaves the other four for the reviewer to reconstruct from the diff alone — which defeats the purpose of asking the author, who has context the diff's structure alone doesn't carry (why this approach and not another, what could go wrong, what this makes easier or harder later).

## Rule 2 — The originating feature plan (or, for pre-plan code, the relevant handbook) is read in full before the diff, never after

**Why:** per `.claude/agents/30-reviewer.md` § 7 Principle 1 and `.claude/handbook/code-review.md` § 5 — reading the diff first primes the reviewer to evaluate the code against whatever mental model the diff itself implies, which is the same model the author already had. Reading the plan first gives an independent yardstick, catching a missing required state (`.claude/agents/10-feature-planner.md` § 9) as a genuine gap rather than something rationalized away after the fact.

## Rule 3 — A diff touching `authStore.ts`, `client.ts`, any token/storage code, input validation, or a new dependency is always routed to `security-reviewer`

**Why non-negotiable:** `.claude/agents/32-security-reviewer.md` owns scrutiny of a precisely-documented, non-hypothetical weakness (the `globalThis.__authToken` bridge, `.claude/handbook/security.md` § 4) — a generalist approval of a change to either file without that routing is not efficient review, it's a review that skips the one pass equipped to catch what matters most in that exact code. This mirrors `.claude/agents/30-reviewer.md` § 9's routing trigger exactly; restated here as a rule with teeth, not a suggestion.

## Rule 4 — A diff adding or changing any interactive component, screen, color/contrast value, or animation is always routed to `accessibility-reviewer`

**Why non-negotiable:** `.claude/agents/33-accessibility-reviewer.md` § 9 documents a codebase-wide, verified gap — zero `accessibilityLabel`/`accessibilityRole` props anywhere in `src/` today. Every new interactive component is either the diff that starts closing that gap or the one that quietly widens it; only a routed review reliably tells which. Skipping this route because a component "looks simple" is exactly the failure mode `.claude/handbook/code-review.md` § 6 names.

## Rule 5 — A diff touching list rendering, image-heavy screens, a `useEffect` with non-trivial dependencies, animation, or a hot render path is always routed to `performance-reviewer`

**Why non-negotiable:** `.claude/agents/31-performance-reviewer.md` reviews against the actual installed stack (no `FlashList`, no `expo-image`) and specifically catches rerender loops and effect hygiene issues a generalist pass is likely to miss — per `.claude/handbook/code-review.md` § 6, the entire value of routing is that it exists precisely for what a surface read doesn't catch.

## Rule 6 — A specialist reviewer's blocking finding is binding on the final verdict; the general reviewer does not overrule it with a shallower read

**Why:** `.claude/agents/30-reviewer.md` § 6 states this explicitly as outside the general reviewer's authority — "overriding a specialist reviewer's finding... is a hard blocker; the general reviewer coordinates, doesn't override." A review process where a generalist can wave through a specialist's blocking finding makes the routing rules (Rules 3–5) purely decorative.

## Rule 7 — A missing mock, missing required state, or missing test (where `constitution.md`'s Definition of Done requires it) is a blocking finding, never a suggestion

**Why:** the Definition of Done explicitly lists "Mock implementation exists" and "Tests are written where appropriate" as completion requirements, not optional polish. `.claude/agents/30-reviewer.md` § 7 Principle 4 states this precisely — treat the absence of either with the same seriousness as a logic bug, not as a "nice to have" left for a follow-up that may never come.

## Rule 8 — Every review ends in an explicit verdict: Approve, Request Changes, or Escalate — silence is never treated as approval

**Why:** per `.claude/agents/30-reviewer.md` § 7 Principle 5, a contributor should never have to guess whether "no comments" means approved or simply not yet reviewed. An implicit or absent verdict is itself a process failure, independent of the diff's actual quality.

## Rule 9 — A finding names a specific file, line, and concrete failing scenario; a finding with no actionable specificity is rejected and must be rewritten before it counts as a review

**Why:** `.claude/agents/30-reviewer.md` § 12's own contrast between good and bad findings makes this concrete — "this screen could probably handle more edge cases" gives the implementing agent nothing to act on, while "ContentScreen.tsx's Screen Specification requires an Offline state... the diff only implements Loading/Error/Success" is immediately actionable. A review consisting of vague findings has not actually reviewed the diff against anything concrete.

## Rule 10 — A change that deviates from an approved feature plan, even a genuine improvement, is routed back to `feature-planner` to update the plan — never silently approved as-is

**Why:** `.claude/agents/30-reviewer.md` § 11 names this precisely: silently approving a plan deviation "because it's obviously better this way" lets the plan and the code drift apart, leaving the next reviewer with no accurate reference. The fix belongs to the plan, not to reviewer discretion in the moment.

## Rule 11 — A diff that reveals the originating feature plan itself was wrong or incomplete stops the review and escalates; it is never approved as a silent fix to a bad plan

**Why:** `.claude/agents/30-reviewer.md` § 8 Step 7 states this as the correct outcome of Escalate — approving code that "fixes" a flawed plan without the plan itself being corrected produces a codebase that no longer matches its own documented plan, defeating `.claude/agents/10-feature-planner.md`'s entire purpose (a plan that's an authoritative, implementable reference).

## Rule 12 — Any undocumented Core Values trade-off (a change that sacrifices Correctness, Simplicity, Maintainability, Readability, or Testability for a lower-ranked value with no stated reason) is a blocking finding

**Why:** `constitution.md`'s Core Values section states the ordering explicitly and requires that priority never be sacrificed "for a lower one without documenting the reason." A review's job, per `.claude/handbook/code-review.md` § 7, includes catching a trade the diff makes silently — an unmeasured memoization, an `any` cast to unblock a type error under time pressure — and requiring it either be documented (satisfying the constitution's Technical Debt section) or reversed.

---

# 4. Good Examples

## Good: a PR description satisfying Rule 1 in full

```
## What changed?
Adds ProductListScreen with FlatList-backed rendering against
mockProductRepository.

## Why?
First screen for the Products feature (context.md Primary Features);
no product management exists in the codebase today.

## Alternatives considered?
Considered .map() in a ScrollView for the initial version, since the mock
data set is small today — rejected per performance.md § 5, since product
lists are expected to grow unbounded and retrofitting FlatList later
touches more call sites than starting with it now.

## Risks?
mockProductRepository's failure-rate simulation is not yet covered by an
automated test (testing-strategy.md § 7 trigger not yet reached at this
mock's current complexity) — manually verified failure/empty/success paths.

## Future impact?
Establishes the FlatList + mock repository pattern other list-backed
features (Customer Management, Chat Center) can follow.
```

## Good: a routed, specific finding matching Rules 3–5 and 9

"Routed to `security-reviewer`: this diff adds a new `expo-secure-store` write inside `authStore.ts`'s `login()` (Rule 3 trigger — token handling). `security-reviewer`, please confirm this matches `security.md` § 5's OS-secure-storage requirement before this merges."

---

# 5. Bad Examples

## Bad: a PR description that only states "what"

```
Adds product screen.
```

Fails Rule 1 outright — none of Why, Alternatives, Risks, or Future impact is answered, forcing the reviewer to reconstruct all four from the diff alone.

## Bad: silently overruling a specialist's finding

"`accessibility-reviewer` flagged the new `IconButton` usage for a missing `accessibilityLabel`, but it's a minor cosmetic thing, approving anyway."

Violates Rule 6 directly — a specialist's blocking finding is binding; overruling it because it "seems minor" is exactly the failure `.claude/agents/30-reviewer.md` § 6 exists to prevent.

## Bad: an implicit verdict

A review with several inline comments and no stated Approve/Request Changes/Escalate at the end, leaving the contributor to guess whether the comments are blocking or optional. Violates Rule 8.

---

# 6. Checklist

- [ ] The PR description answers all five of constitution.md's Reviews questions explicitly (Rule 1).
- [ ] The originating feature plan (or relevant handbook, for pre-plan code) was read in full before the diff (Rule 2).
- [ ] Every applicable specialist trigger (Rules 3–5) was checked and routed, not skipped because the diff "looked fine."
- [ ] Any specialist blocking finding is reflected, unmodified, in the final verdict (Rule 6).
- [ ] A missing mock, missing required state, or missing test (where the Definition of Done requires it) is treated as blocking (Rule 7).
- [ ] The review ends in an explicit verdict: Approve / Request Changes / Escalate (Rule 8).
- [ ] Every finding names a specific file, line, and concrete scenario (Rule 9).
- [ ] Any plan deviation is routed back to `feature-planner`, not silently approved (Rule 10).
- [ ] Any sign the plan itself is wrong triggers Escalate, not a silent code-level fix (Rule 11).
- [ ] Any undocumented Core Values trade-off is flagged as blocking (Rule 12).

---

# 7. References

- [constitution.md](../constitution.md) — Reviews, Core Values, Technical Debt, Definition of Done.
- [.claude/agents/30-reviewer.md](../agents/30-reviewer.md) — role authority, SOP, the specialist routing triggers this file makes binding.
- [.claude/agents/31-performance-reviewer.md](../agents/31-performance-reviewer.md), [32-security-reviewer.md](../agents/32-security-reviewer.md), [33-accessibility-reviewer.md](../agents/33-accessibility-reviewer.md) — specialist authority invoked by Rules 3–5.
- [.claude/handbook/code-review.md](../handbook/code-review.md) — the reasoning this checklist enforces mechanically.
- [.claude/agents/10-feature-planner.md](../agents/10-feature-planner.md) — the plan structure Rule 2, 10, and 11 check diffs against.
- [.claude/rules/git.md](./git.md) — PR sizing (Rule 10 there) that feeds a reviewable diff into this process.
