---
id: command-generate-screen
title: Generate Screen
category: command
version: 1.0.0
status: active
invokes_agent: react-native-engineer
last_updated: 2026-07-18
---

# Command: Generate Screen

> Implement a screen from a feature plan's Screen Specification (§ 9),
> register it in navigation, and wire every required state. Follows
> `10-feature-planner.md` § 9's standard and the real navigation
> registration steps used by `AppNavigator.tsx` / `AuthNavigator.tsx`.

---

## Purpose

Every screen in Sugar Admin must be traceable to a Screen Specification
written by `feature-planner` before it exists, and every screen must
register correctly across two files that must stay in sync:
`src/navigation/types.ts` (the param list type) and either
`src/navigation/AppNavigator.tsx` (authenticated) or
`src/navigation/AuthNavigator.tsx` (unauthenticated). A screen registered in
one but not the other either fails to compile against
`navigation.navigate()` call sites or crashes at runtime when navigated to.

`generate-screen` exists so this two-file registration and the six-state
implementation requirement (Loading, Empty, Error, Offline, Unauthorized,
Success) happen every time, identically, regardless of which screen or which
session is generating it.

---

## When To Invoke

- A feature plan (from `generate-feature.md`) specifies a screen in its § 9
  section that has not yet been implemented.
- An existing screen needs a new required state added that was missing (a
  `review-feature.md` finding).
- A new route needs to be added to an existing feature's navigation flow.

---

## Required Inputs

The invoker must supply:

1. **Screen name and feature** — e.g. `ProductFormScreen` in the `products`
   feature.
2. **The Screen Specification**, sourced from the feature plan's § 9 section
   (purpose, route, entry/exit points, data dependencies, all six states,
   primary/secondary actions, accessibility notes). If this doesn't exist
   yet, stop and route to `generate-feature` first — this command implements
   a spec, it does not write one.
3. **Target navigator** — `AuthNavigator` (unauthenticated) or
   `AppNavigator` (authenticated), or explicit confirmation a new stack is
   required (rare; requires `chief-architect` sign-off per
   `10-feature-planner.md` § 12).
4. **Confirmation that required components, state hooks, and repository/
   query hooks exist or are in progress** — per
   `20-react-native-engineer.md` § 8 Step 2 and Step 3, this command should
   not start writing a screen that depends on a component or hook nobody has
   built yet without first confirming timing with `ui-engineer` /
   `state-engineer` / `network-engineer`.

---

## Procedure

Follow `20-react-native-engineer.md` § 8's Decision Process, concretely:

1. **Read the Screen Specification in full.** Confirm it defines: purpose,
   route with exact params, entry points, exit points, data dependencies,
   all six states (Loading, Empty, Error, Offline, Unauthorized, Success),
   primary action, secondary actions, and accessibility notes. A spec
   missing any of these is rejected per `10-feature-planner.md` § 9 — return
   to `feature-planner`, do not fill the gap by guessing.

2. **Confirm dependencies exist.** Check `src/components/ui/` for the
   presentational components the screen needs (`Screen`, `Card`, `Button`,
   `Input`, `Row`, `Typography`, `Badge`, `Avatar`, `Divider`, `IconButton`,
   `Spacer` are the current inventory). If something needed doesn't exist,
   request it from `ui-engineer` rather than building a substitute inline —
   per `20-react-native-engineer.md`'s Anti Patterns.

3. **Confirm state/data hooks exist or are in progress.** Coordinate the
   exact hook signature with `state-engineer` (for Zustand/local state
   shape) and `network-engineer` (for repository-backed query hooks) before
   writing call sites against them.

4. **Create the screen file** at
   `src/features/<feature>/screens/<ScreenName>.tsx`, following
   `20-react-native-engineer.md` § 10's Screen Implementation Standard
   top-to-bottom order:
   1. Imports (React Native primitives → third-party → project components →
      hooks/stores → types)
   2. Hook calls (`useTheme()`, `useLanguage()`, store hooks, query hooks —
      in that order, matching `LoginScreen.tsx`)
   3. Derived/local state
   4. Early returns for Loading / Unauthorized / Error / Offline states
   5. Main render (Empty or Success)
   6. `StyleSheet.create` block at the bottom, aligned `:` colons matching
      `Button.tsx` / `LoginScreen.tsx`'s existing convention

5. **Implement every state as real, distinct code** — not a comment. Each of
   Loading, Empty, Error, Offline, Unauthorized, Success must have its own
   render branch. A screen that only implements Success is an incomplete
   implementation per `20-react-native-engineer.md` Principle 2.

6. **Wire data through hooks, never through `client` directly.** Per
   Principle 5, no screen may call `src/api/client.ts` or
   `src/api/endpoints/*.ts` directly, even though `authStore.login` does
   exactly that today as existing debt — that pattern is not a precedent to
   follow in new screens.

7. **Register the route in `src/navigation/types.ts` first.** Add the exact
   param shape to the correct `*ParamList` (`AuthStackParamList` or
   `AppStackParamList`), `PascalCase` name, explicit `undefined` for
   paramless routes — matching the existing shape:

   ```ts
   export type AppStackParamList = {
     Home:      undefined;
     Dashboard: undefined;
     Content:   undefined;
     Reports:   undefined;
     AIChat:    undefined;
     ProductList:   undefined;
     ProductDetail: { productId: string };
     ProductForm:   { productId?: string };
   };
   ```

8. **Register the `<Stack.Screen>` entry in the correct navigator file.**
   Import the screen component, add the entry with an `options.title`
   matching the existing convention (Persian titles are hard-coded directly
   in the navigator today, e.g. `"داشبورد"`, `"مدیریت محتوا"` in
   `AppNavigator.tsx` — match this pattern for consistency; do not
   unilaterally switch to `useLanguage().t()` mid-feature, since that is a
   broader cleanup flagged separately to `documentation-engineer` /
   `chief-architect` per `20-react-native-engineer.md` § 11).

9. **Verify every exit point in the spec navigates correctly** — correct
   route name, correct params, correct stack (a `navigate()` call targeting
   a route registered only in `AuthStackParamList` from a screen inside
   `AppNavigator` will fail type-checking, which is exactly the signal that
   catches a misregistered route early).

10. **Apply accessibility notes from the spec** — `accessibilityLabel` on
    icon-only controls, `accessibilityRole` where applicable, RTL-aware
    layout via `useLanguage().isRTL`, matching `LoginScreen.tsx`'s
    per-string branching pattern (Sugar Admin's default locale is Farsi/RTL,
    not an edge case, per § 9's Current Codebase Reality).

11. **Self-review against `20-react-native-engineer.md` § 15's "Before
    handing off a screen" checklist** before declaring the screen complete.

12. **Hand off to `reviewer`**, and explicitly flag `performance-reviewer`
    if the screen renders a list or heavy media, and `accessibility-reviewer`
    for any new interaction pattern (custom gesture, modal, non-standard
    control).

---

## Output Format

```
src/features/<feature>/screens/<ScreenName>.tsx   (new/updated screen file)
src/navigation/types.ts                            (updated param list)
src/navigation/<AppNavigator|AuthNavigator>.tsx     (updated <Stack.Screen>)

# Screen Implementation Report: <ScreenName>

## Spec Reference
<feature plan document + § 9 section>

## States Implemented
- Loading: <render path>
- Empty: <render path>
- Error: <render path>
- Offline: <render path>
- Unauthorized: <render path>
- Success: <render path>

## Navigation
Route: <StackName>.<RouteName>, params: <shape>
Registered in: src/navigation/types.ts, src/navigation/<Navigator>.tsx

## Accessibility Applied
<labels, roles, RTL handling implemented>

## Handoff
reviewer [, performance-reviewer] [, accessibility-reviewer]
```

---

## Example Invocation

> Generate `ProductFormScreen` for the `products` feature, per
> `.claude/docs/examples/products-feature-plan.md` § Screens →
> ProductFormScreen. Target navigator: `AppNavigator` (authenticated only).

## Example Output

```
src/features/products/screens/ProductFormScreen.tsx
src/navigation/types.ts   (+ ProductForm: { productId?: string })
src/navigation/AppNavigator.tsx   (+ <Stack.Screen name="ProductForm" .../>)

# Screen Implementation Report: ProductFormScreen

## Spec Reference
products-feature-plan.md, Screens § ProductFormScreen.

## States Implemented
- Loading: skeleton form fields shown while useProduct(productId) resolves,
  only when productId is present (edit mode); create mode skips straight to
  Success with an empty draft.
- Empty: not applicable to a form screen — noted explicitly per spec, not
  silently omitted.
- Error: inline banner with retry action if useProduct fails to load in
  edit mode; submit-time validation errors render per-field.
- Offline: submit button disabled with an inline "You're offline" notice;
  draft is retained locally so the user doesn't lose input.
- Unauthorized: if the mock repository's authorization check fails (e.g.
  session expired mid-edit), redirect to AuthNavigator's Login route via
  useAuthStore's isAuthenticated flag.
- Success: form renders with save/cancel actions; on submit success,
  navigates back to ProductDetail with the updated productId.

## Navigation
Route: App.ProductForm, params: { productId?: string }
Registered in src/navigation/types.ts (AppStackParamList) and
src/navigation/AppNavigator.tsx, title "ویرایش محصول" / "افزودن محصول"
depending on productId presence, matching the existing hard-coded-title
convention.

## Accessibility Applied
accessibilityLabel on the image-picker icon button and the delete-image
buttons per image; textAlign and flexDirection branch on isRTL for every
form row, matching LoginScreen.tsx's pattern; all touch targets confirmed
>= 44x44.

## Handoff
reviewer, accessibility-reviewer (new image-picker interaction pattern).
```

---

## Related Agents

- `react-native-engineer` — primary owner of this command.
- `feature-planner` — supplies the Screen Specification this command
  implements against.
- `ui-engineer`, `state-engineer`, `network-engineer` — supply the
  components, state, and data hooks this command wires together.
- `reviewer`, `performance-reviewer`, `accessibility-reviewer` — downstream
  review handoffs.

---

## References

- `.claude/agents/10-feature-planner.md` § 9, § 12.
- `.claude/agents/20-react-native-engineer.md` § 8, § 9, § 10, § 11, § 15.
- `src/navigation/types.ts`, `src/navigation/AppNavigator.tsx`,
  `src/navigation/AuthNavigator.tsx` — real registration targets.
- `src/features/auth/screens/LoginScreen.tsx` — reference implementation for
  RTL and styling conventions.
- `.claude/docs/examples/products-feature-plan.md` — worked example this
  command's example output is drawn from.
