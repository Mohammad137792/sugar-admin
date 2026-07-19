---
id: handbook-animations
title: Animations Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Animations Handbook

> "Animations should communicate state. Never decorate for decoration's sake." — constitution.md, Design Principles

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Toolchain: Reanimated 4 + Worklets 0.8
5. Current Reality: No Animation Code Exists Yet
6. What "Animations Communicate State" Means for This App
7. Good Examples
8. Bad Examples
9. Decision Trees
10. Real Project Examples
11. Common Mistakes
12. Best Practices
13. Checklist
14. FAQ
15. References

---

# 1. Purpose

Sugar Admin's dependencies include `react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3` — a modern, capable animation toolchain — but as of this writing, **no screen or component in `src/` uses either package.** This handbook sets the convention for how motion should be used once it is introduced, grounded in the constitution's specific, narrow mandate: animation communicates state, it does not decorate.

---

# 2. Scope

In scope: when Reanimated should be reached for versus React Native's built-in `Animated`/`LayoutAnimation`, the glass/gradient aesthetic's specific motion needs, and reduced-motion accessibility.

Out of scope: the visual tokens animations operate on (`design-system.md`), and the accessibility API for reduced-motion preference detection (`accessibility.md`).

---

# 3. Principles

Grounded in:

- **Design Principles** (constitution.md) — "Animations should communicate state. Never decorate for decoration's sake."
- **Performance Philosophy** (constitution.md) — "Avoid... blocking rendering... measure first, optimize second" — directly relevant since Reanimated's entire value proposition is running animations on the UI thread, off the JS thread, to avoid blocking rendering.
- **Accessibility** (constitution.md) — "Reduced motion" is explicitly listed as a mandatory accessibility support target.

---

# 4. The Toolchain: Reanimated 4 + Worklets 0.8

`react-native-reanimated@4.3.1` is installed alongside `react-native-worklets@0.8.3` — as of Reanimated 4, worklet infrastructure (the mechanism that lets animation code run on the UI thread instead of the JS thread) has been split into its own package, which is why both appear as separate dependencies in `package.json`. No `babel.config.js` plugin configuration for Reanimated was found alongside the standard Expo preset in this codebase's current state — verify the Babel plugin is correctly configured (Reanimated requires `react-native-reanimated/plugin` last in the Babel plugins array) before writing the first real animation, since a misconfigured plugin produces confusing runtime errors that look unrelated to animation code.

The core primitives this app should reach for, once animation work begins: `useSharedValue` (a value that can be mutated from a worklet without triggering a React re-render), `useAnimatedStyle` (derives a style object from shared values, evaluated on the UI thread), and `withTiming`/`withSpring` (the two interpolation functions matching the sugar aesthetic's "subtle" requirement — see § 6).

---

# 5. Current Reality: No Animation Code Exists Yet

Stated plainly: every transition in the app today is either instant (no animation) or provided implicitly by a library the app depends on for other reasons — React Navigation's default `native-stack` push/pop transition, `TouchableOpacity`'s built-in `activeOpacity` press-fade (used throughout: `Button.tsx`, `GlassPill.tsx`, `HomeScreen.tsx`'s buttons, all set `activeOpacity` between `0.75` and `0.85`).

No component uses `Animated` (React Native's built-in API) either. There is no loading skeleton animation, no list-item entrance animation, no gesture-driven interaction anywhere in `src/`. This matches the project's current phase honestly (`context.md`: Foundation, Early Development) — most screens are static placeholders (`ContentScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx` all render two `Text` elements and nothing else) with nothing yet worth animating.

---

# 6. What "Animations Communicate State" Means for This App

The constitution's rule is narrow and should be read narrowly: an animation must map to a state transition the user needs to understand, not be added because a screen "feels static." Applied to Sugar Admin's specific glass/gradient aesthetic:

**Loading → Success/Error transitions.** When a mock repository resolves after its simulated 150–800ms latency (`mock-api.md` § 4), the transition from a loading skeleton to populated content communicating "this just changed" is a legitimate use — a brief fade or subtle scale-in on the resolved content, not a bounce or attention-grabbing flourish.

**Button press feedback.** Already partially covered by `TouchableOpacity`'s `activeOpacity`; a Reanimated-based press animation (subtle scale-down on press, matching `Button.tsx`'s existing `activeOpacity={0.85}` restraint) would be a refinement, not a new category of motion — it communicates "your tap registered," which is a real state (pressed vs. not).

**Toast appearance/dismissal.** `uiStore.ts`'s `toast` field currently has no visual consumer at all — no component renders `useUIStore().toast` anywhere in the codebase yet. When a `Toast` component is built, its entrance/exit is a textbook legitimate animation use: it communicates "a new piece of information just appeared" and "it's now gone," both real state transitions.

**Navigation transitions.** React Navigation's default stack transition already communicates "you moved forward/backward in a hierarchy" — this is already covered, do not add a custom transition without a specific state-communication reason beyond "make it feel nicer."

**What does NOT qualify**, per "never decorate for decoration's sake": a looping ambient glow animation on `HomeScreen.tsx`'s `glowTopRight`/`glowBottomLeft` `View`s purely for visual interest, a staggered entrance animation on every `Card` in a list just because it "looks premium," or a gradient color-cycle animation on `Button`'s `LinearGradient`. None of these communicate a state change — they decorate a state that was already fully rendered.

---

# 7. Good Examples

**Good (target, not yet built): a loading-to-content fade using `useAnimatedStyle`.**

```tsx
// target pattern once the first real useQuery-backed screen exists
function ContentCard({ item, isLoading }: Props) {
  const opacity = useSharedValue(isLoading ? 0 : 1);
  useEffect(() => { opacity.value = withTiming(isLoading ? 0 : 1, { duration: 200 }); }, [isLoading]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={style}>{/* card content */}</Animated.View>;
}
```

This communicates a real transition (not-yet-loaded → loaded) with a short, purposeful duration (200ms — fast enough not to feel sluggish, per Design Principles' "Fast").

---

# 8. Bad Examples

**Bad (hypothetical, do not build): a decorative ambient pulse on the brand glow.**

```tsx
// bad — decoration, not state communication
useEffect(() => {
  glowOpacity.value = withRepeat(withTiming(0.15, { duration: 2000 }), -1, true);
}, []);
```

`withRepeat(..., -1, ...)` runs forever, communicates nothing about app state, costs battery (constitution's Mobile First explicitly names battery usage as a required consideration), and violates "never decorate for decoration's sake" directly.

---

# 9. Decision Trees

## Should this UI change be animated?

```
Does the animation correspond to a real state transition the user
needs to track (loading→success, appeared→dismissed, pressed→released,
navigated forward→back)?
  → Yes: animate it, briefly (150–300ms is the right range for most
    micro-interactions in this aesthetic — see § 6's fade example).
  → No: it's decoration. Do not add it, per constitution's Design
    Principles.
```

## Reanimated or React Native's built-in `Animated`/`LayoutAnimation`?

```
Does the animation need to run smoothly even if the JS thread is busy
(e.g. during a scroll, or a heavy re-render elsewhere)?
  → Yes: Reanimated (useSharedValue/useAnimatedStyle) — this is
    specifically what it's installed for.
Is it a one-off, simple layout change (e.g. a list item removal)?
  → LayoutAnimation may be simpler and sufficient — but confirm it
    doesn't conflict with Reanimated's UI-thread-driven layout in the
    same tree before mixing the two.
```

---

# 10. Real Project Examples

- **`Button.tsx`, `GlassPill.tsx`** — `TouchableOpacity`'s `activeOpacity` is the only motion-adjacent behavior in the codebase today, and it is correctly restrained (subtle opacity dip on press, not a bounce or scale).
- **`package.json`** — `react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3` present, unused. Verify Babel plugin wiring before first use, per § 4.
- **`src/store/uiStore.ts`'s `toast`** — the clearest concrete opportunity for a legitimate, state-driven animation once a `Toast` component is built (§ 6).

---

# 11. Common Mistakes

- Adding an animation because a screen "feels static," without identifying which specific state transition it communicates.
- Using `withRepeat(..., -1, ...)` (infinite loop) for anything that isn't communicating an ongoing process (e.g. an active loading spinner) — an infinite loop on decorative elements burns battery for no user benefit.
- Mixing React Native's `Animated` and Reanimated's `useAnimatedStyle` on the same element, which can produce conflicting style updates.
- Skipping the Babel plugin check (§ 4) and debugging a confusing runtime error that's actually a missing/misordered `react-native-reanimated/plugin`.

---

# 12. Best Practices

- Every animation's duration should default to 150–300ms — matching Design Principles' "Fast" — with longer durations reserved for genuinely large layout changes, never for micro-interactions.
- Write the state-transition justification as a code comment above any new `useAnimatedStyle`/`withTiming` call — if you can't articulate the state it communicates in one sentence, don't add it.
- Respect `AccessibilityInfo.isReduceMotionEnabled()` — check it before running any non-essential animation; see `accessibility.md`.
- Keep animation logic colocated with the component it animates — don't build a separate "animations" utility folder for what should be one component's `useAnimatedStyle` call.

---

# 13. Checklist

- [ ] Animation maps to a specific, nameable state transition, not general "feel."
- [ ] Duration is in the 150–300ms range unless a larger layout change genuinely justifies more.
- [ ] No infinite-loop animation on a purely decorative element.
- [ ] Reduced-motion preference respected before playing non-essential animation.
- [ ] Reanimated Babel plugin verified configured before first real usage.

---

# 14. FAQ

**Is Lottie or any other animation library planned?**

Not listed in `context.md`'s target stack and not a dependency today. Reanimated + Worklets is the full animation toolchain for this app; introducing a second animation library would need `chief-architect` sign-off.

**Should list-item entrance animations be added once FlashList is adopted?**

Only if they communicate something real (e.g. "these are newly arrived items since your last visit"), not as a default list-loading flourish — see § 6's "what does NOT qualify" list.

**Does the glass-morphism `BlurView` itself count as an "animation"?**

No — `BlurView`'s blur is a static rendering effect, not a state-driven transition, and is covered by `design-system.md`, not this handbook.

---

# 15. References

- [constitution.md](../constitution.md) — Design Principles, Performance Philosophy, Accessibility.
- [design-system.md](./design-system.md) — the visual primitives animation will eventually be layered onto.
- [performance.md](./performance.md) — re-render discipline relevant to animation code.
- [accessibility.md](./accessibility.md) — reduced-motion requirements.
