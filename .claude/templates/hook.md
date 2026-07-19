---
id: template-hook
title: Custom Hook Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Custom Hook Template

## Purpose

Use this template to propose or document a new custom React hook — the glue that
connects a screen to a repository, a store, or derived UI logic, without putting
business logic directly inside a component (Constitution's Separation of Concerns:
"Presentation Layer ... Must not contain business logic").

Filled out by `state-engineer` (for hooks wrapping stores/queries) or
`network-engineer` (for hooks wrapping repositories), based on the repository and
state contracts already defined by `10-feature-planner` in a
`.claude/templates/repository.md` / `.claude/templates/store.md` document.

Feature-owned hooks live at `src/features/<feature>/hooks/use<Name>.ts`. A hook
used by more than one feature is a candidate for `src/hooks/use<Name>.ts` (a
shared hooks folder does not exist yet in this codebase — creating one is a small
architectural decision; note it in Instructions § 5 below).

## Instructions

1. **Name** starts with `use`, describes what it returns or does, not how
   (`useProductRepository`, not `useAxiosProductStuff`).
2. **Signature** — full TypeScript parameter and return types. If the hook wraps
   TanStack Query, the return shape should surface `data`, `isLoading`, `isError`,
   `error`, and `refetch`/mutation functions consistent with
   `@tanstack/react-query`'s own conventions — do not rename them to something
   bespoke.
3. **Dependencies** — name every repository, store, or context this hook reads
   from. This makes the hook's coupling visible instead of hidden inside its body.
4. **Backend independence** — a hook that talks to data must depend on the
   repository *interface* (e.g. `ProductRepository`), never directly on
   `src/api/client.ts` or axios — otherwise the hook itself becomes the leak the
   Constitution's Backend Independence section warns against.
5. If this is the first hook to live outside any feature folder (i.e. it needs a
   new `src/hooks/` directory), flag that explicitly — creating a new top-level
   shared folder is a Folder Organization decision that should be confirmed with
   `chief-architect` per `.claude/agents/00-chief-architect.md` § 4 (Authority).
6. **Example usage** — a real snippet showing the hook called inside a screen
   component, not pseudocode.

---

## The Template

```markdown
### Hook: use<Name>

**Location:** `src/features/<feature>/hooks/use<Name>.ts` | `src/hooks/use<Name>.ts` (new shared folder — flag for chief-architect confirmation)

**Purpose:** <one sentence — what problem this hook solves>

**Signature:**
```ts
function use<Name>(<params>: <ParamsType>): <ReturnType>;
```

**Dependencies:**
- <repository / store / context this hook reads from>

**Return shape:**
```ts
interface <Name>Result {
  <field>: <type>;
}
```

**Example usage:**
```tsx
function <SomeScreen>() {
  const { <fields> } = use<Name>(<args>);
  // ...
}
```

**Notes:** <edge cases, memoization concerns, cleanup/unsubscribe behavior>
```

---

## Filled Example: `useProductRepository`

```markdown
### Hook: useProductRepository

**Location:** `src/features/products/hooks/useProductRepository.ts`

**Purpose:** Give screens and other hooks a single, backend-independent access
point to the active `ProductRepository` instance (mock or live), so no component
ever imports `ProductRepository.mock.ts` or `ProductRepository.live.ts` directly
— matching the composition-point pattern in
`.claude/templates/architecture-proposal.md`'s filled example.

**Signature:**
```ts
function useProductRepository(): ProductRepository;
```

**Dependencies:**
- `src/features/products/repository/index.ts` — exports the active
  `productRepository` instance (mock or live, decided by `ENV.USE_MOCK_API`)

**Return shape:**
The hook returns the `ProductRepository` interface itself (see
`.claude/templates/repository.md`'s filled example for its full method list —
`list`, `getById`, `create`, `update`, `archive`). It does not wrap the methods in
React Query — that happens one layer up, in feature-specific hooks like
`useProductList` or `useProduct(id)`, which call `useProductRepository()` internally.

**Example usage:**
```tsx
import { useQuery } from "@tanstack/react-query";
import { useProductRepository } from "../hooks/useProductRepository";
import { useProductsUiStore } from "../store/productsUiStore";

function useProductList(page: number) {
  const repository = useProductRepository();
  const { query, categoryId } = useProductsUiStore();

  return useQuery({
    queryKey: ["products", "list", { page, query, categoryId }],
    queryFn: () => repository.list({ page, pageSize: 20, query, categoryId: categoryId ?? undefined }),
  });
}

// Inside ProductListScreen:
function ProductListScreen() {
  const { data, isLoading, isError, refetch } = useProductList(1);
  // render Loading/Empty/Error/Success per the screen spec
}
```

**Notes:** `useProductRepository()` itself does no data fetching and has no
loading/error state of its own — it exists purely to keep repository selection
(mock vs. live) out of every calling hook, so a future backend swap changes
`src/features/products/repository/index.ts` only. Because the returned repository
instance is a stable module-level constant (not created per-render), this hook is
safe to call unconditionally at the top of any component without a `useMemo`.
```

---

## Checklist

- [ ] Name starts with `use` and describes what it returns
- [ ] Signature has full TypeScript types, no `any`
- [ ] Dependencies name real repositories/stores/contexts, not "some data"
- [ ] If the hook touches data, it depends on a repository interface, never axios/`client.ts` directly
- [ ] A new top-level `src/hooks/` folder (if proposed) is flagged for chief-architect confirmation
- [ ] Example usage is a real snippet inside a screen or another hook, not pseudocode

## References

- `.claude/constitution.md` — Separation of Concerns, Backend Independence, Single Responsibility
- `.claude/agents/00-chief-architect.md` § 4 (Authority — folder organization)
- `.claude/templates/repository.md`, `.claude/templates/store.md` — contracts this hook typically wraps
- `.claude/templates/architecture-proposal.md` — the repository composition-point pattern this hook builds on
