---
id: handbook-refactoring
title: Refactoring Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Refactoring Handbook

> "A refactor that changes behavior isn't a refactor. It's an unreviewed feature change wearing a refactor's name." — `.claude/agents/40-refactor-engineer.md`

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. What Makes Something a Refactor at All
5. Thinking Without a Test Net
6. Worked Example: Repository Pattern Migration, the Reasoning
7. Worked Example: Feature Folder Migration, the Reasoning
8. Sizing a Refactor Step Correctly
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

`.claude/agents/40-refactor-engineer.md` is the authoritative, procedural owner of refactoring in Sugar Admin — it defines the two named migration targets, the exact SOP, the Refactor Safety Notes format, and the anti-patterns to avoid. This handbook does not repeat any of that. It exists to answer a different question: **how should an engineer, or an AI agent standing in for one, actually reason about a proposed refactor** — how to tell a genuine structural change from a feature change wearing a refactor's label, how to size a step correctly, and how to think through the two concrete migrations already identified in this codebase from a "what am I actually deciding here" angle rather than a checklist-following angle.

---

# 2. Scope

In scope: the reasoning behind what qualifies as a refactor, how to size a refactor step, and a "how to think about it" walkthrough of the two named migration targets (Repository Pattern adoption, Feature Folder restructure) that complements `.claude/agents/40-refactor-engineer.md`'s procedural ownership of the same targets.

Out of scope: the Refactor Safety Notes format, the exact SOP steps, and authority/collaboration rules — all owned by `.claude/agents/40-refactor-engineer.md`.

---

# 3. Principles

Grounded in:

- **Predictability** (constitution.md, via `00-chief-architect.md` § 5 Principle 5) — the target shape a refactor arrives at should already be specified elsewhere (`.claude/agents/10-feature-planner.md` § 10, `feature-structure.md` § 4); a refactor's job is to execute that shape, not invent a variant.
- **Correctness first** (constitution.md's Core Values) — ranked above Simplicity, Maintainability, and everything else. A refactor exists to serve Maintainability without ever risking Correctness — the moment a "refactor" might change behavior, it stops being a low-risk structural change and needs the same scrutiny as a feature change.
- **Small Units** (constitution.md) — "prefer many focused modules over one large module," applied at the level of refactor *steps*, not just files: a refactor broken into steps too large to review in one sitting has failed this principle just as surely as a 2,000-line component file would.
- **Technical Debt** (constitution.md) — refactoring is how documented, understood debt (`.claude/knowledge/current-limitations.md`) actually gets paid down, deliberately, not how undocumented debt gets swept under a "cleanup" label.

---

# 4. What Makes Something a Refactor at All

The test is simple to state and easy to violate in practice: **a refactor changes the shape of code without changing what it does.** `.claude/agents/40-refactor-engineer.md` § 7 Principle 1 states this precisely, but the harder skill is applying the test to a change that *looks* purely structural on the diff but actually isn't.

Concretely: moving `src/api/endpoints/content.ts`'s `contentApi.list()` method into a `mockContentRepository.list()` with the identical parameter list, identical success shape, and identical error behavior is a refactor — a caller cannot tell the difference by calling it. Moving the same method while *also* changing what happens when the result is empty (say, from returning `data: []` to throwing a `NotFoundError`) is not a refactor, even if it's bundled into the same "repository migration" diff — it's a behavior change that happens to be structurally adjacent to a refactor, and it needs the scrutiny a behavior change deserves (a feature plan, or at minimum an explicit, separately-reviewed decision), not the lighter scrutiny a pure structural move earns.

The practical check, useful in any ambiguous case: **could you write a test (even a hypothetical one, given `50-testing-engineer.md`'s current zero-infrastructure reality) that passes before the change and fails after, for a reason unrelated to the code's organization?** If yes, it's not purely a refactor.

---

# 5. Thinking Without a Test Net

`.claude/agents/40-refactor-engineer.md` § 7 Principle 5 states the operating consequence plainly: "Until real test coverage exists, be more conservative than a refactor engineer normally would be, not less." The classic refactoring discipline (Fowler-style: small steps, green tests after every step) assumes a test suite exists to catch a behavioral slip automatically. Sugar Admin has zero test infrastructure today (`50-testing-engineer.md` § 9, verified) — no Jest, no test files anywhere in `src/`.

What this actually means in practice, worked through rather than just stated as a constraint: without an automated net, the *only* thing standing between a subtle behavioral slip and a shipped regression is a human reading the diff carefully, or a manual verification step actually performed (not just asserted as "should be fine"). This has two concrete consequences for how a refactor step should be planned:

**Steps should be smaller than they would be in a codebase with real coverage.** A step that would be safely reviewable in one sitting *with* a passing test suite backing it up needs to be smaller here, because the reviewer's own read-through is now the only verification method — and a reviewer can hold less in their head reliably than a test runner can verify mechanically.

**The verification plan has to be concrete and actually executed, not asserted.** `.claude/agents/40-refactor-engineer.md` § 11's Refactor Safety Notes format requires stating the specific manual steps performed — "called `authApi.login` with valid and invalid credentials before and after the change, confirmed identical resolved/rejected shapes" — not "manually verified, looks fine." The former is falsifiable and repeatable by a reviewer; the latter is not evidence at all, it's a claim.

---

# 6. Worked Example: Repository Pattern Migration, the Reasoning

`.claude/agents/40-refactor-engineer.md` § 9 owns the procedural shape of this migration (which file, in what order, what the target structure looks like). Here is the reasoning an engineer should walk through before touching `src/api/endpoints/auth.ts`, thinking about *why* each sequencing decision in that section is the right one, not just following it.

**Why `auth.ts` first, not `content.ts` or `reports.ts`?** `auth.ts` is the only one of the three with a real, working, currently-exercised caller (`authStore.ts`'s `login`/`logout`/`hydrate`). `content.ts` and `reports.ts` back placeholder screens (`ContentScreen.tsx` renders "Coming soon," `ReportsScreen.tsx` similarly thin) with no meaningful call sites to preserve behavior for. Migrating `auth.ts` first means the very first migration step is also the one with the highest stakes and the most to verify — which is exactly right, because it proves the migration pattern works under real conditions before it's repeated on lower-stakes files, rather than proving it easy on the low-stakes files first and hitting the hard case last.

**Why mock-first, even for a migration of *existing* real code?** It seems backwards at first: `auth.ts` already calls a real (if unprovisioned, per `security.md` § 5) backend URL — why build a mock as part of migrating it? Because the destination shape (`architecture.md` § 6) requires a mock to exist as a first-class citizen regardless of whether a real backend is reachable, and because the mock is also the *safest place to first verify the new interface's shape is right* — it's much easier to confirm `mockAuthRepository.login()` returns the exact same shape `authApi.login()` did by testing it in isolation than to discover a shape mismatch only once `httpAuthRepository` is wired to a live (or currently-unprovisioned) endpoint.

**Why is "the whole `login()` method, but not `logout()` or `hydrate()`, in one step" the right size, not too small or too large?** Per § 8 below — each of `login()`, `logout()`, `hydrate()` has independently verifiable behavior (different inputs, different resulting store state), so migrating all three simultaneously means a reviewer has to hold three independent behavior-preservation claims in their head at once, with no test suite to fall back on if one slips past review. One method at a time means one claim at a time.

---

# 7. Worked Example: Feature Folder Migration, the Reasoning

`.claude/agents/40-refactor-engineer.md` § 10 states the target shape and, critically, states this migration is *not* "grow into it as needed only" in the same unqualified way Migration Target A is — it's narrower and more disciplined. The reasoning worth internalizing:

**Why is creating empty `hooks/`, `state/`, `services/` folders ahead of real content wrong, when the target structure clearly names all of them?** Because `feature-structure.md` § 5 (referenced by `.claude/agents/40-refactor-engineer.md` § 10) explicitly calls the current flat `screens/`-only shape "exactly what an early Foundation-phase codebase should look like" — not a defect. An abstraction (a folder is a lightweight abstraction: "this is where X kind of code goes") that has no content behind it doesn't communicate architecture, per `architecture.md` § 3's Predictability principle — it communicates a guess about future architecture, which is exactly the "every abstraction must solve a real problem" anti-pattern `00-chief-architect.md` § 5 Principle 4 names.

**Why is this migration triggered by real work landing, not scheduled independently?** Because the folder structure's entire purpose is to organize *real content* — a `repository/` folder with nothing in it doesn't make the codebase more maintainable, it just adds a navigation step (open an empty folder, find nothing, go back up) for the next person exploring it. The trigger — a feature's first repository, first feature-local component, or first hook actually landing — is the exact moment the folder stops being speculative and starts being descriptive of something real.

**The one non-negotiable, always-required step, regardless of how small the extraction is: update the feature's `index.ts` barrel.** `.claude/agents/40-refactor-engineer.md` § 10 names this explicitly, and it's worth understanding why it's not optional even for a tiny move: an internal file reached into from outside the feature (`imports.md` Rule 4's "illegal deep import") is exactly the boundary violation `feature-structure.md` § 8 names as a Bad Example. Every structural move that creates a new internal file is also an opportunity to either establish or violate the feature's public-API boundary — there is no neutral middle ground where skipping the barrel update is harmless.

---

# 8. Sizing a Refactor Step Correctly

This is the single hardest judgment call in refactoring work, and it's worth a dedicated section because getting it wrong in either direction has a real cost. Two failure modes, both real:

**Too large:** a step that migrates `auth.ts`, `content.ts`, and `reports.ts` simultaneously, or that restructures all five feature folders in one PR (`.claude/agents/40-refactor-engineer.md` § 13's named anti-patterns), produces a diff no reviewer can realistically verify in full — especially without a test suite (§ 5) to lean on. The review either becomes superficial (a rubber-stamp, defeating the point of review) or takes disproportionately long relative to the change's actual risk profile.

**Too small:** an artificially fragmented step — moving one method's type signature in one PR, its implementation in a second, its call-site update in a third — adds review overhead (three PRs to read instead of one) without adding safety, because the three pieces aren't independently meaningful; a reviewer approving step one still has to understand where steps two and three are going to evaluate whether step one is even the right direction. Fragmentation for its own sake isn't the goal — *independent verifiability* is.

**The actual test to apply**, distilled from `.claude/agents/40-refactor-engineer.md` § 7 Principle 2's Correctness-first framing: can this step's behavior-preservation claim be verified — read, manually exercised, or (once test infrastructure exists) tested — in one sitting, by one reviewer, without needing to hold the rest of the migration in their head? If yes, the step is sized correctly. If a reviewer would need to cross-reference three other files' planned-but-not-yet-landed changes to evaluate this one, it's too large, or split along the wrong boundary.

---

# 9. Good Examples

**Good: a properly-scoped Repository Pattern step**, reproduced from `.claude/agents/40-refactor-engineer.md` § 14 because it's the reference shape: "Step: migrate `authApi.login` only (not `logout`, not `me`, not `content.ts`/`reports.ts`)... `logout()` and `hydrate()` are explicitly left calling `authApi` directly in this step — follow-up step." One method, explicit verification performed, explicit statement of what was deliberately left alone.

**Good: declining to scaffold ahead of need**, also from § 10 above and `.claude/agents/40-refactor-engineer.md` § 14: "`src/features/reports/` still has no repository work in flight, so no `hooks/`, `state/`, `services/`, or `tests/` folders were created for it in this pass."

---

# 10. Bad Examples

**Bad: an over-scoped, unverified step.** "Cleaned up `src/api/` — moved everything to repositories, deleted the old `endpoints/` folder, also fixed a typo in an error message and renamed a few variables for clarity." Three unrelated kinds of change (a full migration, a behavior change disguised as a typo fix, unrelated renames) in one diff with no stated verification — every one of § 4, § 5, and § 8's reasoning violated simultaneously.

**Bad: scaffolding without cause.** "Added empty `hooks/`, `services/`, `state/`, `constants/`, `tests/` folders to all five feature directories so the project structure 'looks consistent.'" Creates dead scaffolding nobody asked for and obscures, in a future `git log`, which folders have real content versus which were created speculatively — directly against § 7's reasoning.

---

# 11. Decision Trees

## Is this change a refactor, or a feature change wearing a refactor's label?

```
Apply § 4's test: could a hypothetical test pass before and fail after,
for a reason unrelated to code organization?
  → Yes: this is a behavior change. Route through feature-planner /
    full review, don't label it a refactor.
  → No, genuinely just moved/renamed/restructured with identical
    observable behavior: it's a refactor. Proceed with § 8's sizing
    discipline.
```

## Is this refactor step sized correctly?

```
Can one reviewer verify this step's behavior-preservation claim in one
sitting, without cross-referencing other planned-but-unlanded steps?
  → Yes: correctly sized.
  → No, it's too large: split along a natural seam (one method, one file,
    one feature) — see § 6, § 7's worked examples.
  → No, it's fragmented into pieces with no independent meaning: recombine
    until each step is independently reviewable and independently useful.
```

---

# 12. Real Project Examples

- **`src/api/endpoints/auth.ts`, `content.ts`, `reports.ts`** — the Migration Target A subjects, worked through in § 6.
- **`src/features/{ai-chat,auth,content,dashboard,reports}/`** — the flat, `screens/`-only Migration Target B subjects, worked through in § 7.
- **`.claude/agents/40-refactor-engineer.md` § 11** — the Refactor Safety Notes format this handbook's § 5 explains the reasoning behind.
- **`.claude/knowledge/current-limitations.md`** § 4, § 8 — the documented gaps these two migrations exist to close.

---

# 13. Common Mistakes

- Bundling a genuine behavior change into a diff labeled "refactor," even a small one like a corrected error message.
- Migrating all three `endpoints/*.ts` files, or restructuring all five feature folders, in one PR.
- Creating empty target-shape folders ahead of real content landing in them.
- Asserting "manually verified, works fine" instead of stating the specific steps actually performed.
- Silently fixing a bug discovered mid-refactor instead of reporting it and keeping the refactor scoped to structure only.

---

# 14. Best Practices

- Apply § 4's test to every proposed refactor before starting, not after a reviewer questions it.
- Write the verification plan before making the change, and actually perform it — not "should be fine."
- Size each step so one reviewer can verify it in one sitting without holding the rest of the migration in their head (§ 8).
- When the migration's target shape is already specified elsewhere (`.claude/agents/10-feature-planner.md` § 10, `feature-structure.md` § 4), execute it exactly — don't improvise a variant that "seemed cleaner."
- Report a discovered bug; don't fix it silently inside the refactor diff.

---

# 15. Checklist

- [ ] The change passes § 4's test — no hypothetical test would fail solely due to a behavior change.
- [ ] The step is scoped to the smallest independently-verifiable unit (§ 8), not an entire migration at once.
- [ ] A verification plan was written before the change and actually performed, not asserted.
- [ ] No empty target-shape folder was created without real content behind it.
- [ ] Anything discovered but out of scope (a bug, a missing test trigger) is named, not silently absorbed.
- [ ] The diff contains only the declared structural scope — no drive-by fixes, no unrelated renames.

---

# 16. References

- [constitution.md](../constitution.md) — Core Values ordering, Small Units, Technical Debt.
- [.claude/agents/40-refactor-engineer.md](../agents/40-refactor-engineer.md) — procedural ownership, SOP, Refactor Safety Notes format, the two named migration targets in full.
- [.claude/agents/50-testing-engineer.md](../agents/50-testing-engineer.md) — the zero-test-infrastructure reality this handbook's § 5 is built on.
- [architecture.md](./architecture.md) — § 6, the four-pillar composition Migration Target A completes.
- [feature-structure.md](./feature-structure.md) — § 4, § 5, the target shape Migration Target B executes toward.
- [.claude/rules/imports.md](../rules/imports.md) — Rule 4, the barrel-file boundary requirement referenced in § 7.
- [.claude/knowledge/current-limitations.md](../knowledge/current-limitations.md) — § 4, § 8, the documented gaps motivating both migrations.
