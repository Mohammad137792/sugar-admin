---
id: handbook-repository-pattern
title: Repository Pattern Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Repository Pattern Handbook

> "Migration should require changing repositories, not UI." — constitution.md, Backend Independence

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Target Pattern
5. The Current Pattern
6. Migration Example: Auth Feature, Before and After
7. Good Examples
8. Bad Examples
9. Decision Trees
10. Real Project Examples
11. Common Mistakes
12. Best Practices
13. Checklist
14. References

---

# 1. Purpose

The Repository Pattern is how Sugar Admin achieves Backend Independence in practice, not just in principle.

This handbook defines the target interface shape, shows the current codebase's gap against that target, and gives a full worked migration example using the Auth feature — the feature most likely to be touched next, since `src/features/auth/screens/LoginScreen.tsx` already exists and currently does nothing on submit.

Every future feature (Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, Analytics) should be built against this pattern from day one. No new feature should repeat the direct-axios-call shape described in § 5.

---

# 2. Scope

In scope: repository interface design, mock implementation requirements, real implementation shape, the factory/injection point that decides which implementation a feature uses, and the migration path from `src/api/endpoints/*.ts` to a proper repository per feature.

Out of scope: the exact mock latency/failure simulation values (see `mock-api.md`), state management around repository calls (see `state-management.md`), and UI loading/error rendering (see `error-handling.md`).

---

# 3. Principles

Grounded in:

- **Backend Independence** (constitution.md) — every backend should be replaceable; migration should require changing repositories, not UI.
- **Mock First Development** (constitution.md) — every feature must be fully functional using mock repositories; mocks are first-class citizens, not temporary hacks.
- **Separation of Concerns** (constitution.md) — the Data layer is responsible for persistence, networking, and serialization, and must not know about screens.
- **Repository Contract Standard** (`10-feature-planner.md` § 10) — contracts are written as TypeScript interfaces, independent of fetch/axios/mock detail, with explicit input shape, success shape, and named error cases.

---

# 4. The Target Pattern

Four pieces, always in this order of authorship:

**1. The interface.** Defines the contract. No implementation detail. Lives in `src/features/<feature>/repository/<Feature>Repository.ts`.

```ts
// src/features/products/repository/ProductRepository.ts
export interface ProductRepository {
  list(params: { page: number; pageSize: number; query?: string }): Promise<Paginated<Product>>;
  getById(id: string): Promise<Product>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: string, input: UpdateProductInput): Promise<Product>;
  archive(id: string): Promise<void>;
}
```

**2. The mock implementation.** Feature-complete. Simulates latency, failure, pagination, empty states — see `mock-api.md` for the full simulation checklist. Lives alongside the interface, e.g. `MockProductRepository.ts`.

```ts
// src/features/products/repository/MockProductRepository.ts
import type { ProductRepository } from "./ProductRepository";
import { withLatency, maybeFail } from "../../../lib/mockUtils"; // target shared helper

export class MockProductRepository implements ProductRepository {
  private products: Product[] = SEED_PRODUCTS;

  async list({ page, pageSize, query }: { page: number; pageSize: number; query?: string }) {
    await withLatency(150, 800);
    maybeFail(0.05, "Failed to load products");
    const filtered = query
      ? this.products.filter((p) => p.title.includes(query))
      : this.products;
    const start = (page - 1) * pageSize;
    return {
      data: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      hasMore: start + pageSize < filtered.length,
    };
  }
  // ...getById, create, update, archive follow the same shape
}
```

**3. The real implementation.** Same interface, backed by `client` (axios) today, or whatever backend technology is chosen later. Lives alongside the mock, e.g. `HttpProductRepository.ts`.

```ts
// src/features/products/repository/HttpProductRepository.ts
import client from "../../../api/client";
import type { ProductRepository } from "./ProductRepository";

export class HttpProductRepository implements ProductRepository {
  async list(params) {
    const { data } = await client.get<PaginatedResponse<Product>>("/products", { params });
    return data;
  }
  // ...
}
```

**4. The factory / injection point.** One place decides which implementation a feature actually uses, driven by environment, never scattered across call sites.

```ts
// src/features/products/repository/index.ts
import { MockProductRepository } from "./MockProductRepository";
import { HttpProductRepository } from "./HttpProductRepository";
import ENV from "../../../config/env";

export const productRepository: ProductRepository =
  ENV.USE_MOCK_API ? new MockProductRepository() : new HttpProductRepository();
```

A hook or store then depends only on `productRepository`, never on `MockProductRepository` or `HttpProductRepository` by name. That single indirection is what makes Backend Independence real instead of aspirational.

---

# 5. The Current Pattern

`src/api/endpoints/*.ts` is what exists today, and it does not follow § 4. Full, real code:

```ts
// src/api/endpoints/auth.ts — current, real, complete file
import client from "../client";
import type { ApiResponse, AuthTokens, LoginCredentials, User } from "../../types";

export const authApi = {
  login: (credentials: LoginCredentials) =>
    client.post<ApiResponse<{ user: User; tokens: AuthTokens }>>("/auth/login", credentials),

  logout: () => client.post("/auth/logout"),

  refreshToken: (refreshToken: string) =>
    client.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }),

  me: () => client.get<ApiResponse<User>>("/auth/me"),
};
```

Three concrete problems with this shape, each traced to a constitution principle:

1. **No interface.** `authApi` is a concrete object, not an implementation of a declared contract. Nothing stops a caller from depending on axios-specific details (`.data.data`, HTTP status codes) instead of a clean domain shape. Violates Backend Independence.
2. **No mock.** There is exactly one implementation, and it always hits `ENV.API_BASE_URL` (`https://api.sugar-admin.com/v1` by default, per `src/config/env.ts`). Since no backend exists yet (`context.md` § "Current Development Phase"), every call from `LoginScreen` today would fail against a real network call in development. Violates Mock First Development. See `mock-api.md` § 5 for the full analysis.
3. **No factory/injection point.** `src/store/authStore.ts` imports `authApi` directly (`import { authApi } from "../api"`), so the store is coupled to "auth data comes over HTTP" at the type level, not just at runtime.

This is not a criticism of the engineer who wrote it — for a two-screen prototype phase, a thin axios wrapper is the simplest thing that could work, matching constitution's Simplicity Wins principle in isolation. The problem is only that it does not scale past the prototype phase, and nine features are coming. `10-feature-planner.md` § 10 explicitly calls this out: "Any new feature plan targeting Mock First development must define the repository interface here — do not perpetuate the direct-axios-call pattern for new features."

---

# 6. Migration Example: Auth Feature, Before and After

**Before** (current, real):

```ts
// src/store/authStore.ts (excerpt, current)
import { authApi } from "../api";

login: async (credentials) => {
  set({ isLoading: true, error: null });
  try {
    const { data } = await authApi.login(credentials);
    const { user, tokens } = data.data;
    (globalThis as any).__authToken = tokens.accessToken;
    set({ user, token: tokens.accessToken, isAuthenticated: true });
  } catch (e: any) {
    set({ error: e?.response?.data?.message ?? "Login failed" });
  } finally {
    set({ isLoading: false });
  }
},
```

Notice `data.data` — the store already knows the axios response envelope shape (`ApiResponse<T>`'s `.data` field nested inside axios's own `.data`). That's a Data-layer detail leaking into a Business-layer store action.

**After** (target shape):

```ts
// src/features/auth/repository/AuthRepository.ts
export interface AuthRepository {
  login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  me(): Promise<User>;
}

// src/features/auth/repository/MockAuthRepository.ts
export class MockAuthRepository implements AuthRepository {
  async login({ email, password }: LoginCredentials) {
    await withLatency(200, 600);
    const user = SEED_USERS.find((u) => u.email === email);
    if (!user || password !== "password123") {
      throw new AuthError("Invalid email or password");
    }
    return { user, tokens: { accessToken: mockToken(user), refreshToken: mockRefreshToken(user) } };
  }
  // logout, refreshToken, me follow
}

// src/store/authStore.ts (target)
import { authRepository } from "../features/auth/repository";

login: async (credentials) => {
  set({ isLoading: true, error: null });
  try {
    const { user, tokens } = await authRepository.login(credentials);
    (globalThis as any).__authToken = tokens.accessToken;
    set({ user, token: tokens.accessToken, isAuthenticated: true });
  } catch (e) {
    set({ error: e instanceof AuthError ? e.message : "Login failed" });
  } finally {
    set({ isLoading: false });
  }
},
```

The store action is now identical whether `authRepository` resolves to `MockAuthRepository` or a future `HttpAuthRepository` — it never sees an axios response envelope, only a domain shape and a named error type. This is the entire point of the pattern, demonstrated end to end on a feature that already exists in this repo.

---

# 7. Good Examples

**Good: an interface with explicit error handling**, from `10-feature-planner.md` § 18:

```ts
interface ChatRepository {
  /** Returns null if no conversation exists yet — callers must not treat null as an error. */
  getConversation(customerId: string): Promise<Conversation | null>;
  sendMessage(conversationId: string, body: SendMessageInput): Promise<Message>; // throws RateLimitError if platform throttles sends
}
```

This is good because the `null` case is written into the type, not left for callers to discover by accident, and the thrown error is named (`RateLimitError`), not "may throw."

**Good: a factory that hides the choice of implementation**, per § 4 point 4 — one `if`, one file, every consumer unaffected by which branch is taken.

---

# 8. Bad Examples

**Bad: a repository method typed `any`**, per `10-feature-planner.md` § 18:

```ts
interface ChatRepository {
  getConversation(customerId: string): Promise<any>;
  sendMessage(conversationId: string, body: any): Promise<any>;
}
```

`any` hides every decision this pattern exists to make explicit. Two engineers implementing this interface would each guess a different shape.

**Bad: reaching past the repository "just this once."**

```ts
// inside a component, target architecture violated
import client from "../../../api/client";

async function quickFix() {
  const { data } = await client.get("/products"); // bypasses ProductRepository entirely
}
```

Even one call site like this reintroduces the exact coupling the pattern exists to prevent — the next engineer who needs to swap backends now has two places to check, not one.

---

# 9. Decision Trees

## Does a new feature need a repository?

```
Does the feature read or write data that could plausibly come from
a backend (today or later)?
  → Yes: it needs a repository interface, mock, and injection point,
    even if the mock is the only implementation for months.
  → No (purely derived/local UI state): no repository needed —
    see state-management.md for local-state guidance instead.
```

## Should I add a method to an existing repository or create a new one?

```
Does the method operate on the same domain entity as an existing
repository (e.g. another Product operation)?
  → Yes: add to the existing repository interface.
  → No: does it belong to a different feature module entirely?
      → Yes: new repository, in that feature's folder.
      → No: it's a variant of an existing method (e.g. list with new
        filters) — extend the existing method's params, don't fork it.
```

---

# 10. Real Project Examples

- **`src/api/endpoints/auth.ts`, `content.ts`, `reports.ts`** — the current, real, complete stand-ins for what should become `AuthRepository`, `ContentRepository`, `ReportsRepository`. All three share the same shape: a plain object of arrow functions calling `client` directly, typed against `ApiResponse<T>` / `PaginatedResponse<T>` from `src/types/index.ts`.
- **`src/store/authStore.ts`** — the clearest example of a Business-layer file that has absorbed Data-layer response-envelope knowledge (`data.data`) because no repository sits between it and `authApi`. See § 6 for the exact before/after.
- **`src/api/client.ts`** — this file is correctly positioned to remain the single shared HTTP client *underneath* future `Http*Repository` implementations. Migrating to the Repository Pattern does not mean deleting `client.ts` — it means no longer letting feature code import it directly.

---

# 11. Common Mistakes

- Writing the real (HTTP) implementation before the mock. Mock-First means mock first, always — even when a backend already exists for that endpoint.
- Defining the interface and the mock in the same PR as the first UI screen that uses it, without review of the contract itself. Per `10-feature-planner.md` § 10, contracts are decided during planning, not improvised during implementation.
- Letting the mock implementation "always succeed." Constitution: "A mock that always succeeds is not realistic." Every mock needs a non-zero simulated failure rate.
- Naming a repository method after an HTTP verb (`getProducts`, `postProduct`) instead of a domain action (`list`, `create`). The interface must survive a move to GraphQL or gRPC, where "post" is meaningless.

---

# 12. Best Practices

- One repository per feature module, named after the domain (`ProductRepository`, not `ProductsApiClient`).
- Keep the interface, mock, and real implementation as three separate files even when the mock is trivial — this keeps diffs small when the real implementation eventually changes.
- Route every repository through one factory/injection point per feature, driven by `src/config/env.ts`, never by scattered `if (__DEV__)` checks in call sites.
- When migrating an existing `endpoints/*.ts` file, keep `client.ts` unchanged — only wrap it, don't duplicate it.

---

# 13. Checklist

- [ ] Interface defined before any implementation is written.
- [ ] Mock implementation simulates latency, failure, pagination, empty states (see `mock-api.md`).
- [ ] Real implementation implements the exact same interface, no widened types.
- [ ] Exactly one factory/injection point per feature repository.
- [ ] No component or hook imports `client`/`axios` directly.
- [ ] No repository method is typed `any` for input or output.

---

# 13.5 Frequently Asked Questions

**Does every repository method need to be async?**

Yes.

Even the mock implementation must return a Promise.

A synchronous mock hides the fact that a real network call will be async, and the UI never gets tested against loading states.

**Can a repository call another repository?**

Avoid it.

If `PublishingRepository` needs product data, that is a sign the caller (a service or hook) should orchestrate both repositories, not that repositories should call each other.

Cross-repository calls hide dependency graphs the same way cross-feature imports do.

**What happens to `src/api/client.ts` after migration?**

It stays.

It becomes an implementation detail used only inside `Http*Repository` files, never imported by a screen, hook, or store directly.

**Do mock and real implementations need to return identical error messages?**

No, but they must throw the same error *types*.

A component that catches `AuthError` must work whether the thrown instance came from `MockAuthRepository` or `HttpAuthRepository`.

**Where do repository interfaces for shared concepts (e.g. "Media" used by both Products and AI Images) live?**

If genuinely shared, in `src/api/` or a future `src/shared/repository/` — but confirm with `chief-architect` before creating shared repository code; per `10-feature-planner.md`'s decision tree, most things that feel shared are actually one feature's concern reused, not a new shared module.

---

# 14. References

- [constitution.md](../constitution.md) — Backend Independence, Mock First Development, Separation of Concerns.
- [context.md](../context.md) — Mock API Strategy, Backend Strategy.
- [10-feature-planner.md](../agents/10-feature-planner.md) — § 10 Repository Contract Standard, § 18 Examples.
- [architecture.md](./architecture.md) — § 6 how the Repository Pattern composes with the other three pillars.
- [mock-api.md](./mock-api.md) — full mock simulation requirements.
- [state-management.md](./state-management.md) — how repository results flow into stores and TanStack Query.
- [feature-structure.md](./feature-structure.md) — where `repository/` sits inside a feature folder.
