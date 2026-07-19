---
id: playbook-publishing-a-release
title: Publishing A Release Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Publishing A Release Playbook

> "An empty Known Issues section on a foundation-phase app is a red flag, not a good sign — name real, current limitations." — `../templates/release-notes.md`

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Cutting v1.1.0
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

Sugar Admin ships as an Expo/EAS-built application. This playbook is the procedure for cutting a release: bumping the version consistently across `app.json` and `package.json`, writing honest release notes via `../templates/release-notes.md`, and running the pre-release checklist before a build goes out — grounded in the actual, current state of this repository's release tooling, which is minimal today.

---

# 2. When To Use This Playbook

Use this playbook whenever a set of merged changes is ready to ship as a new version — whether that's the first real release past `1.0.0`'s current placeholder state, or any subsequent one.

---

# 3. Prerequisites

- `app.json` read in full — current real state: `expo.name: "sugar-admin"`, `expo.slug: "sugar-admin"`, `expo.version: "1.0.0"`, `newArchEnabled: false`. There is no `expo.runtimeVersion`, no `expo.ios.buildNumber`, no `expo.android.versionCode`, and no `eas` block configured anywhere in `app.json` today.
- `package.json` read in full — its top-level `"version": "1.0.0"` currently matches `app.json`'s `expo.version`, but its `"name": "myapp"` field does **not** match `app.json`'s `expo.name: "sugar-admin"` — a real, existing inconsistency worth fixing as part of the first real release, not perpetuating silently (see § 4 Step 2).
- **No `eas.json` exists in this repository.** There is no EAS Build profile configured (`development`/`preview`/`production` or otherwise) — confirmed by direct search. A release cannot actually be built via `eas build` until this is created; this playbook names that as an open, real prerequisite rather than assuming it already exists.
- `../templates/release-notes.md` read in full, including its filled `v1.1.0` example — the template this playbook's Step 4 fills out.
- `.claude/handbook/deployment-preparation.md` — referenced by a parallel workstream; it does not exist in this repository as of this writing. If it has since been added, read it before this playbook's Step 6 (pre-release checklist) and reconcile any conflicting guidance in favor of the more specific, later-written document.

---

# 4. Step-by-Step Workflow

## Step 1 — Confirm every change in this release traces back to a plan, ADR, or bug report

Per `../constitution.md`'s Reviews section and Definition of Done — a release is not a grab-bag of whatever merged; every included change should already have gone through `reviewing-code.md`'s gate with an explicit Approve verdict.

## Step 2 — Bump the version, consistently, in both files

`../templates/release-notes.md`'s own Instructions state this plainly: "`app.json`'s `expo.version` field... drives the native app version separately from `package.json`'s own `version` field — keep both in sync when bumping." Follow semver. While doing this, also correct `package.json`'s `"name": "myapp"` to `"sugar-admin"` to match `app.json`'s `expo.name` — a small, low-risk fix worth making explicit in the release PR rather than leaving as an unrelated, un-flagged drift indefinitely.

```json
// app.json
"expo": { "version": "1.1.0", ... }
```
```json
// package.json
{ "name": "sugar-admin", "version": "1.1.0", ... }
```

## Step 3 — Confirm (or create) the EAS Build configuration

Since no `eas.json` exists yet, the first real release requires creating one with at minimum a `production` build profile before `eas build` can run. This is itself a small piece of infrastructure work, not a given — do not assume it silently exists because the project "is on Expo." If EAS Build isn't the chosen distribution path for this particular release (e.g., a purely local/internal build), state that explicitly in the release PR rather than leaving it ambiguous.

## Step 4 — Write release notes using `../templates/release-notes.md`

Fill every section in order:

1. **Highlights** — 2–4 user-facing bullets, no internal jargon.
2. **New Features** — grouped by feature module (`src/features/*` naming), not by individual PR.
3. **Improvements** — smaller, non-new-feature changes.
4. **Bug Fixes** — plain language, referencing the bug report (`../templates/bug-report.md`) where one exists — see `fixing-bugs.md` for how a fix and its bug report pair together.
5. **Known Issues** — be honest. Per the template's own instruction: an empty Known Issues section on a Foundation-phase app (`../context.md`: "Current Development Phase: Foundation," "Status: Early Development") is a red flag, not a good sign. Name real, current limitations — the mock-only backend (`../context.md`'s Backend Strategy), the React Navigation vs. Expo Router discrepancy (`../handbook/navigation.md` § 7), the missing `RootNavigator` auth-gating wiring (`../handbook/navigation.md` § 6), and the absence of automated test coverage (`../agents/50-testing-engineer.md` § 9) are all real, current, and honestly reportable today.
6. **Upgrade Notes** — anything beyond "install the new build." State "None" explicitly if genuinely nothing.

## Step 5 — Cross-check release notes against what actually shipped

Every "New Feature" bullet traces to an accepted feature plan (`../templates/feature-proposal.md`); every "Bug Fix" bullet traces to a bug report (`../templates/bug-report.md`); every "Known Issue" is either still true today or has been explicitly resolved and removed from the list.

## Step 6 — Run the pre-release checklist

Reference `.claude/handbook/deployment-preparation.md` if it exists by the time this release is cut (it did not exist at the time this playbook was written — check first). In its absence, this playbook's own minimum bar applies:

- Every change in this release has an Approve verdict from `reviewing-code.md`.
- `app.json`'s `expo.version` and `package.json`'s `version` match.
- `app.json`'s `expo.name`/`slug` and `package.json`'s `name` are consistent.
- An `eas.json` build profile exists for however this release is actually being distributed, or its absence is explicitly acknowledged.
- Known Issues is honest and non-empty for a Foundation-phase release.
- No secret or credential is committed as part of any config change made in this release (`../constitution.md`'s Security Philosophy).

## Step 7 — Cut the build

Run the appropriate `eas build` profile (once § 4 Step 3's configuration exists), or the project's chosen local build path if EAS isn't yet in use for this release.

## Step 8 — Publish release notes and close the loop

Store the filled `../templates/release-notes.md` output alongside other release history (there is no `CHANGELOG.md` in the repo yet — `../templates/release-notes.md`'s own Purpose section states this is "the starting convention for one"; consider whether this release is the moment to start accumulating one). Update `../knowledge/roadmap.md` if it tracks release milestones.

---

# 5. Worked Example: Cutting v1.1.0

Following `../templates/release-notes.md`'s own filled example directly, since it already documents a plausible, concrete v1.1.0 for this exact codebase.

**Step 1.** This release includes: the Products feature (per `building-a-feature.md`'s worked example), a `Button` `outline` variant (per `creating-a-component.md`'s worked example), and the auth-session-persistence fix (per `fixing-bugs.md`'s worked example) — each traced to an accepted plan, component addition, or bug report respectively.

**Step 2.** `app.json`'s `expo.version` bumped from `"1.0.0"` to `"1.1.0"`; `package.json`'s `version` bumped to match; `package.json`'s `name` corrected from `"myapp"` to `"sugar-admin"`, flagged explicitly in the release PR as a small, deliberate fix alongside the version bump.

**Step 3.** No `eas.json` existed before this release — one is created with a `production` profile as part of this release's PR, named explicitly as new infrastructure landing alongside the version bump, not silently assumed to already exist.

**Step 4.** Release notes filled per the template's own example:

```markdown
# Release Notes: v1.1.0

## Highlights
- Product catalog management is now available.
- The app now clearly tells you when you're offline instead of silently failing.
- Login sessions are more reliable across app restarts.

## New Features
### Products
- Browse, view detail, create/edit, and archive products.

## Improvements
- Shared Button component gained an outline variant.

## Bug Fixes
- Fixed: users were logged out on every app restart — the access token was
  never persisted to device storage (see fixing-bugs.md's worked example).

## Known Issues
- Products, like all features in this release, run entirely against a mock
  backend — no real server integration exists yet.
- The app's navigation library (React Navigation) differs from context.md's
  originally specified Expo Router — documented, unresolved, no user-facing
  impact.
- No automated test suite existed at the start of this release; the auth-fix
  work bootstrapped the first real test infrastructure (see writing-tests.md).

## Upgrade Notes
Existing installs will be logged out once, on first launch of v1.1.0, while
the new secure-storage session format takes effect.
```

**Step 5.** Cross-checked: Products traces to its feature plan, the auth fix traces to `../templates/bug-report.md`'s filled example, the Button variant traces to `../templates/review.md`'s filled example. Known Issues still accurately reflects the mock-only backend and navigation-library discrepancy at release time.

**Step 6.** Pre-release checklist run: all included changes have Approve verdicts; versions match across both files; `name` fields now match; the new `eas.json` production profile is in place; Known Issues is honest and non-empty; no secrets were introduced.

**Step 7.** `eas build --profile production` run.

**Step 8.** Release notes stored; this release is noted as the point a `CHANGELOG.md` convention could reasonably start, flagged for `chief-architect` to decide.

---

# 6. Checklist

- [ ] Every included change has an Approve verdict from `reviewing-code.md`.
- [ ] `app.json`'s `expo.version` and `package.json`'s `version` match, bumped per semver.
- [ ] `app.json`'s `expo.name`/`slug` and `package.json`'s `name` are consistent (fixing the current `"myapp"` vs. `"sugar-admin"` drift the first time this playbook is used).
- [ ] An `eas.json` build profile exists for this release's distribution path, or its absence is explicitly acknowledged in the release PR.
- [ ] Release notes are written using `../templates/release-notes.md`, every section filled, none skipped.
- [ ] Known Issues is honest and non-empty for a Foundation-phase release — no red-flag empty section.
- [ ] Every New Feature / Bug Fix bullet traces to a real plan or bug report.
- [ ] `.claude/handbook/deployment-preparation.md` was checked for existence and followed if present.

---

# 7. Common Mistakes

**Bumping `app.json`'s version but not `package.json`'s, or vice versa.** `../templates/release-notes.md`'s own Instructions call this out directly — they should always match.

**Writing an empty or thin Known Issues section.** For a Foundation-phase app, this is a red flag per the template's own guidance, not a sign of polish.

**Assuming `eas.json` already exists.** It does not, as of this writing — confirm or create it, don't assume.

**Listing a "New Feature" that hasn't actually gone through `reviewing-code.md`'s Approve verdict.** A release note is a claim about what shipped; it should never outrun what was actually reviewed and merged.

**Silently perpetuating the `package.json` name / `app.json` name mismatch.** Small, but a real and easily fixed inconsistency once noticed — fix it in the first release that touches version metadata, rather than carrying it forward indefinitely.

---

# 8. References

- `../constitution.md` — Documentation, Security Philosophy, Definition of Done
- `../context.md` — Current Development Phase, Technology Stack
- `app.json`, `package.json` — the two real files this playbook edits every release
- `../templates/release-notes.md` — the template and filled `v1.1.0` example this playbook is built directly from
- `../templates/bug-report.md`, `../templates/feature-proposal.md`, `../templates/adr.md` — sources for New Features / Bug Fixes / Known Issues entries
- `.claude/handbook/deployment-preparation.md` — referenced but not yet present in this repository as of this writing; check for it and follow it once it exists
- `./reviewing-code.md` — the gate every included change must have passed
- `./fixing-bugs.md` — source of this playbook's Bug Fixes worked example
- `../handbook/navigation.md` § 6, § 7 — source of two of this playbook's honest Known Issues entries
- `../agents/50-testing-engineer.md` § 9 — source of this playbook's test-coverage Known Issues entry
