---
id: playbook-creating-a-component
title: Creating A Component Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Creating A Component Playbook

> "A component is a promise: give me these props, and I will look and behave the same way everywhere I'm used." — `../agents/22-ui-engineer.md`

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: A `Chip` Component for Product Categories
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

Sugar Admin has two legitimate places a component can live: `src/components/ui/` (shared, app-wide) or `src/features/<feature>/components/` (used only by one feature — a folder that doesn't exist for any feature yet, since every feature is currently flat, per `../rules/folders.md` Rule 2). This playbook is the decision process and concrete steps for adding either kind, grounded in the real `Button.tsx` pattern and the real `src/components/ui/index.ts` barrel.

---

# 2. When To Use This Playbook

Use this playbook when a screen needs a visual element that doesn't exist yet — a new button variant, a new card layout, a status chip, a form control — and you've confirmed no existing component in `src/components/ui/` already covers it, even with a new prop or variant.

Do not use this playbook to build a one-off `TouchableOpacity` inline inside a screen file "just this once" — that is the exact anti-pattern `../agents/22-ui-engineer.md` § 13 and `../agents/20-react-native-engineer.md` § 13 both call out.

---

# 3. Prerequisites

- Read `src/components/ui/index.ts` first, in full, to confirm nothing already covers the need. As of this writing it exports: `Button`, `Card`, `Input`, `Screen`, `Badge`, `Divider`, `Avatar`, `IconButton`, `Spacer`, `Row`, `Heading`/`SubHeading`/`Body`/`Caption`/`Label`/`Muted` (from `Typography`), `GlassCard`, `GlassPill`.
- Read `src/components/ui/Button.tsx` — it is the reference pattern every new shared component should read as a sibling of, per `../agents/22-ui-engineer.md` § 16.
- Know which feature(s) will consume this component, and whether it's genuinely reusable or feature-specific — see Step 1's decision tree.
- If a new design token (color) is needed, know that it must be added to all three token sources together: `tailwind.config.js`, `src/constants/colors.ts`, `src/constants/theme.ts` (`../agents/22-ui-engineer.md` § 10).

---

# 4. Step-by-Step Workflow

## Step 1 — Decide: shared or feature-local

```
Does a component already exist in src/components/ui/* or
src/components/Glass*.tsx that fits with a new prop/variant?
  → Yes: extend it. Check every existing call site across
    src/features/ first so the extension doesn't break current usage.
  → No: is this genuinely reusable across more than one feature,
    or specific to one screen's content?
      → Reusable → new component in src/components/ui/.
      → Feature-specific → src/features/<feature>/components/
        (create the subfolder now if it doesn't exist yet —
        per ../rules/folders.md Rule 3, this is created as
        part of the PR that needs it, not a separate restructure PR).
```

This is `../agents/22-ui-engineer.md` § 8's Decision Process, applied. A component used only by the future `products` feature (e.g. `ProductCard`) belongs in `src/features/products/components/ProductCard.tsx`, never in `src/components/ui/` — see `../rules/folders.md` § 5 Bad Example for exactly this mistake.

## Step 2 — Confirm the styling approach: `StyleSheet` + `useTheme()`

`nativewind` (4.2.5) is installed and wired (`tailwind.config.js`, `global.css`, `babel.config.js`), but **every existing component uses `StyleSheet.create` with colors pulled from `useTheme()`**, not `className` props — `Button.tsx`, `Card.tsx`, `Input.tsx`, `Screen.tsx`, `GlassCard.tsx`, `GlassPill.tsx` all follow this. Do not start writing `className="bg-sugar-bg rounded-xl"` on a new component without treating that as a deliberate, project-wide style-approach change requiring `chief-architect` sign-off — it is not a one-off local choice (`../agents/22-ui-engineer.md` § 9, § 13).

Note the codebase's real inconsistency here: `LoginScreen.tsx` and `DashboardScreen.tsx` import the static `colors` object from `src/constants/colors.ts` directly, while every shared component in `src/components/ui/` reads colors through `useTheme()` from `src/context/ThemeContext.tsx`. **New shared components always use `useTheme()`** — that is what makes them theme-aware (dark/light switching), which a direct `colors` import can never be (`../agents/22-ui-engineer.md` § 9 Principle 2).

## Step 3 — Design the prop API

Follow the Component API Standard from `../agents/22-ui-engineer.md` § 11, mirroring `Button.tsx`'s shape exactly:

```ts
interface Props {
  // 1. Content/data props first
  label: string;

  // 2. Behavior props
  onPress: () => void;

  // 3. Variant prop, typed as a union, default in destructuring
  variant?: "primary" | "secondary" | "ghost" | "danger";

  // 4. State props
  loading?: boolean;
  disabled?: boolean;

  // 5. Escape hatch, always last, always optional
  style?: ViewStyle;
}
```

A `variant` describes visual intent, never business meaning — `Button`'s `variant="danger"` means "looks destructive," not "deletes a product" (`../agents/22-ui-engineer.md` Principle 3). Never add a variant like `variant="archiveProduct"`.

## Step 4 — Implement, reading every color through `useTheme()`

```tsx
// src/components/ui/Chip.tsx
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export default function Chip({ label, selected = false, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.violetDim : colors.btnSecondaryBg,
          borderColor: selected ? colors.violet : colors.btnSecondaryBorder,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.violetLight : colors.btnSecondaryText, fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
});
```

This is `../agents/22-ui-engineer.md` § 14's Good Example, verbatim — every color from `useTheme()`, `accessibilityRole`/`accessibilityState` present from the start, structural sibling of `Button.tsx`.

## Step 5 — Handle loading/disabled and RTL if applicable

If the component is interactive, model `loading`/`disabled` the way `Button.tsx` does. If it renders text, verify RTL alignment works via `isRTL` from `useLanguage()` — text-rendering components are not optional here since Farsi/RTL is the app's real default.

## Step 6 — Update all three token sources together, if a new color is needed

```js
// tailwind.config.js
theme.extend.colors.sugar["new-token"] = "#RRGGBB";
```
```ts
// src/constants/colors.ts
export const colors = { /* ... */ newToken: "#RRGGBB" };
```
```ts
// src/constants/theme.ts
export const dark: ThemeColors = { /* ... */ newToken: "#RRGGBB" };
export const light: ThemeColors = { /* ... */ newToken: "#lightVariant" };
```

Never update just one source — `../agents/22-ui-engineer.md` Principle 6 documents an existing, real drift (`textFaint` is `0.2` in `colors.ts` but `0.15` in `theme.ts`) as a cautionary example of what happens when this isn't done together.

## Step 7 — Export from the barrel

Add the export to `src/components/ui/index.ts`:

```ts
export { default as Chip } from "./Chip";
```

## Step 8 — Hand off

For any new interactive component, flag `accessibility-reviewer`. For components with heavy image/animation work, flag `performance-reviewer`. For feature-local components, hand back to `react-native-engineer` for screen integration.

---

# 5. Worked Example: A `Chip` Component for Product Categories

The Products feature plan (`../templates/feature-proposal.md`'s filled example) specifies `ProductListScreen`'s secondary actions include "category filter chips." No chip component exists in `src/components/ui/`.

**Step 1.** Checked `src/components/ui/index.ts` — `Badge` exists but is a static label, not a pressable, selectable filter control; it doesn't fit. This is genuinely reusable (any list screen with category-style filtering could use it — Content, Reports could plausibly reuse it later), so it belongs in `src/components/ui/Chip.tsx`, not `src/features/products/components/`.

**Step 2.** Styling approach: `StyleSheet` + `useTheme()`, matching every existing shared component.

**Step 3.** Prop API: `label: string`, `selected?: boolean`, `onPress?: () => void` — no `variant` needed yet since there's only one visual style (selected/unselected), but the shape leaves room to add one later without a breaking change.

**Step 4–5.** Implemented exactly as shown in Step 4 above — `Chip.tsx`, colors from `useTheme()`, `accessibilityRole="button"` and `accessibilityState={{ selected }}` so a screen reader announces the current filter state.

**Step 6.** No new token needed — `colors.violetDim`, `colors.violet`, `colors.violetLight` already exist in all three sources.

**Step 7.** Added `export { default as Chip } from "./Chip";` to `src/components/ui/index.ts`.

**Step 8.** Handed to `react-native-engineer` to compose into `ProductListScreen`'s filter row, and flagged `accessibility-reviewer` since it's a new selectable-filter interaction pattern.

---

# 6. Checklist

- [ ] `src/components/ui/index.ts` was read in full before deciding to build something new.
- [ ] Decision made explicitly: shared (`src/components/ui/`) vs. feature-local (`src/features/<feature>/components/`) — not defaulted to shared "to be safe."
- [ ] Styling approach is `StyleSheet` + `useTheme()`, matching every existing component — no `className` introduced without a project-wide decision.
- [ ] Every color is read through `useTheme()`, never a literal hex value or a direct `constants/colors.ts` import.
- [ ] Prop API follows the five-group ordering (content, behavior, variant, state, `style` escape hatch).
- [ ] Any `variant` describes visual intent, never a business action.
- [ ] Loading/disabled states are handled if interactive.
- [ ] `accessibilityRole`, and where relevant `accessibilityLabel`/`accessibilityState`, are present.
- [ ] RTL text alignment verified if the component renders text.
- [ ] Any new token was added to all three sources: `tailwind.config.js`, `colors.ts`, `theme.ts`.
- [ ] Exported from `src/components/ui/index.ts` (if shared).
- [ ] Existing call sites checked before changing any existing component's public prop API.

---

# 7. Common Mistakes

**Skipping the barrel export.** A component that works but isn't in `src/components/ui/index.ts` is invisible to every other feature that would otherwise discover and reuse it.

**Hard-coding a hex color inside a screen's own `StyleSheet.create` instead of building/extending a component.** Bypasses all three token sources and can't respond to a future theme switch — see `../agents/22-ui-engineer.md` § 13.

**Putting a feature-specific component in `src/components/ui/`.** `../rules/folders.md` § 5's exact Bad Example: a `ProductCard` that only Products ever uses, placed in the shared barrel, forces every other feature's engineer to evaluate and discard it.

**Mixing NativeWind `className` and `StyleSheet` on the same component.** Two competing sources of truth for one element's styling — pick one, and today's convention is `StyleSheet` + `useTheme()`.

**Reinventing the glass-morphism recipe per screen instead of reusing `GlassCard`/`GlassPill`.** Produces visually inconsistent blur/overlay/sheen values across the app.

**Changing an existing component's prop API without checking call sites.** `Button.tsx` is consumed across every current screen; a breaking prop change ripples silently until something crashes at runtime.

---

# 8. References

- `../constitution.md` — Design Principles, Accessibility, Single Responsibility
- `../agents/22-ui-engineer.md` — the full component-ownership standard this playbook operationalizes
- `../agents/20-react-native-engineer.md` § 13 — the screen-side anti-pattern this playbook prevents
- `../rules/folders.md` § 5 — shared vs. feature-local placement rule
- `../rules/naming.md` Rule 1 — component naming convention (`PascalCase.tsx`, filename matches export)
- `src/components/ui/Button.tsx`, `src/components/ui/index.ts` — the reference implementation and barrel to read first
- `./building-a-screen.md` — where a missing component is discovered and requested from
