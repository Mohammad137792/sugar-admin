---
id: handbook-deployment-preparation
title: Deployment Preparation Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Deployment Preparation Handbook

> Sugar Admin is a managed-workflow Expo app with no `ios/`/`android/` native project checked in — every release ships through EAS Build, and `app.json` is the single file that decides how.

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Current State: Nothing Has Ever Shipped
5. `app.json`, Reviewed Field by Field
6. Environment Configuration for a Release Build
7. EAS Build Considerations (Not Yet Configured)
8. Pre-Release Checklist, Worked Through
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

Sugar Admin has never been built for release. There is no `eas.json`, no EAS Build profile, and `app.json`'s `expo.version` (`1.0.0`) has never been bumped. This handbook exists so that when the first real release is prepared, the engineer doing it isn't reasoning from scratch about what "ready to ship" means for this specific app — it walks through `app.json` as it exists today, the environment-configuration risk that becomes sharper the moment a build actually ships to a device outside the dev loop, and a concrete pre-release checklist grounded in this codebase's real, documented gaps rather than a generic mobile-release checklist.

---

# 2. Scope

In scope: `app.json` review, environment configuration (`src/config/env.ts`) as it affects a shipped build specifically, EAS Build readiness, and the pre-release checklist.

Out of scope: the actual EAS Build/submit commands and CI wiring (belongs to a future `.claude/playbooks/publishing-a-release.md`, referenced but not yet written), release notes content (`.claude/templates/release-notes.md`), and general Expo conventions unrelated to shipping (`.claude/rules/expo.md`).

---

# 3. Principles

Grounded in:

- **Mobile First** (constitution.md) — "network interruptions, device performance, battery usage" are pre-implementation considerations; a release checklist is where these get a final, concrete check before they reach a real device.
- **Definition of Done** (constitution.md) — a feature is complete only when, among other things, "performance impact is acceptable" and "future backend integration is possible." A release is the point where "acceptable" and "possible" get verified against reality rather than assumed.
- **Security Philosophy** (constitution.md) — "never trust... mock validation"; a release build is the first point where the app might genuinely talk to something outside a developer's own machine, which is exactly where `.claude/rules/security.md` Rule 5's silent-fallback-URL risk stops being theoretical.
- **Technical Debt** (constitution.md) — debt must be documented with a reason, a follow-up plan, and understood impact. Release notes' Known Issues section (`.claude/templates/release-notes.md`) is where accumulated debt becomes visible to whoever consumes the release, not just to engineers reading `.claude/knowledge/current-limitations.md`.

---

# 4. The Current State: Nothing Has Ever Shipped

Stated plainly, because a release checklist written as if a release process already exists would mislead the first person who tries to follow it: `app.json`'s `expo.version` is `1.0.0`, unchanged since project creation. There is no `eas.json` in the repository. There is no `.env` file, no `.env.example`, and no CI configuration (no `.github/workflows/`, verified by directory listing) that would run a build. `package.json`'s `scripts` block has exactly four entries — `start`, `android`, `ios`, `web` — all `expo start` variants for local development, none of them a build or submit command.

This means every section below describes what to set up, not what to verify already works. Treat "pre-release checklist" in § 8 as the first checklist this app will ever actually run through, not a periodic re-check of an established process.

---

# 5. `app.json`, Reviewed Field by Field

The full, current file:

```json
{
  "expo": {
    "name": "sugar-admin",
    "slug": "sugar-admin",
    "version": "1.0.0",
    "newArchEnabled": false,
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "ios": { "supportsTablet": true },
    "android": {
      "adaptiveIcon": { "backgroundColor": "#E6F4FE", ... },
      "predictiveBackGestureEnabled": false
    },
    "web": { "favicon": "./assets/favicon.png" }
  }
}
```

Fields worth flagging before a first real release, each for a distinct reason:

- **`version: "1.0.0"`** — per `.claude/templates/release-notes.md`, this and `package.json`'s own `version` field (also `"1.0.0"` today, and confusingly, `package.json`'s `name` is `"myapp"`, not `"sugar-admin"` — a real, current inconsistency worth fixing before the first release, not after) must be bumped together and kept in sync. Nothing enforces this automatically today; it's a manual discipline until tooling exists.
- **`newArchEnabled: false`** — a deliberate, documented choice (`.claude/rules/expo.md` Rule 2, `.claude/rules/performance.md` Rule 8) with a direct consequence for release testing: Reanimated 4's performance characteristics are benchmarked primarily against the New Architecture, which this app has disabled. Any animation shipped in a release must be verified on-device, not assumed smooth from Reanimated's own documentation.
- **`userInterfaceStyle: "light"`** — this is a real, worth-double-checking mismatch against `design-system.md` § 8's "dark-mode-first" framing: `app.json` currently locks the *system chrome* (splash screen, status bar defaults before JS loads) to light, while the app's actual `ThemeContext` defaults to dark unless the system explicitly reports light. Confirm before release whether this is intentional (a deliberate choice about the pre-JS-load native splash experience) or an oversight that should become `"automatic"` to match the app's own dark-first identity — this is a `chief-architect`-level call per `.claude/rules/expo.md` Rule 2, not something to silently flip.
- **`ios.supportsTablet: true`** — no screen in `src/` has been verified against a tablet-sized viewport; this flag currently promises more than the app has been checked to deliver. Verify or explicitly scope tablet support before the first App Store submission, since Apple's review can reject inconsistent tablet behavior.
- **No `icon`/`android-icon-*` assets have been confirmed as final brand assets** — verify these are the actual shipped icon before a store submission, not a placeholder.
- **No `ios.bundleIdentifier` or `android.package` is set.** This is the single largest concrete gap: EAS Build (and any app store submission) requires both, and neither exists in `app.json` today. This must be decided and added — per `.claude/rules/expo.md` Rule 2, as a deliberate, reviewed config change — before any EAS Build can target a real store.

---

# 6. Environment Configuration for a Release Build

`src/config/env.ts`, in full:

```ts
const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.sugar-admin.com/v1",
  AI_API_URL:   process.env.EXPO_PUBLIC_AI_URL  ?? "https://ai.sugar-admin.com/v1",
  APP_NAME:     "Sugar Admin",
  APP_VERSION:  "1.0.0",
} as const;
```

This is the single most important file to check before any release build, for a reason `.claude/rules/security.md` Rule 5 and `.claude/rules/expo.md` Rule 5 both already name: both `API_BASE_URL` and `AI_API_URL` fall back to plausible-looking, unprovisioned domains if their `EXPO_PUBLIC_*` environment variables are unset at build time. A release build kicked off from a CI job or a local machine missing a `.env` file (there is no `.env.example` in the repo to catch this by omission — another concrete gap) will build and ship successfully, install correctly, and then silently point every request at a domain that resolves to nothing meaningful — with no build-time error, no crash, and no obvious symptom besides every network call failing once a user opens the app.

**The pre-release rule this implies, beyond what `.claude/rules/security.md`/`expo.md` already state as ongoing rules:** before triggering any release build, explicitly confirm `EXPO_PUBLIC_API_URL` (and `EXPO_PUBLIC_AI_URL`, once AI integration exists per `ai-integration.md`) is set in whatever EAS Build profile or CI environment is producing that specific build — do not rely on the fallback ever being correct by coincidence. `APP_VERSION: "1.0.0"` is also hardcoded in this file, independently of `app.json`'s `expo.version` — a third place version can drift; check all three (`app.json`, `package.json`, `env.ts`) together at release time until they're consolidated.

---

# 7. EAS Build Considerations (Not Yet Configured)

No `eas.json` exists. When it is created, these are the specific, current-codebase considerations that should shape it, not generic EAS defaults:

**Managed workflow, no custom native code.** Per `.claude/rules/expo.md` Rule 1, there is no `ios/`/`android/` directory and no native module requiring a custom dev client today — a standard EAS Build profile (not requiring `developmentClient: true` or a custom native config) is sufficient as of this writing. This changes the moment any native module outside the Expo-managed set is added — that's a `chief-architect`-level decision (`.claude/rules/expo.md` Rule 1) with direct EAS Build consequences, and the build profile must be revisited at that point, not assumed to still work.

**No secrets are currently defined anywhere to migrate into EAS Secrets** — per `.claude/rules/security.md` Rule 6, there is no `.env` file checked in and no hardcoded credential in `src/` today, which is correct. But once AI provider credentials exist (`ai-integration.md`, currently unbuilt), those belong in EAS Secrets or CI environment configuration exclusively, never in a file that could accidentally be committed — set this expectation before the first credential exists, not after.

**`newArchEnabled: false`** (§ 5) needs to be a deliberate EAS Build profile decision too, not just an `app.json` value — confirm the build profile doesn't silently override it.

**No test suite exists to gate a build** (`testing-strategy.md`) — until one does, an EAS Build profile cannot include an automated test-gate step; the pre-release checklist (§ 8) substitutes manual verification, explicitly, not silently.

---

# 8. Pre-Release Checklist, Worked Through

Rather than a generic list, each item below states *why* it matters for this specific codebase, so it can be followed correctly by someone who has never done a Sugar Admin release before:

1. **`app.json`'s `version`, `package.json`'s `version`, and `env.ts`'s `APP_VERSION` all match the release being cut.** (§ 5, § 6 — three places currently able to drift independently.)
2. **`ios.bundleIdentifier` and `android.package` are set and correct.** (§ 5 — currently absent entirely; required for any store-targeted build.)
3. **`EXPO_PUBLIC_API_URL` (and `EXPO_PUBLIC_AI_URL` if applicable) are confirmed set in the actual build environment**, not assumed. (§ 6 — the silent-fallback risk is real and specific to this codebase.)
4. **`userInterfaceStyle` is a deliberate choice, not an unreviewed leftover**, checked against `design-system.md`'s dark-mode-first stance. (§ 5.)
5. **Every screen reachable in the release is manually verified in both `fa`/RTL and `en`/LTR** — per `accessibility.md` § 8, this is the app's actual default experience, not an edge case to skip under release-day time pressure.
6. **`.claude/knowledge/current-limitations.md`'s open gaps are cross-checked against `.claude/templates/release-notes.md`'s Known Issues section** — an empty Known Issues section on a Foundation-phase release is a red flag per that template's own instructions, not a good sign. At minimum, the in-memory-only auth token (`security.md` § 3) and the absence of automated tests (`testing-strategy.md`) belong there if still true.
7. **No secret, API key, or credential is present in any committed file or `EXPO_PUBLIC_*` variable**, per `.claude/rules/security.md` Rule 6 — re-verify at release time even though this is an ongoing rule, because a release build is exactly the moment a forgotten debug credential becomes externally reachable.
8. **The build was tested on a real device for each target platform being released**, not only the simulator/emulator — particularly relevant given `.claude/rules/performance.md` Rule 5's flagged Android-specific `BlurView` cost risk in `GlassCard.tsx`.
9. **Release notes are drafted using `.claude/templates/release-notes.md`**, with Highlights written in user-facing language, not internal jargon.

---

# 9. Good Examples

**Good: an honest Known Issues section**, per `.claude/templates/release-notes.md`'s filled example — naming that the app runs entirely against a mock backend, that no automated test suite exists, and that navigation diverges from `context.md`'s original Expo Router mention, all stated plainly rather than omitted to make the release look more finished than it is.

---

# 10. Bad Examples

**Bad: shipping a build without confirming `EXPO_PUBLIC_API_URL`.**

A release built from a CI job or a laptop that happens to be missing a local `.env` file succeeds silently — `env.ts`'s fallback (§ 6) means the build compiles, installs, and runs, with every network call quietly targeting an unprovisioned placeholder domain. Nothing about the build process itself signals this happened; it only surfaces once a real user opens the app and every screen fails to load data.

**Bad: an empty or omitted Known Issues section.**

Per `.claude/templates/release-notes.md`'s own instruction: "An empty Known Issues section on a foundation-phase app... is a red flag, not a good sign." Omitting the in-memory-auth-token gap or the missing test suite from release notes doesn't make either gap less true — it just means whoever reads the release notes finds out the hard way.

---

# 11. Decision Trees

## Is this app.json change safe to include in a routine feature PR, or does it need separate release-prep review?

```
Does the change affect version, bundle identifier, package name, icon/
splash assets, or a platform capability flag (supportsTablet, orientation)?
  → Yes: this is a release-prep-level change — call it out explicitly in
    the PR per .claude/rules/expo.md Rule 2, do not bury it in an
    unrelated feature diff.
Does the change only affect a dev-loop concern (e.g. a debug-only flag)?
  → No such flag currently exists in app.json — treat any app.json edit
    as release-relevant until proven otherwise.
```

## Is the codebase actually ready for a first release?

```
Does every screen reachable in the release have Loading/Empty/Error/
Success states, per constitution.md's Error Philosophy?
  → No (true today for most current screens, per current-limitations.md):
    the release is a "Foundation phase preview," not a production
    release — say so explicitly in the release notes, don't imply
    otherwise.
Are ios.bundleIdentifier/android.package set?
  → No: cannot produce a store-targeted EAS Build yet; an internal/
    preview build is still possible once EAS Build itself is configured.
```

---

# 12. Real Project Examples

- **`app.json`** — reviewed field by field in § 5; missing `bundleIdentifier`/`package` is the single largest concrete release blocker today.
- **`src/config/env.ts`** — the silent-fallback risk, § 6.
- **`package.json`**'s `name: "myapp"` vs. `app.json`'s `name: "sugar-admin"` — a small, real, currently-uncorrected inconsistency worth fixing before the first release.
- **`.claude/templates/release-notes.md`** — the filled v1.1.0 example this handbook's § 8 Item 9 points to.
- **`.claude/knowledge/current-limitations.md`** — the source list for § 8 Item 6's Known Issues cross-check.

---

# 13. Common Mistakes

- Assuming `EXPO_PUBLIC_API_URL` is set in the build environment without explicitly verifying it for that specific build.
- Bumping `app.json`'s `version` without also bumping `package.json`'s and `env.ts`'s, leaving three inconsistent version strings in one release.
- Treating an empty Known Issues section as a sign of a clean release, rather than a sign the release notes are incomplete for a Foundation-phase app.
- Flipping `newArchEnabled` or `userInterfaceStyle` casually inside an unrelated PR instead of as an explicit, called-out `chief-architect`-reviewed config change.
- Skipping on-device verification for `GlassCard`/`BlurView`-heavy screens and relying on simulator/emulator performance alone.

---

# 14. Best Practices

- Treat any `app.json` diff as its own reviewable unit, called out explicitly in the PR description, per `.claude/rules/expo.md` Rule 2.
- Check all three version locations (`app.json`, `package.json`, `env.ts`) together at release time, not just one.
- Write release notes' Known Issues section from `.claude/knowledge/current-limitations.md`, not from memory — it's the maintained source of truth for what's actually still broken.
- Verify RTL, on-device performance, and the environment configuration explicitly as part of every release, not only for the first one.

---

# 15. Checklist

- [ ] `app.json`, `package.json`, and `env.ts` versions match and were bumped together.
- [ ] `ios.bundleIdentifier` / `android.package` are set (required before any store-targeted build).
- [ ] `EXPO_PUBLIC_API_URL` (and `EXPO_PUBLIC_AI_URL` if applicable) are confirmed set in the actual build environment, not assumed.
- [ ] `userInterfaceStyle` and `newArchEnabled` are deliberate, reviewed choices, not unreviewed leftovers.
- [ ] Every reachable screen is verified in both `fa`/RTL and `en`/LTR.
- [ ] Release notes' Known Issues section is drawn from `.claude/knowledge/current-limitations.md`, honestly, not omitted.
- [ ] No secret/credential exists in any committed file or `EXPO_PUBLIC_*` variable.
- [ ] The build was tested on a real device per target platform, not simulator/emulator only.

---

# 16. References

- [constitution.md](../constitution.md) — Mobile First, Definition of Done, Security Philosophy, Technical Debt.
- [context.md](../context.md) — Current Development Phase ("Foundation," "Early Development").
- [../../app.json](../../app.json) — reviewed in full in § 5.
- [../../src/config/env.ts](../../src/config/env.ts) — reviewed in full in § 6.
- [.claude/rules/expo.md](../rules/expo.md) — ongoing `app.json`/environment rules this handbook applies at release time specifically.
- [.claude/rules/security.md](../rules/security.md) — Rule 5's silent-fallback-URL risk, Rule 6's secret-handling rule.
- [.claude/templates/release-notes.md](../templates/release-notes.md) — release notes structure and filled example.
- `.claude/playbooks/publishing-a-release.md` — the step-by-step release playbook (not yet written; this handbook is the reasoning it will execute against).
- [testing-strategy.md](./testing-strategy.md) — why no automated test gate exists yet for a release build.
