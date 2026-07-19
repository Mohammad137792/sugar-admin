---
id: playbook-refactoring
title: Refactoring Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Refactoring Playbook

> "A refactor that changes behavior isn't a refactor. It's an unreviewed feature change wearing a refactor's name." — `../agents/40-refactor-engineer.md`

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Migrating `authApi.login` Into the Repository Pattern
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

`../agents/40-refactor-engineer.md` owns two concrete, named migration targets in this codebase today: **Migration Target A** (moving `src/api/endpoints/auth.ts`, `content.ts`, `reports.ts` from direct-axios calls into the Repository Pattern) and **Migration Target B** (moving `src/features/*/` from flat `screens/`-only folders to the full feature-owned structure). This playbook is the procedural how — the concrete steps for actually carrying out a refactor step within either target — grounded directly in `../agents/40-refactor-engineer.md`'s SOP (§ 8), Refactor Safety Standard (§ 11), and both migration targets (§ 9, § 10), which should be read in full before using this playbook, not summarized from memory.

---

# 2. When To Use This Playbook

Use this playbook when carrying out a step of Migration Target A or Migration Target B, or any other structural change `../agents/00-chief-architect.md` has explicitly approved.

Do not use this playbook to justify a refactor nobody approved — `refactor-engineer` does not self-authorize a migration it decided was a good idea (`../agents/40-refactor-engineer.md` § 6). Do not use it for a change that alters what a feature does, what data it shows, or what a screen's states look like — that's a feature change, routed through `feature-planner` and `building-a-feature.md`, not this playbook.

---

# 3. Prerequisites

- The migration is one of the two named targets (`../agents/40-refactor-engineer.md` § 9, § 10) or has explicit `chief-architect` approval for something else.
- The target shape is read from its owning document — `../agents/10-feature-planner.md` § 10 for repository contracts (Target A), `../handbook/feature-structure.md` § 4 for feature folder structure (Target B) — never assumed from memory.
- Awareness that Sugar Admin has zero automated test infrastructure today (`../agents/50-testing-engineer.md` § 9) — per `../agents/40-refactor-engineer.md` § 7 Principle 5, this makes every refactor step here more conservative than a refactor engineer would normally need to be, not less: every step needs a manual verification plan substituting for the automated safety net that doesn't exist yet.
- The relevant owning agent is looped in before starting: `network-engineer` for Target A, the relevant feature-owning agent for Target B.

---

# 4. Step-by-Step Workflow

This mirrors `../agents/40-refactor-engineer.md` § 8's Decision Process exactly, written as concrete actions.

## Step 1 — Confirm approval

The migration is Target A, Target B, or has explicit sign-off. If neither, stop.

## Step 2 — Read the destination precisely

For Target A: `../agents/10-feature-planner.md` § 10's Repository Contract Standard and `../agents/24-network-engineer.md` § 10's Target Repository Pattern. For Target B: `../handbook/feature-structure.md` § 4's target folder shape and § 6's worked example.

## Step 3 — Break the migration into the smallest independently-mergeable step

For Target A: **one endpoint module** (`auth.ts`, or `content.ts`, or `reports.ts`) per step, and within that, **mock-first before real** — do not migrate all three in one PR (`../agents/24-network-engineer.md` § 13's named anti-pattern, restated in `../agents/40-refactor-engineer.md` § 7 Principle 2). `auth.ts` is the highest-value first target, since `authStore.ts` is its only real, working caller today.

For Target B: **one feature folder** per step, triggered by real work landing in that feature (most often, Target A's repository landing for the same feature) — never a standalone "restructure everything" PR across all five feature folders.

## Step 4 — Write the verification plan before touching any code

Since no automated test suite exists to catch a behavioral drift, state the specific manual check that proves this step changed nothing observable — e.g., "called `authApi.login` with valid and invalid credentials before and after the change, confirmed identical resolved/rejected shapes and `authStore.ts`'s resulting state transitions." This is written down before execution, not reconstructed afterward as a justification.

## Step 5 — Execute exactly the declared scope

No drive-by renames, no unrelated formatting changes, no bug fix folded in silently — even a bug discovered mid-refactor is reported and handed to the owning agent, not fixed inline (`../agents/40-refactor-engineer.md` § 7 Principle 4; see `fixing-bugs.md` for the mirror-image rule).

## Step 6 — Run the verification plan and record the outcome

Actually perform the manual check from Step 4 — "should be fine" is not evidence (`../agents/40-refactor-engineer.md` § 13's named Anti Pattern).

## Step 7 — Fill in the Refactor Safety Notes and hand off

```
## Refactor Safety Notes

**Scope:** <exactly what structural change this step makes>
**Behavior claim:** <what continues to behave identically after this change>
**Verification method:** <the manual steps actually performed, or which
  automated tests still pass, if infrastructure now exists for this code>
**What was deliberately NOT changed:** <named explicitly, even when obvious>
**Follow-up needed:** <anything surfaced but out of this step's scope>
```

Hand off to `reviewer` always, and to `testing-engineer` if this step introduced new business logic (a mock repository's failure/pagination logic, for instance) that now crosses `../rules/testing.md` Rule 1's adoption trigger — see `writing-tests.md`.

## Step 8 — Stop and split if a step turns out riskier than planned

If a call site behaves differently than expected, or a hidden dependency surfaces mid-execution, do not push through to "finish it anyway" — split the step further or escalate to `chief-architect` (`../agents/40-refactor-engineer.md` § 8, final step).

---

# 5. Worked Example: Migrating `authApi.login` Into the Repository Pattern

This is Migration Target A's own named "Good" example (`../agents/40-refactor-engineer.md` § 14), walked through as this playbook's procedure.

**Step 1.** Approved: this is Migration Target A, `../agents/40-refactor-engineer.md`'s own frontmatter names it explicitly.

**Step 2.** Destination read: `../agents/24-network-engineer.md` § 10's target shape — `src/features/auth/repository/AuthRepository.ts` (interface), `mockAuthRepository.ts`, `httpAuthRepository.ts`, `index.ts` (factory).

**Step 3.** Scope: `authApi.login` **only** — not `logout`, not `me`, not `content.ts`/`reports.ts`. This is the smallest independently-verifiable unit within Target A, and `auth.ts` is prioritized first per § 9's "highest-value target" guidance since `authStore.ts` is a real, working caller whose behavior must be preserved exactly.

**Step 4.** Verification plan written first: "Manually exercise valid-credential and invalid-credential login, before and after the change, via the store directly (since `AuthNavigator`/`LoginScreen`'s UI path is separately gated by the known `../handbook/navigation.md` § 6 issue) — confirm `authStore`'s `user`, `token`, `isAuthenticated`, and `error` fields end in identical states in both cases, before and after."

**Step 5.** Executed: `AuthRepository.ts` (interface, `login` method only for this step), `mockAuthRepository.ts` (first-class mock per Mock First Development), `httpAuthRepository.ts` (wraps `client.post("/auth/login", ...)`, matching `authApi.login`'s existing endpoint and response envelope exactly), `index.ts` (factory). `authStore.ts`'s `login()` action is updated to call `authRepository.login()` from the new `index.ts`, instead of `authApi.login()` from `src/api/endpoints/auth.ts` directly. `logout()` and `hydrate()` are explicitly left calling `authApi` directly in this step — named as follow-up, not silently swept in.

**Step 6.** Verification performed: valid-credential and invalid-credential login exercised before and after; `authStore`'s four fields confirmed identical in both cases.

**Step 7.** Refactor Safety Notes filled in:

```
Scope: migrate authApi.login only into src/features/auth/repository/
  (AuthRepository.ts, mockAuthRepository.ts, httpAuthRepository.ts, index.ts).
  authStore.ts's login() now imports authRepository.login() instead of
  authApi.login() directly.
Behavior claim: authStore's user/token/isAuthenticated/error fields end in
  identical states for both valid and invalid credentials, before and after.
Verification method: no automated tests exist for this code yet (per
  50-testing-engineer.md). Manually exercised valid- and invalid-credential
  login via useAuthStore.getState().login() directly, before and after the
  change; confirmed identical resulting state in both cases.
What was deliberately NOT changed: logout() and hydrate() still call authApi
  directly — follow-up step, not in scope here. Error message strings
  surfaced to authStore's error field are unchanged byte-for-byte.
Follow-up needed: migrate logout() and hydrate() in a separate step; migrate
  content.ts and reports.ts in their own, separately-scoped steps.
```

Handed to `reviewer`. `testing-engineer` is also looped in — `mockAuthRepository.ts` now has real branching logic (valid vs. invalid credential paths), which is a candidate for crossing `../rules/testing.md` Rule 1's adoption trigger.

**Step 8.** No unexpected risk surfaced during this particular step; it proceeded as planned.

---

# 6. Checklist

- [ ] The refactor is one of the two named migration targets, or has explicit `chief-architect` approval.
- [ ] The target shape was read from its owning document, not assumed.
- [ ] The step is scoped to the smallest independently-verifiable unit — one endpoint module/method (Target A) or one feature's structural move (Target B).
- [ ] A verification plan was written before the change, not after.
- [ ] The relevant owning agent (`network-engineer` for Target A, the feature-owning agent for Target B) was looped in.
- [ ] The diff contains only the declared structural scope — no drive-by fixes, no unrelated renames.
- [ ] The Refactor Safety Notes are filled in completely, including the verification method actually used.
- [ ] Anything discovered but out of scope is named, not silently absorbed or dropped.
- [ ] No empty subfolder was created without real content behind it (Target B specifically).
- [ ] `reviewer`, and `testing-engineer` if applicable, are named in the handoff.

---

# 7. Common Mistakes

**Migrating all three of `auth.ts`, `content.ts`, `reports.ts` in one PR.** Named explicitly as an anti-pattern in both `../agents/24-network-engineer.md` § 13 and `../agents/40-refactor-engineer.md` § 13 — disproportionate review risk for the value delivered.

**Scaffolding empty `hooks/`, `state/`, `services/`, `tests/` folders into a feature "to look more complete."** Contradicts `../handbook/feature-structure.md` § 11 and the Constitution's Simplicity Wins — Target B moves structure only when real content is landing, never speculatively.

**Fixing a discovered bug silently inside the refactor diff.** Tangles two kinds of change into one diff and hides a bug fix from the scrutiny it deserves — report it and hand it off, per `fixing-bugs.md`'s mirror-image rule.

**Skipping the verification plan because "it's obviously equivalent."** The riskiest refactors are exactly the ones that look obviously safe — see `../agents/40-refactor-engineer.md` § 11, § 13.

**Redesigning the target shape mid-migration "because it seemed cleaner."** The destination is already specified (`10-feature-planner.md` § 10, `feature-structure.md` § 4) — a refactor that arrives somewhere slightly different creates a second target the next engineer has to reconcile.

---

# 8. References

- `../constitution.md` — Core Values (Correctness first), Technical Debt
- `../agents/40-refactor-engineer.md` — the full SOP, both named migration targets, and the Refactor Safety Standard this playbook operationalizes
- `../agents/24-network-engineer.md` § 9, § 10, § 13 — the target repository shape and named anti-pattern for Migration Target A
- `../handbook/feature-structure.md` § 4, § 6, § 11 — the target folder shape, worked example, and named common mistake for Migration Target B
- `../agents/50-testing-engineer.md` § 9 — why every refactor step here is more conservative than usual, given zero test infrastructure
- `../rules/testing.md` Rule 1 — the adoption trigger a refactor step may cross
- `src/api/endpoints/auth.ts`, `src/store/authStore.ts` — the real files this playbook's worked example is grounded in
- `./creating-a-repository.md` — the target pattern Migration Target A converges on
- `./writing-tests.md` — the infrastructure-bootstrap procedure a refactor step may trigger
- `./fixing-bugs.md` — the mirror-image discipline against mixing bug fixes into structural changes
