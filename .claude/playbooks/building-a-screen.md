---
id: playbook-building-a-screen
title: Building A Screen Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Building A Screen Playbook

> A screen is not done when it renders. It is done when every state in the plan renders correctly and every navigation edge works. — `../agents/20-react-native-engineer.md`

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Adding ProductDetailScreen to the Products Feature
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

This playbook covers adding one new screen to a feature that already exists (or is being built alongside this screen from an approved plan) — as opposed to `building-a-feature.md`, which covers the full multi-screen feature lifecycle from request to plan. Use this when the screen list, states, and repository contract are already decided and you need to turn one Screen Specification into a working `.tsx` file, correctly registered in navigation.

---

# 2. When To Use This Playbook

Use this playbook when:

- A feature plan (`../templates/feature-proposal.md`) already names the screen you're building, with a completed Screen Specification (`../agents/10-feature-planner.md` § 9).
- You are extending an existing feature — e.g. adding `ProductDetailScreen` to a `products` feature that already has `ProductListScreen`.
- The components, repository hooks, and store hooks the screen needs already exist, or their signatures are agreed with the owning agents (`ui-engineer`, `network-engineer`, `state-engineer`).

Do not use this playbook if no Screen Specification exists yet — go back to `../agents/10-feature-planner.md` and `building-a-feature.md` first. A screen built without a spec is exactly the kind of improvisation `../agents/20-react-native-engineer.md` § 4 exists to prevent.

---

# 3. Prerequisites

- A completed Screen Specification per `../agents/10-feature-planner.md` § 9: purpose, route, entry/exit points, data dependencies, all six states, primary/secondary actions, accessibility notes.
- Confirmation every `ui-engineer` component the screen needs exists in `src/components/ui/*` (see `src/components/ui/index.ts` for the current barrel) — if not, request it first via `creating-a-component.md` rather than inlining a substitute.
- Confirmation the data hook (repository/query) and any store hook the screen needs exist or are in progress with an agreed signature.
- Knowledge of which navigator the screen belongs in: `src/navigation/AuthNavigator.tsx` (unauthenticated) or `src/navigation/AppNavigator.tsx` (authenticated) — see `adding-navigation.md` for the full navigation-registration playbook, which this playbook's Step 5 summarizes inline.

---

# 4. Step-by-Step Workflow

## Step 1 — Re-read the Screen Specification in full

Do not work from memory of a conversation. Read the actual spec block for this screen: Purpose, Route, Entry points, Exit points, Data dependencies, States (all six), Primary/Secondary actions, Accessibility notes.

## Step 2 — Confirm dependencies exist

- Components: check `src/components/ui/index.ts`'s barrel export list (`Button`, `Card`, `Input`, `Screen`, `Badge`, `Divider`, `Avatar`, `IconButton`, `Spacer`, `Row`, `Heading`/`SubHeading`/`Body`/`Caption`/`Label`/`Muted` from `Typography`, plus `GlassCard`/`GlassPill`).
- Data hooks: confirm the repository method exists (see `creating-a-repository.md`) and a hook wraps it in TanStack Query, matching the shape `../agents/20-react-native-engineer.md` § 10 shows for `useContentList()`: `{ data, isLoading, isError, refetch, isRefetching }`.
- Store hooks: confirm which fields, if any, come from `useAuthStore` or `useUIStore` (`src/store/index.ts`'s barrel), or a feature-scoped store per `creating-a-zustand-store.md`.

## Step 3 — Create the screen file

Location: `src/features/<feature>/screens/<Name>Screen.tsx` — never `src/screens/` (that folder is legacy, holds only `HomeScreen.tsx`, and is documented technical debt per `../rules/folders.md` Rule 4 and `../rules/architecture.md` Rule 2 — do not add siblings to it).

Follow the Screen Implementation Standard structure from `../agents/20-react-native-engineer.md` § 10, top to bottom:

1. Imports: React Native primitives, then third-party, then project components, then hooks/stores, then types — matching the order in `src/features/auth/screens/LoginScreen.tsx`.
2. Hook calls in order: theme (`useTheme()`), language (`useLanguage()`), store, query.
3. Derived/local state.
4. Early returns for Loading / Unauthorized / Error / Offline states.
5. Main render for Empty or Success.
6. `StyleSheet.create` block at the bottom, aligned colons matching `Button.tsx`'s and `Input.tsx`'s existing convention.

```tsx
// src/features/products/screens/ProductDetailScreen.tsx
import { View, ScrollView, StyleSheet } from "react-native";
import { useTheme } from "../../../context/ThemeContext";
import { useLanguage } from "../../../context/LanguageContext";
import { Card, Heading, Body, Button } from "../../../components/ui";
import { useProductDetail } from "../hooks/useProductDetail";
import type { AppStackParamList } from "../../../navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type Props = NativeStackScreenProps<AppStackParamList, "ProductDetail">;

export default function ProductDetailScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { isRTL } = useLanguage();
  const { data, isLoading, isError, refetch } = useProductDetail(route.params.productId);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState onRetry={refetch} />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card>
        <Heading style={{ textAlign: isRTL ? "right" : "left" }}>{data.name}</Heading>
        <Body style={{ textAlign: isRTL ? "right" : "left" }}>{data.description}</Body>
      </Card>
      <Button
        label={isRTL ? "ویرایش" : "Edit"}
        onPress={() => navigation.navigate("ProductForm", { productId: data.id })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 20, gap: 16 },
});
```

This mirrors `../agents/20-react-native-engineer.md` § 10's Good example exactly: every plan-required state has a distinct render path, existing `ui-engineer` components are composed rather than reinvented, data comes from a hook rather than a direct `client` call, and `isRTL` is handled inline since Farsi/RTL is the app's actual default (`src/context/LanguageContext.tsx`), not an edge case.

## Step 4 — Implement every state, not just Success

Loading, Empty, Error, Offline, Unauthorized, Success — all six, as distinct, reachable render paths, per the Constitution's Error Philosophy and `../agents/20-react-native-engineer.md` § 4/§ 7 Principle 2. A `// TODO: handle error` comment is a shipped bug, not deferred work.

## Step 5 — Register the route (see `adding-navigation.md` for full detail)

1. Add the route to the correct param list in `src/navigation/types.ts` (`AppStackParamList` or `AuthStackParamList`), `PascalCase`, explicit param shape or `undefined`.
2. Import and register the screen with a `<Stack.Screen>` entry in the matching navigator file (`AppNavigator.tsx` or `AuthNavigator.tsx`).

## Step 6 — Verify every exit point

For each exit point in the spec, confirm `navigation.navigate("RouteName", { param })` uses the exact route name and param shape just registered — a mismatch compiles under loose settings but breaks `navigation.navigate()` type-checking everywhere else (`../agents/20-react-native-engineer.md` § 13).

## Step 7 — Apply accessibility notes

`accessibilityLabel` on icon-only controls, `accessibilityRole` on interactive elements, minimum touch target sizing, and RTL-aware layout via `isRTL`. This is baseline coverage, not the full audit — deep accessibility review is a separate reviewer pass.

## Step 8 — Self-review and hand off

Run `../agents/20-react-native-engineer.md` § 18's Self Review, then hand off to `reviewer` (`../commands/review-feature.md`), flagging `performance-reviewer` for list/media-heavy screens and `accessibility-reviewer` for any new interaction pattern.

---

# 5. Worked Example: Adding ProductDetailScreen to the Products Feature

Continuing from `building-a-feature.md`'s Products worked example — assume `ProductListScreen` already exists and `ProductDetailScreen` is the next screen from the same approved plan.

**Step 1.** The plan's spec: Purpose "Show full detail for one product and expose edit/archive actions." Route `AppStack.ProductDetail`, params `{ productId: string }`. Entry: tap a product card on `ProductListScreen`. Exit: `ProductFormScreen` (Edit) or back to `ProductListScreen` (Archive confirmed). Data: `ProductRepository.getById(productId)`. All six states are specified in the plan, including the note that Empty is "not applicable — a detail screen with no product is an Error state."

**Step 2.** Confirm `Card`, `Heading`, `Body`, `Button` exist in `src/components/ui/index.ts` — they do. Confirm `useProductDetail(productId)` exists or is being built in parallel by `network-engineer`/`state-engineer` with the agreed `{ data, isLoading, isError, refetch }` shape.

**Step 3.** Create `src/features/products/screens/ProductDetailScreen.tsx` following the structure above.

**Step 4.** Loading renders a skeleton; Error renders "Product not found or failed to load" + Retry + "Back to list"; Offline shows cached product read-only with a banner, or falls back to Error if nothing was cached; Unauthorized redirects to `AuthStack.Login`; Success renders the full detail.

**Step 5.** Add `ProductDetail: { productId: string };` to `AppStackParamList` in `src/navigation/types.ts`, then register `<Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: isRTL ? "جزئیات محصول" : "Product Detail" }} />` in `AppNavigator.tsx`.

**Step 6.** Confirm `ProductListScreen`'s card tap calls `navigation.navigate("ProductDetail", { productId: item.id })` with the exact route name and param key.

**Step 7.** "Archive" uses `variant="danger"` on `Button` per the plan's accessibility note, with a confirmation step before calling `ProductRepository.archive`.

**Step 8.** Hand off to `reviewer`; flag `accessibility-reviewer` because "Archive" is a new destructive-confirmation interaction pattern.

---

# 6. Checklist

- [ ] Screen Specification was re-read in full, not recalled from memory.
- [ ] Every needed component exists in `src/components/ui/*`; none were inlined as a substitute.
- [ ] File created at `src/features/<feature>/screens/<Name>Screen.tsx`, not `src/screens/`.
- [ ] All six states (Loading, Empty, Error, Offline, Unauthorized, Success) have distinct render paths.
- [ ] Route added to the correct param list in `src/navigation/types.ts` with `PascalCase` naming.
- [ ] Screen registered in the correct navigator file (`AuthNavigator.tsx` vs `AppNavigator.tsx`).
- [ ] Every exit point's `navigation.navigate()` call matches the registered route name and param shape exactly.
- [ ] No direct `client`/axios call inside the screen file.
- [ ] Accessibility notes from the spec were applied (labels, roles, touch targets, RTL).
- [ ] `reviewer` notified; `performance-reviewer` and/or `accessibility-reviewer` flagged where relevant.

---

# 7. Common Mistakes

**Building a component inline instead of requesting one.** If a needed component doesn't exist in `src/components/ui/`, the fix is `creating-a-component.md`, not a one-off `TouchableOpacity` with hand-rolled styles inside the screen (`../agents/20-react-native-engineer.md` § 13).

**Fetching with `useEffect` + `client.get(...)` directly in the screen.** Bypasses the repository/query layer, duplicates loading/error handling ad hoc, and can't be swapped for a mock later without touching the screen.

**Adding a route to the navigator but forgetting `src/navigation/types.ts`.** Compiles, but breaks `navigation.navigate()` type safety everywhere else in the app.

**Hard-coding LTR and retrofitting `isRTL` later.** `isRTL` is the app's actual default locale behavior (`fa`), not an edge case — build RTL-aware from the first line, matching `LoginScreen.tsx`.

**Implementing only the Success state "for now."** Every state is required at handoff, not as a follow-up PR — a screen missing states is an incomplete implementation, not a fast first draft.

---

# 8. References

- `../constitution.md` — Error Philosophy, Separation of Concerns, Accessibility
- `../agents/10-feature-planner.md` § 9 — Screen Specification Standard
- `../agents/20-react-native-engineer.md` — the full screen implementation standard this playbook operationalizes
- `../agents/22-ui-engineer.md` — component ownership this playbook depends on
- `../rules/folders.md`, `../rules/naming.md` — file location and naming conventions
- `../templates/feature-proposal.md` — filled Products example with the full ProductDetailScreen spec used above
- `./building-a-feature.md` — the full-feature lifecycle this playbook is one step of
- `./adding-navigation.md` — the full route-registration playbook
- `./creating-a-component.md` — how to add a missing shared component before building a screen around a substitute
