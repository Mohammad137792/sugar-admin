---
id: handbook-mock-api
title: Mock API Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Mock API Handbook

> "A mock that always succeeds is not realistic." — constitution.md, Mock First Development

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. What a Proper Mock Repository Must Simulate
5. Why `src/api/endpoints/*.ts` Does Not Satisfy Mock-First
6. Migration Guidance
7. Good Examples
8. Bad Examples
9. Decision Trees
10. Real Project Examples
11. Common Mistakes
12. Best Practices
13. Checklist
14. FAQ
15. References

---

# 1. Purpose

Mock First Development is not "stub it out for now." It is the project's actual development strategy — `context.md` states the backend is not implemented and the development strategy is Backend Agnostic, meaning mocks are the primary environment every feature is built and demoed against, potentially for months. This handbook defines what a mock repository must do to earn the name, and shows exactly why today's `src/api/endpoints/*.ts` files do not qualify, despite superficially looking like a data layer.

---

# 2. Scope

In scope: the full simulation checklist (latency, failures, pagination, authorization, validation, empty states), the gap analysis against current endpoint files, and migration guidance per feature.

Out of scope: the repository interface's exact TypeScript shape (`repository-pattern.md`), and how the UI renders each simulated state (`error-handling.md`).

---

# 3. Principles

Grounded in:

- **Mock First Development** (constitution.md, quoted in full because every clause matters):

  "Every feature must be fully functional using mock repositories. Mock implementations are not temporary hacks. Mocks are first-class citizens. Mocks should simulate: loading, pagination, latency, authorization, validation, failures, empty states, server errors. A mock that always succeeds is not realistic."

- **Mock API Strategy** (context.md) — repositories must simulate delays, failures, authorization, validation, pagination, server errors, empty states; the UI must never know whether the repository is using mock data or a real backend.
- **Mock repository behavior decision tree** (`10-feature-planner.md` § 16) — mirror an existing mock's latency/failure-rate conventions for consistency; default to 150–800ms jitter with a non-zero failure rate.

---

# 4. What a Proper Mock Repository Must Simulate

Each item below is mandatory, not optional, per the constitution's explicit list. This section defines what "satisfying" each one means concretely, so review has a real bar to check against.

**Loading.** Every method returns a `Promise` that resolves after a non-zero delay — never synchronously. This is not about slowing down development; it's the only way a Loading UI state ever gets exercised and reviewed before real network latency exists.

```ts
function withLatency<T>(fn: () => T, minMs = 150, maxMs = 800): Promise<T> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(() => resolve(fn()), delay));
}
```

**Pagination.** `list()`-style methods must honor `page`/`pageSize` (or cursor) params against the full mock dataset, returning `hasMore`/`total` accurately — not returning the entire dataset regardless of params. A mock that ignores pagination params never lets a screen's "load more" or pagination-boundary edge case (`10-feature-planner.md` § 13, "very large result set") be tested.

**Latency.** 150–800ms jitter is the project default (`10-feature-planner.md` § 16). Not a fixed constant — real networks jitter, and a fixed delay trains developers to assume requests always take exactly N milliseconds.

**Authorization.** A mock must be able to simulate "the current user isn't allowed to do this" — e.g. a `viewer`-role `User` (see `src/types/index.ts`'s `role: "admin" | "editor" | "viewer"`) attempting a `create`/`update`/`delete` should be rejectable by the mock, not silently allowed because "it's just a mock."

**Validation.** Server-side validation failures — a duplicate email on register, a required field missing — must be simulable independent of whatever client-side validation exists, per constitution's Security Philosophy: "never trust... mock validation" alone; validation rules must exist independently from presentation.

**Failures.** A non-zero random failure rate (5–10% is a reasonable default, matching `10-feature-planner.md` § 16's spirit) on every method, not just a hardcoded "fail once" test hook. Failures should throw named error types (`NetworkError`, `ValidationError`, `AuthError`) so the UI's `catch` blocks can branch meaningfully — never a bare `throw new Error("failed")`.

**Empty states.** Every `list()` mock must have a code path that returns zero results — either via a specific seed-data query (e.g. searching for a term that matches nothing) or a dedicated "start empty" mode — so the Empty UI state (constitution's Error Philosophy) gets built and reviewed, not discovered as a bug the first time a new user has no data yet.

**Server errors.** Distinct from client-triggered validation failures — a mock should be able to simulate a 500-equivalent ("the server is having a bad day") independent of anything the caller did wrong, so Retry-state UI can be built against something other than "the user's input was invalid."

---

# 5. Why `src/api/endpoints/*.ts` Does Not Satisfy Mock-First

Full, real code, unchanged from `repository-pattern.md` § 5 but examined here specifically against § 4's checklist:

```ts
// src/api/endpoints/content.ts — current, real, complete
import client from "../client";
export const contentApi = {
  list: (page = 1, limit = 20) =>
    client.get<PaginatedResponse<ContentItem>>("/content", { params: { page, limit } }),
  get: (id: string) => client.get<ApiResponse<ContentItem>>(`/content/${id}`),
  create: (payload: Partial<ContentItem>) => client.post<ApiResponse<ContentItem>>("/content", payload),
  update: (id: string, payload: Partial<ContentItem>) => client.put<ApiResponse<ContentItem>>(`/content/${id}`, payload),
  delete: (id: string) => client.delete<ApiResponse<null>>(`/content/${id}`),
};
```

Checked against every item in § 4:

- **Loading** — not simulated; it depends entirely on real network latency to `https://api.sugar-admin.com/v1` (`src/config/env.ts`'s default `API_BASE_URL`), a host that, per `context.md`'s "Backend: Not implemented," has no real backend behind it. In practice, every call from this file today either hangs on DNS/connection failure or 404s against a non-existent server.
- **Pagination** — `page`/`limit` are passed through as query params to a server that doesn't exist; there is no mock dataset being paginated at all.
- **Latency** — none; whatever the network stack's failure timeout is (up to `client.ts`'s configured `timeout: 15000`).
- **Authorization** — none; there's no concept of "this mock user is a viewer" anywhere in this file.
- **Validation** — none; whatever validation exists is entirely client-side (if any), with nothing simulating server-side rejection.
- **Failures** — accidental, not simulated: every call fails today because there is no backend, not because a deliberate, reviewable failure path was designed in.
- **Empty states** — not applicable; there's no mock data to be empty.
- **Server errors** — same as failures: unintentional, not a designed simulation.

The conclusion stated plainly: **this file is not a mock, it is a real HTTP client pointed at a real (currently nonexistent) backend.** It satisfies zero items on the constitution's mandatory list. This is precisely the gap `10-feature-planner.md` § 10 names: "Sugar Admin's current `src/api/endpoints/*.ts` files call `client` (axios) directly with no repository interface in front of them... do not perpetuate the direct-axios-call pattern for new features."

---

# 6. Migration Guidance

Per feature, in this order:

1. Write the repository interface first (`repository-pattern.md` § 4), independent of any implementation.
2. Write the mock implementation against § 4's full checklist — every item, not a subset. Use seed data that's realistic for the domain (real-looking product names, not `"Product 1"`, `"Product 2"`).
3. Wire the feature's screens/hooks against the mock, fully, including building and reviewing every state in constitution's Error Philosophy list.
4. Only after the mock-driven feature is reviewed and working, write the `Http*Repository` wrapping the existing `client` instance — reusing `client.ts` as-is, not rewriting it.
5. Retire the corresponding `endpoints/*.ts` file's direct usage — leave the file in place only if other, not-yet-migrated code still depends on it, and track its removal as follow-up debt per constitution's Technical Debt section.

Do this feature by feature, starting with whichever feature is next actually built out past Level 0 (see `feature-structure.md` § 14.5) — not as a single repo-wide refactor PR. See `refactoring.md` § 5 for why.

---

# 7. Good Examples

**Good: a mock method with every § 4 property present.**

```ts
async login({ email, password }: LoginCredentials) {
  await withLatency(() => null, 200, 600);          // Latency + Loading
  if (Math.random() < 0.05) throw new ServerError(); // Server errors
  const user = SEED_USERS.find((u) => u.email === email);
  if (!user || password !== user.mockPassword) {
    throw new ValidationError("Invalid email or password"); // Validation
  }
  return { user, tokens: mockTokensFor(user) };
}
```

---

# 8. Bad Examples

**Bad: a mock that always succeeds.**

```ts
// bad — violates constitution directly: "A mock that always succeeds is not realistic."
async list() {
  return { data: SEED_PRODUCTS, total: SEED_PRODUCTS.length, page: 1, hasMore: false };
}
```

No latency, no failure path, no pagination honored, no empty-state path. This "works" in a demo and hides every state the real backend will eventually force the UI to handle.

**Bad: treating `src/api/endpoints/*.ts` as already Mock-First because it's simple.**

Simplicity is a virtue (constitution's Simplicity Wins) but only when it satisfies the requirement, not when it skips the requirement entirely. § 5 shows this file satisfies none of the eight required simulations.

---

# 9. Decision Trees

## Is this mock implementation ready for review?

```
Does every method have latency? pagination (if list-shaped)?
a non-zero failure path? a validation-failure path (if it accepts
input)? an authorization check (if role-gated)? an empty-state path
(if list-shaped)?
  → All yes: ready for review.
  → Any no: not Mock-First yet — per constitution, this is not
    "incomplete but acceptable," it is not done.
```

## Should I add a new failure scenario to an existing mock, or is the existing rate enough?

```
Does the corresponding real backend behavior (once it exists) have a
distinct failure mode not yet represented (e.g. rate limiting, a
specific 409 conflict)?
  → Yes: add it explicitly, named, not folded into the generic
    random-failure path.
  → No: the existing random failure rate covers it.
```

---

# 10. Real Project Examples

- **`src/api/endpoints/auth.ts`, `content.ts`, `reports.ts`** — the full, real, current negative example, analyzed exhaustively in § 5.
- **`src/store/authStore.ts`'s `login()`** — already has the *shape* of good error handling (try/catch/finally, `error` state field) that a proper mock's thrown error types would slot into cleanly once `authApi` becomes a real `MockAuthRepository` — the store code barely needs to change, only what it calls.

---

# 11. Common Mistakes

- Writing a mock with hardcoded success data and treating "I'll add failures later" as acceptable for a first PR. Per constitution, an always-succeeding mock is not a partial mock, it does not meet the bar.
- Simulating latency with a fixed `setTimeout(fn, 300)` instead of jittered range — this trains reviewers and developers to expect uniform timing that never reflects reality.
- Building authorization checks only in the UI (hiding a button) without the mock also rejecting the underlying call — constitution's Security Philosophy: never trust mock validation alone; the rejection must exist independent of presentation.
- Copy-pasting seed data across features without adjusting it to look domain-realistic, making Empty/populated states hard to visually distinguish in review screenshots.

---

# 12. Best Practices

- Keep a single shared latency/failure-rate helper (e.g. a future `src/lib/mockUtils.ts`) so every feature's mock uses the same jitter range and failure-rate convention by default, per `10-feature-planner.md` § 16's "mirror an existing mock" guidance.
- Seed each mock with enough data (10–30 realistic records) to make pagination boundaries meaningful to test.
- Name thrown mock errors after their real-world equivalent (`AuthError`, `ValidationError`, `RateLimitError`, `ServerError`), and make sure the real (`Http*`) implementation eventually throws the same named types, so UI error-handling code never needs to know which implementation is active.
- Review a new mock repository the same way you'd review a real backend's API contract — because until a real backend exists, it effectively is the API contract.

---

# 13. Checklist

- [ ] Every mock method has jittered latency (150–800ms default).
- [ ] Every list-shaped method honors pagination params against real seed data.
- [ ] A non-zero, named failure path exists per method.
- [ ] Validation failures are simulated independent of any client-side validation.
- [ ] Authorization is enforced inside the mock, not only hidden in the UI.
- [ ] At least one code path returns a genuinely empty result set.
- [ ] Server-error simulation exists, distinct from validation failure.

---

# 14. FAQ

**Is it acceptable to skip authorization simulation for a feature with only one user role today?**

Only if the feature plan explicitly marks role-gating "does not apply" with a reason, per `10-feature-planner.md` § 13's requirement that every edge case be marked applies/does-not-apply, never silently skipped.

**Should mock seed data be committed to the repo or generated at runtime?**

Committed, as a static array in the mock repository file (or an adjacent `seed.ts`) — deterministic seed data makes bugs reproducible and screenshots consistent across review cycles.

**Does the mock need to simulate rate limiting for AI features?**

Yes, when AI Content/AI Images repositories are built — see `10-feature-planner.md` § 13's AI edge cases ("AI provider timeout or rate limit") and `ai-integration.md`.

---

# 15. References

- [constitution.md](../constitution.md) — Mock First Development, quoted in full in § 3.
- [context.md](../context.md) — Mock API Strategy.
- [10-feature-planner.md](../agents/10-feature-planner.md) — § 16 mock repository decision tree, § 13 edge case catalog.
- [repository-pattern.md](./repository-pattern.md) — the interface/mock/real/factory shape this handbook's mocks slot into.
- [error-handling.md](./error-handling.md) — how simulated states map to rendered UI states.
- [testing-strategy.md](./testing-strategy.md) — testing a mock repository's simulation behavior directly.
