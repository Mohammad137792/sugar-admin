---
id: handbook-code-review
title: Code Review Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Code Review Handbook

> "A review that only checks style missed the point. A review that never checks style wastes everyone's time re-litigating it later." — `.claude/agents/30-reviewer.md`

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. What a Review Is Actually Checking
5. Reading the Plan Before the Diff
6. When to Escalate to a Specialist
7. Constitution Trade-offs, Named Not Implied
8. Good Examples
9. Bad Examples
10. Decision Trees
11. Real Project Examples
12. Common Mistakes
13. Best Practices
14. Checklist
15. References

---

# 1. Purpose

`constitution.md`'s Reviews section is five sentences: every pull request should answer "What changed? Why? Alternatives considered? Risks? Future impact?" and "Reviewers should challenge architecture, not coding style alone." `.claude/agents/30-reviewer.md` turns that into an operating role — decision process, authority, routing rules to the three specialist reviewers. `.claude/rules/review-process.md` turns it into an enforceable, checklist-driven rule set.

This handbook sits between those two: it explains **how to actually perform a review** in this specific, early-stage codebase — where "the plan" often has to be reconstructed because no formal `PLAN.md` exists yet for most current code, where "architecture fit" means checking against a handful of concrete, nameable gaps (`architecture.md` § 4, § 9) rather than a mature layered system, and where routing to a specialist has real teeth because `.claude/agents/32-security-reviewer.md` and `.claude/agents/33-accessibility-reviewer.md` are both reviewing a codebase with well-documented, specific, current weaknesses.

---

# 2. Scope

In scope: the practical mechanics of reviewing a Sugar Admin diff — what "against the plan" means when no plan exists, how to decide a diff needs specialist review, how to write a finding that's actually actionable.

Out of scope: the reviewer role's authority and SOP (`.claude/agents/30-reviewer.md`), the enforceable checklist itself (`.claude/rules/review-process.md`), and the three specialists' own deep review standards (`.claude/agents/31-performance-reviewer.md`, `32-security-reviewer.md`, `33-accessibility-reviewer.md`).

---

# 3. Principles

Grounded in:

- **Reviews** (constitution.md) — the five-question standard, and "challenge architecture, not coding style alone."
- **Core Values** (constitution.md) — Correctness > Simplicity > Maintainability > Readability > Testability > Scalability > Performance > DX > Delivery Speed. A review's most important job is catching a change that sacrifices a higher-ranked value for a lower one without documenting why.
- **Technical Debt** (constitution.md) — debt is acceptable only with a documented reason, a follow-up plan, and understood impact; undocumented debt is prohibited. A review is where this gets enforced, not assumed.
- **Predictability** (constitution.md, via `00-chief-architect.md` § 5) — a contributor should never have to guess whether "no comments" means approved or not yet reviewed (`.claude/agents/30-reviewer.md` § 7 Principle 5).

---

# 4. What a Review Is Actually Checking

`.claude/agents/30-reviewer.md` § 4 lists five responsibilities: Constitution Compliance, Plan Fidelity, Architecture Fit, Correctness, Routing to Specialists. In a codebase this early — where most existing code (`LoginScreen.tsx`'s no-op submit handler, `ContentScreen.tsx`'s "Coming soon" placeholder, `DashboardScreen.tsx`'s hardcoded `MOCK_STATS`) predates any formal feature plan — "Plan Fidelity" needs a concrete answer for what happens when there's no plan to check against.

The answer: **for a diff building genuinely new functionality**, a plan (from `.claude/agents/10-feature-planner.md`) should exist, and its absence is itself a review finding — "escalate to `feature-planner`," not "review the code against your own idea of what it should do" (`.claude/agents/30-reviewer.md` § 7 Principle 1 exists exactly to prevent that substitution). **For a diff touching already-existing, pre-plan code** (fixing a bug in `HomeScreen.tsx`, adjusting `authStore.ts`'s error handling), there is no plan to check fidelity against — the review instead checks the change against the relevant handbook's stated target shape (e.g. `state-management.md` for a `authStore.ts` change) and against whether it makes a documented gap (`architecture.md` § 4, § 9; `.claude/knowledge/current-limitations.md`) better, worse, or unrelated.

---

# 5. Reading the Plan Before the Diff

`.claude/agents/30-reviewer.md` § 8 Step 1 states this as the first SOP step, and it is worth explaining why the order matters rather than just following it mechanically: reading the diff first primes you to evaluate the code against whatever mental model the diff itself suggests — which is exactly the model the engineer who wrote it already had, biases included. Reading the plan first gives you an independent yardstick, so a screen missing the plan's required Offline state (per `.claude/agents/10-feature-planner.md` § 9) is caught as a gap against the plan, not rationalized as "well, the diff doesn't really need offline support" after the fact.

Concretely, for a feature-plan-backed change, read in this order: (1) the feature plan's Screen Specifications, Repository Contracts, State Shape, Navigation Entries, Acceptance Criteria; (2) then the diff, checked line by line against each of those sections — not from memory of having skimmed the plan once.

---

# 6. When to Escalate to a Specialist

`.claude/agents/30-reviewer.md` § 9 states the triggers precisely — reproduced here because getting this step wrong is the single most consequential mistake a general review can make in this codebase specifically, given how much documented, specific risk already exists in the areas the specialists own:

- **→ `.claude/agents/31-performance-reviewer.md`** — list rendering, image-heavy screens, `useEffect` with non-trivial dependencies, animation, hot render paths.
- **→ `.claude/agents/32-security-reviewer.md`** — `src/store/authStore.ts`, `src/api/client.ts`, any token/credential handling, any new storage mechanism, input validation, a new third-party dependency.
- **→ `.claude/agents/33-accessibility-reviewer.md`** — any new interactive component, any new screen, any color/contrast change, any animation.

The reasoning that makes these triggers non-optional rather than judgment calls: `authStore.ts`/`client.ts` already carry a precisely-documented, non-hypothetical weakness (the `globalThis.__authToken` bridge, `state-management.md` § 7) — a generalist review that waves through a change here without routing to `security-reviewer` is not being efficient, it's skipping the one review pass that actually knows what to look for in that exact file. The same logic applies to accessibility: `src/components/ui/*` has a documented, codebase-wide zero-accessibility-props gap (`.claude/agents/33-accessibility-reviewer.md` § 9) — any new interactive component is either the diff that starts closing that gap or the diff that quietly widens it, and only a routed accessibility review reliably tells you which.

`.claude/agents/30-reviewer.md` § 11 names the anti-pattern directly: "Attempting a deep security or accessibility review yourself instead of routing to the specialist... produces false confidence." Do not skip § 5 Step 5 because the diff "looks fine" — routing itself is a review step, not an optional courtesy.

---

# 7. Constitution Trade-offs, Named Not Implied

The Core Values ordering (§ 3) is not a scoring rubric to apply mechanically — it's a tool for catching a specific failure mode: a change that quietly trades a higher-priority value for a lower one, with the trade never stated anywhere in the diff or its description.

Concretely: a change that adds a `React.memo` wrapper with no stated measured reason is trading Simplicity (a rule, per `.claude/rules/performance.md` Rule 1, not a preference) for an assumed Performance gain that was never measured — this is a Core Values violation independent of whether the memoization is "correct." A change that adds an `any` cast to unblock a type error under time pressure trades Correctness/Maintainability for Delivery Speed — exactly backwards per the ordering, and worth naming as such in the finding rather than treated as a minor style nit.

The test to apply: **if you can't point to a sentence in the PR description (or a comment in the diff) that names the trade-off being made, and the diff makes one anyway, that's the finding** — not "this could be better," but "this makes an undocumented Core Values trade-off; either document it (per the Technical Debt section) or don't make it."

---

# 8. Good Examples

**Good: a plan-fidelity finding with an exact citation**, reproduced from `.claude/agents/30-reviewer.md` § 12 because it is the reference shape every finding should match:

"`ContentScreen.tsx`'s Screen Specification (feature plan § Screens) requires an Offline state showing cached data. The diff only implements Loading/Error/Success. Request changes: add the Offline branch per the plan before this merges."

Specific plan citation, specific gap, specific action.

**Good: a Core Values trade-off finding, per § 7's test.**

"This diff adds `React.memo` to `StatCard` with no stated measurement (`.claude/rules/performance.md` Rule 1/2). Either cite what was profiled and what it fixed, or remove the memoization — as written this is an undocumented Simplicity-for-assumed-Performance trade, against the Core Values ordering."

---

# 9. Bad Examples

**Bad: a vague finding**, also from `.claude/agents/30-reviewer.md` § 12: "This screen could probably handle more edge cases." Names no specific missing state, cites no plan section, gives the implementing agent nothing to act on.

**Bad: approving because the diff "looks clean."** A well-formatted, well-typed implementation of the wrong screen states, or one that silently deviates from an approved plan "because it's obviously better this way," is still wrong — `.claude/agents/30-reviewer.md` § 11 names this explicitly: even a genuine improvement should route back through `feature-planner` to update the plan, or the plan and code drift apart with no accurate reference for the next reviewer.

---

# 10. Decision Trees

## Does this diff need a specialist reviewer?

```
Does it touch authStore.ts, client.ts, any token/storage code, input
validation, or add a new dependency?
  → Yes: route to security-reviewer. Non-negotiable, § 6.
Does it add/change an interactive component, a screen, a color/contrast
value, or an animation?
  → Yes: route to accessibility-reviewer. Non-negotiable, § 6.
Does it touch a list, image-heavy screen, a useEffect with real
dependencies, or a hot render path?
  → Yes: route to performance-reviewer. Non-negotiable, § 6.
None of the above?
  → General review only, but re-check this question after reading the
    full diff — a screen you assumed was "just UI" may add a useEffect
    fetch loop that wasn't obvious from its description.
```

## Is a missing test/mock/state a blocking finding or a suggestion?

```
Per constitution.md's Definition of Done: "Mock implementation exists"
and "Tests are written where appropriate" are completion requirements.
Is the missing item something the Definition of Done explicitly requires
for this kind of change?
  → Yes: blocking finding (30-reviewer.md § 7 Principle 4), not a
    suggestion — treat with the same seriousness as a logic bug.
  → No, it's genuinely optional polish:
      → Non-blocking suggestion, stated as such explicitly.
```

---

# 11. Real Project Examples

- **`.claude/agents/30-reviewer.md` § 9** — the specialist routing triggers this handbook's § 6 explains the reasoning behind.
- **`src/store/authStore.ts` / `src/api/client.ts`** — the concrete, always-route-to-security-reviewer files (`state-management.md` § 7, `.claude/agents/32-security-reviewer.md` § 9).
- **`.claude/agents/33-accessibility-reviewer.md` § 9** — the codebase-wide zero-accessibility-props gap that makes every new interactive component a routing trigger.
- **`.claude/rules/performance.md` Rule 1/2** — the "state what was measured" standard § 7's memoization example is built on.

---

# 12. Common Mistakes

- Reviewing the diff before reading the plan, then unconsciously evaluating the code against the diff's own implied intent rather than an independent yardstick.
- Skipping specialist routing because a diff "looks fine" on a surface read — the entire point of routing is that surface reads miss what the specialist is specifically trained to check.
- Treating a missing mock or missing state as a suggestion rather than a blocking finding, when the Definition of Done explicitly requires it.
- Writing a finding with no file, no line, and no concrete failing scenario — "this seems risky" gives the implementing agent nothing to act on.
- Approving a deviation from an approved plan "because it's obviously better" without looping back to `feature-planner` to update the plan itself.

---

# 13. Best Practices

- Read the plan (or, for pre-plan code, the relevant handbook's target shape) in full before opening the diff.
- Check every specialist trigger in § 6 explicitly, every time, even when the diff "seems purely visual" or "seems purely structural" — the trigger list exists because surface impressions are exactly what it's designed to override.
- When flagging a Core Values trade-off, name which value is being sacrificed for which, per § 7's test — don't just say "this feels off."
- Deliver an explicit verdict every time: Approve, Request Changes, or Escalate. Silence is never approval.

---

# 14. Checklist

- [ ] The originating feature plan (or, for pre-plan code, the relevant handbook) was read in full before the diff.
- [ ] Every applicable specialist trigger from § 6 was checked, not skipped because the diff "looked fine."
- [ ] Any Core Values trade-off in the diff is either documented in the PR or flagged as an undocumented trade-off finding.
- [ ] A missing mock, missing state, or missing test (where the Definition of Done requires it) is treated as blocking, not a suggestion.
- [ ] Every finding names a specific file, line, and concrete scenario — no vague findings.
- [ ] The verdict is explicit: Approve / Request Changes / Escalate.

---

# 15. References

- [constitution.md](../constitution.md) — Reviews, Core Values, Technical Debt, Definition of Done.
- [.claude/agents/30-reviewer.md](../agents/30-reviewer.md) — role authority, SOP, specialist routing triggers.
- [.claude/agents/31-performance-reviewer.md](../agents/31-performance-reviewer.md), [32-security-reviewer.md](../agents/32-security-reviewer.md), [33-accessibility-reviewer.md](../agents/33-accessibility-reviewer.md) — specialist review depth this handbook routes to rather than duplicates.
- [.claude/rules/review-process.md](../rules/review-process.md) — the enforceable checklist derived from this handbook's reasoning.
- [.claude/agents/10-feature-planner.md](../agents/10-feature-planner.md) — the plan structure § 5 checks diffs against.
- [architecture.md](./architecture.md), [state-management.md](./state-management.md) — the documented gaps referenced in § 4, § 6.
