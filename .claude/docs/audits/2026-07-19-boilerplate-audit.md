---
id: audit-2026-07-19-boilerplate
title: Boilerplate Architecture Audit — 2026-07-19
category: audit
status: complete
owner: Chief Architect
date: 2026-07-19
scope: full project (pre-Phase-1, no business features implemented yet)
---

# Sugar Admin — Boilerplate Architecture Audit

> Performed before any new feature implementation, per the Chief Architect's Architectural Decision Process (`../../agents/00-chief-architect.md` § 8): understand before building. This audit assumes nothing about the boilerplate's correctness — every claim below is grounded in a direct read of the file cited.

---

## Table of Contents

1. Project Overview
2. Existing Architecture
3. Folder Structure Review
4. Dependency Review
5. Boilerplate Strengths
6. Boilerplate Weaknesses
7. Files to Keep
8. Files to Move
9. Files to Rename
10. Files to Delete
11. Files to Rewrite
12. Missing Modules
13. Recommended Improvements
14. Architecture Score
15. Code Quality Score
16. Scalability Score
17. Maintainability Score
18. Performance Score
19. Security Score
20. Accessibility Score
21. Final Recommendations

---

# 1. Project Overview

Sugar Admin is a React Native (Expo SDK 56) mobile app, currently at the "foundation" stage per `context.md`. The repository contains **35 source files** under `src/`, **9 root config files**, and **6 asset files** — a genuinely small codebase. No backend exists; `context.md` and `constitution.md` mandate Feature-First architecture, Repository Pattern, Mock-First development, and Backend Independence as governing principles.

This audit's central finding: **the boilerplate establishes the right shape at the top level (feature folders, a theme system, a store, an API layer) but does not yet implement the substance the Constitution requires inside that shape.** Several pieces that look wired together are not actually connected at runtime — most importantly, the authentication flow.

---

# 2. Existing Architecture

**Provider stack** (`App.tsx`): `QueryClientProvider` → `ThemeProvider` → `LanguageProvider` → `NavigationContainer` → `AppNavigator`.

**Critical finding — authentication is not wired into the running app.** `App.tsx` imports and renders `AppNavigator` unconditionally. It never imports `AuthNavigator`, never reads `useAuthStore`, and never calls `useAuthStore.getState().hydrate()`. `src/navigation/types.ts` defines a `RootStackParamList` with `Auth` and `App` branches — the type suggests a root switch was *intended* — but no component implements that switch anywhere in the codebase. `AuthNavigator.tsx` and `LoginScreen.tsx` exist, compile, and are dead code from the running app's perspective: opening the app takes every user straight to `HomeScreen` → `Dashboard`/`Content`/`Reports`, with no login gate, regardless of `authStore.isAuthenticated`.

**Data flow today:** every feature screen (`content`, `dashboard`, `reports`, `ai-chat`) either renders static "Coming soon..." text or, in `DashboardScreen`'s case, a hardcoded `MOCK_STATS` array declared inline in the component file (`src/features/dashboard/screens/DashboardScreen.tsx:7-12`). No screen calls `src/api/endpoints/*`, no screen uses `@tanstack/react-query`'s `useQuery`, and no screen reads from a repository (none exists). `TanStack Query` is wired at the provider level (`App.tsx`) but is not consumed by a single call site in the app — confirmed via search, zero `useQuery`/`useMutation` occurrences in `src/`.

**Networking:** `src/api/client.ts` is a single axios instance with a request interceptor that reads `(globalThis as any).__authToken` and a response interceptor that calls `(globalThis as any).__onUnauthorized?.()` on a 401. `__onUnauthorized` is never assigned anywhere in the codebase — a real 401 today would silently no-op instead of logging the user out. `src/api/endpoints/{auth,content,reports}.ts` are thin, direct axios wrappers with no repository interface in front of them, contradicting `constitution.md`'s Mock-First Development mandate (already tracked in `../../knowledge/architecture-decisions.md` § 6a and `adr-0002-mock-first-development.md`).

**State:** two Zustand stores (`authStore`, `uiStore`) — small, matches the Constitution's "state is expensive" philosophy. `authStore` is well-formed except for the `globalThis` bridging pattern (already documented) and the fact that nothing in the app tree ever calls it.

**Styling — the most significant *new* finding of this audit:** the project has NativeWind fully configured (`babel.config.js`'s `nativewind/babel` preset, `metro.config.js`'s `withNativeWind`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts` all present and correctly wired) — but **zero files anywhere in `src/` or `App.tsx` use the `className` prop.** Every single component (`Button`, `Card`, `Input`, `GlassCard`, `GlassPill`, all of `ui/*`, `HomeScreen`, all five feature screens) uses `StyleSheet.create` exclusively. This means the previously-filed `docs/decisions/adr-0004-hybrid-styling-nativewind-and-stylesheet.md` overstates the current reality — there is no actual hybrid usage in the codebase today; NativeWind is installed, fully configured, and **entirely inert**. See § 9 for the correction this requires.

**Design tokens — a second, related finding:** there are **two parallel, inconsistent color systems**:
- `src/constants/theme.ts` — a proper `ThemeColors` interface with `dark`/`light` variants, consumed via `useTheme()`. Used by `HomeScreen`, `Button`, and every component in `src/components/ui/*`.
- `src/constants/colors.ts` — a flat, static, non-theme-reactive `colors` object (dark values only). Used by **all five feature screens** (`LoginScreen`, `AIChatScreen`, `ContentScreen`, `DashboardScreen`, `ReportsScreen`) and by `AuthNavigator.tsx`.

The two files define overlapping but not identical values (e.g. `textFaint` is `rgba(255,255,255,0.2)` in `colors.ts` vs `rgba(255,255,255,0.15)` in `theme.ts`'s `dark`). Practical consequence: toggling light/dark mode from `HomeScreen` visibly re-themes `HomeScreen` and shared `ui/` components, but every feature screen stays hard-locked to dark colors regardless of the toggle. This is a real, user-visible bug waiting to happen the moment a feature screen ships real content.

**Navigation:** React Navigation (`@react-navigation/native` + `native-stack`), not Expo Router — already tracked as `adr-0005-react-navigation-over-expo-router.md`, `Needs Reconciliation`. New finding: `AppNavigator.tsx` hardcodes Persian-only screen titles (`"داشبورد"`, `"مدیریت محتوا"`, `"گزارش‌ها"`, `"دستیار هوشمند"`) directly in `screenOptions`/`options`, bypassing the `useLanguage()`/`t()` i18n system entirely. The app has real, working bilingual infrastructure (`LanguageContext`, `translations.ts`, RTL-aware text alignment throughout `HomeScreen`) — but native navigation chrome ignores it completely, so an English-mode user still sees a Persian header bar after leaving `HomeScreen`.

---

# 3. Folder Structure Review

```
src/
  api/            endpoints/ (auth, content, reports) + client.ts — flat, no repository layer
  components/     GlassCard, GlassPill, Logo (shared, non-ui) + ui/ (11 primitives)
  config/         env.ts — single file, fine
  constants/      colors.ts, theme.ts, typography.ts — colors.ts and theme.ts overlap (see § 2)
  context/        ThemeContext, LanguageContext — good, single responsibility each
  features/       ai-chat/, auth/, content/, dashboard/, reports/ — each only has screens/, not
                  the components/hooks/repository/state/types/constants/tests split the
                  Constitution's Feature Ownership section requires
  i18n/           translations.ts — fine for two languages, will need restructuring past ~3
  navigation/     AppNavigator, AuthNavigator (unused — see § 2), types.ts
  screens/        HomeScreen.tsx — a single top-level screen living outside src/features/,
                  inconsistent with Feature-First; it is also the app's actual landing screen
                  and its most fully-built one, so it is not obviously disposable
  store/          authStore.ts, uiStore.ts, index.ts — correctly minimal
  types/          index.ts — a single flat file; fine at this size, will need splitting per
                  domain once Products/Publishing/Customers land (per `future-modules.md`)
```

**Assessment against Feature-First Architecture** (`../../rules/architecture.md`, `../../rules/folders.md`): the top-level shape is right — `src/features/<name>/` exists and is where new feature work should go. But every existing feature folder is a single `screens/` directory holding one file; there is no feature-owned repository, hook, or local state anywhere yet. This matches what `../../agents/40-refactor-engineer.md` already flags as Migration Target B, so no new finding is needed there — this audit simply confirms it against the real filesystem.

**`src/screens/HomeScreen.tsx` is the one structural outlier that needs an explicit decision** (see § 8): it is not a "feature" in the product sense (Auth, Dashboard, Content, etc.) — it is the landing/marketing screen for the app shell itself. Feature-First folder rules don't cleanly say where an app-shell screen belongs. Recommendation in § 13.

---

# 4. Dependency Review

| Package | Declared | Actually Used? | Finding |
|---|---|---|---|
| `@react-navigation/native`, `@react-navigation/native-stack` | ✓ | ✓ | Core, correctly used. |
| `@tanstack/react-query` | ✓ | Provider only — **zero `useQuery`/`useMutation` call sites** | Installed and wired but not yet exercised. Not a defect (greenfield), but worth tracking so it isn't forgotten once repositories exist. |
| `axios` | ✓ | ✓ (`src/api/client.ts`) | Used, but only as a direct call layer, not behind a repository — see § 2. |
| `babel-preset-expo`, `expo`, `expo-blur`, `expo-linear-gradient` | ✓ | ✓ | Used (`GlassCard`, `GlassPill`, `Button`, `Avatar`, `HomeScreen`). |
| `expo-status-bar` | ✓ | **Not used anywhere.** Every screen imports `StatusBar` from `react-native` directly instead. | Genuinely unused dependency — either adopt it project-wide (it offers auto light/dark status bar without manual `barStyle` plumbing) or remove it. |
| `nativewind`, `tailwindcss` | ✓ | **Fully configured, zero runtime usage** (§ 2) | Highest-priority open question in this audit — see § 13. |
| `react`, `react-native` | ✓ | ✓ | Core. |
| `react-native-reanimated` (4.3.1), `react-native-worklets` (0.8.3) | ✓ | **Not imported anywhere in `src/` or `App.tsx`.** | Unused today, but see the `app.json` conflict below — this is more than a "remove if unused" case. |
| `react-native-safe-area-context` | ✓ | **No `SafeAreaProvider`, `SafeAreaView`, or `useSafeAreaInsets` anywhere.** | Present only because it's a peer dependency of React Navigation. Screens instead hardcode `paddingTop: 56`, `paddingTop: 40`, etc. (`HomeScreen.tsx`) — these values were tuned for one device class and will misalign on devices with different notch/status-bar heights. |
| `react-native-screens` | ✓ | ✓ (implicit, required by native-stack) | Fine. |
| `react-native-svg` | ✓ | ✓ (`Logo.tsx`) | Fine. |
| `react-dom`, `react-native-web` | ✓ | No web-specific code (no `Platform.OS` branches, no `.web.tsx` files) anywhere, but `package.json` does have a `"web"` script (`expo start --web`) | Consistent with supporting the web script; not a defect, just unexercised. |
| `zustand` | ✓ | ✓ | Correctly minimal usage. |
| **Dev:** `@types/react`, `typescript` | ✓ | ✓ | No `eslint`, `prettier`, or any test runner (`jest`, `@testing-library/react-native`) present at all. |

**Critical dependency-level conflict:** `app.json` sets `"newArchEnabled": false`. `react-native-reanimated@4.x` **requires** React Native's New Architecture (Fabric) — this is a hard requirement of Reanimated 4, not an optional optimization. Today this is *latent* (Reanimated is never imported, so the conflict never triggers), but the moment any animation work begins using Reanimated as installed, the app will very likely fail to build or crash at runtime. This needs a decision now, before any animation-heavy feature (per `context.md`'s AI Content/Publishing features, which likely want motion) is planned. See § 13.

**No lint/format tooling exists.** A search for `.eslintrc*` / `.prettierrc*` at the project root found nothing (the only matches were inside `node_modules` of third-party packages, which is expected noise, not project configuration). `../../rules/` and `../../rules/git.md` assume a review process that a linter would normally enforce mechanically; today all of that enforcement is manual/AI-review-only.

---

# 5. Boilerplate Strengths

1. **`tsconfig.json` has `"strict": true`** and extends `expo/tsconfig.base` — a real commitment to type safety from the start, not bolted on later.
2. **The theme system (`theme.ts` + `ThemeContext`) is well-designed** where it's actually used — a typed `ThemeColors` interface, light/dark variants, sensible defaults, correctly consumed via a single `useTheme()` hook across `HomeScreen` and all of `src/components/ui/*`.
3. **RTL/i18n infrastructure is real and functional**, not a stub — `LanguageContext` correctly derives `isRTL` from the active language, and `HomeScreen` conditionally applies `textAlign` throughout based on it. This is more thoroughly built than most boilerplates bother with.
4. **The `ui/` component library is consistent and reasonably complete** for its current scope (`Button`, `Card`, `Input`, `Avatar`, `Badge`, `Divider`, `IconButton`, `Row`, `Screen`, `Spacer`, Typography primitives) — each has a small, focused prop surface and a single clear responsibility, and the barrel export (`ui/index.ts`) is accurate and up to date.
5. **`authStore.ts`'s shape (loading/error/action separation) is sound** and matches the state-shape conventions the workspace's rules/handbook now document — the only real issues are the `globalThis` bridge and the fact that it's never invoked (§ 2), not its internal design.
6. **The "sugar" visual identity (violet→pink gradient, glass-morphism, dark-first) is distinctive and consistently applied** everywhere it *is* used — `GlassCard`, `GlassPill`, `Button`'s primary variant, and `Logo` all reinforce the same aesthetic language.
7. **Small surface area.** 35 source files is genuinely easy to fully audit and fully understand in one pass — this is a real asset for a "fix the foundation before scaling" pass; the cost of getting it right now is low.

---

# 6. Boilerplate Weaknesses

Ranked by severity:

1. **Authentication is not wired into the app at all** (§ 2). This is the most severe finding — it's not a missing feature, it's a built feature that silently doesn't run.
2. **Two incompatible design-token systems**, with all current feature screens on the non-theme-reactive one (§ 2).
3. **NativeWind is fully configured but entirely unused** — either dead weight to remove or an unrealized decision to act on (§ 2, § 4).
4. **`react-native-reanimated@4` + `newArchEnabled: false` is a latent, unresolved build/runtime conflict** (§ 4).
5. **No repository/mock layer** — already tracked project-wide, reconfirmed here at the file level: `src/api/endpoints/*.ts` are the only data-access code that exists, and they call axios directly.
6. **Zero test infrastructure and zero lint/format tooling** — nothing mechanically enforces any of the 19 rule files this workspace now defines.
7. **Navigation titles bypass the i18n system** (§ 2) — a concrete, user-visible bilingual-support bug once any non-Persian-default user reaches a feature screen.
8. **Hardcoded layout offsets instead of safe-area insets** (§ 4) — will misrender on device classes the original author didn't test on.
9. **`LoginScreen`'s submit button is a literal no-op** (`onPress={() => {}}`, `src/features/auth/screens/LoginScreen.tsx:19`) — combined with finding 1, the login screen is fully decorative today.
10. **`package.json`'s `"name": "myapp"` vs. `app.json`'s `"name": "sugar-admin"`** — cosmetic today, a real risk at EAS Build / app-store submission time.
11. **`splash-icon.png` exists in `assets/` but is referenced by no configuration** (`app.json` has no `"splash"` key and no `expo-splash-screen` plugin) — either an incomplete splash-screen setup or an orphaned asset.
12. **`app.json`'s `"userInterfaceStyle": "light"`** locks native-level appearance to light, in tension with the app's dark-first default theme (`ThemeContext` defaults to `"dark"` unless the system reports `"light"`) — a plausible source of a flash-of-wrong-chrome on launch.

---

# 7. Files to Keep

Everything in `src/components/ui/*`, `src/components/{GlassCard,GlassPill,Logo}.tsx`, `src/context/*`, `src/constants/theme.ts`, `src/constants/typography.ts`, `src/store/*`, `src/api/client.ts`, `src/navigation/types.ts`, `src/i18n/translations.ts`, `src/config/env.ts`, `src/types/index.ts`, all root config files (`tsconfig.json`, `babel.config.js`, `metro.config.js`, `nativewind-env.d.ts`, `global.css`). These are sound as written; several need the targeted changes below, but none are structurally wrong enough to warrant replacement.

---

# 8. Files to Move

- **`src/screens/HomeScreen.tsx`** — recommend relocating to `src/features/home/screens/HomeScreen.tsx` (or `src/features/shell/` if "Home" is reserved for a future authenticated dashboard-home) so no screen lives outside `src/features/`, per Feature-First folder rules. This is a judgment call for `chief-architect` to confirm, not a unilateral rename — `HomeScreen` is presently unauthenticated marketing/landing content, which is a different concern than the authenticated `Dashboard` it links to.
- **`src/features/auth/screens/LoginScreen.tsx`** stays put, but once `AuthNavigator` is actually wired in (§ 13), consider whether `AuthNavigator.tsx` should move from `src/navigation/` into `src/features/auth/` — it is entirely auth-specific and currently the only feature-specific navigator living in the shared `navigation/` folder.

---

# 9. Files to Rename

- No source files need renaming for clarity — naming is consistent (`PascalCase` components, `camelCase` hooks/stores) throughout.
- **`docs/decisions/adr-0004-hybrid-styling-nativewind-and-stylesheet.md`** needs a content correction, not a rename: its premise ("the codebase mixes NativeWind classNames with StyleSheet") is not what this audit found — NativeWind usage is zero, not hybrid. Recommend `60-documentation-engineer` revise this ADR's Context/Decision sections to state the accurate current reality (StyleSheet-only in practice, NativeWind configured but dormant) once this audit is acknowledged, rather than silently leaving a documented decision that doesn't match the code.

---

# 10. Files to Delete

**None, currently.** Nothing in the boilerplate is dead code in the sense of "unreachable and safe to delete outright" — `AuthNavigator.tsx` and `LoginScreen.tsx` look dead from `App.tsx`'s perspective, but the correct fix is to *wire them in* (they represent real, needed intent), not delete them. Recommend against deletion; recommend the connection fix in § 13 instead.

**Dependency-level candidates for removal** (not files, but worth listing here since the instruction set treats them together): `expo-status-bar` (§ 4) should either be adopted or removed — a decision, not an automatic deletion.

---

# 11. Files to Rewrite

1. **`src/features/{content,dashboard,reports,ai-chat}/screens/*.tsx`** — not because they're wrong, but because they currently import `colors` from the static `constants/colors.ts` instead of `useTheme()` from `ThemeContext`. This is a small, mechanical rewrite (swap the import and the color-access pattern) but it must happen before any of these screens ship real content, or the light/dark toggle will visibly break on every screen except `Home`.
2. **`App.tsx`** — needs the root Auth/App switch implemented (read `authStore.isAuthenticated`, call `hydrate()` on mount, render `AuthNavigator` vs `AppNavigator` accordingly) per the `RootStackParamList` shape that already exists in `src/navigation/types.ts` but is unused.
3. **`src/navigation/AppNavigator.tsx`** — replace the hardcoded Persian `options.title` strings with `t("...")` calls from `useLanguage()`, adding the missing translation keys to `src/i18n/translations.ts`.
4. **`src/features/auth/screens/LoginScreen.tsx`** — wire the `Button`'s `onPress` to `useAuthStore().login(...)` with the two `Input` values as local component state, instead of the current no-op.
5. **`src/constants/colors.ts`** — either delete it in favor of `theme.ts` everywhere (requires rewriting the 5 feature screens per item 1, which must happen anyway) or formally document why two systems exist. Given the theme-reactive system is strictly more capable, deletion-after-migration is the recommended path, not preservation of both.

---

# 12. Missing Modules

Per `context.md`'s Primary Features and `../../knowledge/roadmap.md`'s phasing, the following have **no code at all today**: Products, AI Content (generation), AI Images, Publishing, Customer Management, full Chat Center (only a placeholder `AIChatScreen` exists), full Analytics (only placeholder `ReportsScreen` and a hardcoded `DashboardScreen` exist). This is expected at the "foundation" phase and is not itself a defect — it is listed here only so this audit's scope (existing code) is not mistaken for a statement that these features are missing *by accident*.

Structurally missing regardless of which feature comes first: any repository interface, any mock repository implementation, any test infrastructure, any lint/format configuration, and a `SafeAreaProvider` at the app root.

---

# 13. Recommended Improvements

In priority order — each is scoped to be independently approvable; none should be batched into an uncontrolled rewrite per the Constitution's "preserve working behavior, improve architecture" instruction.

1. **Wire authentication into `App.tsx`.** Implement the `RootStackParamList`'s `Auth`/`App` switch, call `hydrate()` on mount, gate on `isAuthenticated`. Highest priority — everything else about the auth feature is already built and just needs connecting.
2. **Resolve the design-token duplication.** Migrate all five feature screens from `constants/colors.ts` to `useTheme()`, then delete `colors.ts`. Do this before any feature screen gets real content, since every line of new UI written against the wrong system multiplies this migration's cost later.
3. **Resolve the `newArchEnabled` / Reanimated 4 conflict explicitly**, one way or the other: either set `"newArchEnabled": true` in `app.json` (the architecturally-forward choice, matching what Reanimated 4 already expects) or downgrade to a Reanimated 3.x line compatible with the old architecture. This should be a recorded decision (ADR), not a silent default, since it affects every future animation-touching feature.
4. **Decide NativeWind's fate.** Either start using `className` going forward (and stop writing new `StyleSheet.create` blocks) or remove the NativeWind/Tailwind dependencies and config files entirely. Half-configured-and-unused is the one state that should not persist — it costs onboarding time (a new engineer will reasonably assume it's in use) for zero benefit today.
5. **Fix navigation title i18n** (`AppNavigator.tsx` → `t()` calls) and **wire the `LoginScreen` submit button** — both are small, mechanical, and directly visible to any human tester.
6. **Add `SafeAreaProvider` at the app root** and migrate `HomeScreen`'s hardcoded `paddingTop` values to `useSafeAreaInsets()`.
7. **Fix the `package.json`/`app.json` name mismatch** and either wire up `splash-icon.png` via a proper Expo splash config or remove it.
8. **Bootstrap lint/format tooling** (ESLint + Prettier, per `../../agents/50-testing-engineer.md`'s sibling concern for test tooling) before the codebase grows past its current, easily-hand-reviewed size.
9. Everything already tracked in `../../knowledge/roadmap.md` Phase 0 (Repository Pattern adoption, feature-folder restructuring) remains valid and unchanged by this audit — this audit adds to that list, it does not replace it.

None of the above should begin until this report is reviewed and approved, per this task's explicit instruction.

---

# 14. Architecture Score

**38 / 100**

The top-level shape (Feature-First folders, a theme system, a minimal store, an API layer) is correctly chosen. The score is low because the load-bearing pattern the Constitution requires most — Repository Pattern — is entirely absent, and because the one cross-cutting flow that ties the architecture together (authentication) is disconnected at the root. A boilerplate that looked architected but wasn't wired would score lower; this one is closer to "architected but only half-wired."

---

# 15. Code Quality Score

**56 / 100**

Naming is consistent, TypeScript is strict and mostly well-typed (the `globalThis as any` bridge in `authStore.ts`/`client.ts` is the only real `any` usage found), and component decomposition is clean at the size that exists. The score is held down by the absence of any mechanical quality gate (no lint, no format, no tests) and by concrete, findable defects (no-op button, dead navigator, duplicated color values) that a linter or a single smoke test would have caught immediately.

---

# 16. Scalability Score

**33 / 100**

At 35 files, nothing is unscalable *yet* — but every structural gap found here (no repository seam, flat feature folders, two token systems, untyped `globalThis` bridging) is exactly the kind of thing that gets exponentially more expensive to fix the more feature screens are built on top of it. The score reflects trajectory, not current pain.

---

# 17. Maintainability Score

**45 / 100**

Small and currently readable in full by one person in under an hour — a real asset. But maintainability also means "safe to change," and today there is no test suite to catch a regression, no lint to catch a style drift, and at least one already-observed instance of documentation drifting from code (the Expo Router claim in `context.md`). The size that makes this codebase maintainable today will not last without the tooling in § 13.8.

---

# 18. Performance Score

**58 / 100**

No performance problems were observed — the app is too small and too static (mostly "Coming soon" screens and one hardcoded stat grid) to have generated any yet. The score is a "not yet tested" score, not a "well optimized" score: no list is virtualized because no list has real data yet, no image is optimized because no dynamic image exists yet, and TanStack Query's cache tuning in `App.tsx` (`staleTime: 5 * 60_000, retry: 2`) is reasonable but has nothing to actually cache today.

---

# 19. Security Score

**48 / 100**

Positives: the auth token is never persisted to disk (in-memory only), which is safer than an unencrypted `AsyncStorage` write would have been, and `client.ts` correctly centralizes the Authorization header injection point. Negatives: the 401 → logout wiring is dead code (`__onUnauthorized` unassigned), `ENV.API_BASE_URL` silently falls back to a plausible-looking production URL if `EXPO_PUBLIC_API_URL` is unset (a misconfigured build would fail silently rather than loudly), and — most importantly — the login gate itself does not run, so "security" in the sense of "unauthenticated users can't reach authenticated screens" does not currently hold at all, independent of backend concerns.

---

# 20. Accessibility Score

**32 / 100**

RTL support is a genuine, working strength (§ 5) and deserves credit most boilerplates don't earn. Everything else is largely absent: no `accessibilityLabel`/`accessibilityRole` found on any icon-only control (the theme/language toggle pills in `HomeScreen`, `IconButton`, the password-visibility toggle in `Input`), `IconButton`'s default `size={40}` is under Android's 48dp minimum touch-target guidance, no dynamic-type/font-scaling consideration found anywhere, and no reduced-motion handling exists (though this is currently low-stakes since Reanimated is unused — § 4).

---

# 21. Final Recommendations

1. **Do not begin Phase 1 feature work until items 1–5 in § 13 are resolved.** They are small individually, but every new feature screen built before they're fixed inherits the same theme-system split and the same disconnected-auth problem, multiplying the eventual cleanup cost.
2. **Treat the `newArchEnabled`/Reanimated conflict as a blocking decision, not a backlog item** — it is currently invisible only because nothing exercises Reanimated yet, and the first feature that adds real motion (a very plausible early ask, given the "sugar" glass/gradient aesthetic) will hit it immediately.
3. **File the two follow-up documentation corrections this audit surfaced**: `adr-0004-hybrid-styling-nativewind-and-stylesheet.md` needs its premise corrected (§ 9), and this audit's findings should be folded into `../../knowledge/current-limitations.md` and `../../knowledge/roadmap.md` Phase 0 so they aren't only recorded here.
4. **This audit found no reason to distrust the overall direction** — Feature-First, Repository Pattern (once implemented), Mock-First, and the theme/i18n foundations are all sound choices, correctly reflected in the `.claude` workspace. The gap throughout this report is between *decided* and *wired*, not between *right* and *wrong*.
5. Awaiting approval before any of § 13's changes are implemented, per this task's instruction.

---

## References

- `../../constitution.md`, `../../context.md` — governing standards this audit checked against
- `../../knowledge/current-limitations.md`, `../../knowledge/architecture-decisions.md` — prior, complementary findings this audit extends
- `../../agents/00-chief-architect.md` § 8 — the Architectural Decision Process this audit's structure follows
- `../decisions/adr-0002-mock-first-development.md`, `../decisions/adr-0004-hybrid-styling-nativewind-and-stylesheet.md`, `../decisions/adr-0005-react-navigation-over-expo-router.md` — ADRs this audit's findings directly bear on
