---
id: playbook-replacing-mock-api
title: Replacing Mock API Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Replacing Mock API Playbook

> "The UI must never know whether the repository is using mock data or a real backend." — `../context.md`, Mock API Strategy

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Swapping `ProductRepository`'s Mock for Real
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

`connecting-backend.md` covers the one-time seam work — selecting a backend, updating `src/config/env.ts` and `src/api/client.ts`. This playbook covers what happens after that groundwork exists: swapping **one feature's** mock repository for its real implementation, incrementally, without ever touching that feature's screens, hooks, or the shape of its repository interface — and with an honest plan for verification given that Sugar Admin currently has zero automated test infrastructure (`../agents/50-testing-engineer.md` § 9).

The mock is never deleted. Per `../constitution.md`'s Mock First Development, "mocks are not temporary hacks" — the mock stays in the codebase permanently, available for local development, demos, and (once infrastructure exists) fast unit tests, even after the real implementation is live.

---

# 2. When To Use This Playbook

Use this playbook when:

- `connecting-backend.md`'s groundwork already exists (backend selected, `ENV.USE_MOCK_API` exists, `client.ts` verified against the backend's auth scheme).
- A specific feature's real backend endpoint is confirmed live and reachable — not merely "a backend was chosen," but this feature's actual routes respond.
- The feature already has a repository interface + mock implementation built per `creating-a-repository.md` — a feature still on the direct-axios `src/api/endpoints/*.ts` pattern is migrated to the repository pattern first (`../agents/40-refactor-engineer.md` § 9), which is a separate, prerequisite piece of work, not part of this playbook.

Do not use this playbook to select or wire a backend for the first time — that's `connecting-backend.md`. Do not use it to skip the mock for a brand-new feature — mock-first always comes before real, per `../agents/24-network-engineer.md` Principle 1.

---

# 3. Prerequisites

- The feature's repository interface (`<Feature>Repository`) and mock implementation already exist and are in active use by the feature's screens.
- The real backend endpoint for this specific feature is live, not merely planned — confirm this before starting, not partway through.
- `../agents/50-testing-engineer.md` read in full, specifically § 9 ("Current Codebase Reality — Zero Test Infrastructure") — this playbook does not pretend otherwise, and neither should you.
- `../rules/testing.md` Rule 1 understood: test infrastructure is introduced "the first time a feature has non-trivial business logic worth protecting" — a real mock repository with branching failure/pagination logic already meets this trigger, which makes a mock-to-real swap a strong candidate for being the moment infrastructure actually lands (see Step 4).

---

# 4. Step-by-Step Workflow

## Step 1 — Confirm the real endpoint is actually live for this feature

Not "a backend exists somewhere" — this feature's specific routes, reachable, returning real data. Confirming this first avoids discovering mid-swap that the contract can't actually be fulfilled.

## Step 2 — Confirm the repository interface doesn't need to change

If the real backend's actual response shape doesn't match what the interface promises, that's a contract renegotiation with `feature-planner`, not a silent widening of the interface (`../agents/24-network-engineer.md` § 8, final step: "If implementing the contract reveals it's actually unworkable... stop and escalate... do not silently change the contract"). A shape mismatch that's purely cosmetic (different field names, a differently-nested envelope) is normalized inside the `Http*Repository` implementation itself — per `../rules/networking.md` Rule 8, the app-internal type stays consistent regardless of what the backend actually returns.

## Step 3 — Write `Http<Feature>Repository`, implementing the exact same interface as the mock

```ts
// src/features/products/repository/HttpProductRepository.ts
import client from "../../../api/client";
import type { ProductRepository, ListProductsInput, Paginated } from "./ProductRepository";
import type { Product, ProductSummary } from "../types/Product";

export const httpProductRepository: ProductRepository = {
  async list(params: ListProductsInput): Promise<Paginated<ProductSummary>> {
    const { data } = await client.get("/products", { params });
    return data; // mapped/normalized here if the backend's envelope differs from Paginated<T>
  },
  // getById, create, update, archive follow the same shape
};
```

Every method the mock implements, the real implementation must implement identically in signature — no method added, none dropped, no return type widened.

## Step 4 — Check whether this swap is the test-infrastructure trigger

Per `../agents/50-testing-engineer.md` § 7 Principle 2 and `../rules/testing.md` Rule 1: if this feature's mock repository has real branching logic (pagination boundaries, simulated failure, validation) and no test infrastructure exists yet, this swap is very often exactly the trigger. If so, this is the moment to bootstrap testing — see `writing-tests.md` — landed in the **same PR** as the swap, not deferred to "later." Do not treat this as optional because the swap itself "feels done" without it.

## Step 5 — Verify behavioral parity, not just type parity

TypeScript confirms `httpProductRepository` returns the right *shape*. It says nothing about whether it *behaves* the same way the mock did — same pagination semantics, same treatment of an empty result (`../agents/50-testing-engineer.md` § 7 Principle 6; `../rules/testing.md` Rule 5).

- **If test infrastructure exists** (including if Step 4 just bootstrapped it): write or run a shared, interface-level contract test suite, parameterized to run against both `mockProductRepository` and `httpProductRepository`, asserting both satisfy the same behavioral guarantees (last page returns `hasMore: false`, an empty result returns `[]` not `null`, thrown errors are the same named types).
- **If test infrastructure genuinely does not apply yet** (this swap didn't cross Rule 1's trigger): perform the same manual verification originally used to validate the mock — exercise every one of the Constitution's Error Philosophy states (Loading, Empty, Error, Offline, Unauthorized, Success) against the real backend, and record the outcome in the PR description, per `../templates/testing.md`'s Manual Verification section. Never claim this is equivalent to automated coverage; state plainly that it isn't (`../agents/50-testing-engineer.md` § 14 Anti Patterns).

## Step 6 — Flip the switch for this repository only

```ts
// src/features/products/repository/index.ts
import ENV from "../../../config/env";
import { mockProductRepository } from "./ProductRepository.mock";
import { httpProductRepository } from "./ProductRepository.live";
import type { ProductRepository } from "./ProductRepository";

export const productRepository: ProductRepository =
  ENV.USE_MOCK_API ? mockProductRepository : httpProductRepository;
```

This is the entire swap, mechanically — one factory file, one conditional. No screen, hook, or store for this feature changes at all, which is the concrete proof `../constitution.md`'s Backend Independence claim is actually true for this feature.

## Step 7 — State the rollback plan explicitly, even though it's trivial

Because the switch is a single-line factory decision, rollback is flipping `ENV.USE_MOCK_API` (or a feature-specific override flag, if a global flag is too coarse once multiple features are mid-migration) back to mock. State this explicitly in the PR description anyway — per `../agents/40-refactor-engineer.md` § 11's Refactor Safety Notes discipline, "the rollback plan is trivial" is still a claim that should be written down, not assumed obvious.

## Step 8 — Hand off

`reviewer` confirms the interface didn't change, the mock remains present and untouched, and Step 5's verification (automated or manual) is recorded. `testing-engineer` is looped in explicitly if Step 4 triggered infrastructure adoption.

---

# 5. Worked Example: Swapping `ProductRepository`'s Mock for Real

Continuing the Products thread from `creating-a-repository.md`'s worked example — assume `ProductRepository`, `ProductRepository.mock.ts`, and `ProductRepository.live.ts` already exist per that playbook, and `ProductRepository.live.ts` was written early (per `creating-a-repository.md` Step 3) but has been unreachable until now because no backend existed.

**Step 1.** `connecting-backend.md`'s worked example confirms the chosen Express backend now serves `/products` routes for real, reachable from a deployed environment.

**Step 2.** The interface's five methods (`list`, `getById`, `create`, `update`, `archive`) map cleanly onto the backend's actual REST routes — no contract renegotiation needed. The backend's pagination field is named `hasNext` rather than `hasMore`; this is normalized inside `ProductRepository.live.ts`'s `list()` method, not propagated into the interface.

**Step 3.** `ProductRepository.live.ts` is finalized against the real routes, mapping `hasNext` → `hasMore` at the boundary.

**Step 4.** `mockProductRepository`'s `list()`, `create`, `update` already have real branching logic (pagination math, simulated `viewer`-role rejection, `ConflictError` on stale writes, per `creating-a-repository.md`'s worked example) — this crosses `../rules/testing.md` Rule 1's trigger. Jest, `jest-expo`, and `@testing-library/react-native` are installed in this same PR, per `writing-tests.md`.

**Step 5.** A shared contract test suite (`ProductRepository.contract.test.ts`) runs against both `mockProductRepository` and `httpProductRepository`, asserting: last-page `hasMore: false` on both, empty result returns `[]` on both, `getById` on a missing id throws `NotFoundError` on both. This satisfies `../rules/testing.md` Rule 5 directly.

**Step 6.** `ProductRepository`'s `index.ts` factory is flipped: `ENV.USE_MOCK_API ? mockProductRepository : httpProductRepository`. `ProductListScreen`, `ProductDetailScreen`, and `useProducts`/`useProductDetail` are unchanged — zero lines touched outside `repository/`.

**Step 7.** Rollback: set `EXPO_PUBLIC_USE_MOCK_API=true` (or flip `ENV.USE_MOCK_API` back) — documented explicitly in the PR even though it's a one-line revert.

**Step 8.** `reviewer` confirms no screen/hook changed; `testing-engineer` confirms the contract test suite covers all five methods' behavioral guarantees, not just their type shapes.

---

# 6. Checklist

- [ ] The real endpoint for this specific feature is confirmed live before starting.
- [ ] The repository interface is unchanged; any shape mismatch is normalized inside the `Http*`/`.live.ts` implementation, not leaked upward.
- [ ] Every method the mock implements, the real implementation implements identically.
- [ ] Whether this swap crosses the test-infrastructure trigger (`../rules/testing.md` Rule 1) was checked honestly, not assumed either way.
- [ ] Behavioral parity (not just type parity) between mock and real was verified — automated contract test if infrastructure exists, recorded manual verification if it genuinely doesn't yet.
- [ ] The mock-vs-real switch is a single-line change in one factory file.
- [ ] The mock implementation was not deleted.
- [ ] A rollback plan is stated explicitly in the PR, even if mechanically trivial.
- [ ] `reviewer` (and `testing-engineer`, if triggered) are named in the handoff.

---

# 7. Common Mistakes

**Deleting the mock after the swap.** Directly contradicts `../constitution.md`'s "mocks are not temporary hacks" — the mock stays for local development, demos, and future test coverage.

**Widening the repository interface to match whatever the real backend happens to return.** Leaks a Data-layer detail into a contract the whole feature (and its tests, once they exist) were built against — normalize inside the `Http*` implementation instead.

**Treating "TypeScript compiles" as proof the real implementation behaves like the mock.** `../agents/50-testing-engineer.md` § 7 Principle 6 is explicit: structural typing only guarantees shape, never behavior.

**Flipping the switch globally across every feature at once, "since the backend is ready now."** Each feature's real endpoint may be ready at a different time; swap per feature per `connecting-backend.md` Step 6, not all at once.

**Skipping Manual Verification because "it's basically the same as the mock."** If automated infrastructure genuinely doesn't apply yet, the manual steps are the only verification that exists — skipping them means the swap shipped unverified, not "verified informally."

---

# 8. References

- `../constitution.md` — Mock First Development, Backend Independence
- `../context.md` — Mock API Strategy
- `../agents/24-network-engineer.md` — repository authorship principles this playbook depends on
- `../agents/50-testing-engineer.md` § 7, § 9, § 11 — honest infrastructure state and the contract-test standard this playbook applies
- `../rules/testing.md` Rules 1 and 5 — the adoption trigger and the shared contract-test rule
- `../rules/networking.md` Rule 8 — response-envelope normalization
- `../templates/testing.md` — Manual Verification structure used when infrastructure doesn't yet apply
- `./connecting-backend.md` — the one-time backend seam this playbook's per-feature swap depends on
- `./creating-a-repository.md` — how the mock and interface this playbook swaps were originally built
- `./writing-tests.md` — the infrastructure-bootstrap procedure this playbook's Step 4 may trigger
