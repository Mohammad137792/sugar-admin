---
id: docs-example-products-feature-plan
title: "Feature Plan: Products"
category: example
status: Proposed
date: 2026-07-18
deciders: Engineering (feature-planner output, pending network-engineer / state-engineer / ui-engineer / react-native-engineer handoff)
---

# Feature Proposal: Products

> Worked example produced to `.claude/agents/10-feature-planner.md`'s full standard (§§ 9–14). This plan is written as if handed to an engineer with zero prior conversation history — every decision this plan is responsible for making has been made here, not deferred.

## Feature Summary

`context.md`'s Primary Features section names **Products** — Create, Update, Delete, Archive, Search, Categories, Inventory, Images — as required for Sugar Admin's first production release, immediately after Authentication and Dashboard in the Development Philosophy's vertical-slice order (Authentication → Product Management → AI Caption Generation → Publishing → Analytics). No `src/features/products/` module exists in the codebase today (confirmed: `src/features/` currently contains only `ai-chat`, `auth`, `content`, `dashboard`, `reports`, each `screens/`-only per ADR-0001). This plan introduces that module from scratch so a shop owner can create, edit, organize, and stock-track their product catalog from the phone — fully mock-backed, per ADR-0002, with zero dependency on a real backend existing.

This plan does not describe anything already built. It is the authoritative specification `network-engineer`, `state-engineer`, `ui-engineer`, and `react-native-engineer` implement against.

## Scope

**In scope:**
- Browsing, searching, and filtering the product list by category and archive status
- Viewing a single product's full detail
- Creating a new product and updating an existing one
- Archiving a product (soft-delete; archived products are excluded from the default list view but not permanently destroyed)
- Assigning a product to one or more categories, and creating a new category inline during product creation
- Viewing and adjusting a product's inventory count, including a low-stock threshold
- Attaching, reordering, and removing one or more images per product

**Out of scope (explicitly deferred):**
- AI-generated product images, captions, or marketing copy — owned by the AI Content / AI Images features, planned separately; this plan's Image data dependency is limited to user-picked device photos.
- Publishing a product to Instagram/Telegram/Bale/Rubika/Eita — owned by the Publishing feature. Products exist as catalog data independent of whether or where they are published.
- Bulk import/export (CSV, spreadsheet) — not named in `context.md`'s first-release scope for Products. Not raised as an Open Question because it is a deliberate deferral, not a blocking unknown.
- Hard delete of a product (permanent, unrecoverable removal) — only Archive (soft-delete) is in scope for this release; `context.md` lists "Delete" as a capability, and this plan interprets it as the Archive/soft-delete behavior already specified, consistent with the constitution's general caution around destructive, irreversible actions; a genuinely permanent hard-delete, if needed later, is a distinct, separately-scoped decision.
- Multi-warehouse or per-location inventory — a single, flat inventory count per product is in scope; location-aware inventory is a Long-Term Vision concern (`context.md`'s Inventory Synchronization).

## Screens

### Screen: ProductListScreen

**Purpose:** Let the user browse, search, and filter their product catalog, and enter the create/edit/detail flows.

**Route:** AppStack.ProductList, params: none

**Entry points:** Dashboard quick action "Products" (`DashboardScreen`); a future bottom-tab/menu entry once app-wide navigation grows past the current single-stack shape (out of scope to redesign navigation chrome here — see Navigation section).

**Exit points:** ProductDetailScreen (tap a product card), ProductFormScreen in create mode (tap "New Product").

**Data dependencies:**
- `ProductRepository.list({ page, pageSize, query, categoryId, status })` → paginated product summaries, server-cached via TanStack Query
- `ProductRepository.listCategories()` → category chips for the filter row

**States:**
- Loading: 6 skeleton placeholder cards (image block + two text lines), shown on first load only — not on background refetch (see Success/stale-data behavior below).
- Empty: two distinct empty states depending on cause — (a) no products exist at all yet: illustration + headline "No products yet" + primary action "Add your first product"; (b) a search/filter combination matches zero products: headline "No results for '<query>'" + secondary action "Clear filters", no illustration.
- Error: inline error card ("Couldn't load products") with a "Retry" button; if a previous page of data was already loaded successfully, that data remains visible below the error card rather than being cleared, per `10-feature-planner.md` § 13's "stale cached data" edge case.
- Offline: a persistent top banner "You're offline — showing saved products"; the last successfully fetched page remains visible and browsable, but "New Product," "Edit," and "Archive" affordances are disabled with a short explanation on tap.
- Unauthorized: full-screen "Session expired, please sign in again" state with a single "Sign In" action that navigates to `AuthStack.Login`; this state is entered reactively whenever any `ProductRepository` call resolves a 401-equivalent, not just on initial load.
- Success: a paginated, infinite-scrolling list of product cards (thumbnail image, name, price, stock badge: "In Stock" / "Low Stock" / "Out of Stock"), a search input, and horizontally scrolling category filter chips above the list.

**Primary action:** "New Product" (floating action button, bottom-right) → navigates to `ProductFormScreen` with no `productId` (create mode).

**Secondary actions:** search input (debounced 400ms before triggering `list()`), category filter chips (multi-select), archive-status toggle ("Active" default / "Archived"), pull-to-refresh, infinite scroll to load the next page.

**Accessibility notes:** search input has accessible label "Search products"; stock badges expose their state as text read by screen readers, never conveyed by color alone (per `constitution.md`'s Accessibility section); each product card is a single accessible element combining name, price, and stock status into one readable label, minimum 44×44pt touch target; the floating "New Product" button has an accessible label "Add new product," not just an icon; category filter chips announce their selected/unselected state.

### Screen: ProductDetailScreen

**Purpose:** Show full detail for one product, including images, categories, and inventory, and expose edit/archive/inventory-adjust actions.

**Route:** AppStack.ProductDetail, params: { productId: string }

**Entry points:** ProductListScreen (tap a product card).

**Exit points:** ProductFormScreen in edit mode (tap "Edit"), back to ProductListScreen (after a confirmed archive, or standard back navigation).

**Data dependencies:**
- `ProductRepository.getById(productId)` → full product record (name, description, price, images, categories, inventory count, low-stock threshold, archive status)
- `ProductRepository.adjustInventory(productId, delta)` → used by the inline inventory stepper on this screen, not a separate screen

**States:**
- Loading: skeleton detail layout (image gallery placeholder, three text-line placeholders).
- Empty: not applicable — a detail screen always has exactly one product to show or an Error condition; there is no meaningful "empty" state distinct from Error here.
- Error: "This product couldn't be loaded" + "Retry" + "Back to list"; distinguishes a genuinely missing/deleted product (`NotFoundError` — message: "This product no longer exists") from a transient failure (generic retry copy), per the repository contract's named error cases below.
- Offline: if this product was previously fetched and is cached, it renders read-only with an offline banner and the "Edit"/"Archive"/inventory-adjust actions disabled; if never fetched before, same as Error, with copy adjusted to "You're offline and this product hasn't been viewed on this device before."
- Unauthorized: redirect to `AuthStack.Login`, same handling as ProductListScreen.
- Success: full-width image gallery (swipeable, one dot indicator per image), name, price, category chips (read-only here, editable only in ProductFormScreen), inventory count with an inline "+ / −" stepper, low-stock badge if the count is at or below the product's threshold, description text.

**Primary action:** "Edit" (top-right header button) → navigates to `ProductFormScreen` with `{ productId }` (edit mode, prefilled).

**Secondary actions:** "Archive" (requires a confirmation dialog — "Archive this product? It will be hidden from your active catalog but not deleted." / Cancel / Archive) before calling `ProductRepository.archive`; inline inventory "+ / −" stepper (calls `adjustInventory` directly, optimistic UI update reverted on failure).

**Accessibility notes:** each image in the gallery exposes descriptive alt text ("Product photo 1 of 3"); "Archive" uses the `Button` component's `variant="danger"` convention (see `src/components/ui/Button.tsx`) and is never a single, unconfirmed tap, per the constitution's caution around destructive actions; the inventory stepper's "+" and "−" buttons have accessible labels "Increase stock by one" / "Decrease stock by one," not bare glyphs; the low-stock badge's text is read by screen readers, not implied by badge color alone.

### Screen: ProductFormScreen

**Purpose:** Create a new product or edit an existing one — name, description, price, categories (including inline category creation), inventory starting count, low-stock threshold, and images.

**Route:** AppStack.ProductForm, params: { productId?: string }

**Entry points:** ProductListScreen ("New Product," no `productId`), ProductDetailScreen ("Edit," with `productId`).

**Exit points:** ProductDetailScreen (save succeeds — navigates to the saved product's detail, replacing the form in the stack so back navigation returns to the list, not the form), back to the previous screen (Cancel, or hardware/gesture back with an unsaved-changes confirmation if the form is dirty).

**Data dependencies:**
- `ProductRepository.getById(productId)` → prefill data, edit mode only
- `ProductRepository.listCategories()` → category picker options
- `ProductRepository.createCategory(name)` → inline "Create new category" action within the category picker
- `ProductRepository.create(input)` / `ProductRepository.update(id, input)` → submit
- `ProductRepository.uploadImage(productId, file)` → each image is uploaded individually as it's added, not batched at final submit (see Edge Cases, Device: app backgrounded mid-operation)

**States:**
- Loading: all fields rendered but disabled, with a spinner overlay, while prefill data loads (edit mode only — create mode never shows this state since there's nothing to fetch).
- Empty: not applicable — a form always renders its fields, blank in create mode.
- Error: field-level inline validation errors appear directly below the relevant input as the user types/blurs (client-side, immediate feedback); a top-of-form banner appears specifically for submit-time failures the client couldn't have caught (e.g. a simulated `ValidationError` from the mock repository, or a `ConflictError` on concurrent edit — see Repository Contracts).
- Offline: the "Save" button is disabled and replaced with inline copy "You're offline — changes can't be saved right now"; the user may continue editing fields locally (not lost), and "Save" re-enables automatically when connectivity returns.
- Unauthorized: redirected to `AuthStack.Login` before the form renders any fields, including in edit mode's prefill step.
- Success: a toast "Product saved" (via `useUIStore.showToast`, matching the existing `src/store/uiStore.ts` convention), then navigation to `ProductDetailScreen` for the saved product.

**Primary action:** "Save" → runs client-side validation, then calls `create` or `update` depending on whether `productId` was provided.

**Secondary actions:** "Cancel" (with unsaved-changes confirmation if the form is dirty); per-image "Remove" button in the image picker; "Create new category" inline action inside the category picker.

**Accessibility notes:** every input has a persistent visible label, never a placeholder-only label (per `constitution.md`'s Accessibility section on clear navigation and per general form-accessibility practice — placeholder text disappears once typing starts, losing the label for a user relying on it); validation errors are associated with their field via accessible error announcements when they appear, not only conveyed by red text color; each image's "Remove" button has an accessible label naming which image it removes ("Remove product photo 2"); the price input uses a numeric keyboard type and announces its unit (currency) in its accessible label.

## Repository Contracts

```ts
// Contract only. Implementation belongs to network-engineer, mock first (see ADR-0002).
// Domain types (Product, ProductSummary, Category, CreateProductInput, UpdateProductInput)
// are defined in src/features/products/types/ once this plan is implemented; sketched
// inline below only where needed to make a method's shape unambiguous.

interface ProductRepository {
  /**
   * Paginated, filterable product summaries for ProductListScreen.
   * Honors `query` (name substring match, case-insensitive), `categoryId`
   * (exact match), and `status` (defaults to "active" — archived products are
   * excluded unless status: "archived" is explicitly requested).
   */
  list(params: {
    page: number;
    pageSize: number;
    query?: string;
    categoryId?: string;
    status?: "active" | "archived";
  }): Promise<Paginated<ProductSummary>>;
  // Throws NetworkError on timeout/connectivity failure. Safe to retry —
  // read-only, idempotent regardless of retry count.

  /** Full product record for ProductDetailScreen and ProductFormScreen's prefill. */
  getById(id: string): Promise<Product>;
  // Throws NotFoundError if the product does not exist or was permanently
  // removed (archived products ARE still returned by getById — archive is a
  // soft state, not a removal). Safe to retry.

  /** Creates a new product. */
  create(input: CreateProductInput): Promise<Product>;
  // Throws ValidationError with field-level messages (e.g. name required,
  // price must be >= 0). NOT safe to blindly retry on a network timeout —
  // the caller cannot distinguish "request never reached the server" from
  // "request succeeded but the response was lost," so a retry risks creating
  // a duplicate product; ProductFormScreen surfaces a distinct "did this
  // save? check your product list before retrying" message on timeout
  // specifically, rather than auto-retrying.

  /** Updates an existing product. */
  update(id: string, input: UpdateProductInput): Promise<Product>;
  // Throws NotFoundError (product was removed by another session),
  // ValidationError (same shape as create), or ConflictError (the product
  // was modified by another session since this form's data was fetched —
  // mock simulates this via a version/updatedAt check). Safe to retry ONLY
  // if the caller resends the exact same input unchanged — ProductFormScreen
  // does not auto-retry updates; ConflictError surfaces the "reload to see
  // the latest version" banner described in Edge Cases below.

  /** Soft-deletes (archives) a product. Does not destroy any data. */
  archive(id: string): Promise<void>;
  // Throws NotFoundError. Idempotent — archiving an already-archived product
  // succeeds silently rather than erroring, so this is always safe to retry.

  /** Restores a previously archived product to active status. */
  unarchive(id: string): Promise<void>;
  // Throws NotFoundError. Idempotent, same reasoning as archive(). Exposed
  // for completeness of the Archive workflow (ProductListScreen's
  // "Archived" filter view surfaces an "Unarchive" action per product) even
  // though the primary flows above focus on archive(), not unarchive().

  /**
   * Adjusts inventory by a signed delta (e.g. +1, -1, or a larger manual
   * correction) rather than accepting an absolute value, so two concurrent
   * adjustments (two staff members selling the same item near-simultaneously)
   * compose correctly instead of one silently overwriting the other.
   */
  adjustInventory(id: string, delta: number): Promise<{ inventoryCount: number }>;
  // Throws NotFoundError, or InventoryError if the resulting count would go
  // negative (the mock rejects rather than clamping, so the UI can show a
  // specific "not enough stock to remove" message). NOT safe to blindly
  // retry — a retried decrement could double-apply; ProductDetailScreen's
  // inline stepper disables itself until the in-flight adjustment resolves,
  // rather than allowing a queued retry.

  /** Uploads one image for a product, returning its assigned URL and order. */
  uploadImage(productId: string, file: { uri: string; fileName: string; mimeType: string }):
    Promise<{ imageId: string; url: string; order: number }>;
  // Throws ValidationError (unsupported file type, file too large — mock
  // simulates a 5MB limit) or NotFoundError (product was deleted mid-upload).
  // NOT safe to retry blindly (risk of duplicate image); ProductFormScreen's
  // per-image upload state exposes an explicit "Retry" affordance per image
  // instead of automatic retry.

  /** Removes one image from a product. */
  removeImage(productId: string, imageId: string): Promise<void>;
  // Throws NotFoundError (product or image already gone). Idempotent, safe
  // to retry.

  /** All categories available for assignment, across all products. */
  listCategories(): Promise<Category[]>;
  // Throws NetworkError. Safe to retry, idempotent, read-only.

  /** Creates a new category inline from the ProductFormScreen category picker. */
  createCategory(name: string): Promise<Category>;
  // Throws ValidationError (empty name, or name duplicates an existing
  // category — mock treats category names as case-insensitively unique).
  // NOT safe to blindly retry (risk of duplicate-looking categories with
  // different IDs before the uniqueness check would catch it on a slow
  // network); the category picker disables the "Create" action while a
  // creation is in flight.
}
```

### Supporting Type Definitions

The Repository Contract above references several domain types by name without inlining them, per `10-feature-planner.md` § 10's rule against `Promise<any>` — spelling them out here removes any ambiguity for the implementing engineer:

```ts
// src/features/products/types/product.ts (target location once implemented)

interface ProductImage {
  imageId: string;
  url: string;
  order: number;
}

interface ProductSummary {
  id: string;
  name: string;
  price: number;
  primaryImageUrl: string | null;
  inventoryCount: number;
  lowStockThreshold: number;
  status: "active" | "archived";
}

interface Product extends ProductSummary {
  description: string;
  images: ProductImage[];
  categoryIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
}

interface CreateProductInput {
  name: string;
  description: string;
  price: number;
  categoryIds: string[];
  inventoryCount: number;
  lowStockThreshold: number;
}

interface UpdateProductInput extends Partial<CreateProductInput> {
  // Partial: ProductFormScreen submits only changed fields on edit.
  // The mock/http implementation still requires the full merged record's
  // validation rules to pass (e.g. price cannot become negative via a
  // partial update), not just the fields present in this payload.
}

// Reused across the codebase's other list-shaped repository methods —
// not new to this feature; matches the shape convention already implied by
// src/types/index.ts's PaginatedResponse<T>.
interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
```

`ProductImage.order` is what `ProductFormScreen`'s image reordering (drag-to-reorder in the picker) persists — `uploadImage`'s returned `order` is provisional (append position) until the user explicitly reorders, at which point a future `reorderImages` call would be needed; reordering after initial upload is deliberately left unspecified here since `context.md`'s Products capability list does not call out reordering explicitly — flagged here as a known, non-blocking gap rather than silently assumed away.

## State

### State: productListFilters

**Kind:** Local (component), colocated in `ProductListScreen`.

**Justification:** Only affects what `ProductListScreen` requests from `ProductRepository.list()`; does not need to survive navigating away to a product's detail and back (returning to the list resets to the default "Active" filter, which is the expected, least-surprising behavior); no other screen or feature reads it. Per `10-feature-planner.md` § 16's decision tree, this fails the "read by more than one feature" and "must persist across the whole session" tests, so it stays local — promoting it to a Zustand store would be exactly the "convenient to reach from anywhere" anti-pattern § 18 warns against.

**Shape:**
```
{
  query: string,               // survives navigation? no
  categoryId: string | null,   // survives navigation? no
  status: "active" | "archived", // survives navigation? no
}
```

**Owned by:** products feature, `ProductListScreen` only.

### State: productFormDraft

**Kind:** Local (component), colocated in `ProductFormScreen`, via `react-hook-form` per `context.md`'s Forms technology choice (React Hook Form + Zod).

**Justification:** Exists only while the user is actively creating or editing one product; must not survive navigating away entirely (canceling the form discards the draft, by design — see Edge Cases' "app backgrounded mid-operation" for the one exception, which is handled by the OS's normal component-state retention during backgrounding, not by promoting this to a persistent store). No other screen reads a product's in-progress, unsaved edits.

**Shape:**
```
{
  name: string,                 // survives navigation? no
  description: string,          // survives navigation? no
  price: number,                // survives navigation? no
  categoryIds: string[],        // survives navigation? no
  inventoryCount: number,       // survives navigation? no (create mode only; edit mode adjusts via adjustInventory, not this form)
  lowStockThreshold: number,    // survives navigation? no
  images: { imageId: string; url: string; uploadStatus: "pending" | "uploaded" | "failed" }[], // survives navigation? no
}
```

**Owned by:** products feature, `ProductFormScreen` only.

### State: product list and detail data

**Kind:** Server Cache (TanStack Query), keyed by `["products", "list", filters, page]` for list queries and `["products", "detail", productId]` for detail queries.

**Justification:** Product data is owned by the (future) backend, fetched through `ProductRepository`. TanStack Query already owns caching, background refetch, and staleness tracking for exactly this shape of data — per `10-feature-planner.md` § 16's decision tree ("is the data owned by a server and fetched over the network? → it belongs in TanStack Query cache, not in Zustand"), duplicating this into a Zustand store would directly violate `constitution.md`'s State Philosophy ("avoid duplicated state... avoid synchronization problems").

**Shape:** N/A — owned by the query cache, not hand-modeled here. `adjustInventory`, `archive`, `unarchive`, `create`, and `update` mutations invalidate the relevant `["products", ...]` query keys on success so list and detail views stay consistent without manual synchronization code.

**Owned by:** products feature.

### State: productCategories

**Kind:** Server Cache (TanStack Query), keyed by `["products", "categories"]`.

**Justification:** Categories are server-owned reference data shared by two screens (`ProductListScreen`'s filter chips and `ProductFormScreen`'s category picker) — this is a legitimate case for a shared query key (not a shared Zustand store; per the same § 16 decision tree, server-owned data stays in TanStack Query regardless of how many screens read it). `createCategory` invalidates this key on success so a newly created category appears immediately in both consuming screens without a manual store update.

**Shape:** N/A — owned by the query cache.

**Owned by:** products feature.

## Navigation

### Route: AppStack.ProductList

**Params:** undefined

**Added to:** `AppStackParamList` (`src/navigation/types.ts`)

**Linked from:** Dashboard quick action "Products" (`src/features/dashboard/screens/DashboardScreen.tsx`)

**Deep link:** no.

### Route: AppStack.ProductDetail

**Params:** { productId: string }

**Added to:** `AppStackParamList`

**Linked from:** `ProductListScreen` product card tap.

**Deep link:** no for this release — a strong future candidate (opening a specific product from a push notification, e.g. a low-stock alert), but not required now; noted here rather than silently designed in, per `10-feature-planner.md`'s anti-pattern against inventing unrequested scope.

### Route: AppStack.ProductForm

**Params:** { productId?: string }

**Added to:** `AppStackParamList`

**Linked from:** `ProductListScreen` "New Product" floating action button (no `productId`), `ProductDetailScreen` "Edit" button (`{ productId }`).

**Deep link:** no.

All three routes register in the existing `AppStackParamList` exactly as `Home`, `Dashboard`, `Content`, `Reports`, and `AIChat` already do (`src/navigation/AppNavigator.tsx`'s `<Stack.Screen name="..." component={...} />` pattern) — this plan intentionally does not introduce a new stack, since Products is reached from within the already-authenticated app shell, the same as the other four existing app-level features. Per ADR-0005, this plan follows the codebase's real, current React Navigation convention (`PascalCase` names, explicit `undefined` for paramless routes) — not Expo Router — since ADR-0005 is `Needs Reconciliation`, not resolved in Expo Router's favor.

## Edge Cases

**Network**
- request timeout: applies — `ProductListScreen` and `ProductDetailScreen` show their Error states with Retry; `ProductFormScreen`'s `create`/`update`/`uploadImage` show the specific "did this save?" guidance noted in the Repository Contracts (not-safe-to-blindly-retry methods), since a generic auto-retry risks duplication.
- request fails with no connectivity: applies — see each screen's Offline state above; the app distinguishes this from a generic timeout by checking device connectivity status before attributing a failure to "offline" vs. "server error."
- request succeeds but returns malformed data: applies — the repository layer validates response shape (per `21-typescript-engineer.md`'s type-safety standard) and throws rather than passing malformed data through; screens render their Error state, never partial/garbled data.
- request succeeds after a retry: applies — TanStack Query's default retry (`App.tsx`'s configured `retry: 2`) covers `list`/`getById`/`listCategories` reads automatically; the explicitly-not-safe-to-retry mutations (`create`, `update`, `adjustInventory`, `uploadImage`, `createCategory`) are excluded from automatic retry and instead surface an explicit user-facing retry action, per each method's contract note above.

**Data**
- empty result set: applies — `ProductListScreen`'s Empty state, with the two distinct causes (no products at all vs. no filter matches) both specified above.
- single result: applies — the list renders one card with no special-case layout; pagination controls simply don't appear since `hasMore` is `false`.
- very large result set (pagination boundary): applies — `list()` is paginated (`page`/`pageSize`); `ProductListScreen` uses infinite scroll to request the next page, consistent with `context.md`'s FlashList choice for efficient long lists.
- stale cached data shown while refetching: applies — TanStack Query shows the last-known page while a background refetch runs (e.g. after pull-to-refresh or returning from ProductFormScreen), with a subtle `isFetching` indicator; the list is never blanked during a background refetch.
- concurrent edits from two sessions: applies — `update()` may throw `ConflictError`; `ProductFormScreen` shows "This product was changed elsewhere — reload to see the latest version," discarding the current form's changes only if the user explicitly chooses to reload, never silently.

**Auth**
- token expired mid-session: applies — any `ProductRepository` call may resolve a 401-equivalent; the existing global interceptor pattern in `src/api/client.ts` (`__onUnauthorized` callback) triggers logout, and all three Products screens' Unauthorized state redirects to `AuthStack.Login`.
- user lacks permission for the action: applies — the mock repository simulates a `viewer`-role `User` (per `src/types/index.ts`'s `role: "admin" | "editor" | "viewer"`) being rejected on `create`/`update`/`archive`/`unarchive`/`adjustInventory`/`uploadImage`/`removeImage`/`createCategory` with an `AuthError`; `ProductListScreen` and `ProductDetailScreen` hide (not merely disable) those actions entirely for a `viewer`-role user, per `constitution.md`'s Security Philosophy that presentation-layer hiding is not itself the enforcement — the mock's rejection is the enforcement, the UI hiding is a courtesy.
- session revoked remotely: applies — handled identically to token expiry, since both surface as the same 401-equivalent from the repository's perspective.

**Platform (Instagram / Telegram / Bale / Rubika / Eita)**
- platform account disconnected or token revoked: does not apply — Products is a catalog feature with no direct platform integration; publishing a product to any platform is owned entirely by the separately-scoped Publishing feature.
- platform-specific content limits (character counts, media formats, rate limits) differ per platform: does not apply here directly, but is a forward-looking note: this plan's `uploadImage` accepts standard device photo formats without platform-specific validation, since platform-specific media constraints (e.g. Instagram's aspect ratio rules) are the Publishing feature's concern at publish time, not the Products catalog's concern at storage time.
- publishing succeeds on some platforms and fails on others in the same request: does not apply — no publishing action exists in this plan's scope.

**Device**
- low connectivity / offline: applies — see each screen's Offline state above.
- app backgrounded mid-operation: applies — most significantly for `ProductFormScreen`'s per-image upload flow (images upload individually as added, not batched at final Save, per the Data Dependencies note above) — an image mid-upload when the app backgrounds resumes or shows a "failed to upload, tap to retry" state on foreground, per-image, rather than silently losing it; an in-flight `create`/`update` submission that backgrounds is handled by the OS's normal in-flight-request continuation where possible, and otherwise surfaces the same "did this save? check your product list" guidance as a timeout.
- low storage (affects cached media): applies — product images are cached locally for offline viewing; if device storage is critically low, the OS-level storage warning is relied on rather than custom in-app handling, consistent with `.claude/templates/feature-proposal.md`'s worked Products example precedent for this exact edge case.

**AI**
- N/A — this feature does not touch AI content or AI images. Product images are user-picked device photos only; AI-enhanced product imagery is explicitly out of scope (see Scope) and owned by the AI Images feature in a future, separate plan.

## Acceptance Criteria

- [ ] `ProductListScreen` renders all six required states (Loading, Empty — both causes, Error, Offline, Unauthorized, Success) and each is independently reachable in a mock-driven demo.
- [ ] `ProductDetailScreen` renders all required states; "Archive" always requires the specified confirmation dialog before calling `ProductRepository.archive`.
- [ ] `ProductFormScreen` validates required fields (name non-empty, price >= 0) client-side before calling `create`/`update`, and separately surfaces server-side `ValidationError` and `ConflictError` distinctly, with different copy for each.
- [ ] `ProductRepository`'s mock implementation simulates: jittered latency (150–800ms) on every method, a non-zero failure rate, the `viewer`-role permission denial on every mutating method, at least one `ConflictError`-triggering scenario, and an empty-result path for `list()`.
- [ ] All three routes (`ProductList`, `ProductDetail`, `ProductForm`) are added to `AppStackParamList` in `src/navigation/types.ts`, matching the existing `PascalCase` / explicit-`undefined` convention.
- [ ] Archiving a product removes it from `ProductListScreen`'s default ("Active") view without a full page reload, via query invalidation, not manual list-splicing.
- [ ] Adjusting inventory on `ProductDetailScreen` updates the displayed count optimistically and reverts cleanly if `adjustInventory` fails.
- [ ] No component, hook, or screen in this feature imports `axios` or `src/api/client.ts` directly — all data access goes through `ProductRepository`'s exported instance only (per `24-network-engineer.md` § 10's factory pattern).
- [ ] Creating a category inline from `ProductFormScreen`'s category picker makes it immediately available to `ProductListScreen`'s filter chips without a manual refresh, via the shared `["products", "categories"]` query key.
- [ ] Every image upload in `ProductFormScreen` has an independently visible per-image status (pending/uploaded/failed) and a per-image retry action on failure.

## Open Questions

(none — this plan is ready for handoff. If implementation surfaces a genuine ambiguity this plan did not anticipate, work stops and the plan is corrected here, per `10-feature-planner.md` § 21 — it is not silently resolved in code.)

## Handoff

1. `network-engineer` — implement `ProductRepository` (mock first, per ADR-0002), including the permission, conflict, and inventory-boundary simulations described in the Repository Contracts section above. Reference `.claude/docs/examples/auth-repository-migration-example.md` for the target interface/mock/http/factory file shape.
2. `state-engineer` — wire TanStack Query keys and hooks for `list`, `getById`, `listCategories` (per the State section above); confirm `productListFilters` and `productFormDraft` stay local, and set up mutation-driven cache invalidation for `create`/`update`/`archive`/`unarchive`/`adjustInventory`/`createCategory`.
3. `ui-engineer` — build the presentational layers for `ProductListScreen`, `ProductDetailScreen`, and `ProductFormScreen` against the screen specs above, including all required states and the accessibility notes per screen.
4. `react-native-engineer` — add the three routes to `AppStackParamList` and `AppNavigator.tsx`, and wire navigation and data hooks together across the three screens.
