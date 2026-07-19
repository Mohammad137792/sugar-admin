---
id: handbook-performance
title: Performance Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Performance Handbook

> "Performance is designed. Not optimized afterward... Measure first. Optimize second." — constitution.md, Performance Philosophy

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. Startup Cost, As It Exists Today
5. List Rendering: Current Reality vs. FlashList Target
6. Image Handling: Current Reality vs. expo-image Target
7. TanStack Query Cache Tuning, Explained
8. Re-render Discipline, Worked Through
9. Good Examples
10. Bad Examples
11. Decision Trees
12. Real Project Examples
13. Common Mistakes
14. Best Practices
15. Checklist
16. References

---

# 1. Purpose

`.claude/rules/performance.md` already states the eight enforceable rules — no premature memoization, `FlatList` today/`FlashList` later, `expo-image` once installed, `App.tsx`'s `QueryClient` defaults, and more — each with a "why." This handbook does not restate them. It walks through the reasoning at a level a rule file's per-rule "why" paragraph doesn't have room for: why `retry: 2, staleTime: 5min` were the specific numbers chosen, what "measure first" actually means to do in a codebase with zero profiling tooling installed, and how the gap between the currently-installed stack (`FlatList`, bare `Image`) and the target stack (`FlashList`, `expo-image`) should shape decisions made *today*, before either target dependency exists.

---

# 2. Scope

In scope: startup composition cost, the `FlatList`-today/`FlashList`-target reasoning, the `Image`-today/`expo-image`-target reasoning, the exact reasoning behind `App.tsx`'s `QueryClient` defaults, and re-render discipline as it applies to this codebase's actual component patterns.

Out of scope: the enforceable rule list (`.claude/rules/performance.md`), the review role and authority (`.claude/agents/31-performance-reviewer.md`), and animation-specific performance concerns (`animations.md`).

---

# 3. Principles

Grounded in:

- **Performance Philosophy** (constitution.md) — "avoid premature memoization, unnecessary rerenders, large component trees, expensive effects, blocking rendering. Measure first. Optimize second."
- **Mobile First** (constitution.md) — "device performance, battery usage" are pre-implementation considerations, not post-hoc concerns, alongside "network interruptions."
- **Simplicity Wins** (constitution.md) — the same principle that argues against premature abstraction argues against premature optimization; both add complexity for a benefit that hasn't been demonstrated.
- **Core Values ordering** (constitution.md) — Performance ranks seventh of nine, below Correctness, Simplicity, Maintainability, Readability, Testability, Scalability. A performance change that costs readability or introduces a new abstraction needs to justify that trade, not assume performance automatically wins.

---

# 4. Startup Cost, As It Exists Today

`App.tsx`'s entire composition root, read top to bottom (also documented in full in `architecture.md` § 4, cited here specifically for its startup-cost implications):

```tsx
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <Root />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

Four providers, none of them doing expensive synchronous work on mount: `QueryClient` is instantiated once at module scope (not inside the component, meaning it survives re-renders of `App` itself, though `App` itself only renders once), `ThemeProvider` and `LanguageProvider` each hold a small amount of `useState`, and `Root` computes a `navTheme` object by merging `DarkTheme`/`DefaultTheme` with the sugar palette — a cheap object spread, not a computation that scales with app size.

**The concrete startup-relevant fact worth naming:** there is currently no lazy loading, no code-splitting, and no deferred initialization anywhere in this composition — every provider and every screen's module is loaded as part of the initial JS bundle evaluation. At the current app size (five feature folders, mostly placeholder screens), this is a total non-issue; it becomes a real consideration once Products, Publishing, Customer Management, and AI Images (`.claude/knowledge/current-limitations.md` § 6 — currently zero code) are all built out, each adding module weight to the same bundle. Per constitution's Performance Philosophy — "measure first" — this is not a problem to solve speculatively today; it's a signal worth watching for once the app has enough real feature code that bundle size becomes measurable rather than theoretical.

---

# 5. List Rendering: Current Reality vs. FlashList Target

`context.md`'s Technology Stack names `FlashList` under "Lists." `package.json` has no `@shopify/flash-list` dependency. `.claude/rules/performance.md` Rule 3 and `.claude/agents/31-performance-reviewer.md` § 9 both state this precisely: recommending `FlashList` as if it's already available produces advice nobody can act on.

**What this means practically, right now:** any list built today uses `FlatList` — part of React Native core, already available, already windowing (mounting/unmounting items outside the visible range, though less aggressively than `FlashList`'s view-recycling approach). `DashboardScreen.tsx`'s `MOCK_STATS.map()` inside a plain `View` is correct *as it exists today* — four fixed items never need virtualization at all — but it is explicitly not a pattern to extend to an unbounded list (`.claude/rules/performance.md` Rule 3). The moment a screen renders a product catalog, a customer list, or a chat history — all named in `context.md`'s Primary Features, none built yet — that screen needs `FlatList` with a stable `keyExtractor`, not `.map()` in a `ScrollView`.

**Why `FlashList` matters once it's adopted, and not before:** `FlashList` recycles views (reuses the same mounted component instances as the user scrolls) rather than mounting/unmounting them, and uses an estimated-item-size heuristic to avoid layout thrash. This matters more as list length and item complexity grow — exactly the direction Sugar Admin's product/customer/chat lists are headed. Installing it today, before any such list exists, would be exactly the "unnecessary dependency" constitution's Simplicity Wins warns against (`.claude/agents/31-performance-reviewer.md` § 5 Out of Scope: recommending an uninstalled dependency is a `chief-architect`-level decision, never unilateral). The correct sequencing: build the first genuinely large list with `FlatList`, and if measured scroll performance is actually poor, escalate a `FlashList` adoption request to `chief-architect` with that measurement attached — not before.

---

# 6. Image Handling: Current Reality vs. expo-image Target

Same shape as § 5: `context.md` names "Expo Image" under "Images"; `package.json` has neither `expo-image` nor `@react-native-async-storage/async-storage`-adjacent caching. `expo-blur` and `expo-linear-gradient` *are* installed but solve a different problem entirely (blur effects, gradients) — worth naming explicitly because it's an easy, understandable mix-up: none of the currently-installed `expo-*` packages provide image loading/caching/resizing.

**The concrete risk this creates, not yet realized but worth designing against from the start:** `context.md`'s Primary Features include AI-generated product images, marketing banners, and story templates — all of which imply rendering many remote images, frequently in list or grid contexts. Bare React Native `Image` has weaker disk caching than `expo-image` and no blurhash placeholder support; a feature that renders a grid of AI-generated product images using bare `Image` will re-fetch and re-decode every image on every screen revisit, a real, measurable cost the moment that feature exists.

**What to do about it today, before `expo-image` is adopted:** the achievable mitigations within bare `Image`'s actual capabilities (per `.claude/agents/31-performance-reviewer.md` § 4) are an explicit, deliberate `resizeMode` on every image (never left to the platform default), and never rendering a full-resolution remote image into a thumbnail-sized slot — request or crop appropriately-sized source images where the source is controlled. Adopting `expo-image` itself is a deliberate dependency decision (`.claude/rules/expo.md` Rule 4) — flag it to `chief-architect` when the first image-heavy feature (AI Images) is actually being planned, not before.

---

# 7. TanStack Query Cache Tuning, Explained

`App.tsx`'s `QueryClient`:

```ts
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 * 60 * 5 } },
});
```

These two numbers are not defaults left unconsidered — they're a deliberate baseline, and understanding the reasoning is what lets a future screen correctly decide *when to override them* rather than either blindly inheriting them or blindly overriding them without justification.

**`staleTime: 5 minutes`.** TanStack Query treats cached data as "fresh" (servable with zero network round-trip) for this long after a successful fetch. Five minutes suits dashboard-style, non-real-time data well — a business owner glancing at a stats screen, navigating away, and returning within five minutes sees the cached numbers instantly rather than a spinner-then-refetch for data that almost certainly hasn't changed. **The reasoning for why this should not simply be raised or lowered globally:** raising it further would make genuinely time-sensitive screens (once they exist — a live chat inbox, an order-status screen) show stale data for too long; lowering it globally would make every screen refetch more aggressively than the majority of Sugar Admin's actual data needs, wasting battery and network on mobile connections the constitution's Mobile First section explicitly asks engineers to protect. The correct pattern, per `.claude/rules/performance.md` Rule 7: a screen with genuinely fresher-data needs overrides `staleTime` per-query (to `0` or a short value), leaving the global default serving every other screen's more relaxed needs.

**`retry: 2`.** Combined with `client.ts`'s 15-second timeout (`.claude/rules/networking.md` Rule 2), a worst-case failed query can take up to three attempts × 15 seconds = 45 seconds before definitively failing. This is already a long wait for a mobile user — it's the ceiling, not a target, and it's exactly why `retry` shouldn't casually be raised further without also reconsidering the timeout (raising retry count alone makes the worst case slower, not more resilient, without a corresponding timeout adjustment). Two retries absorbs the common case this is actually solving for: a transient mobile-network blip (a momentary handoff between cell towers, a brief Wi-Fi drop) that resolves itself within a second or two, without making a genuinely dead connection take unreasonably long to fail definitively.

**Mutations default to no automatic retry** — this isn't set explicitly in `App.tsx` (mutations aren't covered by the `queries` key), which means TanStack Query's own default (no retry for `useMutation`) applies. This is correct and deliberate, per `.claude/rules/networking.md` Rule 6: retrying a non-idempotent write (e.g., "create product") risks a duplicate side effect if the first attempt actually succeeded but the response was lost. This must be evaluated per-mutation once real mutations exist — never enabled blanket.

---

# 8. Re-render Discipline, Worked Through

`.claude/rules/performance.md` Rule 1 bans premature memoization outright; the harder, more useful skill is recognizing what a *real* rerender cost actually looks like in this specific codebase's patterns, so that when one does appear, it's fixed with a measured, justified change rather than either ignored or over-corrected with blanket memoization.

**The concrete pattern to watch for: Zustand over-subscription.** `useAuthStore()` called with no selector returns the entire store object — `user`, `token`, `isAuthenticated`, `isLoading`, `error`, all four actions — meaning a component subscribes to *every* field even if it reads only one. `state-management.md` § 5 and `.claude/agents/31-performance-reviewer.md` § 13's worked example both name this exact mechanism: a component that does `const { user } = useAuthStore()` rerenders on every `isLoading`/`error` change too (e.g., during an unrelated login retry), even though it never reads either field. The fix costs nothing structurally — `const user = useAuthStore((s) => s.user)` — and is the single highest-value, lowest-cost performance habit available in this codebase today, because both current stores (`authStore`, `uiStore`) are small enough that this is easy to get right or wrong on every single consuming component.

**Expensive derived data belongs in `select`, not a render body.** `.claude/rules/performance.md` Rule 6's Good Example — sorting or filtering query data inside a `useQuery`'s `select` option — matters because `select` only re-runs when the underlying query data actually changes, whereas the same computation written inline in a screen's render body re-runs on *every* render of that screen, including renders triggered by completely unrelated state (a theme toggle, a sibling component's state update). This is a correctness-adjacent performance issue: the computation itself doesn't produce wrong output either way, but one version wastes CPU on every unrelated render and the other doesn't.

**When memoization genuinely is warranted:** none of the current components (`Button.tsx`, `Card.tsx`, `Input.tsx`, `GlassCard.tsx`) use `React.memo`/`useMemo`/`useCallback` today, and that's correct at their current complexity — matching `.claude/rules/performance.md` Rule 1's "no memoization until a specific, measured rerender cost justifies it." The trigger, per `.claude/rules/performance.md` Rule 2, is a stated measurement (React DevTools Profiler output, an observed frame drop, a specific prop identified as changing on every parent render and cascading to an expensive child) — not "this component renders a lot of stuff, better memoize it."

---

# 9. Good Examples

**Good: a Zustand selector, not full-store destructuring.**

```tsx
const user = useAuthStore((s) => s.user);
```

Rerenders only when `user` itself changes — not on every `isLoading`/`error`/`token` update elsewhere in the store.

**Good: a query-time transformation via `select`.**

```ts
export function useSortedProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => mockProductRepository.list({ page: 1, pageSize: 100 }),
    select: (result) => [...result.data].sort((a, b) => a.name.localeCompare(b.name)),
  });
}
```

Re-sorts only when the underlying query data changes, per § 8.

---

# 10. Bad Examples

**Bad: full-store destructuring for a single field.**

```tsx
const { user, token, isLoading, error } = useAuthStore();
// only `user` is actually read below
```

Every unrelated store field change rerenders this component — the exact mechanism named in `.claude/agents/31-performance-reviewer.md` § 13's worked finding.

**Bad: memoizing a four-item list "just in case."**

```tsx
const MemoizedStatCard = React.memo(function StatCard({ stat }: { stat: Stat }) {
  return <Card><Text>{stat.value}</Text></Card>;
});
```

For `DashboardScreen`'s four-item `MOCK_STATS` grid, the props-comparison cost this adds on every render exceeds the render cost it's trying to save — a net negative "optimization," per `.claude/rules/performance.md`'s own named Bad Example.

---

# 11. Decision Trees

## Does this list need FlatList, or is .map() acceptable?

```
Is the item count fixed and small (roughly under 20-30 items, per
31-performance-reviewer.md § 10), and will it stay that way structurally
(e.g. a fixed set of stat cards, not a query result)?
  → .map() inside a View/ScrollView is fine — matches DashboardScreen.tsx's
    current, correct pattern.
Is the item count derived from a query, user-generated content, or
otherwise unbounded/growable?
  → FlatList, with a stable keyExtractor, today. Escalate a FlashList
    request to chief-architect only after FlatList is measured insufficient.
```

## Does this component need a Zustand selector, or is full destructuring fine?

```
Does the store have more than 2-3 fields (both authStore and uiStore
qualify today)?
  → Use a selector for exactly the fields this component reads.
Is the store trivially small (a single-field store, if one existed)?
  → Full destructuring is harmless; a selector adds no real benefit.
```

## Should this staleTime/retry be overridden for a specific query?

```
Is this data genuinely time-sensitive (a live inbox, a real-time status)?
  → Override staleTime to 0 or a short value on THIS query only.
Is this a write (mutation)?
  → Confirm idempotency before ever enabling retry; default is no retry.
Neither?
  → Inherit the global 5min staleTime / 2 retries default — don't
    override without a specific reason.
```

---

# 12. Real Project Examples

- **`App.tsx`** — the `QueryClient` defaults worked through in § 7, and the full startup composition in § 4.
- **`src/store/authStore.ts`, `uiStore.ts`** — the selector-vs-full-destructuring pattern in § 8, and `state-management.md` § 5/§ 11 for the underlying store shapes.
- **`src/features/dashboard/screens/DashboardScreen.tsx`**'s `MOCK_STATS.map()` — the correct-today, not-a-pattern-to-extend example in § 5.
- **`src/components/GlassCard.tsx`**'s `BlurView` — flagged in `.claude/rules/performance.md` Rule 5 for Android-specific cost in any future repeated/list context; verify before using `GlassCard` inside a scrolling list.
- **`package.json`** — verified absence of `@shopify/flash-list` and `expo-image`, grounding § 5–6's "target, not installed" framing.

---

# 13. Common Mistakes

- Destructuring an entire Zustand store when only one field is read.
- Sorting, filtering, or formatting query data inline in a screen's render body instead of a `useQuery` `select`.
- Recommending `FlashList` or `expo-image` in a code review as if already installed.
- Adding `React.memo`/`useMemo`/`useCallback` without a stated, measured reason.
- Lowering the global `staleTime` or raising the global `retry` count to fix one screen's needs, degrading every other screen's behavior in the process.
- Assuming a Reanimated 4 animation is performant because Reanimated's own documentation benchmarks it well, without verifying on-device given `newArchEnabled: false`.

---

# 14. Best Practices

- Default every Zustand consumption to a selector once the store has more than two or three fields, per § 8 — this costs nothing and prevents an entire class of unnecessary rerenders before it starts.
- Use `useQuery`'s `select` for any derived/transformed data, from the first query that needs it, rather than retrofitting later.
- Treat `FlatList` as the default for any list whose size isn't structurally fixed, even before it's visibly large — the migration cost from `.map()` to `FlatList` only grows as more screens copy the wrong pattern.
- When a genuine performance problem is found that needs an uninstalled dependency (`FlashList`, `expo-image`), name the measured or clearly-reasoned mechanism and escalate to `chief-architect` explicitly — don't add the dependency unilaterally, and don't silently work around its absence indefinitely either.

---

# 15. Checklist

- [ ] No `React.memo`/`useMemo`/`useCallback` was added without a stated, measured reason.
- [ ] Zustand consumption uses a selector for any store with more than 2-3 fields.
- [ ] Unbounded or query-derived lists use `FlatList`, not `.map()` in a `ScrollView`.
- [ ] Derived/transformed query data is computed via `select`, not recomputed unconditionally in a render body.
- [ ] No global `staleTime`/`retry` change was made to serve one screen; a per-query override was used instead.
- [ ] Any dependency needed but not installed (`FlashList`, `expo-image`) is escalated to `chief-architect`, not added unilaterally.
- [ ] New animations are verified on-device given `newArchEnabled: false`, not assumed smooth.

---

# 16. References

- [constitution.md](../constitution.md) — Performance Philosophy, Mobile First, Core Values ordering.
- [context.md](../context.md) — Performance Goals, Technology Stack (FlashList, Expo Image as target).
- [.claude/rules/performance.md](../rules/performance.md) — the enforceable rule list this handbook explains.
- [.claude/agents/31-performance-reviewer.md](../agents/31-performance-reviewer.md) — review authority and current-stack-only review standard.
- [state-management.md](./state-management.md) — § 5, § 6, the Zustand/TanStack Query shapes referenced in § 7–8.
- [architecture.md](./architecture.md) — § 4, the `App.tsx` composition root referenced in § 4.
- [../../App.tsx](../../App.tsx), [../../package.json](../../package.json) — the real files this handbook is grounded in.
