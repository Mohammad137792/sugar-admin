---
id: playbook-reviewing-code
title: Reviewing Code Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Reviewing Code Playbook

> "A review that only checks style missed the point. A review that never checks style wastes everyone's time re-litigating it later." — `../agents/30-reviewer.md`

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Reviewing the `ProductDetailScreen` PR
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

`../constitution.md`'s Reviews section states every pull request should answer five questions — "What changed? Why? Alternatives considered? Risks? Future impact?" — and that "Reviewers should challenge architecture, not coding style alone." `../agents/30-reviewer.md` is the agent that owns this gate; `../templates/review.md` is the document a review is recorded against.

**A note on repo state, carried forward honestly from `../templates/review.md` itself:** at the time that template was written, neither `../agents/30-reviewer.md` nor a `.claude/rules/review-process.md` existed yet. `30-reviewer.md` now exists (read in full for this playbook) and is the review authority this playbook operationalizes. `.claude/rules/review-process.md` still does not exist in this repository as of this writing — this playbook relies directly on `../constitution.md`'s Reviews section and `../agents/30-reviewer.md`'s Decision Process instead. If `rules/review-process.md` is added later, reconcile this playbook's references against it.

---

# 2. When To Use This Playbook

Use this playbook whenever a change — a new feature slice, a screen, a component, a repository, a refactor step, a bug fix — is ready for review before merge. `../constitution.md`'s Definition of Done lists "Code is reviewed" as a completion requirement; this is not optional for any change, regardless of size.

---

# 3. Prerequisites

- `../agents/30-reviewer.md` read in full — this playbook is its Decision Process (§ 8) turned into a concrete, repeatable procedure.
- The originating feature plan (`../templates/feature-proposal.md`), ADR (`../templates/adr.md`), or bug report (`../templates/bug-report.md`) that motivated the change — read before the diff, per `30-reviewer.md` § 8 Step 1. A change with no traceable origin is itself a review finding (see `../templates/review.md`'s worked example: "an unstated alternative is a review finding, not something to silently accept").
- `../templates/review.md` — the document this playbook's verdict gets recorded in.

---

# 4. Step-by-Step Workflow

## Step 1 — Read the plan before the diff

Per `30-reviewer.md` § 8 Step 1: the feature plan's Screen Specifications, Repository Contracts, State Shape, Navigation Entries, and Acceptance Criteria (`../agents/10-feature-planner.md` §§ 9–14) — or the relevant ADR/bug report if this isn't feature work. Reviewing against your own mental model of "what this feature should do" instead of the actual approved plan is `30-reviewer.md`'s named Principle 1 violation.

## Step 2 — Read the diff against the plan, line by line

Not from memory of the conversation. Check every Screen Specification's six required states are actually implemented as distinct render paths; every Repository Contract's methods, named error types, and pagination/retry-safety notes are honored; every State Shape classification (Global/Local/Server Cache) matches what actually landed; every Navigation Entry matches `src/navigation/types.ts` exactly.

## Step 3 — Check Constitution compliance

Walk the Core Values ordering (`../constitution.md`: Correctness > Simplicity > Maintainability > Readability > Testability > Scalability > Performance > DX > Delivery Speed) — flag any trade-off made without documented justification. Check Separation of Concerns (no business logic in a screen file), Mock First Development (a new repository's mock is realistic, not always-succeeding), State Philosophy (no new global store without justification), and Error Philosophy (all required states present).

## Step 4 — Check architecture fit

Per `../rules/architecture.md`'s checklist: new screens under `src/features/<feature>/screens/`, not `src/screens/`; no component importing `client`/axios directly; new data access defined as a repository interface before implementation; no deep cross-feature import; any new `globalThis` bridge documented and justified; no speculative abstraction; business logic living in a hook, not a screen's render body.

## Step 5 — Route to specialists per `30-reviewer.md` § 9's triggers

Do not attempt specialist depth yourself — this is `30-reviewer.md`'s Principle 3, and `../agents/30-reviewer.md`'s named Anti Pattern is exactly a generalist attempting a deep security or accessibility pass instead of routing it:

- **`performance-reviewer`** — list rendering, image-heavy screens, non-trivial `useEffect` dependencies, animation, hot render paths.
- **`security-reviewer`** — `src/store/authStore.ts`, `src/api/client.ts`, any token/credential handling, any new storage mechanism, input validation, a new third-party dependency.
- **`accessibility-reviewer`** — any new interactive component, any new screen, any color/contrast change, any animation.
- **`refactor-engineer`** — a finding that requires a structural change spanning many files, beyond the current diff's scope.

## Step 6 — Treat a missing mock, missing state, or missing test as blocking, not a suggestion

Per `30-reviewer.md` § 7 Principle 4 — `../constitution.md`'s Definition of Done lists "Mock implementation exists" and "Tests are written where appropriate" as completion requirements, not polish. Their absence gets the same weight as a logic bug.

## Step 7 — Incorporate specialist findings as binding

A specialist reviewer's blocking finding blocks the merge regardless of the general reviewer's own read (`30-reviewer.md` § 6) — the general reviewer coordinates, never overrides.

## Step 8 — Deliver an explicit verdict using `../templates/review.md`

Fill out all six of the Constitution's Reviews questions plus the Checklist and Verdict section. Verdict is always one of: Approve / Approve with comments / Request changes / Reject (or, per `30-reviewer.md`'s own vocabulary, Approve / Request Changes / Escalate). Silence is never approval (`30-reviewer.md` § 7 Principle 5).

## Step 9 — Escalate, don't silently fix, a wrong or incomplete plan

If the diff reveals the plan itself was wrong or incomplete, stop the review and route back to `feature-planner`/`chief-architect` — approving code that quietly "fixes" a bad plan hides the drift from the next reviewer (`30-reviewer.md` § 8, final step; § 11's named Anti Pattern).

---

# 5. Worked Example: Reviewing the `ProductDetailScreen` PR

Using `building-a-screen.md`'s own worked example as the PR under review — `ProductDetailScreen.tsx`, its route registration, and its "Archive" action.

**Step 1.** Read the Products feature plan's `ProductDetail` Screen Specification: Purpose, Route (`AppStack.ProductDetail`, `{ productId: string }`), all six states, primary action (Edit), secondary action (Archive, `variant="danger"`, confirmation required per the plan's accessibility note).

**Step 2.** Diff checked against the spec: Loading renders a skeleton (matches); Error renders "Product not found or failed to load" + Retry + "Back to list" (matches); Offline shows cached product read-only with a banner, falling back to Error if nothing was cached (matches); Unauthorized redirects to `AuthStack.Login` (matches, though flagged in Step 4 below); Success renders full detail (matches); Empty is marked "not applicable" in the plan with a stated reason, and the diff correctly has no Empty branch.

**Step 3.** Constitution check: all six states have distinct render paths (Error Philosophy satisfied); `ProductDetailScreen.tsx` calls `useProductDetail(route.params.productId)` — a hook, not a direct `client` call (Separation of Concerns, Mock First satisfied by the underlying `ProductRepository.mock.ts` per `creating-a-repository.md`'s worked example); no new global store was added (State Philosophy satisfied — `productListFilters` stayed local per `creating-a-zustand-store.md`'s worked example, unrelated to this screen but confirms the pattern held).

**Step 4.** Architecture fit: file lives at `src/features/products/screens/ProductDetailScreen.tsx`, not `src/screens/` — correct. **Finding:** the Unauthorized state redirects to `AuthStack.Login`, but `../handbook/navigation.md` § 6 documents that `AuthNavigator` is never mounted in `App.tsx` today — this redirect target is currently unreachable through normal navigation. Not a defect in this PR specifically (the screen-level code is correct against the plan), but the PR description should flag this exactly as `../agents/20-react-native-engineer.md` § 12's "Screen / Gap / Blocked? / Recommendation" report shape requires, rather than silently assuming the redirect works end to end.

**Step 5.** Routed to `accessibility-reviewer` for the "Archive" destructive-confirmation pattern (a new interaction pattern, per `30-reviewer.md` § 9's trigger) — matching `building-a-screen.md`'s own Step 8. Not routed to `performance-reviewer` (no list rendering or heavy media on this screen) or `security-reviewer` (no token/credential handling here).

**Step 6.** `ProductRepository.mock.ts` (dependency of this screen) checked against Mock First Development — confirmed non-zero failure rate, realistic latency, present per `creating-a-repository.md`'s worked example. Not a blocking finding.

**Step 7.** `accessibility-reviewer`'s finding on the Archive confirmation step (e.g., confirming the destructive-action dialog has an accessible focus order) is incorporated as binding once returned.

**Step 8.** Verdict, using `../templates/review.md`'s structure: **Approve with comments** — (1) note the `AuthStack.Login` redirect's current unreachability in the PR description per Step 4, as a known, separately-tracked gap, not a defect of this diff; (2) confirm `accessibility-reviewer`'s Archive-confirmation finding before merge.

**Step 9.** No plan-level problem found — the plan itself was correct and complete; only an existing, separately-documented navigation gap was surfaced, which does not require reopening the plan.

---

# 6. Checklist

- [ ] The originating plan/ADR/bug report was read in full before the diff.
- [ ] The diff was checked against the plan's actual Screen Specifications, Repository Contracts, State Shape, and Navigation Entries — line by line.
- [ ] Constitution Core Values trade-offs were checked, documented or flagged.
- [ ] Architecture fit was checked against `../rules/architecture.md`'s checklist.
- [ ] Every applicable specialist (`performance-reviewer`, `security-reviewer`, `accessibility-reviewer`, `refactor-engineer`) was routed to per § 9's triggers — not skipped because the change "looks fine."
- [ ] A missing mock, missing state, or missing test was treated as blocking, not a suggestion.
- [ ] Specialist findings were treated as binding, not overridden by a shallower generalist read.
- [ ] The verdict is explicit — Approve / Approve with comments / Request changes / Reject — never implied by silence.
- [ ] A wrong or incomplete plan discovered mid-review was escalated, not silently patched around.

---

# 7. Common Mistakes

**Approving because the diff "looks clean" without checking it against the plan.** A well-formatted implementation of the wrong thing is still the wrong thing (`30-reviewer.md` § 11).

**Attempting a deep security or accessibility pass instead of routing to the specialist.** Produces false confidence that real depth was applied when it wasn't (`30-reviewer.md` § 11).

**Blocking on style preferences not covered by the Constitution or an established convention.** Wastes review cycles relitigating taste that isn't grounded in anything written down (`30-reviewer.md` § 11).

**Silently approving a change that deviates from the plan "because it's obviously better this way."** Even a genuine improvement should route back through `feature-planner` to update the plan — otherwise the plan and code drift apart for the next reviewer (`30-reviewer.md` § 11).

**Treating an unstated "alternatives considered" as acceptable.** Per `../templates/review.md`'s own worked example, an author's silence on alternatives is a review finding to raise, not something to fill in charitably on the author's behalf.

---

# 8. References

- `../constitution.md` — Reviews section (the five questions this playbook is built from), Definition of Done
- `../agents/30-reviewer.md` — the review authority this playbook operationalizes step by step
- `.claude/rules/review-process.md` — does not exist in this repository as of this writing; reconcile this playbook against it if it is added later
- `../templates/review.md` — the document format a review is recorded in, including its own `Button` variant worked example
- `../agents/10-feature-planner.md` §§ 9–14 — the plan structure every review checks a diff against
- `../rules/architecture.md` — the concrete architecture-fit checklist this playbook's Step 4 applies
- `./building-a-screen.md` — source of this playbook's `ProductDetailScreen` worked example
- `../handbook/navigation.md` § 6 — the real `AuthNavigator`/`RootNavigator` gap surfaced in the worked example
