---
id: rule-accessibility
title: Accessibility Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_components
  - all_screens
last_updated: 2026-07-18
---

# Accessibility Rules

> Accessibility bugs are functional bugs. — `../constitution.md`, Accessibility

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

The constitution and `../context.md` both list accessibility as mandatory, not optional: dynamic type, screen readers, reduced motion, contrast, touch targets. A full search of `src/` today finds **zero** `accessibilityLabel`, `accessibilityRole`, or `accessibilityHint` props anywhere — every `TouchableOpacity` in `Button.tsx`, `IconButton.tsx`, `HomeScreen.tsx`'s theme/language toggles, and every screen's interactive element is currently accessible only by whatever React Native infers by default. This file states that gap and defines the concrete rules new and touched components must meet.

---

# 2. Scope

Applies to every interactive element, every piece of meaningful text, and every color pairing in `src/`.

---

# 3. Rules

## Rule 1 — Minimum touch target is 44×44pt on iOS, 48×48dp on Android; a smaller visual element gets a larger invisible hit area, not a smaller target

**Why these exact numbers:** 44×44pt is Apple's Human Interface Guidelines minimum tappable size; 48×48dp is Google's Material Design minimum. These are not arbitrary — below them, tap accuracy drops measurably for users with limited fine motor control, and even for users without any accessibility need, on a moving vehicle or with wet/cold hands. `IconButton.tsx`'s default `size = 40` is **below both minimums** — a real, current violation. `hitSlop` (React Native's built-in prop for expanding the tappable area beyond the visual bounds) is the fix when the visual design calls for a smaller icon than the minimum target:

```tsx
<TouchableOpacity
  onPress={onPress}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // 40 visual + 8*2 = 56pt effective tap area
  style={{ width: 40, height: 40 }}
>
```

## Rule 2 — Every non-text interactive element has an explicit `accessibilityLabel`; icon-only buttons never rely on the icon glyph alone

`IconButton.tsx` renders its `icon` prop as a raw `<Text>` character (e.g. `"◆"`, `"☀"`, `"☾"` as used in `HomeScreen.tsx`'s theme/language toggles) with no `accessibilityLabel`. A screen reader today announces these as their literal Unicode character name or nothing meaningful — "white sun with rays" is not "toggle light mode."

**Why:** per the constitution — "screen readers" is listed as mandatory support, and "accessibility bugs are functional bugs," meaning this isn't cosmetic polish, it's a broken feature for a screen-reader user. Every `IconButton` usage going forward passes an explicit label:

```tsx
<IconButton
  icon={isDark ? "☀" : "☾"}
  accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
  onPress={toggleTheme}
/>
```

(`IconButton.tsx`'s `Props` interface does not currently accept an `accessibilityLabel` — adding it is a one-line, low-risk change to make the next time `IconButton.tsx` is touched.)

## Rule 3 — Buttons and links carry `accessibilityRole="button"` (or the correct role for their function), not the default inferred role alone

`Button.tsx`'s `TouchableOpacity` has no explicit `accessibilityRole`. While React Native infers a reasonable default for `TouchableOpacity`, an explicit role is more reliable across platforms and RN versions, and is required for custom elements (e.g. a `View` made tappable via `onPress` without a `Touchable*` wrapper) where no default exists at all.

**Why:** a screen reader user navigates by role (swiping to the "next button," "next heading") — an element with an ambiguous or missing role either doesn't appear in that navigation mode, or appears as a generic, unlabeled "adjustable" or "other" element, breaking the navigation model the whole feature depends on.

## Rule 4 — Text scales with the system's font-size setting (Dynamic Type / Android font scale); font sizes are never locked with `allowFontScaling={false}`

No component in `src/` currently sets `allowFontScaling={false}`, which is correct — React Native's default (`true`) already respects the system setting. This rule exists to keep it that way: a future component must not disable scaling to "protect" a tight layout, because that trades a real accessibility need (a low-vision user's increased font size) for a cosmetic convenience.

**Why:** per the constitution and `../context.md` — "dynamic font scaling" / "dynamic text sizes" is explicitly mandatory. If a larger font size breaks a layout (text overflow, truncation), the fix is a more flexible layout (`flexShrink`, `numberOfLines` with an accessible alternative, or a scrollable container) — not disabling the user's accessibility setting for that screen.

## Rule 5 — Reduced motion is respected for any animation that is purely decorative; motion that communicates required state may remain, scaled down

React Native exposes `AccessibilityInfo.isReduceMotionEnabled()` (and a `useReducedMotion()` equivalent is available via `react-native-reanimated`, already installed). No current animation code checks this — there is very little animation in the codebase today beyond `TouchableOpacity`'s built-in `activeOpacity` fade.

**Why, and the distinction that matters:** per the constitution's Design Principles — "animations should communicate state... never decorate for decoration's sake" (see `animations.md` for the full rule). A decorative animation (a card that bounces on load, a background gradient that pulses) is skipped or reduced entirely when reduced motion is on. An animation that *is* the state communication (e.g. a loading spinner, a progress indicator) stays, because removing it entirely would remove the information it conveys — but its motion can still be toned down (fewer/slower oscillations) where feasible.

## Rule 6 — Color contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text/UI components) against the actual `sugar` dark palette in use

Checking real values from `src/constants/theme.ts`'s `dark` theme: `textPrimary: "#FFFFFF"` on `bg: "#07080F"` — contrast ratio is extremely high (>19:1), well above AA. `textMuted: "#6B7280"` on `bg: "#07080F"` — approximately 4.2:1, which is **below** the 4.5:1 AA threshold for normal-sized text. `textFaint: "rgba(255,255,255,0.15)"` on `bg` is intentionally very low contrast (used for `Muted` typography and footer text like `HomeScreen.tsx`'s `© 2025 Sugar Admin`) — acceptable only for genuinely decorative/non-essential text, never for anything a user needs to read to use the app.

**Why to flag `textMuted` specifically:** it's used for real, sometimes load-bearing content — `Caption` typography, form labels' secondary text, `Input.tsx`'s error text color reference pattern. A borderline-AA color used for content a user actually needs to read (not just decorative) is a real accessibility risk, not a hypothetical one. When introducing new text that must be legible (not purely decorative), verify its contrast ratio against the exact background it will render on, using the real hex values in `theme.ts` — do not assume a color "looks readable" on a dev's specific screen/brightness setting is sufficient.

## Rule 7 — RTL layout (Persian/Farsi, the app's default language per `LanguageContext.tsx`) is treated as a first-class accessibility and usability concern, not an afterthought

`LanguageContext.tsx` defaults to `lang: "fa"`, `isRTL: true`. Every current screen manually branches `textAlign: isRTL ? "right" : "left"` per text element (`LoginScreen.tsx`, `DashboardScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx`, `HomeScreen.tsx` all do this individually).

**Why this belongs in accessibility, not just i18n:** a layout that visually "works" in RTL but wasn't actually verified (icon directionality, `flexDirection: "row"` sequences that should flip, swipe-gesture direction) creates a confusing, effectively broken experience for the majority-Persian user base implied by `LanguageContext`'s default. Given every screen currently hand-manages `isRTL` per text element rather than using RN's `I18nManager` for a global layout-direction flip, any new screen must be manually verified in both `fa` and `en` modes before merge — RTL correctness is not guaranteed by following the existing per-element pattern blindly; each new element needs its own `isRTL` check applied consistently, per the existing (verbose but working) convention.

---

# 4. Good Examples

## Good: an icon button with a full accessibility treatment

```tsx
<TouchableOpacity
  onPress={toggleTheme}
  accessibilityRole="button"
  accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
>
  <Text>{isDark ? "☀" : "☾"}</Text>
</TouchableOpacity>
```

This is good because it has an explicit role, a label that describes the *action* (not the glyph), and an expanded hit area compensating for a 40pt visual size below the 44pt minimum.

---

# 5. Bad Examples

## Bad: `HomeScreen.tsx`'s current theme/language toggle pattern

```tsx
<TouchableOpacity onPress={toggleTheme} style={s.pill}>
  <Text style={s.pillText}>{isDark ? "☀" : "☾"}</Text>
</TouchableOpacity>
```

**Consequence:** exactly what exists in `src/screens/HomeScreen.tsx` today — no `accessibilityLabel`, no `accessibilityRole`. A screen-reader user hears the raw glyph or nothing useful, and cannot tell this control toggles the theme. This is not a hypothetical bad example; it is the current, unmodified code.

## Bad: disabling font scaling to protect a tight layout

```tsx
<Text allowFontScaling={false} numberOfLines={1}>{longLabel}</Text>
```

**Consequence:** a low-vision user who has increased their system font size sees this specific label rendered at a fixed, potentially too-small size while every other text element around it respects their setting — an inconsistent, and for that user, actively unreadable experience.

---

# 6. Checklist

- [ ] Every tappable element meets 44×44pt (iOS) / 48×48dp (Android), using `hitSlop` where the visual size is smaller.
- [ ] Every icon-only or non-text interactive element has an explicit `accessibilityLabel` describing the action, not the glyph.
- [ ] Interactive elements carry an explicit `accessibilityRole`.
- [ ] No component sets `allowFontScaling={false}`.
- [ ] Any new animation checks reduced-motion preference if it is decorative; state-communicating motion may remain but is evaluated for reduction.
- [ ] New text content's color is checked against its actual background using `theme.ts`'s real values — 4.5:1 for normal text, 3:1 for large text/UI components.
- [ ] New screens are manually verified in both `fa` (RTL) and `en` (LTR) modes before merge.

---

# 7. References

- `../constitution.md` — Accessibility (mandatory), Design Principles
- `../context.md` — Accessibility Goals
- `nativewind.md` / `react-native.md` — component patterns these rules apply within
- `animations.md` — reduced-motion handling in Reanimated code
- `../../src/constants/theme.ts` — real color values this file's contrast rule checks against
- `../../src/context/LanguageContext.tsx` — the RTL default this file's Rule 7 addresses
