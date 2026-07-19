---
id: rule-nativewind
title: NativeWind Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_components
  - all_screens
last_updated: 2026-07-18
---

# NativeWind Rules

> Avoid unnecessary configuration. — `../constitution.md`, Simplicity Wins

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

NativeWind 4.2.5 is fully configured in this repository: `tailwind.config.js` defines a custom `sugar` color palette, `babel.config.js` sets `jsxImportSource: "nativewind"` and includes the `nativewind/babel` preset, and `App.tsx` imports `"./global.css"` (which contains the three `@tailwind` directives). Despite this, **zero files in `src/` currently use a `className` prop.** Every existing component and screen styles itself with `StyleSheet.create` plus inline style arrays, driven by `useTheme()` (`ThemeContext`) or the static `colors` object in `src/constants/colors.ts`.

This file states that gap honestly and gives the rule for what new code should do, rather than pretending the codebase is "pure NativeWind" when it demonstrably is not.

---

# 2. Scope

Applies to every new component and screen, and to any refactor of an existing one.

---

# 3. Rules

## Rule 1 — NativeWind is fully wired but unused today; do not assume any existing file demonstrates the intended pattern

Confirmed by inspection: `Button.tsx`, `Card.tsx`, `Input.tsx`, `Screen.tsx`, `IconButton.tsx`, `Typography.tsx`, `GlassCard.tsx`, `HomeScreen.tsx`, `LoginScreen.tsx`, `DashboardScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx` — all of them use `StyleSheet.create()` and/or inline `style={[...]}` arrays exclusively. None uses `className`.

**Why this must be stated plainly:** an engineer opening `Button.tsx` looking for "the NativeWind pattern to copy" will find a `StyleSheet.create` + `useTheme()` + `expo-linear-gradient` component instead, and might reasonably conclude NativeWind isn't actually in use, or copy the non-NativeWind pattern forward indefinitely. Neither conclusion is correct — NativeWind is a deliberate, configured dependency; it has simply not been adopted in component code yet.

## Rule 2 — New static, non-themed styling uses NativeWind `className`; dynamic, theme-driven, or animated styling uses `StyleSheet` + `useTheme()`

```tsx
// Good: static layout/spacing, no theme dependency, no runtime color logic
<View className="flex-row items-center gap-3 px-4 py-3">
  <Text className="text-sugar-text-primary text-base font-semibold">{label}</Text>
</View>
```

```tsx
// Good: color depends on runtime theme state (dark/light) or a gradient — use useTheme() + StyleSheet
const { colors } = useTheme();
<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
```

**Why this split, specifically:** `ThemeContext.tsx` currently drives dark/light mode via a JS-computed `colors` object (`dark` / `light` from `src/constants/theme.ts`), not via NativeWind's `dark:` variant or a CSS-variable-driven theme. NativeWind *can* support dark mode (via `useColorScheme` + the `dark:` variant), but adopting that would mean maintaining two parallel theming mechanisms (`ThemeContext`'s `colors` object AND NativeWind's `dark:` classes) unless one is deliberately retired in favor of the other — a decision for `chief-architect`, not an incidental choice made per-component. Until that decision is made, any value that must change with `ThemeContext`'s `mode` (background, border, text color, brand gradient stops) stays in `StyleSheet` + `useTheme()`; anything static regardless of theme (padding, gap, flex layout, border radius) is a safe, low-risk place to start using `className`.

## Rule 3 — Reanimated-animated styles (`useAnimatedStyle`) are never expressed as `className`

NativeWind classNames are resolved at build/interop time; `react-native-reanimated`'s `useAnimatedStyle` produces a style object driven on the UI thread at runtime. The two cannot be mixed for the same property — an animated `opacity` or `transform` stays in `useAnimatedStyle`'s returned style object, applied via the `style` prop, never attempted via a dynamically-templated `className` string.

**Why:** see `animations.md` for the full Reanimated convention. This rule exists here specifically to prevent a well-intentioned "let's NativeWind-ify this component" refactor from breaking an animated component by trying to template class names based on animated values — that pattern does not work reliably in NativeWind's current architecture and produces confusing, hard-to-debug style bugs.

## Rule 4 — When a component is deliberately migrated to NativeWind, migrate the whole component, not individual style properties

Do not produce a component that is 60% `className` and 40% `StyleSheet` for the *same* static styling concern (e.g. padding half in `className="p-4"`, half in `style={{ paddingTop: 8 }}`) — pick one mechanism per concern and apply it consistently within that component.

**Why:** per the constitution's Explicit Beats Implicit — a reader who sees `className="p-4"` and *also* an inline `style` prop on the same element has to mentally merge two style sources and reason about NativeWind/RN style-merge precedence to know the actual rendered padding. This is genuinely more confusing than either approach used alone. Rule 2's split is at the *component* level (which parts are static vs. dynamic), not a license to interleave both mechanisms arbitrarily within one element's styling.

## Rule 5 — The `sugar` color palette in `tailwind.config.js` and the `colors` object in `src/constants/colors.ts` are the same values under two different access mechanisms; keep them in sync manually until one is deprecated

```js
// tailwind.config.js
sugar: { bg: "#07080F", violet: "#7C3AED", pink: "#DB2777", /* ... */ }
```
```ts
// src/constants/colors.ts
bg: "#07080F", violet: "#7C3AED", pink: "#DB2777", /* ... */
```

**Why this is a real risk, not a hypothetical:** these are two independently maintained sources of the same design tokens. Nothing enforces they stay identical — a color updated in `tailwind.config.js` (for a `className`-based component) will silently diverge from `constants/colors.ts` (used by every `StyleSheet`-based component) unless a human remembers to update both. Until NativeWind adoption is complete enough to retire `constants/colors.ts` / `constants/theme.ts` entirely, any palette change is applied to both files in the same PR — call this out explicitly in the PR description as a two-file change.

## Rule 6 — `className` values use the `sugar-*` namespaced tokens from `tailwind.config.js`, never raw Tailwind defaults or arbitrary hex values

```tsx
// Good
<View className="bg-sugar-surface border border-sugar-border rounded-2xl" />

// Bad — bypasses the design system entirely
<View className="bg-[#0E1018] border border-[#ffffff14] rounded-2xl" />
```

**Why:** the whole point of the `sugar` namespace in `tailwind.config.js` is a single, named source of truth for the palette (mirroring `constants/colors.ts`'s intent). An arbitrary hex value in a `className` reintroduces exactly the untracked, undocumented color drift the palette exists to prevent, and it can no longer be found by searching for the `sugar-*` token name.

---

# 4. Good Examples

## Good: a new static component using NativeWind for layout, `useTheme()` for color

```tsx
import { View, Text } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function StatPill({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center gap-2 rounded-full px-3 py-1.5">
      {/* layout is static → className; color depends on theme mode → inline style */}
      <View style={{ backgroundColor: colors.violetDim }} className="rounded-full px-3 py-1.5 flex-row items-center gap-2">
        <Text style={{ color: colors.violetLight }} className="text-xs font-semibold">{label}</Text>
        <Text style={{ color: colors.textPrimary }} className="text-sm font-bold">{value}</Text>
      </View>
    </View>
  );
}
```

This is good because layout/spacing (static) uses `className`, color (theme-dependent) uses `useTheme()` + inline `style`, and there is no ambiguity about which mechanism owns which property.

---

# 5. Bad Examples

## Bad: assuming `Button.tsx` demonstrates the NativeWind pattern

```tsx
// A new engineer, copying Button.tsx's actual pattern verbatim, believing it's "how we do NativeWind here":
const styles = StyleSheet.create({ wrap: { borderRadius: 14, overflow: "hidden" } });
```

**Consequence:** this is a reasonable-looking mistake given the current state of the codebase — `Button.tsx` genuinely doesn't use NativeWind. But copying it forward means the codebase never actually adopts the dependency it has fully configured, and NativeWind's install cost (bundle size, Babel transform, `tailwind.config.js` maintenance) is paid with zero benefit realized. New static components should use `className` per Rule 2, specifically to start closing this gap.

## Bad: mixed styling mechanisms on the same static concern

```tsx
<View className="px-4" style={{ paddingTop: 12, paddingHorizontal: 20 }}>
```

**Consequence:** the rendered horizontal padding depends on NativeWind/RN style-merge precedence rules the reader has to know by heart, and `px-4` (16px) directly conflicts with `paddingHorizontal: 20` in the inline style — one silently wins, and it's not obvious which without checking documentation or testing on-device.

---

# 6. Checklist

- [ ] New static, non-themed styling uses `className` with `sugar-*` tokens, not raw Tailwind defaults or arbitrary hex values.
- [ ] Theme-dependent (dark/light) or gradient/animated styling stays in `StyleSheet` + `useTheme()`, not attempted via `className`.
- [ ] No Reanimated `useAnimatedStyle` output is expressed as a `className`.
- [ ] A single element does not mix `className` and inline `style` for the same static property.
- [ ] Any palette change is applied to both `tailwind.config.js` and `src/constants/colors.ts` (and `theme.ts`) in the same PR.
- [ ] PR description notes if this change moves a component further toward or away from NativeWind adoption, so the migration's progress stays visible.

---

# 7. References

- `../constitution.md` — Simplicity Wins, Explicit Beats Implicit
- `react-native.md` — component and screen conventions this file's split applies within
- `animations.md` — Reanimated-driven styles and why they never become `className`
- `documentation.md` — doc-drift risk of the "fully configured but unused" NativeWind gap
- `../../tailwind.config.js`, `../../src/constants/colors.ts`, `../../src/constants/theme.ts` — the two token sources this file requires kept in sync
