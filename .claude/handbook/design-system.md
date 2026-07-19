---
id: handbook-design-system
title: Design System Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Design System Handbook

> "The interface should feel: Fast. Predictable. Consistent. Minimal. Accessible." — constitution.md, Design Principles

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Sugar Palette
5. Typography
6. The Glass-Morphism Component Family
7. Button's Variant System
8. Dark-Mode-First
9. Good Examples
10. Bad Examples
11. Decision Trees
12. Real Project Examples
13. Common Mistakes
14. Best Practices
15. Checklist
16. FAQ
17. References

---

# 1. Purpose

Sugar Admin's visual identity — the "sugar" design system — is a dark violet-to-pink gradient aesthetic with glass-morphism cards. This handbook documents the actual token values, component conventions, and the two-file color-definition split that exists in the codebase today, so new UI is built consistent with what's already shipped, not a reinvention per screen.

---

# 2. Scope

In scope: `src/constants/colors.ts`, `src/constants/theme.ts`, `src/constants/typography.ts`, `tailwind.config.js`'s sugar palette, `GlassCard`/`GlassPill`, `Button`'s variant system, and dark/light mode.

Out of scope: motion and animation conventions (`animations.md`), and accessibility contrast requirements against this palette (`accessibility.md`).

---

# 3. Principles

Grounded in:

- **Design Principles** (constitution.md) — fast, predictable, consistent, minimal, accessible; animations communicate state; never decorate for decoration's sake.
- **Design Goals** (context.md) — professional, minimal, fast, reliable, accessible, modern.
- **Simplicity Wins** (constitution.md) — avoid unnecessary abstraction, unnecessary configuration.

---

# 4. The Sugar Palette

Three files define color, and understanding why all three exist — and where they can drift — matters more than memorizing hex values.

**`src/constants/colors.ts`** — the raw, dark-only palette. This is the single source of truth for the actual hex values:

```ts
export const colors = {
  bg:      "#07080F",
  surface: "#0E1018",
  card:    "#111320",
  violet:      "#7C3AED",
  violetLight: "#A78BFA",
  pink:        "#DB2777",
  pinkLight:   "#F472B6",
  gradientBrand: ["#7C3AED", "#DB2777"] as const,
  success: "#10B981",
  warning: "#F59E0B",
  error:   "#EF4444",
  info:    "#3B82F6",
  // ...full palette includes borders, overlay, text tiers, dim variants
} as const;
```

Imported directly by screens that don't need light-mode awareness: `LoginScreen.tsx`, `ContentScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx`, `AuthNavigator.tsx`.

**`src/constants/theme.ts`** — wraps the same brand values in a `ThemeColors` interface with explicit `dark`/`light` variants, consumed via `useTheme()`:

```ts
export const dark: ThemeColors = {
  bg: "#07080F", surface: "#0E1018", card: "#111320",
  violet: "#7C3AED", violetLight: "#A78BFA", pink: "#DB2777", pinkLight: "#F472B6",
  // ...
};
export const light: ThemeColors = {
  bg: "#F5F3FF", surface: "#FFFFFF", card: "#FFFFFF",
  violet: "#6D28D9", violetLight: "#7C3AED", pink: "#BE185D", pinkLight: "#DB2777",
  // ...
};
```

Consumed by `useTheme()`-aware components: `Button.tsx`, `Card.tsx`, `Screen.tsx`, `Input.tsx`, `Badge.tsx`, `Typography.tsx`, `AppNavigator.tsx`, `HomeScreen.tsx`.

**`tailwind.config.js`'s `sugar` color group** — a third, NativeWind-facing mirror of the dark palette, for any component styled with `className="bg-sugar-bg"` instead of `StyleSheet`. As of this writing, no component in `src/` actually uses NativeWind class names for the sugar colors — every real component reads `colors` or `useTheme().colors` and builds a `StyleSheet.create()` object. The Tailwind config exists, is wired (`App.tsx` imports `"./global.css"`, NativeWind is a dependency), but is currently unused in practice.

**The drift risk, stated explicitly.** `colors.violet` (`#7C3AED`) and `dark.violet` (`#7C3AED`) currently agree. `light.violet` (`#6D28D9`) is a different, deliberately darker shade for light-mode contrast — correct and intentional. The risk is that `colors.ts` (dark-only, no light variant) will be edited by someone updating the brand color without touching `theme.ts`'s `dark` object, or vice versa, silently reintroducing a mismatch between the two dark palettes. There is no single source of truth today; a future consolidation (either generate `colors.ts` from `theme.dark`, or delete `colors.ts` and have non-theme-aware screens import `theme.dark` directly) is worth proposing to `chief-architect` once a third file needs the palette.

---

# 5. Typography

`src/constants/typography.ts` defines the raw scale — sizes (`xs: 11` through `4xl: 36`), weights (`regular` "400" through `extrabold` "800"), line heights, and letter spacing — as plain numeric/string tokens, not yet wired into a `useTypography()` hook or consumed by `StyleSheet.create()` calls directly (grep confirms no component currently imports from `typography.ts`).

The actual typographic system in use today lives in `src/components/ui/Typography.tsx`'s six semantic components — `Heading`, `SubHeading`, `Body`, `Caption`, `Label`, `Muted` — each with its own hardcoded `StyleSheet` values (`heading: { fontSize: 28, fontWeight: "800", lineHeight: 36 }`) that happen to roughly track `typography.ts`'s scale but don't import it. This is a second, smaller version of § 4's drift risk: two files describe the same design intent (a `2xl`/heading size is `24`/`28` depending which file you read) without one importing the other.

The fix, when touched: `Typography.tsx`'s `StyleSheet` values should read from `typography.sizes`/`typography.weights` instead of restating the numbers. Until then, when adding a new text style, check both files and keep them in sync manually.

---

# 6. The Glass-Morphism Component Family

`GlassCard.tsx` and `GlassPill.tsx` are the visual signature of the sugar aesthetic — a four-layer composition, documented in the component's own comments:

```tsx
// src/components/GlassCard.tsx — current, real, complete structure
<View style={{ borderRadius, borderWidth: 1, borderColor, overflow: "hidden" }}>
  {/* ① Blur layer — blurs the colorful background behind the card */}
  <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
  {/* ② Dark overlay — adds depth, prevents card from being too transparent */}
  <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(8,8,18,0.45)" }]} />
  {/* ③ Top sheen — the subtle white highlight Apple puts at the top of glass */}
  <LinearGradient
    colors={[`rgba(255,255,255,${sheenOpacity})`, "rgba(255,255,255,0)"]}
    start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
    style={[StyleSheet.absoluteFill, { height: "45%" }]}
  />
  {/* ④ Content — renders crisp on top */}
  <View style={padded ? styles.padded : undefined}>{children}</View>
</View>
```

Notice `GlassCard` hardcodes `tint="dark"` on its `BlurView` regardless of `useTheme()`'s active mode — it does not read `useTheme()` at all. This is a deliberate scope limitation, not an oversight to silently "fix": `GlassCard` is currently only used in dark, glass-appropriate contexts (`HomeScreen.tsx`'s hero area sits on a dark background regardless of app theme mode in its current usage). If `GlassCard` is used in a light-mode-only context in the future, `tint="dark"` will look wrong — check current usages before adding a new one in a light-background context, and consider adding theme-awareness at that point rather than before it's needed (Simplicity Wins: don't add the light-mode branch speculatively).

`GlassPill` follows the same `BlurView`-based approach at smaller scale, for a chip/toggle affordance — see `HomeScreen.tsx`'s theme-toggle and language-toggle pills, which use an inline equivalent pattern (bordered `TouchableOpacity` with theme-aware background) rather than `GlassPill` itself — another small, current inconsistency: two visually similar "pill" patterns exist (`GlassPill.tsx`'s blur-based version, and `HomeScreen.tsx`'s `s.pill` StyleSheet-based version), and they are not currently unified into one component.

---

# 7. Button's Variant System

`Button.tsx` is the clearest example of correct `useTheme()` + `StyleSheet.create()` + `expo-linear-gradient` composition in the codebase, and the reference implementation to copy for any new interactive component:

```tsx
// src/components/ui/Button.tsx — current, real
type Variant = "primary" | "secondary" | "ghost" | "danger";

export default function Button({ label, onPress, variant = "primary", loading, disabled, style }: Props) {
  const { colors } = useTheme();
  const isDisabled = disabled || loading;

  if (variant === "primary") {
    return (
      <TouchableOpacity onPress={onPress} disabled={isDisabled} activeOpacity={0.85} style={[styles.wrap, isDisabled && styles.disabled, style]}>
        <LinearGradient colors={[colors.violet, colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.labelPrimary}>{label}</Text>}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  // secondary/ghost/danger share one branch, differentiated by StyleSheet composition
}
```

Four things worth naming explicitly as the pattern to follow:

1. **`primary` gets a fully separate render branch**, not a conditional style merge, because it's structurally different (wraps a `LinearGradient`, the others don't). Don't force every variant into one giant ternary-styled `View` when the structure genuinely differs.
2. **`colors.violet`/`colors.pink` come from `useTheme()`, not the raw `colors` import** — this is what makes the button's gradient correctly invert for light mode (`light.violet` is `#6D28D9`, darker for contrast on a white background).
3. **`loading` and `disabled` collapse into one `isDisabled` check**, applied once, consistently, to both `disabled` prop and opacity styling — avoiding the bug class where a button is visually disabled but still clickable, or vice versa.
4. **The style array pattern** — `style={[styles.wrap, isDisabled && styles.disabled, style]}` — merges base styles, conditional styles, and caller-provided overrides in a fixed, predictable order. Every themed component in `src/components/ui/` follows this same array-merge convention (`Card.tsx`, `Input.tsx`, `Badge.tsx`).

---

# 8. Dark-Mode-First

Sugar Admin is dark-mode-first, not dark-mode-only: `ThemeContext.tsx` defaults to `"dark"` unless the system reports `"light"` explicitly (`system === "light" ? "light" : "dark"`), meaning an undetermined system preference resolves to dark, not light. This is a deliberate default matching the brand's dark violet identity (`colors.bg: "#07080F"` is the "true" brand background; `light.bg: "#F5F3FF"` is a secondary, accommodating mode).

Practically, this means: design and build every new component against `dark` first, verify it in `light` second — not the reverse. `GlassCard`'s hardcoded `tint="dark"` (§ 6) is a direct consequence of this priority; it is correct for a dark-mode-first app that hasn't yet needed a light-mode glass variant.

---

# 9. Good Examples

**Good: `Card.tsx`'s minimal, fully theme-aware shape** — four lines of actual logic, every color from `useTheme()`, no hardcoded hex value anywhere in the file. The shortest correct example of the pattern in the codebase.

---

# 10. Bad Examples

**Bad: a new component that hardcodes a sugar hex value instead of reading it from `colors`/`useTheme()`.**

```tsx
// bad
<View style={{ backgroundColor: "#7C3AED" }} />
// good
const { colors } = useTheme();
<View style={{ backgroundColor: colors.violet }} />
```

Hardcoding breaks light-mode support silently — the view above renders the same violet in both themes, when `theme.ts` explicitly defines a different, more-contrast-appropriate violet for light mode (`#6D28D9`).

---

# 11. Decision Trees

## `colors` import or `useTheme()`?

```
Does this component need to render correctly in both dark and light
mode (i.e. it's inside the themed app, not a fixed-dark surface like
AuthNavigator's current background)?
  → Yes: useTheme().colors.
  → No, it's intentionally always-dark (rare, and should be justified
    in a comment, e.g. an always-dark splash surface): raw colors import.
```

## New reusable visual primitive: `src/components/` or `src/components/ui/`?

```
Is it a data/form primitive (buttons, inputs, cards, badges) with a
clear single semantic role?
  → src/components/ui/, exported from ui/index.ts.
Is it a brand/visual-identity primitive (logo, glass surface) with no
data-display semantics of its own?
  → src/components/ (top level, alongside GlassCard/GlassPill/Logo).
```

---

# 12. Real Project Examples

- **`src/components/ui/Button.tsx`** — the reference implementation, § 7.
- **`src/components/GlassCard.tsx`** — the four-layer glass composition, § 6.
- **`src/constants/colors.ts` vs `theme.ts`** — the two-file drift risk, § 4.
- **`src/screens/HomeScreen.tsx`'s `s.pill`** vs **`src/components/GlassPill.tsx`** — two unreconciled pill patterns, § 6.

---

# 13. Common Mistakes

- Hardcoding a sugar hex value instead of `colors.violet`/`useTheme().colors.violet`.
- Adding a new text style with numbers that don't match `typography.ts`'s scale, widening the drift described in § 5.
- Using `GlassCard`/`GlassPill` in a context that isn't dark-appropriate without checking the hardcoded `tint="dark"` first.
- Building a new "pill" component instead of checking whether `GlassPill.tsx` or `HomeScreen.tsx`'s `s.pill` pattern should be reused/promoted.

---

# 14. Best Practices

- Copy `Button.tsx`'s structure (branch by structural variant, theme-aware colors, `isDisabled` collapse, style-array merge order) for any new interactive component.
- When editing brand colors, update `colors.ts` and `theme.ts`'s `dark` object together, in the same commit, until they're consolidated.
- Default every new component's visual design to dark mode first, verify light mode second.
- Prefer `useTheme().colors` over the raw `colors` import for any component that could plausibly render in both themes.

---

# 15. Checklist

- [ ] No hardcoded sugar hex values — reads from `colors` or `useTheme().colors`.
- [ ] Component verified in both dark and light mode if it's theme-aware.
- [ ] New text styles checked against `typography.ts`'s scale.
- [ ] `colors.ts`/`theme.ts` updated together if brand values change.
- [ ] Follows `Button.tsx`'s style-array merge order for new components.

---

# 16. FAQ

**Is NativeWind actually used anywhere?**

It's configured (`tailwind.config.js`, `global.css` import in `App.tsx`) but no component currently uses `className` for sugar colors — every real component uses `StyleSheet.create()`. Treat NativeWind as available infrastructure, not the established convention, until a component actually adopts it.

**Why does `GlassCard` use `BlurView` instead of a plain semi-transparent `View`?**

`BlurView` (expo-blur) blurs whatever renders behind it, producing the "frosted glass over content" effect; a plain semi-transparent `View` would only tint, not blur, the background.

**Should I add a `useTypography()` hook?**

Only after confirming with `chief-architect` that consolidating `Typography.tsx` and `typography.ts` is worth doing now versus when the drift in § 5 actually causes a visible bug.

---

# 17. References

- [constitution.md](../constitution.md) — Design Principles.
- [context.md](../context.md) — Design Goals.
- [folder-structure.md](./folder-structure.md) — § 6, the shared-vs-feature-owned boundary this handbook's components sit inside.
- [animations.md](./animations.md) — motion conventions layered on top of these visual primitives.
- [accessibility.md](./accessibility.md) — contrast requirements against this palette.
