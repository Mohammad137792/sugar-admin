---
id: template-store
title: State/Store Shape Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# State / Store Shape Template

## Purpose

Use this template to classify and specify any new piece of state — before deciding
whether it becomes a Zustand store, local component state, or TanStack Query cache.
Filled out by `10-feature-planner` as part of a feature plan, implemented by
`state-engineer`. Matches `.claude/agents/10-feature-planner.md` § 11 (State Shape
Standard) exactly.

Sugar Admin currently has exactly two global Zustand stores:
`src/store/authStore.ts` and `src/store/uiStore.ts`. Promoting new state to a third
global store is the exception, not the default (§ 11's closing rule) — this
template exists specifically to force that justification into writing before a
store gets created out of convenience.

## Instructions

1. Run the decision tree in `.claude/agents/10-feature-planner.md` § 16 ("Global
   store or local state?") before filling in **Kind**. Its short form:
   - Read by more than one feature module, or must survive the whole app session
     (auth, theme, language)? → candidate for global Zustand — but first confirm no
     existing store (`authStore`, `uiStore`) already owns this concern.
   - Needs to persist across screens within one feature only? → feature-scoped
     Zustand store or Context, colocated in the feature folder — not a new global
     store.
   - Otherwise → local component state (`useState`/`useReducer`).
   - Owned by the server and fetched over the network, regardless of the above? →
     TanStack Query cache, never Zustand — Zustand is for client state.
2. **Justification** must name a real reason. "In case we need it elsewhere later"
   is explicitly rejected as a Bad Example in § 18 — see that section's worked
   comparison.
3. **Shape** lists every field with its type and whether it survives navigation.
   Model actions (setters/async methods) the same way `authStore.ts` and
   `uiStore.ts` do: plain functions on the same object returned by `create()`, not
   a separate "actions" object, to match existing convention.
4. If promoting to a new global store, this template's filled-in Justification
   section **is** the artifact that stands in for `chief-architect` sign-off
   required by § 11 for cross-feature global state — attach it to (or reference it
   from) the relevant `architecture-proposal.md`/ADR if the store is genuinely
   cross-feature.

---

## The Template

```markdown
### State: <name>

**Kind:** Global (Zustand) | Local (component) | Server Cache (TanStack Query)

**Justification:** <why this kind and not another — must be a real reason, not
convenience>

**Shape:**
```ts
interface <Name>State {
  <field>: <type>;   // survives navigation? yes/no

  <action>: (<params>) => <ReturnType>;
}
```

**Owned by:** <feature name>, or "cross-feature" with explicit justification
(cross-feature global state requires chief-architect sign-off)

**File (if global or feature-scoped store):** `src/store/<name>Store.ts` |
`src/features/<feature>/store/<name>Store.ts`
```

---

## Filled Example: `productsUiStore` (Products Filter/Sort UI State)

```markdown
### State: productsUiStore

**Kind:** Local-to-feature Zustand store (feature-scoped, not global)

**Justification:** ProductListScreen's search query, category filter, and sort
order need to survive if the user navigates to ProductDetailScreen and back
(re-running the search on return would be a bad UX — the Constitution's Design
Principles call for "predictable" behavior), so plain `useState` in
ProductListScreen is insufficient. However, per the decision tree in
`10-feature-planner.md` § 16, this state is read by exactly one feature (products)
and does not need to survive the whole app session — it should reset on logout
and does not need to be read by Dashboard, Content, or any other feature module.
That rules out promoting it to a third global store alongside `authStore` and
`uiStore`; a feature-scoped store colocated in `src/features/products/` is the
correct kind. This mirrors the real shape of `src/store/uiStore.ts` (a small,
single-purpose Zustand store with primitive fields and a few setters) but is
deliberately NOT exported from `src/store/index.ts` alongside the two genuine
global stores, to keep it feature-owned per the Constitution's Feature Ownership
section.

**Shape:**
```ts
interface ProductsUiState {
  query: string;                          // survives navigation? yes (within products feature)
  categoryId: string | null;              // survives navigation? yes
  sortBy: "name" | "price" | "newest";    // survives navigation? yes

  setQuery: (query: string) => void;
  setCategoryId: (categoryId: string | null) => void;
  setSortBy: (sortBy: ProductsUiState["sortBy"]) => void;
  reset: () => void;                      // called on logout and on leaving the products feature
}
```

Modeled directly on the real shape of `src/store/authStore.ts` — plain fields plus
colocated setter functions returned from a single `create<T>((set) => ({...}))`
call, no separate reducer or actions module:

```ts
import { create } from "zustand";

interface ProductsUiState {
  query: string;
  categoryId: string | null;
  sortBy: "name" | "price" | "newest";

  setQuery: (query: string) => void;
  setCategoryId: (categoryId: string | null) => void;
  setSortBy: (sortBy: ProductsUiState["sortBy"]) => void;
  reset: () => void;
}

export const useProductsUiStore = create<ProductsUiState>((set) => ({
  query:      "",
  categoryId: null,
  sortBy:     "newest",

  setQuery:      (query) => set({ query }),
  setCategoryId: (categoryId) => set({ categoryId }),
  setSortBy:     (sortBy) => set({ sortBy }),
  reset:         () => set({ query: "", categoryId: null, sortBy: "newest" }),
}));
```

**Owned by:** products feature only. Not cross-feature — no chief-architect
sign-off required.

**File:** `src/features/products/store/productsUiStore.ts`
```

---

## Checklist

- [ ] Kind is one of the three allowed values, chosen via the § 16 decision tree
- [ ] Justification names a real, specific reason — never "might need it later"
- [ ] Shape lists every field with type and navigation-survival note
- [ ] Actions are colocated functions on the same store object, matching `authStore.ts`/`uiStore.ts` convention
- [ ] Owned by is a single feature, or "cross-feature" with a linked chief-architect sign-off
- [ ] If Kind is Global, confirmed neither `authStore` nor `uiStore` already covers this concern
- [ ] If the data comes from the server, confirmed it is TanStack Query cache, not Zustand

## References

- `.claude/agents/10-feature-planner.md` § 11 (State Shape Standard), § 16 (Global store or local state? decision tree), § 18 (Good/Bad state classification examples)
- `.claude/constitution.md` — State Philosophy, Feature Ownership
- `.claude/context.md` — State Management Rules
- `src/store/authStore.ts`, `src/store/uiStore.ts` — the two real global stores this template's Kind decision is measured against
