---
id: playbook-creating-a-zustand-store
title: Creating A Zustand Store Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Creating A Zustand Store Playbook

> "Global state should be minimal... never create global state for convenience." — `../context.md`, State Management Rules

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Evaluating (and Rejecting) a Global Store for Product Filters
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

Sugar Admin has exactly two global Zustand stores today: `useAuthStore` (`src/store/authStore.ts`) and `useUIStore` (`src/store/uiStore.ts`), both exported from `src/store/index.ts`. This is deliberately minimal — `../context.md`'s State Management Rules name only Authentication, Theme, Language, and Session as legitimate global-state examples. This playbook is how a new global store gets added correctly, and — just as importantly — how to correctly conclude a new store should **not** be added and use local or feature-scoped state instead.

---

# 2. When To Use This Playbook

Use this playbook when a feature plan's State section (`../agents/10-feature-planner.md` § 11) proposes a new Zustand store, or when implementation surfaces a state need the plan didn't anticipate.

Do not use this playbook for server data — TanStack Query owns that, not Zustand (`../agents/10-feature-planner.md` § 16's decision tree: "Is the data owned by a server and fetched over the network? → Yes, regardless of the above: it belongs in TanStack Query cache, not in Zustand"). Do not use it for state that only one screen needs — that's `useState`/`useReducer`, full stop.

---

# 3. Prerequisites

- Read `src/store/authStore.ts` and `src/store/uiStore.ts` in full — every new store must read as a sibling of these two, not a novel pattern.
- Read `src/store/index.ts` — the barrel every store must be registered in.
- The feature plan's State Shape classification (`../agents/10-feature-planner.md` § 11) already exists and names this state as "Global (Zustand)" with an explicit justification — not "in case we need it elsewhere later" (§ 18's Bad Example, rejected outright).
- If the store crosses feature boundaries (more than one feature reads it), `chief-architect` sign-off is required per `../agents/10-feature-planner.md` § 11.

---

# 4. Step-by-Step Workflow

## Step 1 — Run the decision tree before writing any code

From `../agents/10-feature-planner.md` § 16:

```
Does the data need to be read by more than one feature module,
or must it survive across the whole app session (e.g. auth, theme,
language)?
  → Yes: candidate for a global Zustand store. Confirm no existing
    store already owns this concern.
  → No: does it need to persist across screens within one feature only?
      → Yes: feature-scoped Zustand store or Context, colocated in
        the feature folder (src/features/<feature>/state/, per
        ../rules/folders.md Rule 3).
      → No: local component state.
Is the data owned by a server and fetched over the network?
  → Yes, regardless of the above: TanStack Query cache, not Zustand.
```

Most state fails this tree at the first branch and belongs in `useState` or TanStack Query — that is the expected, common outcome, not a failure of the process.

## Step 2 — Confirm no existing store already owns this concern

Check `useAuthStore` (user, token, isAuthenticated, isLoading, error) and `useUIStore` (isLoading, toast) before proposing a third store. A new global toast-adjacent concern, for instance, extends `useUIStore`; it does not become a fourth store.

## Step 3 — Choose the scope: global (`src/store/`) or feature-scoped (`src/features/<feature>/state/`)

Global stores live in `src/store/`, follow the `use<Domain>Store` naming convention (`../rules/naming.md` Rule 4), and are registered in `src/store/index.ts`. Feature-scoped stores live in `src/features/<feature>/state/` (a subfolder that doesn't exist for any feature yet — create it as part of this work, per `../rules/folders.md` Rule 3) and are exported through the feature's own `index.ts` public API, not `src/store/`.

## Step 4 — Write the store file

Mirror `authStore.ts`'s and `uiStore.ts`'s exact shape: `create<State>((set) => ({ ... }))`, state fields first, actions after, colon-aligned formatting matching the existing files.

```ts
// src/store/notificationStore.ts — hypothetical new GLOBAL store
import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  hasPermission: boolean;

  setUnreadCount: (count: number) => void;
  setPermission:  (granted: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount:   0,
  hasPermission: false,

  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setPermission:  (hasPermission) => set({ hasPermission }),
}));
```

Or, for a feature-scoped store:

```ts
// src/features/products/state/productFiltersStore.ts — FEATURE-SCOPED
import { create } from "zustand";

interface ProductFiltersState {
  query: string;
  categoryId: string | null;

  setQuery:      (query: string) => void;
  setCategoryId: (categoryId: string | null) => void;
  reset:         () => void;
}

export const useProductFiltersStore = create<ProductFiltersState>((set) => ({
  query:      "",
  categoryId: null,

  setQuery:      (query) => set({ query }),
  setCategoryId: (categoryId) => set({ categoryId }),
  reset:         () => set({ query: "", categoryId: null }),
}));
```

Only derive from `set`; avoid storing anything computable from existing fields (`../constitution.md`'s State Philosophy: "Derived values should be computed. Avoid duplicated state.").

## Step 5 — Register in the barrel (global stores only)

```ts
// src/store/index.ts
export { useAuthStore }         from "./authStore";
export { useUIStore }           from "./uiStore";
export { useNotificationStore } from "./notificationStore"; // new
```

A feature-scoped store is instead exported through the feature's own `index.ts` (once that exists) or imported directly within the feature by path — it never joins `src/store/index.ts`, which is reserved for genuinely app-wide state.

## Step 6 — Keep async actions honest about error state

Follow `authStore.ts`'s `login` action pattern: set `isLoading: true` and clear `error` before the call, resolve state in the `try` block, capture a message in `catch`, and always reset `isLoading` in `finally`. Every async store action needs this shape, not just success-path updates.

## Step 7 — Get sign-off if cross-feature

If more than one feature reads this store, get explicit `chief-architect` sign-off (`../agents/10-feature-planner.md` § 11) and document the decision, ideally as an ADR (`../templates/adr.md`) if it establishes a new pattern.

---

# 5. Worked Example: Evaluating (and Rejecting) a Global Store for Product Filters

The Products feature plan (`../templates/feature-proposal.md`'s filled example) considers `productListFilters` (`query`, `categoryId`) as a candidate state entry.

**Step 1 — Decision tree.** Is `productListFilters` read by more than one feature module? No — only `ProductListScreen` reads it. Does it need to survive the whole app session? No — it resets when the user leaves the screen. Does it need to persist across more than one screen within `products`? The plan states: "only affects what ProductListScreen requests from the repository; does not need to survive navigation; no other feature reads it." That fails even the feature-scoped branch — it's local, single-screen state.

**Step 2 — Existing store check.** N/A — the decision tree already resolved this to local state before reaching this step.

**Result, per the plan itself:** `productListFilters`'s **Kind** is classified as **Local (component)**, colocated in `ProductListScreen`, with the explicit fallback noted in the plan: "or a small feature-scoped `productsUiStore` if the same filters must be read from more than one screen" — i.e., only promote to a feature-scoped Zustand store if a second screen (e.g. a future saved-filters feature) genuinely needs to read the same state, and even then it stays feature-scoped, never global.

This worked example exists specifically because the *correct* outcome of this playbook is very often "do not create a store" — and the Products plan already demonstrates that judgment being applied correctly, matching `../agents/10-feature-planner.md` § 18's Good classification example.

---

# 6. Checklist

- [ ] The decision tree (§ 16 of `../agents/10-feature-planner.md`) was run and its outcome recorded, even if the outcome is "local state, no store needed."
- [ ] Existing stores (`useAuthStore`, `useUIStore`, or any existing feature-scoped store) were checked for overlap before proposing a new one.
- [ ] Server-owned data was routed to TanStack Query, not Zustand.
- [ ] Store file mirrors `authStore.ts`/`uiStore.ts`'s exact shape and formatting.
- [ ] Store is named `use<Domain>Store`.
- [ ] Global stores are registered in `src/store/index.ts`; feature-scoped stores are not.
- [ ] Only non-derivable values are stored; nothing computable from existing state is duplicated.
- [ ] Async actions set/clear `isLoading` and `error` consistently, including in the `finally` branch.
- [ ] Cross-feature global state has explicit `chief-architect` sign-off.

---

# 7. Common Mistakes

**Promoting local state to global "because it's easier to reach from anywhere."** Explicitly rejected — see `../agents/10-feature-planner.md` § 18's Bad Example and the Constitution's State Philosophy.

**Storing server data in Zustand.** Product lists, chat messages, analytics — anything fetched from a repository belongs in TanStack Query's cache, which already owns caching, refetch, and staleness. Duplicating it into a store creates a synchronization problem the Constitution explicitly warns against.

**Adding a fourth store instead of extending `useUIStore` or `useAuthStore`.** Check for overlap first — Sugar Admin's minimal-global-state posture is a stated goal (`../context.md`, State Management Rules), not an accident of a young codebase.

**Skipping `finally` on an async action.** `authStore.ts`'s `login` resets `isLoading` in `finally` specifically so a thrown error doesn't leave the UI stuck in a loading state forever — copy this pattern exactly.

**Registering a feature-scoped store in `src/store/index.ts`.** That barrel is for app-wide state only; a feature-scoped store belongs to its feature's own export surface.

---

# 8. References

- `../constitution.md` — State Philosophy, Feature Ownership
- `../context.md` — State Management Rules
- `../agents/10-feature-planner.md` § 11, § 16, § 18 — State Shape Standard, decision tree, worked good/bad examples
- `../rules/naming.md` Rule 4 — `use<Domain>Store` naming convention
- `../rules/folders.md` Rule 3 — feature-scoped `state/` subfolder placement
- `src/store/authStore.ts`, `src/store/uiStore.ts`, `src/store/index.ts` — the real files every new store must match
- `./building-a-feature.md` — where the State section this playbook implements comes from
