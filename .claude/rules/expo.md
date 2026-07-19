---
id: rule-expo
title: Expo Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_screens
  - all_components
  - app_config
last_updated: 2026-07-18
---

# Expo Rules

> The frontend must never depend on a specific backend implementation. — `../constitution.md`, Backend Independence

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

Sugar Admin runs on Expo SDK 56 (`expo@56.0.11`) in the managed workflow. This file states why the managed workflow was chosen, what `app.json` currently configures, and the rules for using `expo-*` packages consistently.

---

# 2. Scope

Applies to `app.json`, any `expo-*` package usage, and any change that would require ejecting to bare workflow or adding native modules outside the Expo-managed set.

---

# 3. Rules

## Rule 1 — Expo managed workflow is the default; do not introduce native modules that require ejecting without `chief-architect` sign-off

`babel.config.js` uses `babel-preset-expo`; there is no `ios/` or `android/` native project directory checked into the repo — this is a pure managed-workflow app today.

**Why chosen:** per `../constitution.md`'s Mobile First and the constitution's emphasis on a small team building for years, not sprints — the managed workflow trades a small amount of native-module flexibility for a dramatically simpler build, update, and CI story (`expo start`, EAS Build, OTA updates via `expo-updates` if adopted later, no manual Xcode/Android Studio project maintenance). A native module requiring a custom dev client or bare workflow is a real architectural cost — evaluate it against that trade-off explicitly before adding it, per the Chief Architect's Architectural Decision Process (`../agents/00-chief-architect.md` § 8).

## Rule 2 — `app.json` changes are deliberate and reviewed as configuration, not as incidental diffs

Current `app.json` sets: `newArchEnabled: false`, `orientation: "portrait"`, `userInterfaceStyle: "light"`, `ios.supportsTablet: true`, `android.predictiveBackGestureEnabled: false`. Each of these is a real product/technical decision (see `react-native.md` Rules 8–9 for the consequences of `newArchEnabled` and `userInterfaceStyle`).

**Why:** `app.json` config changes often have effects that only surface in a native build (`expo prebuild` / EAS Build), not in the JS-only Metro dev loop. A silent, unreviewed change here (e.g. flipping `newArchEnabled` to `true` "to try it") can break the build for every other engineer without showing up in a normal code review of component diffs. Treat `app.json` changes as their own reviewable unit — call them out explicitly in the PR description.

## Rule 3 — `expo-*` packages are preferred over bare React Native equivalents when both exist

The project already chose `expo-blur`, `expo-linear-gradient`, and `expo-status-bar` over bare-RN or third-party equivalents (`react-native-linear-gradient`, a manual blur implementation).

**Why:** Expo-maintained packages are tested against the exact Expo SDK version in use, ship prebuilt config plugins, and avoid the native-linking issues bare RN third-party packages sometimes require manual `ios`/`android` project edits for — which the managed workflow (Rule 1) doesn't support without ejecting. When both an `expo-*` package and a bare-RN equivalent solve the same problem, default to the `expo-*` one unless there's a specific, documented reason not to (e.g. a feature only the bare package supports).

## Rule 4 — `expo-image` and `expo-notifications` are target dependencies, not installed; do not write code assuming they exist

Neither `expo-image` nor `expo-notifications` appears in `package.json`. Current image rendering uses bare React Native `Image` (implicitly, wherever it's used) or the icon assets referenced in `app.json`. There is no push-notification integration anywhere in `src/`.

**Why to flag rather than silently add:** `../context.md`'s Technology Stack lists both as the target stack. Adding either is a real dependency decision (native config plugin for `expo-notifications` in particular touches `app.json`, requires push credentials setup, and has platform-specific permission flows) — it goes through the same deliberate-config-change process as Rule 2, not an incidental `npm install` inside an unrelated feature PR. See `performance.md` for why `expo-image` specifically matters (caching, memory) once it is adopted.

## Rule 5 — Environment configuration goes through `src/config/env.ts` and `EXPO_PUBLIC_*` variables, never hardcoded per call site

```ts
// src/config/env.ts — existing pattern, follow it
const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.sugar-admin.com/v1",
  AI_API_URL:   process.env.EXPO_PUBLIC_AI_URL  ?? "https://ai.sugar-admin.com/v1",
} as const;
```

**Why:** Expo only exposes environment variables prefixed `EXPO_PUBLIC_` to client code by design (anything else is server/build-time only and would be `undefined` at runtime) — this is a platform constraint, not a project convention, and any new environment-dependent value must follow the `EXPO_PUBLIC_` prefix to actually work. Centralizing reads in `env.ts` means there is exactly one place to audit for "what environment configuration does this app depend on," rather than scattered `process.env.EXPO_PUBLIC_X` reads across feature files.

**Real risk in the current fallback values:** `ENV.API_BASE_URL` falls back to `"https://api.sugar-admin.com/v1"` — a real-looking but not-yet-provisioned domain — when `EXPO_PUBLIC_API_URL` is unset. If a production build ships without that environment variable correctly set, the app will silently point at a placeholder host instead of failing loudly. See `security.md` and `networking.md` for the rule this implies: a missing required environment variable should fail the build or fail loudly at startup, not fall back to a URL that looks legitimate.

## Rule 6 — `expo-status-bar` (or the `StatusBar` prop pattern already in `Screen.tsx`) is the only place status bar styling is set; it is not duplicated per screen

`src/components/ui/Screen.tsx` and `src/screens/HomeScreen.tsx` both independently set `<StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={bg} />`. Every screen that uses `Screen.tsx` gets this for free; a screen that bypasses `Screen.tsx` (as `HomeScreen.tsx` does — it renders its own root `View` instead of using the shared `Screen` component) has to duplicate the logic.

**Why:** duplicated status-bar logic means a future theme change (a new dark-mode color, a new status bar behavior) has to be updated in every screen that opted out of the shared wrapper. New screens use `Screen.tsx` rather than reimplementing its `StatusBar` handling — see `folders.md` Rule 4 for why `HomeScreen.tsx` bypassing shared components is itself flagged as legacy.

---

# 4. Good Examples

## Good: environment-driven configuration, centralized

```ts
// src/config/env.ts
const ENV = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_URL ?? (() => {
    throw new Error("EXPO_PUBLIC_API_URL is required and was not set.");
  })(),
} as const;
```

This is a stricter target version of the existing pattern — it fails loudly instead of silently defaulting to a placeholder-looking production URL. (Not yet implemented; flagged here as the direction, per Rule 5.)

---

# 5. Bad Examples

## Bad: adding a native module that requires ejecting, without flagging the trade-off

```json
// package.json — added silently in a feature PR
"react-native-some-native-only-sdk": "^2.0.0"
```

**Consequence:** if this package has no Expo config plugin, the app can no longer build via plain `expo start` / EAS Build managed workflow without a custom dev client or a full eject — a decision with build-pipeline-wide consequences buried inside what looked like a small feature change. This must go through `chief-architect` per Rule 1, called out explicitly in the PR, not slipped in as a transitive dependency of some other package.

## Bad: reading `process.env` directly in a feature file

```ts
// src/features/products/repository/restProductRepository.ts
const baseUrl = process.env.EXPO_PUBLIC_PRODUCTS_API_URL ?? "https://products.sugar-admin.com";
```

**Consequence:** a second, undocumented source of environment configuration outside `src/config/env.ts`. The next engineer auditing "what environment variables does this app need" has to grep the entire codebase instead of reading one file. Add the value to `ENV` in `src/config/env.ts` instead.

---

# 6. Checklist

- [ ] No native module was added that requires ejecting from the managed workflow without an explicit architectural decision.
- [ ] Any `app.json` change is called out explicitly in the PR description, not buried in an unrelated diff.
- [ ] New image/blur/gradient/status-bar needs use the existing `expo-*` packages already installed, or a documented reason is given for not doing so.
- [ ] No code assumes `expo-image` or `expo-notifications` exist; both are absent from `package.json` today.
- [ ] New environment-dependent values are added to `src/config/env.ts`, prefixed `EXPO_PUBLIC_` in `.env`, not read via `process.env` at the call site.
- [ ] New screens use the shared `Screen.tsx` wrapper for status bar handling rather than reimplementing it.

---

# 7. References

- `../constitution.md` — Backend Independence, Replaceability
- `../context.md` — Technology Stack
- `react-native.md` — `newArchEnabled`, `userInterfaceStyle`, and their interaction with Expo SDK 56
- `networking.md` — `EXPO_PUBLIC_API_URL` and the fallback-URL risk in full
- `security.md` — why a silently-defaulted API URL is a security-adjacent risk
- `performance.md` — `expo-image` as the target for image optimization
