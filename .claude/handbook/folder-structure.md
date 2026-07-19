---
id: handbook-folder-structure
title: Folder Structure Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Folder Structure Handbook

> "Folders communicate architecture. If a folder structure is confusing, redesign it." — 00-chief-architect.md § 3

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Whole-Repo Layout
5. What Belongs Where
6. The Shared vs. Feature-Owned Boundary
7. The HomeScreen Exception
8. Good Examples
9. Bad Examples
10. Decision Trees
11. Real Project Examples
12. Common Mistakes
13. Best Practices
14. Checklist
15. FAQ
16. References

---

# 1. Purpose

This handbook documents the actual top-level structure of `src/` in this repository, folder by folder, and the rule for deciding whether new code goes into a shared top-level folder or into a feature.

Where `feature-structure.md` zooms into one `src/features/<name>/` folder, this handbook is the whole-repo map surrounding it.

---

# 2. Scope

In scope: every top-level folder under `src/`, its responsibility, and the boundary between "shared, app-wide" code and "feature-owned" code.

Out of scope: the internal shape of a feature module (`feature-structure.md`), navigation-specific file organization (`navigation.md`), and the repository pattern's internal files (`repository-pattern.md`).

---

# 3. Principles

Grounded in:

- **Predictability** (constitution.md) — folder organization should never surprise contributors; naming should be consistent; architecture should remain stable.
- **Small Units** (constitution.md) — prefer many focused modules over one large module.
- **Folder Philosophy** (context.md) — the project uses Feature First organization; shared code exists only when it is genuinely reusable.
- **Naming Philosophy** (context.md) — names should communicate intent; avoid generic names such as `utils`, `helpers`, `manager`.

---

# 4. The Whole-Repo Layout

This is the real, current `src/` tree:

```
src/
  api/
    client.ts               # shared axios instance
    index.ts                 # barrel export of all endpoint modules + client
    endpoints/
      auth.ts
      content.ts
      reports.ts
  components/
    GlassCard.tsx             # glass-morphism card (BlurView + gradient sheen)
    GlassPill.tsx              # glass-morphism pill button/label
    Logo.tsx                    # SVG hexagon "S" mark
    ui/
      Avatar.tsx
      Badge.tsx
      Button.tsx
      Card.tsx
      Divider.tsx
      IconButton.tsx
      Input.tsx
      Row.tsx
      Screen.tsx
      Spacer.tsx
      Typography.tsx
      index.ts                 # public barrel — the design system's front door
  config/
    env.ts                      # API_BASE_URL, AI_API_URL, app name/version
  constants/
    colors.ts                    # raw sugar palette (dark-only values)
    theme.ts                      # ThemeColors interface + dark/light theme objects
    typography.ts                  # font sizes, weights, line heights, letter spacing
  context/
    LanguageContext.tsx             # fa/en + RTL
    ThemeContext.tsx                 # dark/light
  features/
    ai-chat/screens/AIChatScreen.tsx
    auth/screens/LoginScreen.tsx
    content/screens/ContentScreen.tsx
    dashboard/screens/DashboardScreen.tsx
    reports/screens/ReportsScreen.tsx
  i18n/
    translations.ts                  # fa/en dictionaries
  navigation/
    AppNavigator.tsx
    AuthNavigator.tsx
    types.ts                          # AuthStackParamList, AppStackParamList, RootStackParamList
  screens/
    HomeScreen.tsx                     # legacy — see § 7
  store/
    authStore.ts
    index.ts
    uiStore.ts
  types/
    index.ts                            # all shared TypeScript types
```

Plus, at the repo root: `App.tsx` (composition root), `tailwind.config.js` (NativeWind sugar palette), `package.json`.

---

# 5. What Belongs Where

**`src/api/`** — the shared HTTP client and, currently, all endpoint definitions. Target state: this folder shrinks to just `client.ts` as endpoint logic migrates into per-feature `repository/` folders (see `repository-pattern.md`). It should never grow new feature-specific endpoint files once a feature has its own repository.

**`src/components/`** — components with zero feature-specific domain knowledge, usable by any feature. `GlassCard.tsx`, `GlassPill.tsx`, `Logo.tsx` sit at this top level (not under `ui/`) because they are visual-identity primitives rather than form/data-display primitives — a defensible but informal distinction worth being consistent about. `ui/` is the more disciplined design-system layer with a barrel file; see `design-system.md`.

**`src/config/`** — environment-driven configuration, currently just `env.ts`. This is where a future `USE_MOCK_API` flag (referenced in `repository-pattern.md` § 4) belongs.

**`src/constants/`** — static, non-environment-driven values: the color palette, theme objects, typography scale. Notice `colors.ts` and `theme.ts` currently overlap (both define violet/pink/bg/surface hex values) — see `design-system.md` § 4 for why both exist and the duplication risk.

**`src/context/`** — React Context providers that are genuinely app-wide and rarely change value shape: theme, language. Do not add a new top-level Context here for a feature-specific concern — that belongs in `state/` inside the feature (see `feature-structure.md` § 4).

**`src/features/`** — the Feature-First home for all screen-owning code. See `feature-structure.md` for the internal shape.

**`src/i18n/`** — currently one file, `translations.ts`, holding both `fa` and `en` dictionaries for the whole app. Flagged in `architecture.md` § 14.6 as not scaling past the current 16 keys; future growth should move per-feature translation content closer to its feature.

**`src/navigation/`** — all React Navigation configuration: navigators and the param-list types. See `navigation.md`.

**`src/screens/`** — should be empty in the target architecture. Contains exactly one file today, `HomeScreen.tsx`, which predates Feature-First. See § 7.

**`src/store/`** — global Zustand stores only: `authStore.ts`, `uiStore.ts`, and the barrel `index.ts`. Per constitution's State Philosophy, a third file here should be rare and deliberate, not a default landing spot for any new state.

**`src/types/`** — TypeScript types shared across more than one feature (`User`, `ApiResponse<T>`, `PaginatedResponse<T>`, `Stat`, `ChatMessage`, `Toast`). Feature-specific types belong inside that feature's `types/` folder instead (see `feature-structure.md`).

---

# 6. The Shared vs. Feature-Owned Boundary

The rule, stated once and applied consistently: **code is shared only when it has no feature-specific domain knowledge, and is either already used by two or more features, or is a foundational primitive every feature is guaranteed to need (theming, navigation types, the HTTP client).**

Concretely:

- `src/components/ui/Button.tsx` is shared — it has no idea what "login" or "publish" means, it just renders a gradient or bordered touchable.
- A future `src/features/content/components/ContentStatusBadge.tsx` is feature-owned — it wraps the shared `Badge` but encodes content-specific status→color logic.
- `src/constants/colors.ts` is shared — every feature needs the palette.
- A future `src/features/products/constants/categoryLabels.ts` is feature-owned — no other feature cares about product category labels.

When in doubt, default to feature-owned. Promotion to a shared top-level folder happens after a second real usage appears, never speculatively (constitution's Simplicity Wins: "avoid unnecessary abstraction").

---

# 7. The HomeScreen Exception

`src/screens/HomeScreen.tsx` is 264 lines, fully implemented, and is the app's actual first screen (`AppNavigator.tsx` registers it as `"Home"` with `headerShown: false`, the entry route). It predates the `src/features/` structure and has never been migrated.

It is architecturally inconsistent with every other screen in the app in two specific ways:

1. It lives outside `src/features/`, so it has no feature-folder home, no `index.ts` boundary, nothing to enforce Feature Ownership around it.
2. It receives `navigation` as an explicit prop (`{ navigation }: Props`) rather than using `useNavigation()`, which is a stylistically different pattern from every other screen in this codebase (all of which are parameterless functions).

This is documented technical debt, not a bug to silently fix inside an unrelated change. Per constitution's Technical Debt section, the reason is documented (predates Feature-First), the impact is understood (cosmetic/organizational, not functional — the screen works correctly today), and the follow-up plan is: when a "Home" or "Landing" concept is formally planned as part of Dashboard or a dedicated onboarding feature, migrate this file into `src/features/<appropriate-feature>/screens/HomeScreen.tsx` and align it to the parameterless-function convention, updating `AppNavigator.tsx`'s import accordingly.

Do not use `HomeScreen.tsx` as a template for new screens. Use `DashboardScreen.tsx` or `LoginScreen.tsx` instead — both follow the current, correct convention.

---

# 8. Good Examples

**Good: a shared barrel file with a flat, discoverable surface.**

```ts
// src/components/ui/index.ts — current, real, complete
export { default as Button }     from "./Button";
export { default as Card }       from "./Card";
export { default as Input }      from "./Input";
export { default as Screen }     from "./Screen";
export { default as Badge }      from "./Badge";
export { default as Divider }    from "./Divider";
export { default as Avatar }     from "./Avatar";
export { default as IconButton } from "./IconButton";
export { default as Spacer }     from "./Spacer";
export { default as Row }        from "./Row";
export { Heading, SubHeading, Body, Caption, Label, Muted } from "./Typography";
export { default as GlassCard }  from "../GlassCard";
export { default as GlassPill }  from "../GlassPill";
```

Every screen imports from `"../../../components/ui"`, never from a deep path like `"../../../components/ui/Button"`. This is the pattern every feature's future `index.ts` (see `feature-structure.md` § 4) should mirror.

---

# 9. Bad Examples

**Bad: a new top-level folder for a single feature's concern.**

```
src/
  publishing-helpers/     # <- should be src/features/publishing/services/
    scheduleLogic.ts
```

Creating a top-level sibling to `features/` for one feature's logic breaks Predictability — the next contributor has to check two places (`features/` and every ad hoc top-level folder) to find where a feature's code lives.

**Bad: deep-importing past a barrel file.**

```ts
// bad — bypasses src/components/ui/index.ts
import Button from "../../../components/ui/Button";
// good
import { Button } from "../../../components/ui";
```

---

# 10. Decision Trees

## New shared code or feature-owned code?

```
Does it encode any domain knowledge specific to one feature
(status names, business rules, platform names)?
  → Yes: feature-owned, inside that feature's folder.
  → No: is it already needed by two or more features?
      → Yes: promote to the matching top-level folder
        (components/ui, constants, types).
      → No: keep it feature-local until a second real usage appears.
```

## New top-level `src/` folder, or does it belong under an existing one?

```
Does the concern already have a top-level folder that matches its
responsibility (api, components, config, constants, context,
features, i18n, navigation, store, types)?
  → Yes: it belongs there. Do not create a new top-level folder.
  → No: is this a whole new category of concern that will recur
    across many features (not just convenient for one PR)?
      → Yes: propose it to chief-architect before creating it.
      → No: it's feature-local — put it inside features/<name>/.
```

---

# 11. Real Project Examples

- **`src/constants/colors.ts` vs `src/constants/theme.ts`** — both define brand colors; `colors.ts` is the raw, dark-only palette also mirrored in `tailwind.config.js`'s `sugar` color group, while `theme.ts` wraps it in a `ThemeColors` interface with light/dark variants for `useTheme()`. Screens that don't need light-mode awareness import `colors` directly (`LoginScreen.tsx`, `ContentScreen.tsx`); screens that do, use `useTheme().colors` (`HomeScreen.tsx`, `Button.tsx`). This split is intentional but easy to misuse — see `design-system.md` § 4 for the full explanation and the risk of drift between the two files.
- **`src/screens/HomeScreen.tsx`** — the canonical example of § 7's exception. Read before assuming it's a pattern to copy.
- **`src/api/index.ts`** — a working barrel file for the Data layer, one line per endpoint module plus the raw `client` export, mirroring the same barrel convention as `components/ui/index.ts`.

---

# 12. Common Mistakes

- Adding a new file to `src/screens/` because `HomeScreen.tsx` is already there. That folder should not grow; new screens go in `src/features/<name>/screens/`.
- Putting a feature-specific constant in `src/constants/` because "it's a constant, so it goes with the other constants." Check § 6 first.
- Creating a new top-level folder for a one-off concern instead of nesting it inside an existing folder or a feature.
- Forgetting to update a barrel file (`ui/index.ts`, `api/index.ts`, `store/index.ts`) after adding a new module, forcing consumers to deep-import.

---

# 13. Best Practices

- Before creating any new file, name the top-level folder it belongs in out loud, using § 5's table. If none fits, that's a signal to stop and ask, not to invent a new top-level folder solo.
- Keep every barrel file (`components/ui/index.ts`, `api/index.ts`, `store/index.ts`) up to date in the same PR that adds the module it exports.
- When a feature-local component is promoted to `src/components/ui/`, add it to `ui/index.ts` in the same commit, and delete the feature-local copy — don't leave both.
- Treat `src/screens/HomeScreen.tsx` as read-only unless the PR's explicit purpose is migrating it.

---

# 14. Checklist

- [ ] New file's top-level folder matches § 5's responsibility table.
- [ ] Shared-vs-feature-owned boundary from § 6 checked before placing new code in a top-level folder.
- [ ] No new top-level `src/` folder created without confirming § 10's decision tree.
- [ ] Barrel files updated in the same PR as the module they export.
- [ ] No new code added to `src/screens/`.

---

# 15. FAQ

**Is `src/config/` the same thing as `src/constants/`?**

No.

`config/` holds environment-driven values (`process.env.EXPO_PUBLIC_API_URL`).

`constants/` holds static values baked into the bundle regardless of environment.

**Should `i18n/` move under `context/` since `LanguageContext` is its only consumer?**

Not currently — `translations.ts` is data, `LanguageContext.tsx` is the Presentation-facing hook that reads it. Keeping them as siblings under different top-level folders mirrors the `constants/` + `context/` split used for theming.

**Where would a future `src/hooks/` (app-wide, cross-feature hooks) folder fit?**

It doesn't exist today because no cross-feature hook exists yet. If one is needed, follow § 10's decision tree — most "shared hook" instincts turn out to be one feature's `hooks/` folder reused, not truly cross-cutting.

**Can a feature import directly from another feature's folder at all?**

Only through that feature's `index.ts` public API — see `feature-structure.md` § 4 and § 8.

---

# 15.5 Glossary

**Top-level folder** — a direct child of `src/`. There are ten today: `api`, `components`, `config`, `constants`, `context`, `features`, `i18n`, `navigation`, `screens`, `store`, `types`.

**Barrel file** — an `index.ts` that re-exports a folder's public surface, so consumers import from the folder, not individual files.

**Feature-owned** — code that encodes domain knowledge specific to one feature, and lives inside that feature's folder.

**Shared** — code with no feature-specific domain knowledge, promoted to a top-level folder after a genuine second usage.

**Legacy exception** — `src/screens/HomeScreen.tsx`. Documented, not hidden, not a template.

---

# 16. References

- [constitution.md](../constitution.md) — Predictability, Small Units, Folder Philosophy references.
- [context.md](../context.md) — Folder Philosophy, Naming Philosophy.
- [00-chief-architect.md](../agents/00-chief-architect.md) — § 3 Folder Organization.
- [architecture.md](./architecture.md) — whole-system view this handbook's tree fits inside.
- [feature-structure.md](./feature-structure.md) — internal shape of `src/features/<name>/`.
- [design-system.md](./design-system.md) — the `colors.ts`/`theme.ts` split in full.
- [navigation.md](./navigation.md) — `src/navigation/` in full.
