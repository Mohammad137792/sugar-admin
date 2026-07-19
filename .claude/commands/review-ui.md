---
id: command-review-ui
title: Review UI
category: command
version: 1.0.0
status: active
invokes_agent: ui-engineer
last_updated: 2026-07-18
---

# Command: Review UI

> Check a screen or component against Sugar Admin's "sugar" design system
> tokens and accessibility rules (touch target size, contrast, dynamic type,
> RTL). A joint pass between `ui-engineer` (design conformance) and
> `accessibility-reviewer` (accessibility conformance).

---

## Purpose

Sugar Admin's design tokens live in `src/constants/theme.ts` (the `dark` and
`light` `ThemeColors` objects, consumed through `useTheme()` in
`src/context/ThemeContext.tsx`) and `src/constants/typography.ts` (sizes,
weights, line heights, letter spacing). The Constitution's Design Principles
require the interface to feel "Fast. Predictable. Consistent. Minimal.
Accessible," and states plainly: "Never decorate for decoration's sake."

`review-ui` exists to catch the two most common ways a screen drifts from
this: (1) hand-rolled colors/spacing that bypass the theme tokens, and (2)
accessibility gaps that are invisible until a screen reader or a user with
low vision actually encounters them. Both are treated as functional bugs per
the Constitution's Accessibility section — not polish.

---

## When To Invoke

- A screen or component built by `react-native-engineer` or `ui-engineer` is
  ready for review before merge.
- A new reusable component is added to `src/components/ui/`.
- `review-feature.md`'s general pass flagged a screen for deeper UI/
  accessibility review (e.g. it introduces a new interaction pattern, custom
  gesture, or modal).

---

## Required Inputs

The invoker must supply:

1. **File path(s)** — the screen(s) or component(s) under review, e.g.
   `src/features/auth/screens/LoginScreen.tsx` or
   `src/components/ui/Button.tsx`.
2. **Theme mode(s) to check** — both `dark` and `light` by default (Sugar
   Admin ships both; see `theme.ts`), unless the invoker explicitly scopes
   to one.
3. **Whether this is a new component or a screen composing existing
   components** — determines whether raw token conformance (new component)
   or composition conformance (screen reusing `ui-engineer`'s components) is
   the primary check.

---

## Procedure

### Design Token Conformance (`ui-engineer`)

1. **Check for hard-coded colors.** Search the file for hex codes, `rgb()`,
   or `rgba()` literals that are not sourced from `useTheme().colors`. The
   one documented exception is `Button.tsx`'s `"#fff"` for text rendered
   directly on top of the violet-to-pink gradient, where the color is
   correct in both themes by design — see
   `.claude/docs/decisions/adr-0004-hybrid-styling-nativewind-and-stylesheet.md`
   for why this specific case is accepted. Any other hard-coded color is a
   finding.

2. **Check spacing and radius against existing convention**, not against an
   arbitrary spec — Sugar Admin does not have a formal spacing-scale token
   file yet, so the check is consistency with sibling components (e.g.
   `Button.tsx`'s `borderRadius: 14`, `Card.tsx`'s existing radius) rather
   than a fixed token lookup. Flag inconsistency, not deviation from a
   nonexistent rule.

3. **Check typography usage.** Font sizes and weights should come from
   `src/constants/typography.ts`'s `sizes`/`weights` scale or from the
   `Typography` component in `src/components/ui/Typography.tsx`, not
   arbitrary numbers inlined in a `StyleSheet.create` block.

4. **Check styling system usage matches the documented hybrid pattern.**
   Per `adr-0004`, Sugar Admin intentionally mixes NativeWind utility
   classes with `StyleSheet.create` plus `useTheme()` for values that must
   vary by theme (colors, gradients). A screen using raw NativeWind classes
   for colors that should be theme-aware (e.g. `className="bg-white"`
   instead of `{ backgroundColor: colors.surface }`) is a finding — it will
   not adapt to dark mode.

5. **Check component reuse.** Per `20-react-native-engineer.md`'s Anti
   Patterns, a screen that hand-rolls a `TouchableOpacity` with inline
   styles instead of using `Button`, `Input`, `Card`, etc. from
   `src/components/ui/` is a finding, not a style preference.

6. **Check both theme modes render sensibly.** Since `ThemeColors` defines
   distinct `dark` and `light` palettes, verify the component was not
   visually tuned for only one (e.g. a shadow or opacity value that only
   reads correctly against `dark.bg`'s near-black `#07080F`).

### Accessibility Conformance (`accessibility-reviewer`)

7. **Touch target size.** Every interactive element (`TouchableOpacity`,
   `Pressable`, icon buttons) must have an effective touch target of at
   least 44×44 points, per the Constitution's Accessibility section ("Touch
   target guidelines"). Check `IconButton.tsx` usages in particular — icon-
   only controls are the most common violation.

8. **Screen reader labels.** Every icon-only interactive element must carry
   `accessibilityLabel`. Every meaningful non-interactive grouping should
   carry an appropriate `accessibilityRole`. Decorative-only elements
   (background gradients, glows) should be marked
   `accessibilityElementsHidden` / `importantForAccessibility="no"` where
   supported, so screen readers don't announce noise.

9. **Dynamic type / font scaling.** Check that text does not use
   `allowFontScaling={false}` without a specific, documented reason (e.g. a
   fixed-width badge where scaling would break layout) — per the
   Constitution's "Dynamic font scaling" requirement, scaling should be the
   default, not the exception.

10. **Color contrast.** Check text-on-background combinations against the
    active theme's actual token values (e.g. `dark.textMuted` (`#6B7280`) on
    `dark.bg` (`#07080F`), `light.textMuted` (`#6E6E73`) on `light.bg`
    (`#F5F3FF`)) for WCAG AA contrast (4.5:1 for body text, 3:1 for large
    text). Flag any combination that falls short, and flag it against
    `ui-engineer` (token value is wrong for the theme) rather than the
    component (which correctly consumed the token).

11. **Reduced motion.** Any `react-native-reanimated` animation should
    respect `reduceMotion` where the interaction is decorative rather than
    state-communicating — per the Constitution's Design Principles,
    "Animations should communicate state" and per Accessibility, "Reduced
    motion" is a named requirement.

12. **RTL correctness.** Per `20-react-native-engineer.md` § 9, Farsi/RTL is
    the app's default locale (`LanguageContext.tsx` defaults `lang: "fa"`,
    `isRTL: true`), not an edge case. Check `textAlign`, `flexDirection`,
    and icon placement respond to `useLanguage().isRTL`, following
    `LoginScreen.tsx`'s existing pattern of branching per-string, or use
    logical properties (`start`/`end`) where the library supports them.

---

## Output Format

```
# UI Review: <file path(s)>

## Design Token Findings
- [ ] <finding>: <file:line if applicable> — <what token/pattern should be
  used instead>

## Accessibility Findings
- [ ] <finding>: <file:line if applicable> — <what the fix is>

## Theme Mode Check
Dark: <pass/fail + notes>
Light: <pass/fail + notes>

## Verdict
Pass | Pass with non-blocking notes | Blocked

## Follow-ups
<owning agent per finding — ui-engineer for token findings,
accessibility-reviewer or react-native-engineer for accessibility findings>
```

---

## Example Invocation

> Review `src/features/auth/screens/LoginScreen.tsx` for design token and
> accessibility conformance, both theme modes.

## Example Output

```
# UI Review: src/features/auth/screens/LoginScreen.tsx

## Design Token Findings
- [ ] LoginScreen.tsx imports `colors` from `../../../constants/colors`
  (a flat, single-mode color export) instead of `useTheme().colors` from
  ThemeContext — this means LoginScreen does not respond to dark/light
  toggling the way Button.tsx and other theme-aware components do. This is
  the single highest-priority finding: the screen is visually frozen to
  one palette while the rest of the app is theme-aware.

## Accessibility Findings
- [ ] No accessibilityLabel on the password Input's secure-entry toggle (if
  present in Input.tsx's secure variant) — verify Input.tsx exposes one;
  if not, this is an Input.tsx-level finding, not LoginScreen-level.
- [ ] Title text ("ورود به حساب" / "Sign In") uses fontSize: 28 inline
  rather than typography.sizes["3xl"] (30) or a defined scale step — minor,
  does not block, but drifts from constants/typography.ts.

## Theme Mode Check
Dark: FAIL — LoginScreen uses the flat `colors` import, not theme-aware;
renders identically regardless of ThemeProvider's mode.
Light: FAIL — same root cause.

## Verdict
Blocked

## Follow-ups
1. [blocking] react-native-engineer / ui-engineer: migrate LoginScreen.tsx
   from `constants/colors` to `useTheme().colors`, matching Button.tsx's
   pattern.
2. [non-blocking] ui-engineer: verify Input.tsx's secure-entry control has
   an accessibilityLabel; if missing, fix at the component level so every
   consumer benefits.
3. [non-blocking] ui-engineer: align inline font sizes with
   constants/typography.ts's scale.
```

---

## Related Agents

- `ui-engineer` — owns design token conformance; primary invocation target.
- `accessibility-reviewer` — owns accessibility conformance, joint pass with
  this command.
- `react-native-engineer` — implements fixes for screen-level findings.
- `reviewer` — folds this command's verdict into the overall feature review.

---

## References

- `.claude/constitution.md` — Design Principles, Accessibility.
- `.claude/docs/decisions/adr-0004-hybrid-styling-nativewind-and-stylesheet.md`
  — the styling system this review checks conformance against.
- `src/constants/theme.ts`, `src/constants/typography.ts` — the actual token
  source of truth.
- `src/context/ThemeContext.tsx`, `src/context/LanguageContext.tsx` — the
  hooks screens must consume for theme- and RTL-awareness.
- `.claude/agents/20-react-native-engineer.md` § 9, § 13 — RTL-as-default and
  component-reuse anti-patterns.
