---
id: playbook-fixing-bugs
title: Fixing Bugs Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Fixing Bugs Playbook

> "If code requires explanation, improve the code before improving the comments." — `../constitution.md`, applied here to root causes before patches

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Auth Session Lost on App Restart
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

A bug in Sugar Admin is behavior that violates `../constitution.md`'s Error Philosophy, a broken screen state, or a gap between documented and actual behavior. This playbook is the procedure from "something is wrong" to "verified fixed at the root cause" — and it is explicit about a real constraint: **Sugar Admin has zero automated test infrastructure today** (`../agents/50-testing-engineer.md` § 9). A bug fix here does not get to assume a regression test suite exists to lean on; it either becomes the trigger that bootstraps one, or it documents honest manual verification instead.

---

# 2. When To Use This Playbook

Use this playbook whenever behavior contradicts what the Constitution, a feature plan, or documented expectations say should happen — from something a user would notice down to an architecture-level gap discovered while reading code (as `../templates/bug-report.md`'s own filled example was).

Do not use this playbook for a feature that was never built yet ("Content screen doesn't do X" when Content is still a Level 0 placeholder is a feature request, not a bug) — route that to `feature-planner` via `building-a-feature.md` instead.

---

# 3. Prerequisites

- `../templates/bug-report.md` read in full — every bug fix starts from a filled-out report, even a short one, following its Summary / Steps to Reproduce / Expected vs. Actual / Environment / Severity / Suspected Area structure.
- `../agents/50-testing-engineer.md` § 9 read — know, honestly, that no test framework exists in this repo before promising a regression test as part of any fix.
- `../rules/testing.md` Rule 1 — the trigger for introducing test infrastructure — read and understood, since a bug's root cause often is that trigger.

---

# 4. Step-by-Step Workflow

## Step 1 — File or locate the bug report

Fill out `../templates/bug-report.md`'s template if one doesn't already exist: a searchable one-sentence Summary, numbered literal Steps to Reproduce, both Expected and Actual stated even when "obvious," Severity tied to real user impact, and Suspected Area naming real files — never "somewhere in auth."

## Step 2 — Reproduce literally, before touching any code

Follow the Steps to Reproduce exactly as written. If they don't reproduce the bug, the report itself is wrong or incomplete — fix the report before attempting a fix for behavior you haven't actually confirmed.

## Step 3 — Find the root cause, not the symptom

Trace the actual mechanism, not the first plausible-looking line. `../templates/bug-report.md`'s own filled example demonstrates this discipline directly: the symptom is "user is logged out on restart"; a symptom-level fix might call `hydrate()` earlier in `App.tsx`'s lifecycle — but the actual root cause is that `hydrate()` only ever checks `(globalThis as any).__authToken`, an in-memory value that is always `undefined` on a fresh process, because the token was never persisted anywhere durable in the first place. Calling `hydrate()` earlier would not fix anything; it would just fail slightly sooner.

## Step 4 — Determine whether the fix is a scoped patch or an architecture-level change

Per `../templates/bug-report.md`'s own filled example's Notes section: a fix touching a security-sensitive storage decision (e.g. token persistence — `expo-secure-store` vs. an encrypted MMKV instance vs. plain MMKV) is "architecture-adjacent enough that a fix should go through `../templates/architecture-proposal.md` rather than being patched directly... without review, per the Constitution's principle that architecture decisions precede implementation." Not every bug is this — a null-check miss or an off-by-one is a scoped patch. Judge honestly which kind this is before proceeding.

## Step 5 — Scope the fix to the bug, nothing more

A bug fix stays a bug fix. If while fixing it you notice an unrelated cleanup opportunity, name it separately — don't fold it into this diff (the same discipline `../agents/40-refactor-engineer.md` § 7 Principle 4 requires in the opposite direction, for refactors that shouldn't silently absorb bug fixes, applies here too: bug fixes shouldn't silently absorb refactors).

## Step 6 — Check whether this bug's root cause crosses the test-infrastructure trigger

Per `../rules/testing.md` Rule 1: "the first repository mock implementation with real branching logic... the first non-trivial validation function, or the first Zustand store action with more than one conditional path" is the trigger. A bug fix frequently *creates* exactly this condition — e.g., fixing token persistence gives `authStore.ts`'s `login()`/`hydrate()` real, newly-testable branching behavior for the first time. If the trigger is crossed, this is the moment to bootstrap infrastructure (see `writing-tests.md`), landed in the same PR as the fix — not deferred.

## Step 7 — Write the regression test, or document honest manual verification

- **If infrastructure exists or was just bootstrapped in Step 6:** write a test that fails against the old (buggy) code path and passes against the fix — proving the regression is actually caught, not merely "probably fixed."
- **If the trigger genuinely wasn't crossed:** document Manual Verification steps per `../templates/testing.md`, explicitly marked as manual, never implied to be equivalent to automated coverage (`../agents/50-testing-engineer.md` § 14's named Anti Pattern: "Treating manual verification as equivalent to an automated test").

## Step 8 — Fix the code

Only after Steps 3–4 have established the actual root cause and the correct scope.

## Step 9 — Verify against the original repro steps

Re-run the exact numbered steps from the bug report. A fix that wasn't re-verified against the original reproduction isn't confirmed fixed.

## Step 10 — Update release notes if this fix ships in a release

`../templates/release-notes.md`'s Bug Fixes section references the bug report in plain language — see § 5 below for the exact worked pairing.

## Step 11 — Hand off

`reviewer` always. `security-reviewer` if the bug touches `src/store/authStore.ts`, `src/api/client.ts`, tokens, or storage (`../agents/30-reviewer.md` § 9's trigger). `chief-architect` if Step 4 determined this is architecture-adjacent.

---

# 5. Worked Example: Auth Session Lost on App Restart

This is not a hypothetical — it is a real, current, verified defect in this codebase, matching `../templates/bug-report.md`'s own filled example exactly.

**Step 1.** Bug report filed: "Auth session lost on app restart, even after a successful login." Severity: Major. Suspected Area: `src/store/authStore.ts` (`login()` line 30, `hydrate()` lines 45–53), `src/api/client.ts` (line 13).

**Step 2.** Reproduced literally: log in successfully on `AuthStack.Login` (in principle — `AuthStack` is currently unreachable per `../handbook/navigation.md` § 6, so this step is actually exercised via `useAuthStore.getState().login()` directly in a dev console today), `isAuthenticated` becomes `true`; force-close the app; reopen; land back on an unauthenticated state.

**Step 3.** Root cause traced: `login()` (line 30) writes the token only to `(globalThis as any).__authToken` and to Zustand's in-memory state — Zustand's `create()` call has no `persist` middleware. `hydrate()` (lines 45–53) exists and clearly intends to restore a session on launch, but it only reads the same in-memory global, which is always `undefined` on a fresh process — so `hydrate()` always takes its early return and never actually rehydrates anything. The symptom ("logged out on restart") and the naive fix ("call `hydrate()` on app start") are both downstream of the real root cause: **no persistence layer exists at all.**

**Step 4.** This is architecture-adjacent: `../context.md`'s Technology Stack names MMKV as the project's storage choice, and `../constitution.md`'s Replaceability section explicitly names "Storage: MMKV ↓ SecureStore ↓ SQLite should be isolated" — but neither MMKV nor `expo-secure-store` is even installed in `package.json` today. Choosing between plain MMKV, encrypted MMKV, and `expo-secure-store` for a security-sensitive value (an auth token) is a storage-layer decision the Constitution's Security Philosophy ("sensitive information should never be stored insecurely") makes non-trivial. Per `../templates/bug-report.md`'s own Notes: this fix goes through `../templates/architecture-proposal.md` first, not a direct patch to `authStore.ts`.

**Step 5.** Scope: the architecture proposal covers exactly the storage decision and its integration into `login()`/`logout()`/`hydrate()`. It does not also fix the separate, related `RootNavigator` gap (`../handbook/navigation.md` § 6) that keeps `AuthNavigator` unreachable — that is named as a related but distinct piece of debt, not folded in.

**Step 6.** Once the architecture proposal is accepted and implemented, `authStore.ts`'s `login()`/`hydrate()` gain real, meaningful branching logic for the first time (persisted-token-present vs. absent, valid vs. expired) — this crosses `../rules/testing.md` Rule 1's trigger. Test infrastructure is bootstrapped in the same PR as the fix, per `writing-tests.md`.

**Step 7.** A test is written: `authStore.hydrate()` restores `isAuthenticated: true` when a valid persisted token exists, and correctly stays `false` when none does — failing against the pre-fix code, passing against the post-fix code.

**Step 8.** The fix is implemented per the accepted architecture proposal (e.g., `expo-secure-store` for the token specifically, per the Security Philosophy's guidance toward the more secure of MMKV vs. `SecureStore` for a credential).

**Step 9.** The original repro steps are re-run: login, force-close, reopen — session now persists correctly.

**Step 10.** `../templates/release-notes.md`'s own filled example already shows exactly this pairing: "Fixed: users were logged out every time the app was closed and reopened... Sessions now persist via secure on-device storage," with an Upgrade Notes entry warning existing installs will be logged out once as the new storage format takes effect.

**Step 11.** Handed to `reviewer` and explicitly to `security-reviewer` (token storage change) and `chief-architect` (the architecture proposal's sign-off already required by Step 4).

---

# 6. Checklist

- [ ] A bug report exists, following `../templates/bug-report.md`'s structure, with a literal, numbered reproduction.
- [ ] The bug was reproduced before any code was touched.
- [ ] The actual root cause was found and named — not the first plausible symptom-level explanation.
- [ ] The fix's scope (simple patch vs. architecture-adjacent) was judged honestly, and routed through `../templates/architecture-proposal.md` if the latter.
- [ ] The diff is scoped to the bug only — no unrelated cleanup folded in.
- [ ] Whether this bug crosses the test-infrastructure trigger (`../rules/testing.md` Rule 1) was checked honestly.
- [ ] A regression test was written (if infrastructure applies) or Manual Verification was documented and clearly labeled as manual (if it doesn't yet).
- [ ] The fix was re-verified against the original bug report's exact reproduction steps.
- [ ] Release notes were updated if this fix ships in a release.
- [ ] `reviewer`, and `security-reviewer`/`chief-architect` where applicable, are named in the handoff.

---

# 7. Common Mistakes

**Patching the symptom instead of the root cause.** Calling `hydrate()` earlier without fixing persistence "fixes" nothing — it just changes when the same underlying gap becomes visible.

**Claiming a regression test exists when no infrastructure does.** `../agents/50-testing-engineer.md` § 14 names this directly — state the infrastructure gap honestly every time, per its Principle 1.

**Folding an architecture-level storage decision into a quiet `authStore.ts` patch.** Skips the review a security-sensitive decision deserves, per the Constitution's principle that architecture decisions precede implementation.

**Declaring "fixed" without re-running the original repro steps.** A fix that only satisfies the engineer's mental model of the bug, not the literal reproduction that was filed, is unverified.

**Bundling an unrelated refactor into the bug-fix diff.** Makes the fix harder to review in isolation and obscures which change actually resolved the reported behavior.

---

# 8. References

- `../constitution.md` — Error Philosophy, Security Philosophy, Definition of Done
- `../templates/bug-report.md` — the template this playbook is built around, including its full Auth-session filled example used as this playbook's worked example
- `../agents/50-testing-engineer.md` § 9, § 14 — the honest test-infrastructure state and the anti-pattern of overclaiming coverage
- `../rules/testing.md` Rule 1 — the trigger for bootstrapping test infrastructure a bug fix may cross
- `../templates/testing.md` — Manual Verification structure for when infrastructure doesn't yet apply
- `../templates/architecture-proposal.md` — where an architecture-adjacent bug fix is routed first
- `../templates/release-notes.md` — where a shipped fix is documented, including its own filled pairing with this exact bug
- `src/store/authStore.ts`, `src/api/client.ts` — the real files this playbook's worked example is grounded in
- `./writing-tests.md` — the infrastructure-bootstrap procedure this playbook's Step 6/7 may trigger
- `../agents/40-refactor-engineer.md` § 7 Principle 4 — the discipline against silently mixing change types, applied here in reverse
