---
id: rule-animations
title: Animation Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_components
  - all_screens
last_updated: 2026-07-18
---

# Animation Rules

> Animations should communicate state. Never decorate for decoration's sake. — `../constitution.md`, Design Principles

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

`react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3` are installed and available. No component in `src/` currently uses either — the only motion in the codebase today is `TouchableOpacity`'s built-in `activeOpacity` fade (`Button.tsx` uses `0.85`/`0.8`, `IconButton.tsx` uses `0.7`, `GlassPill`/`HomeScreen.tsx` similarly). This file defines the conventions for the Reanimated code that gets written from here forward, and the specific `newArchEnabled: false` risk that applies to it.

---

# 2. Scope

Applies to any new animated component or transition using `react-native-reanimated` or `react-native-worklets`.

---

# 3. Rules

## Rule 1 — Every animation answers "what state is this communicating?" before it is written; if the honest answer is "nothing, it just looks nice," it is not built

**Why:** this is the constitution's Design Principles applied literally, not softened. A loading spinner communicates "the app is working, wait." A shake on a failed form field communicates "this input was rejected." A card that bounces in on mount communicates nothing except "look, motion" — it is decoration, and the constitution rejects decoration-for-its-own-sake explicitly, not as a soft preference to be weighed against visual appeal.

## Rule 2 — Reanimated's `useSharedValue` / `useAnimatedStyle` are the default mechanism for any animation driven by gesture or continuous state; the `Animated` API from `react-native` core is not introduced alongside it

**Why one library, not two:** `react-native-reanimated` and RN core's `Animated` solve the same problem with different execution models (Reanimated runs worklets on the UI thread; core `Animated` primarily orchestrates from the JS thread, even with `useNativeDriver`). Mixing both in the same codebase means every future engineer has to know two animation mental models and two sets of debugging tools for what should be one concern. Since Reanimated is already the installed, chosen library, it is the only one used going forward.

## Rule 3 — Worklets (`'worklet'` directive, or a function passed to `useAnimatedStyle`) contain no non-worklet-safe calls — no direct state setters, no arbitrary JS-thread function calls, no `console.log` left in committed code

```ts
const style = useAnimatedStyle(() => {
  'worklet';
  return { opacity: progress.value };
});
```

**Why:** a worklet runs on the UI thread, a fundamentally different execution context from the JS thread most of the app's logic runs on. Calling a JS-thread-only function (a Zustand setter, a non-worklet helper) from inside a worklet either throws or silently fails to do what's expected, depending on the specific call — this is a category of bug specific to Reanimated that doesn't exist in `Animated`-based code, and it's worth stating explicitly because nothing in the codebase has hit it yet (no Reanimated usage exists today) to serve as a cautionary example.

## Rule 4 — Reduced-motion preference is checked before any purely decorative animation runs; state-communicating animation may remain but is reduced in intensity where feasible

```ts
import { useReducedMotion } from "react-native-reanimated";

function useEntranceAnimation() {
  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(reduceMotion ? 0 : 20);
  // ...
}
```

**Why:** repeated from `accessibility.md` Rule 5 because it is specifically enforceable at the Reanimated code level — `react-native-reanimated` ships `useReducedMotion()` as a built-in hook, so there is no excuse (no extra dependency, no manual `AccessibilityInfo` wiring) for a new animation to skip this check.

## Rule 5 — `newArchEnabled: false` in `app.json` (per `react-native.md` Rule 8) means every new Reanimated 4 animation is verified on-device on both iOS and Android before merge, not assumed correct from Reanimated's documentation alone

**Why this is worth restating specifically for animations:** Reanimated 4's documented behavior and performance characteristics are written primarily against apps running the New Architecture. Running Reanimated 4 with the old architecture (Sugar Admin's current, deliberate `app.json` setting) is a real, if currently unmeasured, gap between "what the docs say" and "what this app actually does." An animation that reads correctly in Reanimated's own examples is not guaranteed to run identically here — a quick on-device check (does it run at 60fps, does the worklet actually execute, no visible stutter) is the verification step, not a nice-to-have.

## Rule 6 — Animation duration and easing are consistent across the app; a new animation does not invent a bespoke timing curve without checking whether an existing one already fits

**Why:** the constitution's Design Principles list "Fast. Predictable. Consistent." as the target feel. Two different loading spinners with different speeds, or two different screen-transition durations that feel subtly "off" relative to each other, undermine consistency even though neither is individually wrong. Since no animation constants currently exist in `src/constants/`, the first animation added should establish a small shared set (e.g. a `durations` and `easings` export near `src/constants/theme.ts`) rather than hardcoding a one-off value with no shared reference for the next animation to match.

## Rule 7 — Gesture-driven animation (swipe-to-dismiss, drag interactions) uses Reanimated's worklet-driven gesture handling, not a JS-thread `PanResponder` fallback

**Why:** `react-native-worklets` is installed specifically to support UI-thread gesture response — a `PanResponder`-based interaction, driven from the JS thread, will visibly lag behind a finger during a drag under any JS-thread congestion (a network response resolving, a re-render elsewhere), which is exactly the kind of "unnecessary rerenders... blocking rendering" cost the constitution's Performance Philosophy warns about. Since the dependency to do this correctly is already installed, there's no reason to fall back to the older, JS-thread-bound approach.

---

# 4. Good Examples

## Good: an entrance animation that respects reduced motion and communicates a real state (content has loaded)

```tsx
function ContentCard({ isLoaded, children }: { isLoaded: boolean; children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(isLoaded ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(isLoaded ? 1 : 0, { duration: reduceMotion ? 0 : 200 });
  }, [isLoaded]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }), []);
  return <Animated.View style={style}>{children}</Animated.View>;
}
```

This is good because it communicates a real state change (loaded vs. not), checks `useReducedMotion()`, and uses a bounded, short duration rather than an arbitrary "looks nice" curve.

---

# 5. Bad Examples

## Bad: a decorative bounce with no state to communicate

```tsx
useEffect(() => {
  scale.value = withSequence(
    withSpring(1.1),
    withSpring(1)
  ); // runs on every mount, regardless of any actual state change, purely for visual flourish
}, []);
```

**Consequence:** this animation exists purely to "feel nice," with no state it's communicating — per Rule 1, this does not get built. If a reviewer asks "what does this communicate?" and the honest answer is "nothing, it's decoration," the animation is removed or replaced with one that has a real justification.

## Bad: mixing `Animated` and Reanimated in the same component

```tsx
import { Animated } from "react-native";
import { useSharedValue } from "react-native-reanimated";

// both used in the same component for different properties
```

**Consequence:** two animation systems now need independent reasoning about thread execution, timing, and debugging for what is conceptually one animated component — a maintenance cost with no corresponding benefit, since Reanimated alone can express both properties.

---

# 6. Checklist

- [ ] Every new animation has a stated state it communicates; purely decorative motion is not added.
- [ ] `react-native-reanimated` is the only animation library used; RN core `Animated` is not introduced alongside it.
- [ ] No non-worklet-safe call is made from inside a worklet (`useAnimatedStyle`, `useDerivedValue`, gesture handlers).
- [ ] `useReducedMotion()` is checked for any decorative animation; state-communicating animation is reduced in intensity, not necessarily removed.
- [ ] New animations are verified on-device on both iOS and Android, given `newArchEnabled: false`.
- [ ] New duration/easing values check against an existing shared constant before introducing a bespoke one.
- [ ] Gesture-driven interactions use Reanimated's worklet-based gesture handling, not `PanResponder`.

---

# 7. References

- `../constitution.md` — Design Principles
- `../context.md` — Design Goals
- `react-native.md` § Rule 8 — `newArchEnabled: false` and its effect on Reanimated 4
- `accessibility.md` § Rule 5 — reduced-motion requirement in full
- `performance.md` § Rule 8 — the performance-verification angle on the same `newArchEnabled` gap
- `nativewind.md` § Rule 3 — why animated styles are never expressed as `className`
