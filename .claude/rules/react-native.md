---
id: rule-react-native
title: React Native Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_components
  - all_screens
  - all_navigation
last_updated: 2026-07-18
---

# React Native Rules

> Mobile First. Desktop concepts should not drive architecture. — `../constitution.md`

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

Sugar Admin runs on React Native 0.85.3 with Expo ~56 (`expo` 56.0.11), React 19.2.3, and `newArchEnabled: false` in `app.json`. This file states the concrete platform decisions already made — most importantly, that navigation is React Navigation (native-stack), not Expo Router, despite `../context.md` listing Expo Router as the target — and the rules for writing components that behave correctly on both iOS and Android.

---

# 2. Scope

Applies to every screen, navigator, and platform-sensitive component in `src/`.

---

# 3. Rules

## Rule 1 — Navigation is React Navigation (`@react-navigation/native` + `native-stack`), not Expo Router. This contradicts `../context.md`; the code is authoritative.

`package.json` installs `@react-navigation/native@7.3.1` and `@react-navigation/native-stack@7.17.3`. There is no `expo-router` dependency, no `app/` directory, and both `src/navigation/AppNavigator.tsx` and `src/navigation/AuthNavigator.tsx` use `createNativeStackNavigator`. `../context.md`'s Technology Stack section lists "Navigation: Expo Router" — that is aspirational and does not match the installed dependencies or the code.

**Why this must be flagged, not silently reconciled:** `documentation.md` treats this exact mismatch as the canonical cautionary example of doc drift. Building a new screen as if Expo Router's file-based routing applies (creating files under an `app/` directory, using `expo-router`'s `Link` or `useRouter`) would not work — there is no router installed to support it. Every new route is added to `src/navigation/types.ts`'s param lists and wired into `AppNavigator.tsx` / `AuthNavigator.tsx` by hand, per `../agents/10-feature-planner.md` § 12.

## Rule 2 — Every new route is added to the correct `*StackParamList` in `src/navigation/types.ts`, with an explicit `undefined` for paramless routes

```ts
export type AppStackParamList = {
  Home:      undefined;
  Dashboard: undefined;
  Content:   undefined;
  Reports:   undefined;
  AIChat:    undefined;
  ProductList: undefined;        // new route, explicit undefined
  ProductDetail: { productId: string }; // new route with params
};
```

**Why:** `undefined` (rather than omitting the key or using `void`) is what makes `navigation.navigate("Dashboard")` type-check with zero arguments while `navigation.navigate("ProductDetail", { productId })` requires them — React Navigation's typing depends on this exact convention, already used consistently in the existing param lists.

## Rule 3 — `AuthStackParamList.Register` exists in types but has no corresponding screen or navigator entry; do not assume it works

`src/navigation/types.ts` declares `Register: undefined` in `AuthStackParamList`, but `src/navigation/AuthNavigator.tsx` only registers a `Login` screen, and there is no `RegisterScreen.tsx` anywhere in `src/features/auth/screens/`. Any code that calls `navigation.navigate("Register")` will type-check but crash at runtime (no screen registered for that route name).

**Why flag this specifically:** it is exactly the kind of gap between declared types and actual wiring that silent assumptions create. Before building anything that navigates to `Register`, either build the screen and register it, or remove the dangling type entry — do not leave it half-wired.

## Rule 4 — `App.tsx` does not currently branch between `AuthNavigator` and `AppNavigator` based on auth state

`App.tsx` renders `<AppNavigator />` unconditionally inside `NavigationContainer`. `RootStackParamList` (`Auth: undefined; App: undefined;`) exists in `src/navigation/types.ts` but nothing reads `useAuthStore().isAuthenticated` to decide which stack to mount. `AuthNavigator` (and therefore `LoginScreen`) is currently unreachable in the running app.

**Why this belongs here and not just `architecture.md`:** it directly affects any React Navigation work — a screen assuming it can navigate "back to Login" via `navigation.navigate("Login")` from inside `AppNavigator`'s stack will fail, because `Login` is not a registered route in that stack (it lives in the separate `AuthStackParamList`). Fixing the root switch is a prerequisite for any auth-gated navigation feature, not an incidental cleanup.

## Rule 5 — List rendering uses `FlatList` or `ScrollView` today; `FlashList` is the target, not yet installed

`@shopify/flash-list` is not in `package.json`. Every list-like rendering in the current codebase (`DashboardScreen`'s stat grid) uses a plain `View` with `flexDirection: "row", flexWrap: "wrap"` over a small, fixed array — not a virtualized list at all, because four items don't need one.

**Why the distinction matters going forward:** a new screen rendering an unbounded or large list (a product catalog, a chat message history, a customer list) must use `FlatList` today, never a `.map()` inside a `ScrollView` — mapping an unbounded array inside a `ScrollView` renders every item immediately, with no virtualization, and will visibly jank or crash on a large enough dataset. When `FlashList` is added to `package.json` (a deliberate `chief-architect`-approved dependency addition, not a drive-by import), migrate list screens to it for the recycling and estimated-item-size performance gains it provides over `FlatList`. Until then, `FlatList` is the correct choice for any list of unbounded or unknown size; `ScrollView` + `.map()` remains correct only for small, fixed-size content (a handful of stat cards, a settings screen's rows).

## Rule 6 — Safe areas are handled via `react-native-safe-area-context`, already installed; `Screen.tsx` does not currently use it

`react-native-safe-area-context@~5.7.0` is installed, but `src/components/ui/Screen.tsx` — the shared screen wrapper every screen should use — does not render a `SafeAreaView` or use `useSafeAreaInsets()`. It relies on manual `paddingTop` values hand-tuned per screen instead (e.g. `HomeScreen.tsx`'s `topBar: { paddingTop: 56, ... }`, `LoginScreen.tsx`'s `content: { paddingTop: 60 }`).

**Why this is a real gap:** hand-tuned `paddingTop: 56` assumes a specific notch/status-bar height. It will look correct on the device it was tuned against and wrong on others (a Dynamic Island iPhone vs. an older notch, or a punch-hole Android device vs. one with a larger status bar). New screens should prefer `useSafeAreaInsets()` (via a `SafeAreaProvider` that would need to be added to `App.tsx`'s provider tree — not present today) over hardcoded padding constants. This is flagged as a `Screen.tsx` migration, not something every screen re-solves individually.

## Rule 7 — Platform differences are handled explicitly with `Platform.OS`, not assumed away

Any interaction that behaves differently on iOS vs. Android (haptics, back-gesture handling — note `app.json`'s `android.predictiveBackGestureEnabled: false`, shadow rendering, keyboard avoidance) is branched explicitly:

```ts
import { Platform } from "react-native";

const shadow = Platform.select({
  ios:     { shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8 },
  android: { elevation: 6 },
});
```

**Why:** per the constitution's Mobile First section, "touch interactions, small screens, network interruptions, device performance" must be considered before implementation, not patched in after a bug report from one platform. `android.predictiveBackGestureEnabled: false` in `app.json` is itself a platform-specific decision already made — do not assume Android's back gesture behaves like iOS's swipe-back without checking this setting first.

## Rule 8 — `newArchEnabled: false` in `app.json` is a real constraint on `react-native-reanimated` 4 and `react-native-worklets`

`app.json` sets `"newArchEnabled": false`. `react-native-reanimated@4.3.1` and `react-native-worklets@0.8.3` are installed — Reanimated's 4.x line is built around the New Architecture, and running it with the old architecture disabled is a known source of subtle behavioral differences and missing features compared to Reanimated running on New Architecture.

**Why this must be flagged rather than assumed fine:** any animation work (see `animations.md`) should be verified on-device on both platforms specifically because of this mismatch, not assumed to behave identically to Reanimated's own New-Architecture-targeted documentation and examples. If a Reanimated 4 feature behaves unexpectedly, check `newArchEnabled` before treating it as an application bug.

## Rule 9 — `userInterfaceStyle: "light"` in `app.json` is static; it does not automatically follow the system, even though `ThemeContext.tsx` reads `useColorScheme()`

`app.json`'s `expo.userInterfaceStyle` is set to `"light"`, a static value, while `src/context/ThemeContext.tsx` independently reads `useColorScheme()` at the JS layer to pick an initial theme. These are two different mechanisms (native `UIUserInterfaceStyle` / Android equivalent vs. JS-level `Appearance` API) and are not currently kept in sync.

**Why to flag:** a user who has set their OS to dark mode will get native chrome (e.g. system alerts, keyboard appearance) rendered for light mode, while the JS-rendered UI switches to dark via `ThemeContext`. This inconsistency is a known gap; changing `app.json`'s `userInterfaceStyle` to `"automatic"` is the fix, and it is a one-line, low-risk change worth making the next time `app.json` is touched — but it is not silently bundled into an unrelated PR.

---

# 4. Good Examples

## Good: platform-aware list rendering for unbounded data

```tsx
import { FlatList } from "react-native";

function ProductListScreen() {
  const { data } = useProducts();
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ProductRow product={item} />}
    />
  );
}
```

This is good because it virtualizes an unbounded dataset today, without waiting for `FlashList` to be added, and the migration to `FlashList` later (per Rule 5) is a near drop-in replacement of the same props shape.

---

# 5. Bad Examples

## Bad: mapping an unbounded list inside a `ScrollView`

```tsx
function CustomerListScreen() {
  const { data: customers } = useCustomers(); // could be thousands of rows
  return (
    <ScrollView>
      {customers.map((c) => <CustomerRow key={c.id} customer={c} />)}
    </ScrollView>
  );
}
```

**Consequence:** every row renders immediately regardless of whether it's on screen. With a small mock dataset this looks fine in development; against a real customer list it becomes a slow, janky screen and a large memory footprint — a performance bug that is invisible until the data grows, per exactly the failure mode `performance.md` warns about.

## Bad: assuming Expo Router conventions apply

```tsx
// app/products/[id].tsx  — this file has no effect; there is no expo-router installed.
import { useLocalSearchParams } from "expo-router";
```

**Consequence:** this code will not run — `expo-router` is not a dependency, and Metro has no `app/`-directory routing convention configured. Anyone pattern-matching from `../context.md`'s stack list without checking `package.json` will lose time here. Always verify against `package.json`, not `../context.md`, for what's actually installed (`documentation.md` covers this doc-drift risk in more depth).

---

# 6. Checklist

- [ ] New navigation uses `@react-navigation/native-stack`, not Expo Router conventions.
- [ ] Every new route is added to the correct `*StackParamList` with explicit `undefined` or a typed params object.
- [ ] No code navigates to `Register` without first confirming a screen exists for it.
- [ ] No code assumes `App.tsx` already branches between `AuthNavigator` and `AppNavigator` by auth state — verify current wiring before building on it.
- [ ] Unbounded or large lists use `FlatList`, never `.map()` inside a `ScrollView`.
- [ ] New screens account for safe areas explicitly (until `Screen.tsx` adopts `useSafeAreaInsets()`, hardcoded padding is checked against multiple device sizes).
- [ ] Platform-specific behavior (`Platform.select`, `Platform.OS`) is used wherever iOS and Android are known to differ.
- [ ] Any Reanimated 4 behavior questioned during review considers `newArchEnabled: false` as a possible cause before assuming a code bug.

---

# 7. References

- `../constitution.md` — Mobile First
- `../context.md` — Technology Stack (flag: lists Expo Router, actual dependency is React Navigation)
- `documentation.md` — doc-drift prevention, using this exact mismatch as the canonical example
- `expo.md` — Expo SDK conventions, `app.json` configuration
- `animations.md` — Reanimated 4 / `newArchEnabled` interaction
- `performance.md` — list virtualization and `FlashList` migration target
- `accessibility.md` — touch target and safe-area-adjacent accessibility concerns
