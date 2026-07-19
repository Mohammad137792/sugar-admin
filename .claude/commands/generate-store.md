---
id: command-generate-store
title: Generate Store
category: command
version: 1.0.0
status: active
invokes_agent: state-engineer
last_updated: 2026-07-18
---

# Command: Generate Store

> Produce a Zustand store (global or feature-scoped) or a TanStack Query hook
> set, following `10-feature-planner.md` § 11's State Shape Standard and the
> real naming/shape conventions already established by
> `src/store/authStore.ts` and `src/store/uiStore.ts`.

---

## Purpose

The Constitution's State Philosophy is explicit: "State is expensive. Only
store information that must survive... Avoid global state when local state
is sufficient." `context.md` reinforces this: "Never create global state for
convenience." Sugar Admin currently has exactly two global stores —
`useAuthStore` (session/user) and `useUIStore` (loading flag, toast) — and
that minimal footprint is the standard this command defends, not an
accident to be grown past casually.

`generate-store` exists so that every new piece of state gets deliberately
classified — global Zustand, feature-local Zustand/Context, local component
state, or TanStack Query server cache — before any code is written, per
`10-feature-planner.md` § 11 and § 16's Decision Tree.

---

## When To Invoke

- A feature plan's § 11 State section specifies a piece of state that needs
  an actual store or hook implementation.
- A new global concern is proposed (e.g. a new cross-app setting) — this
  command's procedure forces the classification decision, including the
  possibility that the answer is "no, this does not need a new global
  store."
- An existing store needs a new field or action added.

---

## Required Inputs

The invoker must supply:

1. **State description** — what the data is, which screen(s)/feature(s) read
   or write it.
2. **The feature plan's § 11 classification**, if one exists (Global /
   Local / Server Cache, with justification). If none exists, this command's
   Step 1 below performs that classification using the same standard before
   proceeding — it does not skip straight to writing a store.
3. **Whether this extends an existing store** (`authStore`, `uiStore`, or a
   feature-scoped store already in place) or requires a new one.

---

## Procedure

1. **Classify the state**, using `10-feature-planner.md` § 16's Decision
   Tree if not already done by `feature-planner`:
   - Is the data owned by a server and fetched over the network? →
     TanStack Query cache, not Zustand, regardless of anything else. Server
     state does not belong in a Zustand store — see the Decision Tree's
     final branch.
   - Does the data need to be read by more than one feature module, or must
     it survive across the whole app session (auth, theme, language)? →
     candidate for global Zustand. Confirm no existing store (`authStore`,
     `uiStore`) already owns this concern before proposing a new one.
   - Does it need to persist across screens within one feature only? →
     feature-scoped Zustand store or Context, colocated in the feature
     folder — not the global `src/store/` folder.
   - Otherwise → local component state (`useState`/`useReducer`).

2. **If the classification result is "Global Zustand,"** stop and require
   explicit justification beyond convenience, per § 11: "Promoting to a new
   global Zustand store is the exception, not the default." Write the
   justification down before writing code. "In case we need it elsewhere
   later" is rejected outright — see § 18's Bad example.

3. **If the classification result is "Server Cache,"** this command produces
   TanStack Query hooks, not a Zustand store — see Step 6 below.

4. **Name the store/hook** following the existing convention exactly:
   `use<Domain>Store` for Zustand (`useAuthStore`, `useUIStore`,
   `useProductStore`), `use<Domain><Verb>` for TanStack Query hooks
   (`useProducts`, `useProduct`, `useCreateProduct` — verb-suffixed for
   mutations, plural/singular noun for queries per REST-like convention).

5. **Write the Zustand store** matching `authStore.ts`'s and `uiStore.ts`'s
   actual shape:
   - A single `interface <Domain>State` combining state fields and actions
     in one type (not split into separate `State`/`Actions` types — the
     existing files don't do that).
   - `create<DomainState>((set) => ({ ... }))` with state fields first,
     actions after, matching the visual alignment convention seen in both
     existing files (aligned `:` colons within the object literal).
   - Actions that call a repository (per `generate-repository.md`) must
     follow `authStore.login`'s error-handling shape: `set` a loading flag
     before the call, catch and `set` an `error` string on failure, always
     `set` the loading flag back off in a `finally`.
   - Do not put derived/computed values in state — compute them in a
     selector or in the consuming component, per the Constitution's State
     Philosophy ("Derived values should be computed").

6. **If the classification result is "Server Cache,"** write TanStack Query
   hooks instead:
   - One hook per repository method that reads data (`useQuery`), one hook
     per method that writes data (`useMutation`).
   - Query keys follow `[<feature>, <resource>, ...params]` shape, e.g.
     `["products", "list", { page, query }]`, `["products", "detail", id]`
     — granular enough that a mutation can invalidate precisely the queries
     it affects, not the whole feature's cache indiscriminately.
   - Set `staleTime` deliberately per the data's actual freshness need — do
     not accept the React Query default silently; state the reasoning (see
     `optimize-feature.md` for what happens when this is skipped and later
     needs fixing).
   - Mutations invalidate or update the specific affected query keys in
     `onSuccess`, not a blanket `invalidateQueries()` with no key filter.

7. **Place the file correctly.** Global stores live in `src/store/` (matching
   `authStore.ts`, `uiStore.ts`, and are re-exported from `src/store/index.ts`
   — check and update that barrel file). Feature-scoped stores and query
   hooks live under `src/features/<feature>/store/` or
   `src/features/<feature>/hooks/` respectively — new subfolders, per
   `20-react-native-engineer.md` § 9's note that this is additive to the
   currently-flat feature folders.

8. **Hand off to `react-native-engineer`** for screen wiring and to
   `reviewer` for state-ownership conformance checking against the plan.

---

## Output Format

```
# Store/Hook Manifest: <name>

## Classification
Global (Zustand) | Local (component) | Server Cache (TanStack Query)

## Justification
<why this classification, referencing § 16's Decision Tree>

## Shape
{
  field: type,   // survives navigation? yes/no
}

## File
<path>

## Actions / Hooks
- <name>: <what it does, what repository/state it touches>

## Handoff
react-native-engineer, reviewer
```

---

## Example Invocation

> Generate state for the `products` feature's list filters and form draft,
> per `.claude/docs/examples/products-feature-plan.md` § State.

## Example Output

```
# Store/Hook Manifest: productFilters, productDraft, product queries

## Classification
productFilters: Local (component), scoped to ProductListScreen.
productDraft: Local (component), scoped to ProductFormScreen.
Product list/detail data: Server Cache (TanStack Query), via
ProductRepository from generate-repository.md.

## Justification
Neither productFilters nor productDraft is read by any other screen or
feature, and neither needs to survive navigating away — reopening
ProductListScreen or ProductFormScreen should start from a clean state, not
resume a stale filter/draft. Per § 16, this does not qualify for global
Zustand. Product data itself is server-owned, so per § 16's final rule it
belongs in TanStack Query regardless of how many screens read it.

## Shape
productFilters (useState in ProductListScreen):
{ query: string, categoryId: string | null, status: "active" | "archived" | "all" }
  // survives navigation: no

productDraft (useState/useReducer in ProductFormScreen):
{ name: string, price: number, categoryId: string | null, images: string[], ... }
  // survives navigation: no

## File
No new global store file. Local state defined inline in
src/features/products/screens/ProductListScreen.tsx and
ProductFormScreen.tsx. Query hooks in
src/features/products/hooks/useProducts.ts.

## Actions / Hooks
- useProducts(filters): useQuery, key ["products", "list", filters],
  staleTime 30s (product catalogs change infrequently mid-session).
- useProduct(id): useQuery, key ["products", "detail", id], staleTime 30s.
- useCreateProduct(): useMutation, invalidates ["products", "list"] on
  success.
- useUpdateProduct(): useMutation, invalidates ["products", "list"] and
  ["products", "detail", id] on success.
- useArchiveProduct(): useMutation, invalidates ["products", "list"] and
  ["products", "detail", id] on success.

## Handoff
react-native-engineer — wire useProducts/useProduct/useCreateProduct/etc.
into ProductListScreen, ProductDetailScreen, ProductFormScreen.
reviewer — confirm no state was promoted to global without justification.
```

---

## Related Agents

- `state-engineer` — primary owner of this command.
- `feature-planner` — supplies the § 11 classification this command
  implements against, or receives escalation if classification is unclear.
- `network-engineer` — supplies the repository this command's query hooks
  wrap.
- `react-native-engineer` — consumes the store/hooks in screens.
- `chief-architect` — required sign-off for any new global Zustand store,
  per § 11.

---

## References

- `.claude/constitution.md` — State Philosophy.
- `.claude/context.md` — State Management Rules.
- `.claude/agents/10-feature-planner.md` § 11, § 16, § 18.
- `src/store/authStore.ts`, `src/store/uiStore.ts` — real naming/shape
  convention this command must match exactly.
- `.claude/docs/decisions/adr-0003-zustand-for-global-state.md`.
