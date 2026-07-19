---
id: template-screen
title: Screen Specification Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Screen Specification Template

## Purpose

Use this template to specify a single screen in isolation — pulled out of a full
feature plan when a screen needs its own focused spec (e.g. mid-feature addition,
or a spec review requested independently of the rest of `feature-proposal.md`).
Filled out by `10-feature-planner`. Implemented against by `react-native-engineer`
(navigation, data wiring) and `ui-engineer` (presentation), per
`.claude/agents/10-feature-planner.md` § 21 (Collaboration Rules).

This template is a single-screen extraction of `.claude/agents/10-feature-planner.md`
§ 9 (Screen Specification Standard) — the structure below is copied verbatim from
that section. When specifying an entire feature with multiple screens, use
`.claude/templates/feature-proposal.md` instead, which embeds one of these blocks
per screen.

## Instructions

Every field is required. Per § 9's closing rule: "a screen spec missing any state
is rejected in review."

1. **Purpose** — one sentence, not a paragraph.
2. **Route** — `<StackName>.<RouteName>`, matching the real param-list convention
   in `src/navigation/types.ts` (`AuthStackParamList`, `AppStackParamList`, or a new
   named param list). State `params: { ... }` or `params: none`.
3. **Entry points / Exit points** — name the actual screens or actions, not "from
   elsewhere."
4. **Data dependencies** — name the actual repository method or store slice (see
   `.claude/templates/repository.md` / `.claude/templates/store.md`), not "fetches
   data."
5. **States** — all six are mandatory: Loading, Empty, Error, Offline, Unauthorized,
   Success. If a state is genuinely impossible for this screen (e.g. a form screen
   has no meaningful Empty state), write "Not applicable: <reason>" rather than
   deleting the line — matching the rule in
   `.claude/agents/10-feature-planner.md` § 15.
6. **Primary/Secondary actions** — name what each action does, not just its label.
7. **Accessibility notes** — dynamic type behavior, screen reader labels for
   non-text controls, minimum touch target notes. Required per the Constitution's
   Accessibility section ("accessibility bugs are functional bugs").

---

## The Template

```markdown
### Screen: <Name>

**Purpose:** <one sentence>

**Route:** <StackName>.<RouteName>, params: { <param>: <type> } | none

**Entry points:** <where the user comes from>

**Exit points:** <where the user can go>

**Data dependencies:**
- <repository method or store slice> → <what it provides>

**States:**
- Loading: <what renders>
- Empty: <what renders, what action is offered — or "Not applicable: <reason>">
- Error: <what renders, is retry offered>
- Offline: <what renders, is cached data shown>
- Unauthorized: <what renders, where does the user get redirected>
- Success: <what renders>

**Primary action:** <action, and what it triggers>
**Secondary actions:** <list>

**Accessibility notes:** <dynamic type behavior, screen reader labels for
non-text controls, minimum touch target notes>
```

---

## Filled Example: `ProductListScreen`

```markdown
### Screen: ProductListScreen

**Purpose:** Let the user browse, search, and filter their product catalog.

**Route:** AppStack.ProductList, params: none

**Entry points:** Dashboard quick action "Products"; app menu entry point.

**Exit points:** ProductDetailScreen (tap a product card); ProductFormScreen
(tap "New Product").

**Data dependencies:**
- `productRepository.list({ page, pageSize, query, categoryId })` → paginated
  `ProductSummary[]` for the current page
- `useProductsUiStore` → current `query`, `categoryId`, `sortBy` filter state
  (see `.claude/templates/store.md`'s filled example)

**States:**
- Loading: 6 skeleton product cards in a 2-column grid, shimmer animation
- Empty: centered illustration + "No products yet" text + "Add your first
  product" primary button (navigates to ProductFormScreen)
- Error: inline error card at the top of the list ("Couldn't load products") +
  "Retry" button; if a previous page was already loaded, that data remains
  visible below the error card rather than being cleared
- Offline: persistent banner "You're offline — showing saved products"; the last
  successfully fetched page remains visible and browsable, but pull-to-refresh
  and "load more" are disabled
- Unauthorized: full-screen state "Your session expired" with a single "Log in
  again" button that navigates to `AuthStack.Login` and clears `authStore`
- Success: 2-column grid of product cards (thumbnail image, name, price, stock
  status badge), infinite-scroll pagination, pull-to-refresh

**Primary action:** "New Product" (header button) → navigates to
`AppStack.ProductForm` with no `productId` param (create mode)
**Secondary actions:** search input (debounced, updates `useProductsUiStore.query`),
category filter chips (see `.claude/templates/component.md`'s `Chip` example),
sort control, pull-to-refresh, infinite scroll "load more"

**Accessibility notes:** search input has `accessibilityLabel="Search products"`;
category chips expose `accessibilityState={{ selected }}`; stock status is
communicated as text ("In stock" / "Low stock" / "Out of stock"), never color
alone; every product card meets the 44x44pt minimum touch target; the screen
respects the system's Reduce Motion setting by disabling the shimmer animation
on skeleton loading state when active.
```

---

## Checklist

- [ ] Purpose is one sentence
- [ ] Route matches the real param-list convention (`PascalCase`, explicit `params`)
- [ ] Entry points and Exit points name real screens/actions
- [ ] Data dependencies name a real repository method or store slice, not "fetches data"
- [ ] All six states present — Loading, Empty, Error, Offline, Unauthorized, Success — each either filled or explicitly "Not applicable: <reason>"
- [ ] Primary action states what it triggers, not just its label
- [ ] Accessibility notes are present and specific (not "should be accessible")

## References

- `.claude/agents/10-feature-planner.md` § 9 (Screen Specification Standard), § 13 (Edge Case Catalog — consult when filling in Error/Offline detail)
- `.claude/constitution.md` — Error Philosophy, Accessibility
- `src/navigation/types.ts` — real param-list shape (`AuthStackParamList`, `AppStackParamList`, `RootStackParamList`)
- `.claude/templates/feature-proposal.md` — embeds this same block for a multi-screen feature
