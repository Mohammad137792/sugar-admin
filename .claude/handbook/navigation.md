---
id: handbook-navigation
title: Navigation Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Navigation Handbook

> "Navigation should never surprise contributors." — adapted from 00-chief-architect.md § 5, Principle 5 (explicit boundaries)

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. React Navigation in This Repo
5. RTL Handling
6. The Auth/App Stack Gap
7. Expo Router vs. React Navigation, Honestly
8. Good Examples
9. Bad Examples
10. Decision Trees
11. Real Project Examples
12. Common Mistakes
13. Best Practices
14. Checklist
15. FAQ
16. References

---

# 1. Purpose

This handbook documents how navigation actually works in Sugar Admin today — `@react-navigation/native` + `@react-navigation/native-stack`, not Expo Router — and closes the gap between what `context.md` names as target stack and what is actually implemented.

It also documents a real, currently-shipping architectural gap: the Auth stack is fully coded and never mounted.

---

# 2. Scope

In scope: `src/navigation/AppNavigator.tsx`, `src/navigation/AuthNavigator.tsx`, `src/navigation/types.ts`, how `App.tsx` wires the navigation theme, RTL direction handling, and the honest Expo Router question.

Out of scope: screen-level state during navigation (`state-management.md`), and the design of any specific screen (`feature-structure.md`).

---

# 3. Principles

Grounded in:

- **Predictability** (constitution.md) — architecture should remain stable; naming should be consistent.
- **Explicit Beats Implicit** (constitution.md) — avoid hidden side effects, avoid surprising APIs.
- **Navigation Entry Standard** (`10-feature-planner.md` § 12) — `PascalCase` route names, explicit `undefined` for paramless routes, one param list per stack.

---

# 4. React Navigation in This Repo

Three files make up the whole navigation layer.

**`src/navigation/types.ts`** — the param-list contracts:

```ts
export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Home:      undefined;
  Dashboard: undefined;
  Content:   undefined;
  Reports:   undefined;
  AIChat:    undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App:  undefined;
};
```

Every route today is paramless (`undefined`). `Register` is declared in `AuthStackParamList` but has no screen implementation yet — a planned route, not a bug.

**`src/navigation/AuthNavigator.tsx`** — a `native-stack` navigator with exactly one screen, `Login`, header hidden, background set from the raw `colors` constant (not `useTheme()` — see § 6 for why that matters).

**`src/navigation/AppNavigator.tsx`** — a `native-stack` navigator with five screens (`Home`, `Dashboard`, `Content`, `Reports`, `AIChat`), header shown by default with theme-aware styling via `useTheme()`, and Persian-language `options={{ title: "..." }}` hardcoded per screen (`"داشبورد"`, `"مدیریت محتوا"`, `"گزارش‌ها"`, `"دستیار هوشمند"`) — notice these titles do not go through `LanguageContext`'s `t()` function, so they will not switch to English when the user toggles language. This is a real, current inconsistency: `HomeScreen.tsx`'s in-page content is fully translated via `t()`, but the native header title bar above it, when navigating to `Dashboard`/`Content`/`Reports`/`AIChat`, is not.

**`App.tsx`** builds the React Navigation theme by merging `DarkTheme`/`DefaultTheme` with sugar palette values, and renders `AppNavigator` inside `NavigationContainer` — see § 6 for what's missing between these two steps.

---

# 5. RTL Handling

RTL is handled at two levels, and it is important to understand that they are separate mechanisms:

**Layout direction** — set once, at the `View` wrapping the entire `NavigationContainer`, in `App.tsx`:

```tsx
<View style={{ flex: 1, direction: isRTL ? "rtl" : "ltr", backgroundColor: colors.bg }}>
  <NavigationContainer theme={navTheme}>
    <AppNavigator />
  </NavigationContainer>
</View>
```

The `direction` style property flips the flex layout direction for everything inside — this affects how `flexDirection: "row"` children lay out, but not text alignment.

**Text alignment** — set per-`Text`-element, per-screen, using `isRTL` read from `useLanguage()`:

```tsx
<Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
```

This pattern repeats in every current screen (`LoginScreen.tsx`, `DashboardScreen.tsx`, `ContentScreen.tsx`, `ReportsScreen.tsx`, `AIChatScreen.tsx`, `HomeScreen.tsx`). It is manual and repetitive by design at this stage — there is no shared `RTLText` component yet. If this pattern is copy-pasted into five more features without change, it becomes a strong candidate for promotion to `src/components/ui/` per `folder-structure.md` § 6's "second real usage" rule — arguably it has already crossed that threshold at six occurrences and should be extracted soon.

React Navigation itself does not automatically mirror screen transitions or header layout for RTL — `native-stack` relies on the OS-level `I18nManager` for true RTL screen-transition mirroring, which this app does not currently configure (`I18nManager.forceRTL` is never called). The `direction` style and per-text `textAlign` give a convincing RTL *reading* experience without forcing a native RTL layout re-render, which is a reasonable trade-off for a Persian-primary app that also supports English, but it means gesture-based back-swipe direction and header back-button placement remain LTR-oriented regardless of language. Document this explicitly if a future RTL bug report comes in about swipe direction — it is a known, deliberate gap, not a regression.

---

# 6. The Auth/App Stack Gap

This is the most important fact in this handbook: **`AuthNavigator` is never mounted.**

`App.tsx`'s `Root` component renders `<AppNavigator />` directly and unconditionally:

```tsx
<NavigationContainer theme={navTheme}>
  <AppNavigator />
</NavigationContainer>
```

There is no `RootNavigator` that reads `useAuthStore().isAuthenticated` and switches between `AuthNavigator` and `AppNavigator`, even though:

- `RootStackParamList` in `types.ts` exists specifically for this (`Auth: undefined; App: undefined;`).
- `AuthNavigator.tsx` is fully implemented and renders `LoginScreen`.
- `authStore.ts` already has `isAuthenticated`, `login`, `logout`, and `hydrate` — everything a `RootNavigator` would need to make the switching decision.

The practical consequence today: every user, authenticated or not, lands on `AppNavigator`'s `Home` screen. `LoginScreen` is unreachable through normal app navigation — there is no route to `AuthStackParamList.Login` from anywhere inside `AppStackParamList`. It only renders if a developer manually points a navigator at it.

**The fix**, to be implemented when Authentication is taken past Level 0/1 (see `feature-structure.md` § 14.5):

```tsx
// src/navigation/RootNavigator.tsx (target, does not exist yet)
import { useAuthStore } from "../store";
import AuthNavigator from "./AuthNavigator";
import AppNavigator from "./AppNavigator";

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <AppNavigator /> : <AuthNavigator />;
}
```

And in `App.tsx`, `<AppNavigator />` becomes `<RootNavigator />`. This also requires calling `useAuthStore.getState().hydrate()` once at startup (currently never called anywhere in the app) to restore session state — except, per `state-management.md` § 7, there is currently nothing to hydrate from, since the token lives only in `globalThis` and is never persisted. Wiring `RootNavigator` and fixing token persistence are two separate, related pieces of debt — do not conflate them into one PR without planning both explicitly.

---

# 7. Expo Router vs. React Navigation, Honestly

`context.md` § "Technology Stack" lists **Expo Router** under Navigation. The actual `package.json` dependencies are `@react-navigation/native@7.3.1` and `@react-navigation/native-stack@7.17.3` — there is no `expo-router` dependency installed, and the app has no `app/` directory (Expo Router's file-based routing convention).

This is a real divergence between aspirational target stack and current implementation, and this handbook states it plainly rather than pretending otherwise: **Sugar Admin currently uses React Navigation, imperatively configured, not Expo Router.**

What a future migration to Expo Router would actually involve, if `chief-architect` decides to pursue it:

1. Convert `AppStackParamList`/`AuthStackParamList` screen registrations into an `app/` directory file-based structure (`app/(auth)/login.tsx`, `app/(app)/dashboard.tsx`, etc.).
2. Replace `NavigationContainer` + manual `Stack.Navigator` composition in `AppNavigator.tsx`/`AuthNavigator.tsx` with Expo Router's `<Slot />`/layout-route convention.
3. Replace the missing `RootNavigator` switching logic (§ 6) with Expo Router's route groups and redirect conventions (`app/_layout.tsx` guarding `(app)` routes on `isAuthenticated`) — notably, this migration would also be the natural moment to finally fix § 6's gap, since Expo Router makes auth-gating a first-class layout concern.
4. Re-home every screen file's import paths; every `navigation.navigate("X")` call becomes a `router.push("/x")` call.
5. Re-evaluate deep linking, since Expo Router's file-based routes double as deep link paths automatically, whereas today's React Navigation setup has no deep linking configured at all.

This is a non-trivial, whole-navigation-layer rewrite — not a drop-in swap. Until `chief-architect` explicitly approves it, new navigation work should extend the current React Navigation setup, not hedge between both patterns.

---

# 8. Good Examples

**Good: theme-aware header styling in `AppNavigator.tsx`.**

```tsx
<Stack.Navigator
  screenOptions={{
    headerStyle:      { backgroundColor: colors.surface },
    headerTintColor:  colors.textPrimary,
    headerTitleStyle: { fontWeight: "700" as const, color: colors.textPrimary },
    contentStyle:     { backgroundColor: colors.bg },
  }}
>
```

Reads `useTheme()` once at the navigator level and applies it to every screen's header via `screenOptions`, rather than each screen re-implementing header styling individually.

---

# 9. Bad Examples

**Bad: a route with no way to reach it (current, real).**

`AuthStackParamList.Login` is a fully valid, typed route — and unreachable in the running app, per § 6. A route that exists in code but has no navigational path to it is worse than no route at all: it passes a type check and a code review glance, while being functionally dead.

**Bad: hardcoding a single language's string into a header title, bypassing `LanguageContext`.**

```tsx
// AppNavigator.tsx, current, real
<Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "داشبورد" }} />
```

This works today because the app only exercises the Persian string path in manual testing, but it silently breaks the English toggle for anyone who taps `langToggle` on `HomeScreen` and then navigates to `Dashboard` — the in-page heading translates, the native header above it does not.

---

# 10. Decision Trees

## New route: which stack?

```
Does the screen require an authenticated user?
  → Yes: AppStackParamList (post-auth-gate, once RootNavigator exists —
    see § 6; until then, still register here, since AppNavigator is the
    only mounted stack today).
  → No: AuthStackParamList.
Is this screen reachable from both authenticated and unauthenticated
states (e.g. a public "About" screen)?
  → This is a new case not yet handled by the two-stack model — escalate
    to chief-architect rather than guessing which stack it belongs in.
```

## Should this navigation param be typed as `undefined` or given a shape?

```
Does the destination screen need data the previous screen already has
in hand (an id, a pre-filled filter)?
  → Yes: add a typed param to the relevant param list, per
    10-feature-planner.md § 12's Navigation Entry Standard.
  → No: keep it `undefined` — do not pass data through params that the
    destination screen can fetch itself via a repository/hook.
```

---

# 11. Real Project Examples

- **`App.tsx`** — renders `AppNavigator` directly; the concrete site of § 6's gap.
- **`src/navigation/AuthNavigator.tsx`** — fully correct, fully unreachable. A textbook example of the "Bad Example" in § 9.
- **`src/navigation/types.ts`** — `RootStackParamList` is declared but no navigator in the codebase actually uses it as a param list (no `createNativeStackNavigator<RootStackParamList>()` call exists anywhere). It documents an intent that implementation hasn't caught up to.
- **`src/screens/HomeScreen.tsx`** — the only screen that takes `navigation` as an explicit prop (`NativeStackNavigationProp<AppStackParamList, "Home">`) rather than calling `useNavigation()` — a stylistic inconsistency inherited from its legacy status (see `folder-structure.md` § 7).

---

# 12. Common Mistakes

- Assuming `AuthNavigator` is live because it's well-written and fully wired internally. Verify against `App.tsx`, not against `src/navigation/*.ts` in isolation.
- Adding a hardcoded, single-language string to a new screen's `options={{ title: ... }}`. Route it through `t()` from `useLanguage()` instead, matching every in-page heading's convention.
- Passing large objects through navigation params instead of an id the destination screen resolves via its own repository/hook call.
- Building new navigation logic as if Expo Router were already in place, because `context.md` lists it as target stack. Build against React Navigation as it exists today; see § 7.

---

# 13. Best Practices

- Register every new route in the correct param list (`10-feature-planner.md` § 12) before writing the screen component.
- Read header titles through `t()`, not hardcoded strings, so `AppNavigator.tsx` stays consistent with in-page content when the language toggle is used.
- When adding a screen that needs auth-gating, note in the PR description that it depends on § 6's unresolved `RootNavigator` gap, so reviewers don't assume gating already works.
- Keep `AuthNavigator.tsx` and `AppNavigator.tsx` structurally parallel (same `screenOptions` shape, same theme-reading pattern) so a future `RootNavigator` merge is mechanical, not a rewrite.

---

# 14. Checklist

- [ ] New route added to the correct `*StackParamList` in `types.ts`, `PascalCase`, explicit `undefined` or a typed param shape.
- [ ] Header title (if any) reads through `t()`, not a hardcoded string.
- [ ] Screen uses `useNavigation()`/`useRoute()` hooks, not an explicit `navigation` prop, unless there's a documented reason to deviate (matching `HomeScreen.tsx`'s legacy exception is not one).
- [ ] If the screen requires authentication, the PR notes that real gating depends on § 6's `RootNavigator` work, not implemented.
- [ ] No new code assumes Expo Router conventions.

---

# 15. FAQ

**Why does `AuthNavigator.tsx` import raw `colors` instead of `useTheme()`?**

Inconsistency, not a deliberate choice — `AppNavigator.tsx` uses `useTheme()`, `AuthNavigator.tsx` uses the static `colors` constant. Since `AuthNavigator` is unmounted (§ 6), this has had no visible effect yet; fix it to use `useTheme()` when wiring `RootNavigator`.

**Does `Register` have a screen yet?**

No. It is declared in `AuthStackParamList` as a planned route with no implementation.

**Is deep linking configured?**

No. `NavigationContainer` has no `linking` prop configured anywhere in this codebase.

**Should I build `RootNavigator` now, unprompted, since this handbook describes it?**

No — implementing it is an architecture-level change (touches `App.tsx`, `authStore.ts` hydration timing, and possibly a splash/loading screen for the hydration window) that should go through `chief-architect` and a proper feature plan, not be slipped into an unrelated PR because this handbook names the fix.

---

# 16. References

- [constitution.md](../constitution.md) — Predictability, Explicit Beats Implicit.
- [context.md](../context.md) — Technology Stack (Navigation: Expo Router, target).
- [10-feature-planner.md](../agents/10-feature-planner.md) — § 12 Navigation Entry Standard.
- [architecture.md](./architecture.md) — § 4, the same gap described at the whole-system level.
- [state-management.md](./state-management.md) — `authStore`'s `hydrate()` and the token-persistence gap this handbook's § 6 depends on.
- [feature-structure.md](./feature-structure.md) — where per-feature screens registered in these navigators live.
