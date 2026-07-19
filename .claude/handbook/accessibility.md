---
id: handbook-accessibility
title: Accessibility Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Accessibility Handbook

> "Accessibility bugs are functional bugs." — constitution.md, Accessibility

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Current State, Verified
5. Touch Targets, In Depth
6. Screen Reader Labels, In Depth
7. Dynamic Type, In Depth
8. RTL Is Not An Edge Case — It Is the Default
9. Contrast Against the Real Sugar Palette
10. Reduced Motion
11. Good Examples
12. Bad Examples
13. Decision Trees
14. Real Project Examples
15. Common Mistakes
16. Best Practices
17. Checklist
18. References

---

# 1. Purpose

`constitution.md`'s Accessibility section is not a wish list: "Support: Dynamic font scaling. Screen readers. Keyboard navigation where applicable. High contrast. Reduced motion. Touch target guidelines. Accessibility bugs are functional bugs." `context.md`'s Accessibility Goals repeat the same list and add "Clear navigation."

`.claude/rules/accessibility.md` already states the concrete rules (exact touch-target numbers, the `accessibilityLabel`/`accessibilityRole` requirement, the contrast threshold) and `.claude/agents/33-accessibility-reviewer.md` already states how those rules are enforced in review. This handbook does not restate either — it explains **why** each rule is shaped the way it is, walks through the actual current gap in this codebase in enough depth that an engineer can reason about a case the rules file doesn't spell out verbatim, and shows the worked examples (contrast math, RTL layout reasoning) that make the rules file's checklist items executable rather than aspirational.

---

# 2. Scope

In scope: the reasoning behind touch-target sizing, screen-reader labeling, dynamic type, RTL, contrast, and reduced motion, as they apply to Sugar Admin's actual components (`Button.tsx`, `IconButton.tsx`, `Input.tsx`, `GlassPill.tsx`, every screen) and actual palette (`src/constants/theme.ts`, `src/constants/colors.ts`).

Out of scope: the enforceable rule list itself (`.claude/rules/accessibility.md`), the review process and verdict authority (`.claude/agents/33-accessibility-reviewer.md`), and general color/typography tokens unrelated to contrast (`design-system.md`).

---

# 3. Principles

Grounded in:

- **Accessibility** (constitution.md) — "Accessibility bugs are functional bugs," listed as mandatory alongside Correctness, not as a lower-priority nice-to-have.
- **Accessibility Goals** (context.md) — dynamic text sizes, screen readers, reduced motion, accessible color contrast, large touch targets, clear navigation.
- **Mobile First** (constitution.md) — "touch interactions... accessibility" are named explicitly as pre-implementation considerations, not post-hoc fixes.
- **Design Principles** (constitution.md) — "the interface should feel... accessible... animations should communicate state... never decorate for decoration's sake" — the same sentence that governs § 10's reduced-motion reasoning also governs `design-system.md`'s visual conventions; the two are not separable.

---

# 4. The Current State, Verified

A search across `src/` for `accessibilityLabel` or `accessibilityRole` returns no matches, anywhere. Every `TouchableOpacity` in `src/components/ui/Button.tsx`, `Input.tsx`, `IconButton.tsx`, `Avatar.tsx`, `GlassPill.tsx`, and every screen (`LoginScreen.tsx`, `DashboardScreen.tsx`, `ContentScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx`, `HomeScreen.tsx`) currently ships with zero explicit accessibility props. This matches `.claude/agents/33-accessibility-reviewer.md` § 9's own finding exactly — it is not a description of a few missed spots, it is the literal starting point.

This matters for how you should read the rest of this document: nothing here describes a regression to fix. It describes a floor the codebase has not yet reached. `.claude/agents/33-accessibility-reviewer.md` § 7 Principle 5 states the correct remediation shape explicitly — close the gap **opportunistically**, one touched component at a time, never as a blocking big-bang retrofit on an unrelated diff. This handbook exists so that when a component *is* touched, the engineer touching it understands the reasoning well enough to fix it correctly the first time, not just paste in a plausible-looking prop.

---

# 5. Touch Targets, In Depth

`.claude/rules/accessibility.md` Rule 1 states the numbers: 44×44pt minimum on iOS, 48×48dp on Android, `hitSlop` for a smaller visual element. The number is not arbitrary — it comes from the two platforms' own Human Interface Guidelines / Material Design specs, and it is derived from measured fingertip contact-area studies, not house style.

The concrete violation to know about: `IconButton.tsx`'s default `size` is `40`, below both platform minimums. This is not a cosmetic quibble — below the minimum, tap accuracy measurably degrades for *every* user, not only users with a diagnosed motor-control condition: someone on a moving bus, someone with cold or wet hands, someone glancing at the screen while also watching where they're walking, all miss a 40×40 target more often than a 44×44 or 48×48 one.

`hitSlop` is the correct fix, not a compromise: it expands the *tappable* area without changing the *visual* area, so the "sugar" aesthetic's preference for compact icon buttons (§ 6 of `design-system.md`) doesn't have to be redesigned to satisfy this rule — the two constraints (visual density, tap accuracy) are genuinely independent and `hitSlop` is exactly the tool that decouples them:

```tsx
<TouchableOpacity
  onPress={onPress}
  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // 40 visual + 16 total = 56pt effective
  style={{ width: 40, height: 40 }}
>
```

When `IconButton.tsx` is next touched, this is the specific, minimal fix — not a redesign of its default `size` prop, which would ripple into every call site.

---

# 6. Screen Reader Labels, In Depth

The reasoning behind Rule 2 (`.claude/rules/accessibility.md`) is worth internalizing rather than just applying: a screen reader does not "see" a component the way a sighted user does. It announces whatever the accessibility tree exposes — for a `<Text>` glyph like `IconButton.tsx`'s `"☀"` or `"☾"` (used in `HomeScreen.tsx`'s theme toggle), that is either the Unicode character's own name ("white sun with rays") or, depending on platform/font, nothing intelligible at all. Neither communicates "toggle light mode."

The fix is not "add any label" — it is "describe the action the control performs, not its current visual appearance." This distinction matters concretely for a *toggle*: labeling `HomeScreen.tsx`'s theme pill `"Sun icon"` is technically present but useless; labeling it `isDark ? "Switch to light mode" : "Switch to dark mode"` tells a screen reader user exactly what will happen if they activate it, mirroring how a sighted user reads the icon's meaning contextually.

`Input.tsx`'s password-visibility toggle (`◉`/`○` glyph inside a `TouchableOpacity`) is the concrete, current, nameable example in `.claude/agents/33-accessibility-reviewer.md` § 9 — worth reading there for the exact fix (`accessibilityLabel={hidden ? "Show password" : "Hide password"}`, `accessibilityRole="button"`), because it demonstrates the pattern this section describes on a real file, not a hypothetical.

`accessibilityRole` matters independently of the label: a screen reader user commonly navigates by role ("swipe to next button," "swipe to next heading"), not just linearly through the tree. A control with no role either doesn't appear in that navigation mode, or appears generically ("other element"), which breaks the navigation model the whole feature depends on — this is why Rule 3 requires an explicit role even where React Native infers a reasonable default for `TouchableOpacity`, and requires it unconditionally for a bare `View` made tappable via `onPress` with no `Touchable*` wrapper at all, where no default exists.

---

# 7. Dynamic Type, In Depth

React Native's default (`allowFontScaling={true}`) already respects the system's font-scale setting; the actual risk is a future engineer disabling it "to protect a layout" under deadline pressure. `.claude/rules/accessibility.md` Rule 4 names this precisely.

The reasoning worth internalizing: a low-vision user's increased system font size is not a cosmetic preference the way a color theme is — for that user, it is often the difference between being able to read the screen at all and not. Trading that off for a tighter layout is not a neutral design decision; it is closing off the app to exactly the users this constitutional requirement exists to protect. When a larger font size breaks a layout (overflow, truncation, an icon and label colliding), the correct fix is a more flexible layout — `flexShrink`, `numberOfLines` paired with a way to reach the full text another way (not just silent truncation), or a scrollable container — never `allowFontScaling={false}`.

Sugar Admin's own `Typography.tsx` components (`Heading`, `Body`, `Caption`, etc., per `design-system.md` § 5) use hardcoded `fontSize` values but do not disable scaling — this is the correct current state to preserve as `Typography.tsx` evolves, including when it's eventually wired to `typography.ts`'s scale (`design-system.md` § 5's flagged drift).

---

# 8. RTL Is Not An Edge Case — It Is the Default

`src/context/LanguageContext.tsx` defaults to `lang: "fa"`, `isRTL: true`. This is worth stating plainly because it inverts a common assumption: for most React Native apps, RTL is a secondary mode tested occasionally before a release. For Sugar Admin, given its target users (`context.md`'s Target Users, `context.md`'s Supported Platforms leaning toward Instagram/Telegram/Bale/Rubika/Eita businesses that plausibly operate in Farsi-speaking markets), RTL is the literal default rendering path most real users will actually experience first.

Every current screen (`LoginScreen.tsx`, `DashboardScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx`, `HomeScreen.tsx`) already branches manually per text element:

```tsx
<Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
  {isRTL ? "خلاصه وضعیت" : "Overview"}
</Text>
```

This pattern works, but it is **manual and per-element**, not a global layout-direction flip via React Native's `I18nManager`. That has a real consequence worth naming: correctness is not guaranteed by "the app supports RTL" as a blanket claim — it is only as correct as the last engineer's diligence in applying `isRTL` to *every* new text element, icon position, and `flexDirection: "row"` sequence they add. A new screen that copies 90% of this pattern but misses one `flexDirection: "row"` (which should become `"row-reverse"` in RTL, or use `flexDirection: isRTL ? "row-reverse" : "row"`) produces a subtly broken layout for the majority of the app's actual users, not an edge case affecting a minority.

This is why `.claude/agents/33-accessibility-reviewer.md` § 7 Principle 2 treats RTL review with the same rigor as LTR review, every time, not as an occasional spot-check — and why this handbook frames it as an accessibility concern specifically, not only an i18n one: a broken RTL layout doesn't just look wrong, it can make controls genuinely hard to locate or operate for the language the app defaults to.

---

# 9. Contrast Against the Real Sugar Palette

"It's a dark theme" is not evidence of sufficient contrast — a mid-gray on near-black can still fail WCAG AA depending on the exact values, and Sugar Admin's palette has at least one color pairing that sits right at the threshold. The worked calculation, reproduced from `.claude/agents/33-accessibility-reviewer.md` § 10 because every engineer touching text color should be able to redo this math themselves, not just trust a cached conclusion:

```
bg:            #07080F
textMuted:     #6B7280
```

Relative luminance of `#6B7280` ≈ 0.207. Relative luminance of `#07080F` ≈ 0.0026.
Contrast ratio = (0.207 + 0.05) / (0.0026 + 0.05) ≈ **4.9:1**.

This clears WCAG AA's 4.5:1 minimum for normal text — but only just, and it does **not** clear AAA's 7:1. The practical rule this implies: `textMuted` is acceptable for genuinely secondary/de-emphasized body text (`Caption`, `Muted` typography components, per `design-system.md` § 5) but should not become the *only* differentiator on small, dense text where legibility matters more than de-emphasis (a critical status label, a timestamp someone actually needs to read at a glance). For that content, prefer `textSecondary` (`#E5E7EB`), which sits far higher above the AA floor.

`textFaint` (`rgba(255,255,255,0.15)` in the dark theme) is intentionally, deliberately low-contrast — used for genuinely decorative content like `HomeScreen.tsx`'s footer copyright text. It is correct there and would be a real accessibility bug anywhere a user needs to actually read the text to use the app.

The rule this handbook adds beyond the reviewer's checklist: **do this calculation, or a close defensible approximation, for every new text/background pairing before shipping it** — not as a formality, but because "looks readable on my screen" varies wildly by device brightness and ambient light, and the actual users of a "manage your business from your phone" app (per `context.md`'s Vision) are frequently outdoors, in variable lighting, glancing at the screen quickly.

---

# 10. Reduced Motion

Sugar Admin has very little animation today beyond `TouchableOpacity`'s built-in `activeOpacity` fade — `react-native-reanimated` is installed (`package.json`, version 4.3.1) but no current screen uses it for a meaningful transition. This section is therefore mostly forward-looking, but the distinction it establishes matters before the first real animation is built, not after.

Per constitution.md's Design Principles — "animations should communicate state... never decorate for decoration's sake" — there are exactly two categories of animation, and they get opposite treatment under reduced motion:

- **Decorative motion** (a card that bounces on load, a background gradient that pulses) communicates nothing a static frame couldn't. Skip or disable it entirely when `AccessibilityInfo.isReduceMotionEnabled()` (or Reanimated's `useReducedMotion()` equivalent) reports the preference is on.
- **State-communicating motion** (a loading spinner, a progress indicator, a swipe-to-dismiss gesture's follow-through) *is* the information. Removing it entirely would remove something the user needs — instead, scale it down (fewer oscillations, shorter duration) where feasible, but don't delete it.

The reason this distinction is worth stating explicitly, rather than a blanket "respect reduced motion": conflating the two categories produces either an app that ignores a real accessibility preference (never checking it) or one that becomes confusing under reduced motion (a loading state silently disappears because the spinner that indicated it was also flagged "just an animation" and removed).

---

# 11. Good Examples

**Good: a fully-treated icon control** (also shown in `.claude/rules/accessibility.md` § 4, reproduced here because it's the reference shape every new interactive component should match):

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

Role, action-describing label, and an expanded hit area compensating for a below-minimum visual size — all three concerns from § 5–6 addressed in one control, none of them in conflict with the visual design.

---

# 12. Bad Examples

**Bad: `HomeScreen.tsx`'s current, real, unmodified toggle pattern.**

```tsx
<TouchableOpacity onPress={toggleTheme} style={s.pill}>
  <Text style={s.pillText}>{isDark ? "☀" : "☾"}</Text>
</TouchableOpacity>
```

No role, no label. A screen reader user hears the raw glyph, or nothing useful, with no indication this toggles the theme. This is not a hypothetical — it is the literal current state of a shipped file, cited exactly as `.claude/agents/33-accessibility-reviewer.md` § 9 and `.claude/rules/accessibility.md` § 5 both cite it, because it's the single clearest real example in the repo.

**Bad: assuming a dark theme is automatically high-contrast.**

Approving a new `textFaint`-on-`bg` pairing for a status label a user needs to read, on the reasoning "it's dark mode, it'll be fine" — without running § 9's calculation — is exactly the anti-pattern `.claude/agents/33-accessibility-reviewer.md` § 13 names: "guessing contrast is 'probably fine because it's a dark theme.'"

---

# 13. Decision Trees

## Does this new interactive element need an explicit accessibility treatment?

```
Is it rendered via a Touchable*/Pressable wrapper, or a View with onPress?
  → Always: add accessibilityRole matching its function ("button", "link", etc.)
Does it contain only an icon/glyph, no visible descriptive text?
  → Yes: accessibilityLabel is mandatory, describing the ACTION, not the glyph.
  → No, it has adjacent visible text describing its action already:
      → accessibilityLabel is still recommended if the visible text alone
        would be ambiguous out of context (e.g. a bare "Delete" button in
        a list of many rows — "Delete product: <name>" is clearer).
Is its visual size below 44x44pt / 48x48dp?
  → Yes: add hitSlop to compensate. Do not enlarge the visual element
    unless the design system update is intentional and separately reviewed.
```

## Is this text/background pairing safe to ship without recalculating contrast?

```
Is it one of the palette's already-verified pairings (textPrimary/bg,
textSecondary/bg, textMuted/bg — see § 9)?
  → Yes: safe, no new calculation needed.
  → No, it's a new pairing (a new semantic color, a new background surface,
    an opacity-adjusted color):
      → Calculate the ratio (§ 9's method) before shipping. Never estimate
        visually.
```

---

# 14. Real Project Examples

- **`src/components/ui/IconButton.tsx`** — default `size: 40`, below both platform touch-target minimums (§ 5).
- **`src/components/ui/Input.tsx`**'s password-visibility toggle — the concrete, current, unlabeled control cited by `.claude/agents/33-accessibility-reviewer.md` § 9 (§ 6).
- **`src/screens/HomeScreen.tsx`**'s theme/language toggle pills — the current, unmodified bad example (§ 12).
- **`src/context/LanguageContext.tsx`** — `lang: "fa"`, `isRTL: true` by default, the concrete basis for § 8.
- **`src/constants/theme.ts`**'s `dark.textMuted` (`#6B7280`) on `dark.bg` (`#07080F`) — the ~4.9:1 borderline-AA pairing worked in § 9.

---

# 15. Common Mistakes

- Adding an `accessibilityLabel` that restates visible text or the glyph itself (`"Sun icon"`) instead of describing the action (`"Switch to light mode"`).
- Fixing a below-minimum touch target by enlarging the visual element instead of using `hitSlop` — this silently changes the design system's density without a separate design review.
- Reviewing a new screen only in `en`/LTR and treating `fa`/RTL as a secondary check, when RTL is this app's actual default.
- Assuming a color "looks fine" on a dark background without calculating its actual contrast ratio against the specific background it renders on.
- Disabling `allowFontScaling` to fix a layout overflow instead of fixing the layout.
- Deleting a loading spinner's animation entirely under "respect reduced motion" when the spinner is state-communicating, not decorative (§ 10).

---

# 16. Best Practices

- When touching any existing `Touchable*`/`Pressable` element for any reason, close its accessibility gap in the same diff (per `.claude/agents/33-accessibility-reviewer.md` § 7 Principle 5) rather than leaving it for a future pass that may never come.
- Write the `accessibilityLabel` by imagining you are describing the control over the phone to someone who cannot see the screen at all — "what happens if I tap this" is the right framing, not "what does this look like."
- Verify every new screen in both `fa` and `en` before merge, not just the language you happen to be developing in.
- Run § 9's contrast calculation (or a close approximation) for any new text/background pairing before shipping it, and default to `textSecondary` over `textMuted` when in doubt about legibility needs.
- Treat `hitSlop` as the default tool for reconciling a compact visual design with the mandatory touch-target minimum — not a workaround to reach for reluctantly.

---

# 17. Checklist

- [ ] Every new/touched interactive element has an explicit `accessibilityRole`.
- [ ] Every icon-only or ambiguous control has an `accessibilityLabel` describing the action, not the glyph.
- [ ] Every touchable meets 44×44pt (iOS) / 48×48dp (Android), using `hitSlop` where the visual element is smaller.
- [ ] No `allowFontScaling={false}` was introduced.
- [ ] New text/background pairings have a stated, calculated contrast ratio (§ 9), not a visual guess.
- [ ] The screen was verified in both `fa` (RTL) and `en` (LTR).
- [ ] Any new animation is classified decorative vs. state-communicating, and reduced-motion is respected accordingly.

---

# 18. References

- [constitution.md](../constitution.md) — Accessibility, Design Principles, Mobile First.
- [context.md](../context.md) — Accessibility Goals.
- [.claude/rules/accessibility.md](../rules/accessibility.md) — the enforceable rule list this handbook explains.
- [.claude/agents/33-accessibility-reviewer.md](../agents/33-accessibility-reviewer.md) — review authority, current-state findings, contrast standard.
- [design-system.md](./design-system.md) — the sugar palette and typography tokens referenced in § 9.
- [../../src/context/LanguageContext.tsx](../../src/context/LanguageContext.tsx) — the RTL default discussed in § 8.
- [../../src/constants/theme.ts](../../src/constants/theme.ts) — real hex values used in § 9's calculation.
