---
id: template-feature-proposal
title: Feature Proposal Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Feature Proposal Template

## Purpose

Use this template to plan a new feature or a substantial addition to an existing feature module before any component, hook, store, or repository code is written.

This template is filled out by `10-feature-planner`, working from architecture already approved by `00-chief-architect`. It is the document referenced by `.claude/agents/10-feature-planner.md` § 15 (Feature Plan Document Structure) as the base document for every feature plan.

Do not start this template until:
- The feature's module boundaries are approved (or the feature obviously fits an existing module in `src/features/`), and
- Product requirements exist in writing — `context.md`, a written feature request, or explicit user input. Never invent requirements to fill a blank field.

## Instructions

Fill every section below in order. Every rule referenced here comes from `.claude/agents/10-feature-planner.md` — read that file's numbered section before filling the matching part of this template.

1. **Feature Summary** — one paragraph, matches § 14.
2. **Scope** — be explicit about what is out of scope. A missing "out of scope" line is treated as "everything is in scope," which is almost never true.
3. **Screens** — one block per screen using the exact structure in § 9 (Screen Specification Standard). All seven states (Loading, Empty, Error, Offline, Unauthorized, Success — note the template also treats "Success" as its own required state) must be filled; a screen missing a state is rejected in review per § 9's closing rule.
4. **Repository Contracts** — one TypeScript interface per repository using § 10. Every method needs input shape, success return shape, named error cases, pagination behavior (if any), and retry-safety. Do not write `Promise<any>`.
5. **State** — one block per piece of state using § 11 (State Shape Standard). Default to Local or Server Cache; promoting to a new global Zustand store requires explicit justification per the decision tree in § 16 and effectively requires `chief-architect` sign-off if it crosses feature boundaries.
6. **Navigation** — one block per new route using § 12, matching the real shape of `src/navigation/types.ts` (`PascalCase` route names, explicit `undefined` for paramless routes, one param list per stack).
7. **Edge Cases** — complete the full catalog from § 13. Mark every item "applies" or "does not apply" with a one-line reason; silence is not acceptable.
8. **Acceptance Criteria** — a checklist a reviewer can verify without reading the implementation.
9. **Open Questions** — should usually be empty at handoff. If not empty, the plan is not ready.
10. **Handoff** — name every downstream agent and the order they should work in, per § 21/§ 22.

Save completed plans to `.claude/docs/examples/<feature-name>-plan.md` (default location per § 15, until `chief-architect` formally decides otherwise) or alongside the feature under `src/features/<feature>/PLAN.md`.

---

## The Template

```markdown
# Feature Proposal: <Feature Name>

## Feature Summary
<One paragraph: what is being built and why, tied to a Primary Feature in context.md.>

## Scope

**In scope:**
- <capability>
- <capability>

**Out of scope:**
- <capability explicitly deferred, and why>

## Screens

### Screen: <Name>

**Purpose:** <one sentence>

**Route:** <StackName>.<RouteName>, params: { <param>: <type> } | none

**Entry points:** <where the user comes from>

**Exit points:** <where the user can go>

**Data dependencies:**
- <repository method or store slice> → <what it provides>

**States:**
- Loading: <what renders>
- Empty: <what renders, what action is offered>
- Error: <what renders, is retry offered>
- Offline: <what renders, is cached data shown>
- Unauthorized: <what renders, where does the user get redirected>
- Success: <what renders>

**Primary action:** <action, and what it triggers>
**Secondary actions:** <list>

**Accessibility notes:** <dynamic type behavior, screen reader labels, minimum touch target notes>

<repeat "### Screen:" block for every screen>

## Repository Contracts

```ts
interface <Name>Repository {
  <method>(<params>): Promise<<ReturnType>>; // <error cases, pagination, retry-safety notes>
}
```

<repeat one interface block per repository>

## State

### State: <name>

**Kind:** Global (Zustand) | Local (component) | Server Cache (TanStack Query)

**Justification:** <why this kind and not another>

**Shape:**
{
  <field>: <type>,  // survives navigation? yes/no
}

**Owned by:** <feature name>, or "cross-feature" with explicit justification

<repeat "### State:" block for every distinct piece of state>

## Navigation

### Route: <StackName>.<RouteName>

**Params:** { <param>: <type> } | undefined

**Added to:** AuthStackParamList | AppStackParamList | <NewStackParamList>

**Linked from:** <screen/action that navigates here>

**Deep link:** yes/no — if yes, path and params

<repeat "### Route:" block for every new route>

## Edge Cases

**Network**
- request timeout: <applies/does not apply — reason>
- request fails with no connectivity: <applies/does not apply — reason>
- request succeeds but returns malformed data: <applies/does not apply — reason>
- request succeeds after a retry: <applies/does not apply — reason>

**Data**
- empty result set: <applies/does not apply — reason>
- single result: <applies/does not apply — reason>
- very large result set (pagination boundary): <applies/does not apply — reason>
- stale cached data shown while refetching: <applies/does not apply — reason>
- concurrent edits from two sessions: <applies/does not apply — reason>

**Auth**
- token expired mid-session: <applies/does not apply — reason>
- user lacks permission for the action: <applies/does not apply — reason>
- session revoked remotely: <applies/does not apply — reason>

**Platform (Instagram / Telegram / Bale / Rubika / Eita)**
- platform account disconnected or token revoked: <applies/does not apply — reason>
- platform-specific content limits differ per platform: <applies/does not apply — reason>
- publishing succeeds on some platforms and fails on others: <applies/does not apply — reason>

**Device**
- low connectivity / offline: <applies/does not apply — reason>
- app backgrounded mid-operation: <applies/does not apply — reason>
- low storage (affects cached media): <applies/does not apply — reason>

**AI (only if the feature touches AI content or AI images)**
- AI provider timeout or rate limit: <applies/does not apply — reason>
- AI output requires human review before publishing: <applies/does not apply — reason>
- AI provider unavailable — non-AI fallback path: <applies/does not apply — reason>

## Acceptance Criteria
- [ ] <independently verifiable statement>
- [ ] <independently verifiable statement>

## Open Questions
<Should usually be empty. If not, list the blocking question and who must answer it.>

## Handoff
<Name every agent that continues the work, in order, e.g.:>
1. `network-engineer` — implement `<X>Repository` mock first.
2. `state-engineer` — implement the state slices defined above.
3. `ui-engineer` — build presentational components for each screen.
4. `react-native-engineer` — wire screens, navigation, and data hooks together.
```

---

## Filled Example: Products Feature

```markdown
# Feature Proposal: Products

## Feature Summary
Sugar Admin's Primary Features (context.md) name Products — create, update, delete,
archive, search, categories, inventory, images — as required for the first production
release. No `src/features/products/` module exists yet. This plan introduces that
module so a shop owner can manage their catalog from the phone, fully mock-backed,
before any real backend exists.

## Scope

**In scope:**
- Browsing and searching the product list
- Viewing a single product's detail
- Creating, updating, and archiving a product
- Assigning a product to one or more categories
- Managing a product's inventory count
- Attaching one or more images to a product

**Out of scope:**
- AI-generated product images or captions (owned by AI Content / AI Images features,
  planned separately)
- Publishing a product to Instagram/Telegram/etc. (owned by Publishing feature)
- Bulk import/export (not in context.md's first-release scope; open question below
  intentionally not raised — deferred, not blocking)

## Screens

### Screen: ProductListScreen

**Purpose:** Let the user browse, search, and filter their product catalog.

**Route:** AppStack.ProductList, params: none

**Entry points:** Dashboard quick action "Products"; App tab/menu entry.

**Exit points:** ProductDetailScreen (tap a product), ProductFormScreen (tap "New Product").

**Data dependencies:**
- `ProductRepository.list({ page, pageSize, query, categoryId })` → paginated product summaries

**States:**
- Loading: skeleton list rows (6 placeholder cards)
- Empty: "No products yet" illustration + "Add your first product" primary action
- Error: inline error card with "Retry" button; list is not cleared if a previous page was loaded
- Offline: banner "You're offline — showing saved products"; last successfully fetched page remains visible, read-only
- Unauthorized: full-screen "Session expired" state, redirects to AuthStack.Login after acknowledgement
- Success: paginated product cards (image, name, price, stock badge)

**Primary action:** "New Product" → navigates to ProductFormScreen (create mode)
**Secondary actions:** search input, category filter chips, pull-to-refresh

**Accessibility notes:** search input has an accessible label "Search products"; stock
badges expose "in stock" / "low stock" / "out of stock" as text, not color alone;
product cards are a minimum 44x44pt touch target.

### Screen: ProductDetailScreen

**Purpose:** Show full detail for one product and expose edit/archive actions.

**Route:** AppStack.ProductDetail, params: { productId: string }

**Entry points:** ProductListScreen (tap a product card).

**Exit points:** ProductFormScreen (tap "Edit"), back to ProductListScreen (archive
confirmed, or back navigation).

**Data dependencies:**
- `ProductRepository.getById(productId)` → full product record

**States:**
- Loading: skeleton detail layout
- Empty: not applicable — a detail screen with no product is an Error state (see below)
- Error: "Product not found or failed to load" + Retry + "Back to list"
- Offline: cached product shown read-only with an offline banner if previously loaded; otherwise same as Error
- Unauthorized: redirect to AuthStack.Login
- Success: image gallery, name, price, inventory count, categories, description

**Primary action:** "Edit" → ProductFormScreen (edit mode, prefilled)
**Secondary actions:** "Archive" (confirmation dialog required before calling
`ProductRepository.archive`)

**Accessibility notes:** image gallery exposes alt text per image; "Archive" is a
destructive action and must use `variant="danger"` per the Button component
convention with a confirmation step, never a single tap.

### Screen: ProductFormScreen

**Purpose:** Create a new product or edit an existing one.

**Route:** AppStack.ProductForm, params: { productId?: string }

**Entry points:** ProductListScreen ("New Product"), ProductDetailScreen ("Edit").

**Exit points:** ProductDetailScreen (save succeeds), back to previous screen (cancel).

**Data dependencies:**
- `ProductRepository.getById(productId)` → prefill data, edit mode only
- `ProductRepository.create` / `ProductRepository.update` → submit

**States:**
- Loading: form fields disabled + spinner while prefill data loads (edit mode only)
- Empty: not applicable — a form always renders its fields
- Error: inline field-level validation errors; a top-of-form banner for submit failures
- Offline: submit button disabled with "You're offline — changes cannot be saved right now"
- Unauthorized: redirect to AuthStack.Login before the form renders
- Success: toast "Product saved" (via `useUIStore.showToast`), navigate to ProductDetailScreen

**Primary action:** "Save" → validates then calls create/update
**Secondary actions:** "Cancel", per-image "Remove" in the image picker

**Accessibility notes:** every input has a visible label (not placeholder-only);
validation errors are announced to screen readers when they appear; image picker
"Remove" buttons have accessible labels naming which image they remove.

## Repository Contracts

```ts
// Contract only. Implementation belongs to network-engineer (mock first).
interface ProductRepository {
  list(params: {
    page: number;
    pageSize: number;
    query?: string;
    categoryId?: string;
  }): Promise<Paginated<ProductSummary>>;
  // Throws NetworkError on timeout/connectivity failure. Safe to retry.

  getById(id: string): Promise<Product>;
  // Throws NotFoundError if the product does not exist or was archived.
  // Safe to retry.

  create(input: CreateProductInput): Promise<Product>;
  // Throws ValidationError with field-level messages. Not safe to blindly retry
  // (caller must confirm the create did not already succeed before resubmitting).

  update(id: string, input: UpdateProductInput): Promise<Product>;
  // Throws NotFoundError | ValidationError | ConflictError (concurrent edit).
  // Safe to retry only if the caller resends the same input unchanged.

  archive(id: string): Promise<void>;
  // Throws NotFoundError. Idempotent — safe to retry.
}
```

## State

### State: productListFilters

**Kind:** Local (component), colocated in ProductListScreen (or a small feature-scoped
`productsUiStore` if the same filters must be read from more than one screen — see
`store.md` template for that decision worked through in detail)

**Justification:** Only affects what ProductListScreen requests from the repository;
does not need to survive app restart; no other feature reads it.

**Shape:**
{
  query: string,       // survives navigation? no
  categoryId: string | null, // survives navigation? no
}

**Owned by:** products feature, ProductListScreen only

### State: product list data

**Kind:** Server Cache (TanStack Query), keyed by `["products", "list", filters, page]`

**Justification:** Product data is owned by the (future) backend; TanStack Query
already owns caching, refetch, and staleness — duplicating it into Zustand would
violate the Constitution's "avoid duplicated state" rule.

**Shape:** N/A — owned by the query cache, not hand-modeled here.

**Owned by:** products feature

## Navigation

### Route: AppStack.ProductList

**Params:** undefined

**Added to:** AppStackParamList

**Linked from:** Dashboard quick action; app entry menu

**Deep link:** no

### Route: AppStack.ProductDetail

**Params:** { productId: string }

**Added to:** AppStackParamList

**Linked from:** ProductListScreen product card tap

**Deep link:** no (candidate for future deep link to open a specific product from a
push notification; not required for this release)

### Route: AppStack.ProductForm

**Params:** { productId?: string }

**Added to:** AppStackParamList

**Linked from:** ProductListScreen "New Product", ProductDetailScreen "Edit"

**Deep link:** no

## Edge Cases

**Network**
- request timeout: applies — ProductListScreen shows Error state with Retry
- request fails with no connectivity: applies — see Offline state on all three screens
- request succeeds but returns malformed data: applies — repository validates shape and throws; UI shows Error state, does not render partial garbage
- request succeeds after a retry: applies — TanStack Query default retry covers list/detail reads; mutations (create/update/archive) are not auto-retried, per repository contract notes above

**Data**
- empty result set: applies — ProductListScreen Empty state
- single result: applies — list renders one card, no special-case UI needed
- very large result set (pagination boundary): applies — `list()` is paginated; infinite scroll loads next page
- stale cached data shown while refetching: applies — TanStack Query shows cached page while refetching in background, standard `isFetching` indicator
- concurrent edits from two sessions: applies — `update()` may throw ConflictError; ProductFormScreen shows "This product was changed elsewhere, reload to see the latest version"

**Auth**
- token expired mid-session: applies — any repository call may 401; global axios interceptor in `src/api/client.ts` triggers logout; screens show Unauthorized state
- user lacks permission for the action: applies — mock repository simulates a `viewer` role rejecting create/update/archive; UI hides those actions for `viewer` role (see `User.role` in `src/types/index.ts`)
- session revoked remotely: applies — same handling as token expiry

**Platform (Instagram / Telegram / Bale / Rubika / Eita)**
- platform account disconnected or token revoked: does not apply — Products is a catalog feature, not a publishing feature
- platform-specific content limits differ per platform: does not apply — no publishing happens here
- publishing succeeds on some platforms and fails on others: does not apply — out of scope, owned by Publishing feature

**Device**
- low connectivity / offline: applies — see Offline states above
- app backgrounded mid-operation: applies — an in-flight ProductFormScreen submit that backgrounds must not be lost silently; TanStack Query mutation resumes on foreground or shows a failed-to-save banner
- low storage (affects cached media): applies — product images are cached; if device storage is critically low, image picker shows the OS-level storage warning, no custom handling required in v1

**AI**
- N/A — this feature does not touch AI content or AI images in this plan.

## Acceptance Criteria
- [ ] ProductListScreen renders all six required states (Loading/Empty/Error/Offline/Unauthorized/Success)
- [ ] ProductDetailScreen renders all required states and "Archive" requires confirmation
- [ ] ProductFormScreen validates required fields (name, price >= 0) before calling create/update
- [ ] `ProductRepository` mock implementation simulates latency, a non-zero failure rate, and the `viewer` role permission denial
- [ ] All three routes are added to `AppStackParamList` in `src/navigation/types.ts`
- [ ] Archiving a product removes it from ProductListScreen's default view without a full page reload
- [ ] No component directly imports `axios` or `client` — all data access goes through `ProductRepository`

## Open Questions
(none — this plan is ready for handoff)

## Handoff
1. `network-engineer` — implement `ProductRepository` (mock first), including the
   permission and conflict simulation described above.
2. `state-engineer` — wire TanStack Query keys/hooks for list and detail; confirm
   `productListFilters` stays local unless a second screen needs it.
3. `ui-engineer` — build ProductListScreen, ProductDetailScreen, ProductFormScreen
   presentational layers against the screen specs above.
4. `react-native-engineer` — add the three routes to `AppStackParamList` and wire
   navigation between the screens.
```

---

## Checklist

Fields that must never be left blank:

- [ ] Feature Summary
- [ ] At least one item in Scope → In scope
- [ ] Every screen has Purpose, Route, and all six States filled
- [ ] Every repository method has an explicit error case and retry-safety note
- [ ] Every state block has a Kind and Justification (not "in case we need it later")
- [ ] Every new route is added to a named param list
- [ ] Every Edge Case Catalog line is marked applies/does not apply with a reason
- [ ] Acceptance Criteria has at least one independently verifiable item
- [ ] Handoff names at least one agent

## References

- `.claude/agents/10-feature-planner.md` — §§ 8–19 (SOP, standards, catalog, checklists)
- `.claude/agents/00-chief-architect.md` — § 6 (Communication Protocol), § 8 (Architectural Decision Process)
- `.claude/constitution.md` — Error Philosophy, Mock First Development, State Philosophy
- `.claude/context.md` — Primary Features, Architecture Principles
- `.claude/templates/screen.md`, `.claude/templates/repository.md`, `.claude/templates/store.md` — for isolated per-artifact detail once the plan is approved
