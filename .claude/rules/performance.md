---
id: rule-performance
title: Performance Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_components
  - all_screens
  - all_lists
last_updated: 2026-07-18
---

# Performance Rules

> Performance is designed. Not optimized afterward. Measure first. Optimize second. — `../constitution.md`, Performance Philosophy

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

The constitution explicitly warns against premature memoization, unnecessary rerenders, large component trees, expensive effects, and blocking rendering — and states these are prevented by design, not patched in later. This file translates that into rules for React Native rendering, list virtualization (target: `FlashList`, not yet installed), and image handling (target: `expo-image`, not yet installed).

---

# 2. Scope

Applies to every component, screen, and list in `src/`.

---

# 3. Rules

## Rule 1 — Do not add `React.memo`, `useMemo`, or `useCallback` without first identifying an actual rerender problem

**Why:** the constitution is explicit — "avoid premature memoization" is listed as a specific anti-pattern, not a stylistic preference. Every memoization hook has a real cost: `useMemo`/`useCallback` retain a dependency array comparison on every render and hold a reference alive, and `React.memo` adds a props-comparison pass before every potential skip. Applied where no expensive rerender exists, this is pure overhead disguised as an optimization. None of the current components (`Button.tsx`, `Card.tsx`, `Input.tsx`, `GlassCard.tsx`, etc.) use any memoization today — correctly, since none has been measured to need it. New components follow the same default: no memoization until a specific, measured rerender cost justifies it, per "measure first, optimize second."

## Rule 2 — When memoization is added, the PR states what was measured and what the memoization fixed

Not "this looked like it might rerender a lot" — an actual observation: React DevTools Profiler output, a visible frame drop, a specific prop that changes on every parent render and cascades to an expensive child.

**Why:** this makes Rule 1 enforceable in review — a memoization addition with no stated measurement is presumptively premature and gets pushed back on, per the constitution's "measure first" ordering.

## Rule 3 — Unbounded or large lists use `FlatList` today, migrate to `FlashList` once it's installed; `.map()` inside `ScrollView` is reserved for small, fixed-size content only

This duplicates `react-native.md` Rule 5 because it is specifically a performance rule, not just a component-choice rule: `@shopify/flash-list` is not in `package.json`. `DashboardScreen.tsx`'s `MOCK_STATS.map()` inside a `View` is correct today because it's four fixed items — this is not a pattern to extend to an unbounded list (a product catalog, a customer list, a chat history).

**Why `FlashList` specifically, once adopted:** it recycles views instead of mounting/unmounting them on scroll (unlike `FlatList`, which windows but still mounts/unmounts more aggressively), and uses an estimated-item-size heuristic to reduce layout thrash — both matter more as list length and item complexity grow, which is exactly the direction Sugar Admin's product/customer/chat lists are headed per `../context.md`'s Primary Features.

## Rule 4 — Images use `expo-image` once installed; until then, minimize decode cost by sizing source images correctly and never rendering a full-resolution remote image at thumbnail size

`expo-image` is not in `package.json` today; bare `Image` from `react-native` is the only option. `expo-image` (target) provides disk/memory caching, blurhash placeholders, and more predictable memory behavior than bare `Image` — relevant given `../context.md`'s Primary Features include AI-generated product images, marketing banners, and story templates, all of which imply rendering many remote images, often in list contexts.

**Why to flag rather than defer silently:** a feature that renders a grid of AI-generated product images today, using bare `Image` with no caching, will refetch and re-decode every image on every screen revisit — a real, measurable cost once that feature exists. Adopting `expo-image` is a deliberate dependency decision (`expo.md` Rule 4), not something to work around indefinitely with manual caching logic.

## Rule 5 — `expo-blur`'s `BlurView` (used in `GlassCard.tsx`) is expensive on Android; verify it, don't assume iOS performance characteristics transfer

`GlassCard.tsx` renders a `BlurView` with `intensity={55}` behind a `LinearGradient` sheen and content — a layered, GPU-composited effect. Blur effects are historically far more expensive on Android (often falling back to a software blur or a flat approximation depending on the RN/Expo version and device) than on iOS's native `UIVisualEffectView`-backed implementation.

**Why:** if `GlassCard` is used inside a scrolling list of cards (not just a single hero card, as it likely is today), the per-item blur cost could visibly drop frame rate on Android specifically — exactly the platform-divergent performance risk `react-native.md` Rule 7 requires designing for explicitly. Before using `GlassCard` inside any repeated/list context, verify Android frame rate on a real or representative device, not just the iOS simulator.

## Rule 6 — Expensive computation inside a render body (sorting, filtering, formatting a large list) happens once, upstream of the component, not per-render

If a screen needs a sorted/filtered view of query data, that transformation happens in the hook (e.g. inside the `useQuery`'s `select` option, which TanStack Query only re-runs when the underlying data changes) — not recomputed inline in the screen's render body on every render regardless of whether the source data changed.

**Why:** per the constitution — "expensive effects... blocking rendering" are explicitly called out. `useQuery`'s `select` (or a `useMemo` justified per Rule 2, if a hook isn't the right shape) exists precisely so a transformation runs only when its input actually changes, not on every unrelated rerender of the screen (e.g. a theme toggle, a sibling state update).

## Rule 7 — `App.tsx`'s `QueryClient` defaults (`staleTime: 5 minutes`, `retry: 2`) are the project baseline; a screen that needs fresher data overrides `staleTime` per-query, not globally

**Why:** a 5-minute `staleTime` means TanStack Query serves cached data without a network round-trip for up to 5 minutes after a successful fetch — this is a deliberate performance choice (fewer redundant requests) that suits dashboard-style, non-real-time data well. A screen with genuinely time-sensitive data (a live chat inbox, per `../context.md`'s Chat Center feature) overrides `staleTime` to `0` or a short value on its specific query, rather than lowering the global default and making every other screen refetch more aggressively than it needs to.

## Rule 8 — `newArchEnabled: false` (per `react-native.md` Rule 8) means Reanimated 4 animations should be verified for dropped frames on-device, not assumed smooth from Reanimated's own New-Architecture-oriented benchmarks

**Why repeated here:** this is a performance-specific consequence of a fact already stated in `react-native.md` and `animations.md` — Reanimated 4's UI-thread performance characteristics are documented and benchmarked primarily against the New Architecture, which this app currently has disabled. An animation that looks smooth in Reanimated's own demos is not guaranteed to perform identically here; profile on-device before treating an animation as performance-acceptable.

---

# 4. Good Examples

## Good: expensive transformation via `select`, not recomputed per render

```ts
export function useSortedProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => mockProductRepository.list({ page: 1, pageSize: 100 }),
    select: (result) => [...result.data].sort((a, b) => a.name.localeCompare(b.name)),
  });
}
```

This is good because the sort only re-runs when the underlying query data changes, not on every render of whatever screen consumes this hook.

---

# 5. Bad Examples

## Bad: memoizing without a measured reason

```tsx
// Added "just in case," no profiling done, no stated reason in the PR
const MemoizedStatCard = React.memo(function StatCard({ stat }: { stat: Stat }) {
  return <Card><Text>{stat.value}</Text></Card>;
});
```

**Consequence:** for `DashboardScreen`'s four-item `MOCK_STATS` grid, this adds a props-comparison cost to every render for a component that is already cheap to re-render fully — the "optimization" is net negative. Per Rule 1/2, this is rejected in review unless a specific measured cost is cited.

## Bad: sorting/filtering inline in a screen's render body

```tsx
export default function ProductListScreen() {
  const { data } = useProducts();
  const sorted = [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)); // re-sorts on every render
  return <FlatList data={sorted} ... />;
}
```

**Consequence:** this re-sorts the full list on every render of `ProductListScreen`, including renders triggered by unrelated state (a theme toggle, a sibling component's state change) that have nothing to do with the product data changing. Moving it into the query's `select` (per the Good Example) ties the recomputation to the actual data dependency.

---

# 6. Checklist

- [ ] No `React.memo`/`useMemo`/`useCallback` was added without a stated, measured reason.
- [ ] Unbounded/large lists use `FlatList` (or `FlashList`, once installed), never `.map()` inside `ScrollView`.
- [ ] New remote-image-heavy screens are flagged as `expo-image` migration candidates rather than silently accepting bare `Image`'s caching behavior.
- [ ] `GlassCard`/`BlurView` usage inside any repeated or list context was verified on Android, not just iOS.
- [ ] Expensive derived data is computed via `select` or a justified `useMemo`, not recomputed unconditionally in a render body.
- [ ] No global `staleTime`/`retry` change was made to serve one screen's needs; a per-query override was used instead.
- [ ] New Reanimated 4 animations were profiled on-device given `newArchEnabled: false`, not assumed performant from documentation alone.

---

# 7. References

- `../constitution.md` — Performance Philosophy, Mobile First
- `../context.md` — Performance Goals
- `react-native.md` — `FlashList`/`FlatList`, `newArchEnabled` context
- `expo.md` — `expo-image` as a deliberate dependency decision
- `animations.md` — Reanimated 4 performance verification
- `nativewind.md` — style-mechanism choice, tangential but relevant to render cost
