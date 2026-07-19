---
id: playbook-adding-navigation
title: Adding Navigation Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Adding Navigation Playbook

> "A `<Stack.Screen>` with no matching param list entry compiles under loose TypeScript but breaks `navigation.navigate()` type-checking everywhere else." — `../agents/20-react-native-engineer.md` § 13

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Adding `ProductDetail` to `AppStackParamList`
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

Sugar Admin's whole navigation layer is three files: `src/navigation/types.ts` (the param-list contracts), `src/navigation/AuthNavigator.tsx` (unauthenticated), and `src/navigation/AppNavigator.tsx` (authenticated) — all built on `@react-navigation/native` (7.3.1) and `@react-navigation/native-stack` (7.17.3), **not** Expo Router, despite `../context.md`'s Technology Stack listing Expo Router as the target (`../handbook/navigation.md` § 7 documents this discrepancy in full; it is real, not a typo).

This playbook is the mechanical procedure for registering a new route correctly — one param-list entry, one `<Stack.Screen>` entry, both matching the existing `PascalCase` convention exactly — so that `navigation.navigate()` stays type-safe everywhere else in the app, not just at the new call site.

---

# 2. When To Use This Playbook

Use this playbook when a feature plan's Navigation Entry (`../agents/10-feature-planner.md` § 12) names a new route, or when `building-a-screen.md`'s Step 5 sends you here for the full procedure.

Do not use this playbook to invent a route the plan didn't specify — a new route is a Navigation Entry decision owned by `feature-planner`, not something `react-native-engineer` improvises while wiring a screen (`../agents/20-react-native-engineer.md` § 5, § 6).

---

# 3. Prerequisites

- A completed Navigation Entry from the feature plan (`../agents/10-feature-planner.md` § 12): route name, params shape, which param list it joins, what links to it, whether it's deep-linked.
- The screen component this route points to exists, or is being built in the same PR (see `building-a-screen.md`).
- `src/navigation/types.ts` read in full — it currently declares exactly three types: `AuthStackParamList` (`Login`, `Register`), `AppStackParamList` (`Home`, `Dashboard`, `Content`, `Reports`, `AIChat`), and `RootStackParamList` (`Auth`, `App`) — the last of which no navigator in the codebase actually consumes yet (`../handbook/navigation.md` § 11).
- Awareness of `../handbook/navigation.md` § 6's real, current gap: `App.tsx` renders `AppNavigator` directly and unconditionally — there is no `RootNavigator` reading `useAuthStore().isAuthenticated` to switch between `AuthNavigator` and `AppNavigator`. `AuthNavigator` is fully implemented and completely unreachable. If your route needs auth-gating, this playbook does not fix that gap for you — see Step 6.

---

# 4. Step-by-Step Workflow

## Step 1 — Confirm which stack the route belongs to

```
Does the screen require an authenticated user?
  → Yes: AppStackParamList — and note in your PR description that real
    auth-gating depends on the RootNavigator gap (§ 6 of
    ../handbook/navigation.md), which is not implemented. AppNavigator
    is the only stack actually mounted in App.tsx today, so the route
    is still registered here even though "gating" doesn't function yet.
  → No: AuthStackParamList.
Is the screen reachable from both authenticated and unauthenticated
states (e.g. a public "About" screen)?
  → Not yet a modeled case in the two-stack system. Escalate to
    ../agents/00-chief-architect.md rather than guessing.
```

This mirrors `../handbook/navigation.md` § 10's decision tree exactly.

## Step 2 — Add the route to the correct param list in `src/navigation/types.ts`

`PascalCase` route name, no `Screen` suffix (the suffix belongs on the component, not the route — `../rules/naming.md` Rule 8). Explicit `undefined` for a paramless route; an explicit object shape otherwise, `camelCase` field names:

```ts
export type AppStackParamList = {
  Home:      undefined;
  Dashboard: undefined;
  Content:   undefined;
  Reports:   undefined;
  AIChat:    undefined;
  ProductDetail: { productId: string }; // new
};
```

Do not pass data through params that the destination screen can fetch itself via its own repository/hook call (`../handbook/navigation.md` § 10) — an id is a param; a whole `Product` object is not.

## Step 3 — Decide the param shape deliberately, not by convenience

```
Does the destination screen need data the previous screen already has
in hand (an id, a pre-filled filter)?
  → Yes: add a typed param.
  → No: keep it undefined.
```

## Step 4 — Import and register the screen in the matching navigator file

`AuthNavigator.tsx` for `AuthStackParamList` routes, `AppNavigator.tsx` for `AppStackParamList` routes:

```tsx
// src/navigation/AppNavigator.tsx
import ProductDetailScreen from "../features/products/screens/ProductDetailScreen";
// ...
<Stack.Screen
  name="ProductDetail"
  component={ProductDetailScreen}
  options={{ title: "جزئیات محصول" }}
/>
```

## Step 5 — Know the header-title inconsistency before copying it

`AppNavigator.tsx`'s existing `options={{ title: "..." }}` entries (`"داشبورد"`, `"مدیریت محتوا"`, `"گزارش‌ها"`, `"دستیار هوشمند"`) are hardcoded Persian strings, not routed through `useLanguage()`'s `t()` function — a real, current inconsistency (`../handbook/navigation.md` § 5, § 9) that silently breaks the English toggle for any screen navigated to after `Home`. Do not copy this pattern into new routes without acknowledging it: prefer `t()` if the feature plan calls for full bilingual support, or explicitly hardcode Persian and flag it as a known, existing convention gap in your PR description (per `../agents/20-react-native-engineer.md` § 11) rather than silently reproducing debt without comment.

## Step 6 — If the route requires auth-gating, do not silently build on top of the gap

`../rules/architecture.md` Rule 6 states this explicitly: any engineer touching auth-gated navigation must flag the `RootNavigator` gap, not build further on top of it silently. Implementing `RootNavigator` itself is an architecture-level change (touches `App.tsx`, `authStore.ts` hydration timing, possibly a splash/loading screen) and requires `../agents/00-chief-architect.md` sign-off via `../templates/architecture-proposal.md` — it is out of scope for a playbook adding a single route.

## Step 7 — Consider deep linking, explicitly

`NavigationContainer` has no `linking` prop configured anywhere in this codebase today (`../handbook/navigation.md` § 15's FAQ: "Is deep linking configured? No."). If the feature plan's Navigation Entry marks this route as deep-linked, that is a new capability, not an incremental addition — flag it to `../agents/00-chief-architect.md` before implementing a `linking` config from scratch. If the plan doesn't call for a deep link, mark it `undefined`/"no" explicitly in your PR notes rather than leaving it unaddressed.

## Step 8 — Verify every call site that navigates to the new route

`navigation.navigate("ProductDetail", { productId: item.id })` — exact route name, exact param key names, matching what was just registered in Step 2. A mismatch compiles under loose settings but breaks type-checking for `navigation.navigate()` everywhere in the app (`../agents/20-react-native-engineer.md` § 13).

## Step 9 — Self-review and hand off

Confirm the route was added to **both** `types.ts` and the navigator file — one without the other is the single most common mistake in this playbook (see § 7). Hand off to `reviewer`; flag `accessibility-reviewer` if this route introduces a new interaction pattern.

---

# 5. Worked Example: Adding `ProductDetail` to `AppStackParamList`

Continuing the Products thread used throughout `building-a-feature.md` and `building-a-screen.md` — `ProductDetailScreen` needs a route.

**Step 1.** `ProductDetail` requires an authenticated user viewing their own catalog → `AppStackParamList`. Noted in the PR: real gating still depends on the unresolved `RootNavigator` gap; today, reaching `Home` at all means `AppNavigator` is already active regardless of auth state.

**Step 2.** Added to `src/navigation/types.ts`:

```ts
export type AppStackParamList = {
  Home:      undefined;
  Dashboard: undefined;
  Content:   undefined;
  Reports:   undefined;
  AIChat:    undefined;
  ProductDetail: { productId: string };
};
```

**Step 3.** `ProductListScreen` already has `item.id` in hand when the user taps a card — a typed `productId` param is correct; `ProductDetailScreen` fetches the rest itself via `useProductDetail(productId)`.

**Step 4.** Registered in `src/navigation/AppNavigator.tsx`:

```tsx
import ProductDetailScreen from "../features/products/screens/ProductDetailScreen";
// ...
<Stack.Screen
  name="ProductDetail"
  component={ProductDetailScreen}
  options={{ title: "جزئیات محصول" }}
/>
```

**Step 5.** Title hardcoded to Persian, matching every existing `AppNavigator.tsx` entry — flagged in the PR description as reproducing the known `t()` gap (`../handbook/navigation.md` § 5), not silently copied without comment.

**Step 6.** No auth-gating change attempted — noted as out of scope, referencing `../handbook/navigation.md` § 6.

**Step 7.** No deep link requested by the Products plan — explicitly marked "no" in the PR.

**Step 8.** Confirmed `ProductListScreen`'s card `onPress` calls `navigation.navigate("ProductDetail", { productId: item.id })` — exact match to Step 2's registration.

**Step 9.** Handed to `reviewer`; `accessibility-reviewer` flagged separately by `building-a-screen.md`'s worked example for the screen's "Archive" confirmation pattern, not for the navigation entry itself.

---

# 6. Checklist

- [ ] Target stack (`AuthStackParamList` vs `AppStackParamList`) decided via the decision tree, not assumed.
- [ ] Route added to `src/navigation/types.ts`, `PascalCase`, no `Screen` suffix.
- [ ] Param shape is `undefined` or a deliberately typed object — never a whole domain object where an id would do.
- [ ] Route registered with `<Stack.Screen>` in the matching navigator file.
- [ ] Header title's language-routing decision (hardcoded vs. `t()`) is a deliberate choice, stated in the PR, not a silent copy.
- [ ] If the route needs auth-gating, the `RootNavigator` gap is flagged, not built around.
- [ ] Deep-linking need is explicitly stated (yes with a plan, or no).
- [ ] Every `navigation.navigate()` call site matches the registered route name and param shape exactly.

---

# 7. Common Mistakes

**Adding the `<Stack.Screen>` but forgetting `types.ts`, or vice versa.** Both are required; each alone produces a route that either doesn't compile against `navigation.navigate()` or doesn't actually render — see `../agents/20-react-native-engineer.md` § 13's named anti-pattern.

**Assuming `AuthNavigator` routes are reachable.** They are not, today — `AuthNavigator` is never mounted (`../handbook/navigation.md` § 6). Do not build a feature that assumes a user can reach `Login`/`Register` through normal in-app navigation without first confirming the `RootNavigator` gap is being addressed as part of your work.

**Passing a full object through navigation params.** Pass an id; let the destination screen fetch its own data via a repository hook, per `../handbook/navigation.md` § 10.

**Building `linking` config or a full Expo Router migration unprompted.** Both are `chief-architect`-level architecture changes (`../handbook/navigation.md` § 7, § 15) — not something to slip into a single-route PR because the handbook happens to describe the target.

**Copying the hardcoded-Persian-title pattern without comment.** It's an accepted existing inconsistency, not a silently-extendable convention — say so in the PR.

---

# 8. References

- `../constitution.md` — Predictability, Explicit Beats Implicit
- `../agents/10-feature-planner.md` § 12 — Navigation Entry Standard
- `../agents/20-react-native-engineer.md` § 11, § 13 — Navigation Standard and anti-patterns this playbook operationalizes
- `../handbook/navigation.md` — the full, current-state reference this playbook is built from, including § 6's `RootNavigator` gap and § 7's Expo Router discrepancy
- `../rules/naming.md` Rule 8 — route naming convention
- `../rules/architecture.md` Rule 6 — the rule against silently building on top of the auth-gating gap
- `src/navigation/types.ts`, `src/navigation/AppNavigator.tsx`, `src/navigation/AuthNavigator.tsx` — the real files this playbook edits
- `./building-a-screen.md` — where this playbook's Step 5 is invoked from
