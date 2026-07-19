---
id: command-refactor-feature
title: Refactor Feature
category: command
version: 1.0.0
status: active
invokes_agent: refactor-engineer
last_updated: 2026-07-18
---

# Command: Refactor Feature

> Restructure a feature's internals without changing its observable behavior.
> Behavior-preserving only — this command never adds, removes, or alters
> what a user experiences.

---

## Purpose

Sugar Admin's Constitution requires that "Undocumented technical debt is
prohibited" and that debt may only be accepted with a documented reason, a
follow-up plan, and an understood impact. `refactor-feature` is how that
follow-up plan gets executed: it pays down a specific, named piece of debt in
a specific feature, and nothing else.

This command is deliberately narrow. It is not `generate-feature` (new
capability), not `optimize-feature` (performance), and not a stealth vehicle
for redesigning a feature's screens or adding scope. If the invoker wants
new behavior, they want `generate-feature`, not this command.

---

## When To Invoke

- A `review-feature.md` report contains a non-blocking follow-up that
  requires structural cleanup (e.g. "direct axios call bypasses repository
  boundary").
- A feature was built before a standard existed (e.g. before the Repository
  Pattern was adopted for a given feature) and now needs to be brought into
  conformance.
- `chief-architect` or a human engineer has identified accumulating
  structural drift in a feature folder that makes future work harder.

The two concretely known migration targets in Sugar Admin today are:

1. **Repository pattern adoption** — `src/api/endpoints/auth.ts`,
   `content.ts`, and `reports.ts` currently export plain objects that call
   `client` (axios) directly, with no interface, no mock implementation, and
   no simulated latency/failure. See
   `.claude/docs/decisions/adr-0002-mock-first-development.md` and the worked
   example at
   `.claude/docs/examples/auth-repository-migration-example.md`.
2. **Feature-folder restructure** — every feature under `src/features/`
   (`ai-chat`, `auth`, `content`, `dashboard`, `reports`) currently contains
   only a `screens/` subfolder. The target shape (per `constitution.md`'s
   Feature Ownership section and `context.md`'s Folder Philosophy) is that
   each feature owns `components/`, `hooks/`, `repository/`, `store/`,
   `types/`, `constants/`, and `tests/` alongside `screens/`.

Do not invoke this command speculatively ("this might be nice to clean up
someday") — the Constitution's Simplicity Wins principle means refactors need
a real, current reason, not a hypothetical future one.

---

## Required Inputs

The invoker must supply:

1. **Feature name** — the `src/features/*` module being refactored.
2. **The specific debt being paid down** — named precisely (e.g. "migrate
   `contentApi` to `ContentRepository`"), not "clean up the content feature."
3. **The trigger** — a `review-feature.md` finding, an ADR, or an explicit
   instruction from `chief-architect`. A refactor with no documented trigger
   is itself undocumented technical debt.
4. **Behavior baseline** — how the invoker (or `testing-engineer`) will
   confirm nothing changed. If no test infrastructure exists yet for this
   feature (see `generate-tests.md` — likely true today, since no test
   framework is installed per `package.json`), this must be a manual
   before/after walkthrough of every screen state instead.

---

## Procedure

1. **Confirm the refactor is behavior-preserving in scope.** Read the trigger
   (review finding, ADR, or instruction). If the requested change would alter
   what a user sees, what a screen returns, or what a repository method's
   contract promises, stop — this is `generate-feature` or
   `optimize-feature` territory, not a refactor. Escalate back to the
   invoker.

2. **Establish the current behavior baseline.** Before touching any code,
   enumerate the current observable behavior: every screen state, every
   repository method's actual current signature and error shape, every
   render path. If `testing-engineer` has already bootstrapped tests for
   this feature (via `generate-tests.md`), run them and record the passing
   baseline. If not, walk every screen manually and note what renders for
   each state (Loading, Empty, Error, Offline, Unauthorized, Success).

3. **Identify the target shape.** Reference the specific standard being
   migrated toward:
   - For repository pattern adoption: `10-feature-planner.md` § 10's
     Repository Contract Standard, and the worked before/after in
     `auth-repository-migration-example.md`.
   - For feature-folder restructure: `constitution.md`'s Feature Ownership
     section (components, hooks, repository, services, state, types,
     constants, tests) and `20-react-native-engineer.md` § 9's note that this
     is additive, not destructive — new subfolders are created, existing
     files move into them, nothing is deleted or rewritten in behavior.

4. **Plan the move in the smallest safe increments.** Prefer several small,
   independently verifiable changes over one large rewrite — per
   Constitution's "Small Units" and "Simplicity Wins" principles. For a
   repository migration: (a) write the interface, (b) write the mock
   implementation, (c) write the real implementation as a thin wrapper around
   the existing `client` call, (d) swap the call site, (e) delete the old
   direct-call export only after the call site is confirmed working.

5. **Execute each increment, verifying behavior after every step.** After
   each increment, re-check the baseline from Step 2. Any divergence means
   the increment was not behavior-preserving — revert that increment and
   reconsider, do not push forward and "fix it in the next step."

6. **Do not expand scope mid-refactor.** If a second, unrelated piece of debt
   is discovered during the refactor (e.g. a naming inconsistency in an
   unrelated file), note it and hand it off as a separate follow-up — do not
   fix it inline. Per Constitution's Single Responsibility: this refactor has
   one reason to change.

7. **Update documentation impacted by the move.** If the refactor changes
   where code lives (e.g. new `src/features/<feature>/repository/` folder),
   flag `documentation-engineer` to update any ADR or handbook reference that
   named the old location.

8. **Hand off to `reviewer`** with an explicit note that this was a
   behavior-preserving refactor, the trigger that justified it, and the
   before/after verification method used.

---

## Output Format

A refactor report plus the actual code changes:

```
# Refactor Report: <feature-name> — <debt being paid down>

## Trigger
<review finding / ADR / instruction that justified this refactor>

## Behavior Baseline
<what was verified before starting, and how>

## Target Shape
<standard being migrated to, with reference>

## Increments
1. <increment> — verified: <how>
2. <increment> — verified: <how>
   ...

## Scope Discipline
<confirmation that no new behavior was introduced; any discovered
out-of-scope debt, listed as a separate follow-up, not fixed inline>

## Behavior Confirmation
<final confirmation the baseline from "Behavior Baseline" still holds>

## Handoff
reviewer (behavior-preserving confirmation)
documentation-engineer (if file locations changed)
```

---

## Example Invocation

> Refactor the `content` feature: migrate `contentApi`
> (`src/api/endpoints/content.ts`) to a `ContentRepository` interface with a
> mock implementation, per the review finding in `review-feature.md`'s
> example output ("ContentRepository: does not exist"). Trigger: review
> finding, blocking follow-up #2.

## Example Output

```
# Refactor Report: content — migrate contentApi to ContentRepository

## Trigger
review-feature.md finding: "ContentRepository: does not exist. contentApi in
src/api/endpoints/content.ts calls `client` (axios) directly with no
interface, no mock implementation, and no simulated latency/failure."

## Behavior Baseline
Manually walked ContentScreen: renders a list from contentApi.list(1, 20),
no loading/error/empty states existed prior to this refactor (those are a
separate, already-flagged follow-up — not touched here).

## Target Shape
10-feature-planner.md § 10 Repository Contract Standard. Reference
implementation: auth-repository-migration-example.md.

## Increments
1. Wrote ContentRepository interface (list, getById, create, update,
   archive) in src/features/content/repository/ContentRepository.ts —
   verified: compiles, no call sites changed yet.
2. Wrote MockContentRepository with 150-800ms jitter and 5% simulated
   failure rate — verified: unit-testable in isolation, no call sites
   changed yet.
3. Wrote RealContentRepository wrapping existing `client` calls unchanged —
   verified: identical request shape to old contentApi via manual diff.
4. Swapped ContentScreen's import from contentApi to a repository-backed
   hook — verified: manually confirmed the list still renders the same data
   in the same shape.
5. Left src/api/endpoints/content.ts in place, unused by ContentScreen, and
   flagged for removal in a follow-up (out of scope for this refactor to
   delete without confirming no other call sites depend on it).

## Scope Discipline
Missing loading/empty/error states in ContentScreen were noticed but not
added — that is new behavior, out of scope for a refactor. Filed as a
separate follow-up for react-native-engineer.

## Behavior Confirmation
ContentScreen renders identical data in identical shape before and after.
No screen state changed. No repository consumer outside ContentScreen exists
yet, so no other call site was affected.

## Handoff
reviewer — confirm behavior-preserving.
documentation-engineer — note new src/features/content/repository/ location
if any handbook file referenced the old contentApi location.
```

---

## Related Agents

- `refactor-engineer` — primary owner of this command.
- `reviewer` — confirms the refactor was behavior-preserving.
- `network-engineer` — owns the target repository shape being migrated to.
- `documentation-engineer` — updates any documentation invalidated by moved
  files.
- `testing-engineer` — supplies the automated baseline when test
  infrastructure exists (see `generate-tests.md`).

---

## References

- `.claude/constitution.md` — Technical Debt, Simplicity Wins, Single
  Responsibility.
- `.claude/agents/10-feature-planner.md` § 10 — target shape for repository
  migrations.
- `.claude/docs/decisions/adr-0002-mock-first-development.md` — why the
  repository pattern migration is required, not optional.
- `.claude/docs/examples/auth-repository-migration-example.md` — full worked
  before/after example of exactly this migration pattern.
- `.claude/agents/20-react-native-engineer.md` § 9 — feature-folder
  restructure is additive, not destructive.
