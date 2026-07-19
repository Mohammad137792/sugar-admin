---
id: rule-typescript
title: TypeScript Rules
category: rules
version: 1.0.0
status: active
owner: Engineering
applies_to:
  - all_components
  - all_hooks
  - all_repositories
  - all_stores
last_updated: 2026-07-18
---

# TypeScript Rules

> Strong typing. — `../context.md`, Architecture Principles

---

# Table of Contents

1. Purpose
2. Scope
3. Rules
4. Good Examples
5. Bad Examples
6. Checklist
7. References

---

# 1. Purpose

`tsconfig.json` already sets `"strict": true`. That is a floor, not a ceiling. This file defines the rules strict mode does not enforce on its own — banning `any`, requiring explicit return types on exported functions, and modeling async state with discriminated unions instead of loose booleans.

TypeScript is 5.9.3 (`package.json`). No `zod` is installed — runtime validation of external data (API responses, especially) cannot lean on schema inference yet; see `networking.md` and `security.md` for how validation is handled without it today.

---

# 2. Scope

Applies to every `.ts` and `.tsx` file in `src/` and `App.tsx`.

---

# 3. Rules

## Rule 1 — `any` is never written in new code, including as a cast

**Why:** `any` disables type checking for everything it touches, silently, for the rest of that expression's lifetime. It is the single fastest way to reintroduce the class of bug TypeScript exists to prevent.

**Existing violations to know about, not copy:** `src/store/authStore.ts` casts `(globalThis as any).__authToken` (three occurrences) and catches errors as `catch (e: any)`. `src/api/client.ts` casts `(globalThis as any).__authToken` and `(globalThis as any).__onUnauthorized`. These are accepted, narrowly, as the documented circular-import workaround described in `imports.md` Rule 6 — not as permission to use `any` elsewhere. When either file is next substantially touched, tighten the casts per Rule 2 below instead of adding more untyped `globalThis` access nearby.

## Rule 2 — `globalThis` bridges (per `imports.md` Rule 6) are typed via module augmentation, not `as any`, once touched again

```ts
// src/types/global.d.ts (target — does not exist yet)
declare global {
  // eslint-disable-next-line no-var
  var __authToken: string | undefined;
  var __onUnauthorized: (() => void) | undefined;
}
export {};
```

With this in place, `globalThis.__authToken` is typed as `string | undefined` everywhere, with no cast. This is flagged as the concrete next step for `authStore.ts` / `client.ts`, not required to be fixed as a drive-by in an unrelated PR — but any new code touching either file should apply it rather than adding another `as any`.

**Why:** the underlying `globalThis` bridge stays (see `imports.md` Rule 6 for why it's an accepted trade-off) — but there is no reason the type system has to be blind to it. A `declare global` block gets full type safety with zero runtime cost.

## Rule 3 — Catch blocks type the error explicitly, never as `any`

```ts
} catch (e) {
  const message = e instanceof Error ? e.message : "Unknown error";
}
```

**Why:** `catch (e: any)` — as written today in `authStore.ts`'s `login` — allows `e?.response?.data?.message` to compile even though nothing guarantees `e` is an axios error shape. `catch (e: unknown)` (or the implicit `unknown` TypeScript 5.9 already applies under `strict`) forces a narrowing check before any property access, which is exactly the guard that would prevent a crash if a non-axios error (a plain `TypeError`, a thrown string) reaches that block.

## Rule 4 — Exported functions declare explicit return types

```ts
export function useProducts(page: number): UseQueryResult<Product[], Error> {
  // ...
}
```

**Why:** an inferred return type on an exported function is a silent contract — change the function body in a way that widens or narrows the inferred type, and every caller's type-checking shifts without a visible diff at the function's signature. An explicit return type makes a breaking change visible exactly where it's introduced.

**Exception:** React components' return type (`JSX.Element` / `React.ReactElement`) may be left inferred — this is the one place explicit annotation adds noise without proportionate benefit, and it matches the existing style in every component in `src/components/` and `src/features/*/screens/`.

## Rule 5 — Async/network state is modeled as a discriminated union, not independent booleans

```ts
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
```

**Why:** `src/store/authStore.ts` today models this as three independent fields — `isLoading: boolean`, `error: string | null`, plus the derived `isAuthenticated: boolean` — which permits impossible states the type system cannot rule out (`isLoading: true` and `error: "Login failed"` simultaneously true, which the code never intends but nothing prevents). A discriminated union makes the impossible state unrepresentable: there is no way to construct `{ status: "loading", error: "..." }` because the type doesn't have an `error` field in the `loading` variant. New stores and hooks that track request state use this pattern; `authStore.ts`'s existing boolean-flag shape is not extended further without a reason.

## Rule 6 — Discriminate on a `status`/`type`/`kind` string literal field, and switch exhaustively

```ts
function renderContent(state: AsyncState<Product[]>) {
  switch (state.status) {
    case "idle":    return <EmptyState />;
    case "loading": return <Spinner />;
    case "success": return <ProductList items={state.data} />;
    case "error":   return <ErrorState message={state.error} />;
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
```

**Why:** the `never`-typed default branch causes a compile error the moment a new variant (e.g. `"offline"`, per the constitution's Error Philosophy, which requires an Offline state) is added anywhere but the switch is not updated to handle it. Without this, a missing case silently falls through at runtime instead of failing at compile time.

## Rule 7 — No implicit `any` — this is inherited from `strict: true`, but interfaces at API boundaries must be written explicitly, never inferred from a mock literal

```ts
// Bad: type is inferred narrowly from one mock object, drifts silently
const MOCK_STATS = [{ label: "Users", value: "1,284", trend: "up" }];

// Good: explicit interface first, mock data conforms to it
import type { Stat } from "../../../types";
const MOCK_STATS: Stat[] = [{ label: "Users", value: "1,284", trend: "up", change: 12 }];
```

**Why:** `src/features/dashboard/screens/DashboardScreen.tsx` already does this correctly — `MOCK_STATS: Stat[]` is explicitly typed against the shared `Stat` interface in `src/types/index.ts`. Keep doing this. An inferred type from a single mock array means TypeScript checks the mock is internally consistent, but never checks it actually matches what a real API would return — the interface is the contract; the mock must conform to it, not define it.

## Rule 8 — Union types over enums

```ts
type ToastType = "success" | "error" | "warning" | "info"; // matches src/types/index.ts today
```

Not `enum ToastType { Success, Error, Warning, Info }`.

**Why:** TypeScript `enum` generates runtime JavaScript (an object, sometimes a reverse mapping) for what is conceptually a compile-time-only concept. String union types have zero runtime cost, serialize predictably to JSON (relevant for anything crossing the network boundary), and are what the codebase already uses consistently (`ToastType`, `Trend` inline in `Stat`, `User["role"]`).

---

# 4. Good Examples

## Good: `Stat["trend"]` modeled as a literal union, matching `src/types/index.ts`

```ts
export interface Stat {
  label: string;
  labelFa?: string;
  value: string | number;
  change?: number;
  trend: "up" | "down" | "neutral";
}
```

This is good because `trend` cannot silently become `"increasing"` somewhere and `"up"` somewhere else — the union is the single source of truth for valid values.

---

# 5. Bad Examples

## Bad: independent boolean flags for what is really one state machine

```ts
// The pattern authStore.ts uses today — flagged, not to be extended to new stores.
interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
```

**Consequence:** four boolean/nullable fields produce technically-representable-but-logically-invalid combinations (`isAuthenticated: true` and `error: "Login failed"` together). A discriminated union (Rule 5) makes those combinations unrepresentable instead of merely "shouldn't happen."

## Bad: casting through `any` instead of narrowing

```ts
} catch (e: any) {
  set({ error: e?.response?.data?.message ?? "Login failed" });
}
```

**Consequence:** exactly what `authStore.ts` does today. If `login()` throws something that is not an axios error (a `TypeError` from a bug elsewhere in the call chain, for instance), `e?.response?.data?.message` silently evaluates to `undefined`, falls back to `"Login failed"`, and the actual bug is hidden behind a generic message. `catch (e: unknown)` plus an `instanceof` / `isAxiosError` check would surface the real error type to the developer during debugging.

---

# 6. Checklist

- [ ] No `any` was introduced (including `as any` casts) outside the documented `globalThis` bridge in `imports.md` Rule 6.
- [ ] Catch blocks narrow `unknown` explicitly; none are typed `any`.
- [ ] Every exported function (excluding React components) has an explicit return type.
- [ ] New async/request state uses a discriminated union with a `status` field, not independent booleans.
- [ ] Any `switch` over a discriminated union has an exhaustive `never` default branch.
- [ ] Mock data is typed against an explicit interface, not the other way around.
- [ ] New fixed-value fields use string union types, not `enum`.

---

# 7. References

- `../constitution.md` — Explicit Beats Implicit, Error Philosophy
- `../context.md` — Architecture Principles ("Strong typing")
- `imports.md` § Rule 6 — the `globalThis` circular-import workaround this file's `any` exceptions refer to
- `state.md` — discriminated union usage in Zustand stores and TanStack Query state
- `networking.md` — typing API responses without `zod`
- `repositories.md` — typed repository contracts
