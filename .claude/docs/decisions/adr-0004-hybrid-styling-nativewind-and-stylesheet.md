---
id: adr-0004-hybrid-styling-nativewind-and-stylesheet
title: Hybrid Styling — NativeWind Utility Classes Plus StyleSheet.create
category: decision
status: Accepted
date: 2026-07-18
deciders: Engineering
---

# ADR-0004: Hybrid Styling — NativeWind Utility Classes Plus StyleSheet.create

## Status

Accepted, de facto. This ADR documents a pattern that was already consistently in use across the codebase before being formally decided; no `architecture-proposal.md` review preceded the pattern's adoption. It is written up now, honestly labeled as retroactive, per this project's ADR template Instructions ("An ADR describing a decision that was made *without* going through review... should say so honestly in Status").

## Context

`context.md`'s Technology Stack section names NativeWind as Sugar Admin's styling solution, and `package.json` confirms `nativewind` (4.2.5) and `tailwindcss` (3.4.19) are installed, with `tailwind.config.js` configured with a full custom `sugar` color palette (`sugar-bg`, `sugar-violet`, `sugar-pink`, `sugar-text-primary`, etc.) and `content` globs covering `App.tsx`, `src/**/*`, `components/**/*`, `screens/**/*`.

The actual, observed styling code does not use NativeWind utility `className` props as its primary mechanism. `src/components/ui/Button.tsx` and `src/screens/HomeScreen.tsx` — both read in full — are written entirely with React Native's `StyleSheet.create`, driven by a theme-aware color object:

```tsx
// src/components/ui/Button.tsx — current, real, entire styling approach
import { useTheme } from "../../context/ThemeContext";
// ...
export default function Button({ label, onPress, variant = "primary", ... }: Props) {
  const { colors } = useTheme();
  // ...
  return (
    <LinearGradient colors={[colors.violet, colors.pink]} /* ... */ style={styles.gradient}>
      {/* ... */}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap:         { borderRadius: 14, overflow: "hidden" },
  gradient:     { paddingVertical: 15, alignItems: "center", borderRadius: 14 },
  disabled:     { opacity: 0.45 },
  labelPrimary: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },
});
```

`src/screens/HomeScreen.tsx` follows the identical pattern at larger scale: a `makeStyles(colors: ThemeColors)` function that returns a `StyleSheet.create(...)` object, called with the current theme's `colors` on every render, driven by `useTheme()` from `src/context/ThemeContext.tsx`. `ThemeContext.tsx` itself (read in full) exposes `colors: ThemeColors` — an object with dozens of semantic keys (`bg`, `surface`, `violet`, `violetLight`, `pink`, `textPrimary`, `border`, `btnSecondaryBg`, glow opacities, etc.) sourced from `src/constants/theme.ts`'s `dark`/`light` palettes, switched at runtime based on `useColorScheme()` and a manual `toggleTheme()`.

No NativeWind `className` usage was found in either file. `Button.tsx`'s color values (`colors.violet`, `colors.pink`) are the same violet/pink brand colors `tailwind.config.js` also defines as `sugar-violet` and `sugar-pink` utility classes — the same design tokens exist in two parallel forms today (a static Tailwind config and a runtime JS theme object), not yet unified.

## Decision

Sugar Admin uses both NativeWind (Tailwind-style utility classes) and React Native's `StyleSheet.create`, deliberately, rather than committing exclusively to one. The de facto rule already observed in the codebase — now made explicit — is:

- **Static, non-theme-dependent layout** (spacing, flex layout, simple structural styling that does not change between light/dark mode) is a reasonable candidate for NativeWind utility classes.
- **Theme-driven, dynamic styling** — anything that must read the current `ThemeColors` object at render time (background colors, brand gradient colors, border colors, glow effect opacities, or any value that must swap between `dark`/`light` at runtime via `ThemeContext`) is written with `StyleSheet.create` inside a `makeStyles(colors)` function, or inline `style` props referencing `colors.*` directly, as `Button.tsx` and `HomeScreen.tsx` both do today.

This is a decision about which tool to reach for, not a mandate to rewrite existing `StyleSheet`-based components into NativeWind, nor a mandate to migrate NativeWind's installed-but-underused utility classes out.

## Consequences

**Positive:**
- Theme-driven values map naturally onto `StyleSheet.create` plus a `colors` object — `makeStyles(colors)` is a plain function, fully typed against `ThemeColors`, that TypeScript can check exhaustively. NativeWind's static utility classes (`bg-sugar-violet`) have no equivalent runtime branching mechanism for "use this color, unless the user is in light mode, in which case use that one" without either duplicating className strings behind a ternary or introducing NativeWind's separate `dark:` variant convention on top of a custom (not Tailwind's default) dark-mode source of truth (`ThemeContext`'s own `mode` state, not the OS-level `dark` media feature NativeWind's `dark:` variant assumes by default).
- Two design-token sources (`tailwind.config.js`'s `sugar.*` palette and `src/constants/theme.ts`'s `dark`/`light` objects) currently agree on the brand colors (violet `#7C3AED`, pink `#DB2777` match `tailwind.config.js`'s `sugar-violet`/`sugar-pink`), so no visible inconsistency exists yet — but see Negative below.
- NativeWind remains available and installed for simpler, non-theme-dependent styling needs (e.g. a static layout wrapper, a fixed-spacing container) without requiring every component to adopt the heavier `makeStyles(colors)` pattern when it isn't needed — `constitution.md`'s Simplicity Wins favors using the lighter tool where the theme-dependency doesn't apply.

**Negative / accepted debt:**
- Two styling systems means two things to learn and two conventions to keep consistent — a new engineer must understand both `StyleSheet.create` plus `ThemeContext`'s `colors` object *and* NativeWind's utility class syntax, and must know, without a written rule until this ADR, which one to reach for in a new component. This ADR's Decision section is the first place that rule has been written down.
- The two design-token sources (`tailwind.config.js`'s `sugar.*` and `theme.ts`'s `dark`/`light` objects) are maintained by hand, separately, with no shared source of truth or generation step connecting them. They agree today by convention, not by construction — a future change to one (e.g. adjusting the violet brand color) could silently drift from the other if only one file is updated. Follow-up: no immediate action is required (per Technical Debt rules, the impact today is zero drift, verified), but any future design-token change should update both `tailwind.config.js` and `src/constants/theme.ts` in the same PR, and `60-documentation-engineer` should periodically re-verify they still agree.
- NativeWind (`nativewind` + `tailwindcss`, two dependencies) is installed and configured but, per the files actually inspected for this ADR, not exercised by the two most central UI files (`Button.tsx`, `HomeScreen.tsx`) — meaning some fraction of the installed dependency's value is not yet realized. This is not evidence to remove NativeWind (other, unread files in the codebase may use it, and it remains `context.md`'s stated choice for the parts of the UI that fit its static-utility-class model), but it is an honest observation: the "hybrid" in this ADR's title is currently weighted more heavily toward `StyleSheet.create` than toward NativeWind in the highest-traffic UI code inspected.

## Alternatives Considered

- **Pure NativeWind, no `StyleSheet.create`** — rejected. `context.md`'s Technology Stack names NativeWind as the styling choice, but a pure-NativeWind approach would require encoding `ThemeContext`'s runtime `dark`/`light` swap and Sugar Admin's ~20-key `ThemeColors` object as either (a) NativeWind's `dark:` variant, which assumes OS-level color scheme as its default trigger rather than this app's own explicit `toggleTheme()` state, requiring custom NativeWind configuration to redirect that trigger, or (b) CSS custom properties injected at runtime, which NativeWind supports but which none of the inspected code uses today. Given the working `ThemeContext` + `StyleSheet` pattern already covers this cleanly, migrating to pure NativeWind was rejected as churn with no functional benefit to the user, per `constitution.md`'s Simplicity Wins.
- **Pure `StyleSheet.create`, drop NativeWind entirely** — rejected. NativeWind is a real, intentional entry in `context.md`'s Technology Stack, and removing it would be a larger decision than this ADR's scope (it would also contradict the stated stack without the kind of explicit reconciliation ADR-0005 shows is required for a stack discrepancy of that magnitude). Static, non-theme-dependent styling is also plausibly faster to write in utility-class form, so removing the option has a real, if modest, cost.
- **A single unified design-token source, generating both `tailwind.config.js`'s colors and `theme.ts`'s `dark`/`light` objects from one file** — a legitimate future improvement, not rejected outright, but out of scope for this ADR (which documents the current de facto pattern, not a proposed change to it). Flagged as a candidate follow-up in Consequences above rather than adopted now, since no drift has actually occurred yet to justify the engineering cost.

## Sign-off

Engineering (retroactive documentation of a pattern already consistently implemented in `src/components/ui/Button.tsx`, `src/screens/HomeScreen.tsx`, and `src/context/ThemeContext.tsx`, none of which went through a prior `architecture-proposal.md` review before this pattern was adopted).

## Related Decisions

- **ADR-0001 (Feature-First Architecture)** — orthogonal to this ADR: styling approach is a cross-cutting concern (any feature's screens can use either tool) rather than something a feature folder's boundary affects. `.claude/handbook/design-system.md` is the shared reference this ADR expects both static-utility and theme-driven components to draw their actual color/spacing values from, regardless of which folder they live in.
- This ADR's "which tool for which situation" rule (Decision section above) is the first time that rule has been written down anywhere in the workspace — until this ADR, `ui-engineer` (`.claude/agents/22-ui-engineer.md`) had no single authoritative reference to point to when deciding between the two approaches for a new component; new component work should cite this ADR rather than re-deriving the rule from reading `Button.tsx` directly each time.
- No other ADR currently governs the two-design-token-source gap named in Consequences (`tailwind.config.js`'s `sugar.*` palette vs. `theme.ts`'s `dark`/`light` objects). If a unified token-generation approach is ever built, it should be recorded as a new ADR that explicitly supersedes this one's "two sources, kept in agreement by hand" acceptance.

## References

- `.claude/context.md` — Technology Stack (Styling: NativeWind)
- `.claude/constitution.md` — Simplicity Wins, Design Principles
- `src/components/ui/Button.tsx`, `src/screens/HomeScreen.tsx` — the real, current hybrid pattern this ADR documents
- `src/context/ThemeContext.tsx`, `src/constants/theme.ts` — the runtime theme source `StyleSheet`-based components read from
- `tailwind.config.js` — the parallel, static design-token source
- `.claude/handbook/design-system.md` — broader design-system conventions (color, spacing, typography)
- `.claude/knowledge/architecture-decisions.md` — § 7 (ADR-0004 summary)
