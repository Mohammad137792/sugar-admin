---
id: playbook-building-a-feature
title: Building A Feature Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Building A Feature Playbook

> A feature is done when the plan, the code, and the review all agree with each other. This playbook is how you get from a request to that state.

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Planning the Products Feature
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

Sugar Admin ships product capability as vertical slices — Authentication, Dashboard, Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, Analytics (`../context.md`, Primary Features and Development Philosophy). A "feature" in this codebase is a folder under `src/features/<feature-name>/` that eventually owns its own screens, components, hooks, repository, state, types, and constants (`../constitution.md`, Feature Ownership; `../rules/folders.md` Rule 1).

This playbook is the full lifecycle: turning a feature request into an approved plan, handing that plan to the right engineering agents in parallel, and closing the loop with review. It exists so no feature ever gets implemented by an engineer guessing at scope, screen list, or data shape — every one of those decisions is made once, in writing, before code.

---

# 2. When To Use This Playbook

Use this playbook when:

- A new capability from `../context.md`'s Primary Features list (Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, Analytics) does not yet exist under `src/features/`.
- A request is large enough to need multiple screens, a new repository, and/or new state — not a single small addition to an existing screen (for that, see `building-a-screen.md` instead).
- `../knowledge/roadmap.md` names the feature as ready to start (see its § 15 "Is a Feature Ready to Start?" checklist).

Do not use this playbook for:

- Adding one screen to an existing, already-planned feature — use `building-a-screen.md`.
- A pure architecture question with no product requirement yet (new folder pattern, new cross-cutting rule) — that starts with `../agents/00-chief-architect.md` and `../templates/architecture-proposal.md`, not a feature plan.

---

# 3. Prerequisites

Before starting, confirm all of the following exist or are explicitly produced as part of this workflow:

- A product requirement in writing: an entry in `../context.md`'s Primary Features, a line in `../knowledge/roadmap.md`, or an explicit written request from a human. Never invent scope to fill a gap — `../agents/10-feature-planner.md` § 5 and § 17 both forbid this.
- Confirmation the feature doesn't already exist under `src/features/` (`ai-chat`, `auth`, `content`, `dashboard`, `reports` are the current five — check this list first).
- If the feature requires a new architectural pattern (e.g. it's the first feature to adopt the repository layer for real), `../agents/00-chief-architect.md` has approved that pattern via `../templates/architecture-proposal.md`, or you are consciously establishing it now the way `../templates/architecture-proposal.md`'s filled example does for the repository pattern.
- You know which agent owns the plan: `../agents/10-feature-planner.md`. It is the only agent authorized to decide screens, repository contracts, state shape, and navigation entries (`../agents/10-feature-planner.md` § 1, § 6).

---

# 4. Step-by-Step Workflow

## Step 1 — Confirm module fit

Ask `../agents/10-feature-planner.md` § 8 Step 2's question: does this belong to an existing feature module, or does it need a new one? Check `src/features/` for a name collision. If the feature is genuinely new (e.g. `products`, `publishing`, `chat`, `analytics`), confirm the proposed folder name doesn't overlap an existing concept.

## Step 2 — Write the feature plan

Fill out `../templates/feature-proposal.md` completely, in order, using `../agents/10-feature-planner.md` §§ 9–13 as the standard for each section:

1. **Feature Summary** — one paragraph, tied to a named Primary Feature in `../context.md`.
2. **Scope** — explicit in-scope and out-of-scope lists. A missing "out of scope" section is treated as "everything is in scope."
3. **Screens** — one block per screen, per the Screen Specification Standard (`../agents/10-feature-planner.md` § 9). All six states (Loading, Empty, Error, Offline, Unauthorized, Success) are mandatory, every screen, every time.
4. **Repository Contracts** — one TypeScript interface per repository domain, per § 10. Named input/return types, named error cases, pagination behavior, retry-safety — never `Promise<any>`.
5. **State** — classify every piece of state as Global (Zustand), Local, or Server Cache (TanStack Query), per § 11. Default to Local or Server Cache; a new global store is the exception (see `creating-a-zustand-store.md`).
6. **Navigation** — one route block per new screen, per § 12, matching `src/navigation/types.ts`'s real shape (`PascalCase` route names, explicit `undefined` for paramless routes).
7. **Edge Cases** — complete the full catalog from § 13 (Network, Data, Auth, Platform, Device, AI where applicable). Every line marked "applies" or "does not apply" with a reason. Silence is rejected.
8. **Acceptance Criteria** — an independently verifiable checklist `reviewer` can check against the shipped feature without reading the implementation first.
9. **Open Questions** — should be empty at handoff. If not, the plan is not ready.
10. **Handoff** — name every downstream agent and the order they work in.

Save the completed plan to `.claude/docs/examples/<feature-name>-plan.md` (the default location per `../agents/10-feature-planner.md` § 15) or `src/features/<feature-name>/PLAN.md`.

## Step 3 — Self-review the plan before handoff

Run `../agents/10-feature-planner.md` § 19's "Before handing off a feature plan" checklist and § 23's Self Review questions against the plan. If any answer is uncertain, revise — do not hand off a plan you would not want implemented literally.

## Step 4 — Hand off to engineering agents in parallel

Per `../agents/10-feature-planner.md` § 21, `../agents/20-react-native-engineer.md` § 17, and `../agents/22-ui-engineer.md` § 17, the following agents can work simultaneously against the same finished plan, without depending on each other's output being "done" first — only on agreed hook/component signatures:

- `network-engineer` — implements the repository contract, mock first (see `creating-a-repository.md`). Start here if the feature is data-heavy and the contract is the riskiest unknown.
- `state-engineer` — wires TanStack Query keys/hooks and any justified new store slice (see `creating-a-zustand-store.md`).
- `ui-engineer` — builds presentational components against the screen specs (see `creating-a-component.md`), following `../agents/22-ui-engineer.md`.
- `react-native-engineer` — composes screens, wires navigation and state/data hooks together (see `building-a-screen.md` and `adding-navigation.md`), following `../agents/20-react-native-engineer.md`.
- `ai-engineer` — only if the plan's Edge Case Catalog flagged AI-touching repository methods.

Sequence guidance: hand off to `network-engineer` and `state-engineer` first when the data shape is the biggest risk; hand off to `ui-engineer` first when the feature is presentation-heavy and the data shape is already well understood from an existing pattern (`../agents/10-feature-planner.md` § 22).

## Step 5 — Coordinate on interface signatures early

Engineers don't wait for a "finished" component or hook if a stable interface is agreed upon (`../agents/20-react-native-engineer.md` § 17). If `react-native-engineer` needs a `useProducts()` hook and `network-engineer` hasn't finished the mock repository yet, agree on the hook's return shape (`{ data, isLoading, isError, refetch }`, matching `useContentList`'s shape in `../agents/20-react-native-engineer.md` § 10) and build against that shape in parallel.

## Step 6 — Escalate plan gaps, never improvise around them

If any engineering agent discovers the plan is wrong or incomplete once implementation starts, work stops and the plan is corrected — the plan is never silently overridden in code (`../agents/10-feature-planner.md` § 21). Use the "Screen / Gap / Blocked? / Recommendation" report shape from `../agents/20-react-native-engineer.md` § 12.

## Step 7 — Review against the plan

Once every assigned agent reports their portion complete, hand off to `reviewer` using `../commands/review-feature.md`. This command checks screen-by-screen, repository, state, and navigation conformance against the plan, plus a Constitution cross-check — not code style in isolation. A "Blocked" verdict must be resolved (with owning agent and severity) before merge.

## Step 8 — Close the loop

Update `.claude/docs/decisions/` with an ADR (`../templates/adr.md`) if the feature introduced a new pattern (e.g. the first repository-pattern feature, the first new global store). Confirm `../knowledge/roadmap.md`'s status for this feature is updated if that document tracks it.

---

# 5. Worked Example: Planning the Products Feature

Products is named in `../context.md`'s Primary Features (Create, Update, Delete, Archive, Search, Categories, Inventory, Images) but no `src/features/products/` folder exists yet — a clean, real case for this playbook end to end.

**Step 1 — Module fit.** `products` does not collide with `ai-chat`, `auth`, `content`, `dashboard`, or `reports`. It is a new, distinct domain concept (a catalog, not content or reporting), so a new feature module is justified per `../agents/10-feature-planner.md` § 16's decision tree.

**Step 2 — Plan.** `../templates/feature-proposal.md` already contains a complete, filled-out Products example — use it as the literal reference, not a hypothetical: three screens (`ProductListScreen`, `ProductDetailScreen`, `ProductFormScreen`), a `ProductRepository` interface with five methods (`list`, `getById`, `create`, `update`, `archive`), two state entries (`productListFilters` as Local, product list data as Server Cache), three new routes on `AppStackParamList` (`ProductList`, `ProductDetail`, `ProductForm`), a fully completed Edge Case Catalog, and seven acceptance criteria.

**Step 3 — Self-review.** Every screen has all six states. Every repository method names its error type (`NetworkError`, `NotFoundError`, `ValidationError`, `ConflictError`) and states retry-safety. State is classified with justification, defaulting to Local/Server Cache rather than a new global store — correct, per the Constitution's State Philosophy. Open Questions is empty. The plan is ready.

**Step 4 — Handoff order**, exactly as the filled plan states:
1. `network-engineer` — `ProductRepository` mock implementation (see `creating-a-repository.md` for the concrete file layout this produces: `src/features/products/repository/ProductRepository.ts`, `.mock.ts`, `.live.ts`, `index.ts`, per `../templates/architecture-proposal.md`'s filled example).
2. `state-engineer` — TanStack Query keys/hooks for list and detail.
3. `ui-engineer` — presentational layers for all three screens.
4. `react-native-engineer` — routes added to `AppStackParamList` in `src/navigation/types.ts`, navigation wired between screens.

**Step 5 — Review.** `reviewer` runs `../commands/review-feature.md` against the Products plan once all four agents report done, checking every acceptance criterion (e.g. "No component directly imports `axios` or `client` — all data access goes through `ProductRepository`") line by line.

---

# 6. Checklist

- [ ] Product requirement exists in writing; nothing was invented to fill a gap.
- [ ] Feature module name doesn't collide with an existing folder in `src/features/`.
- [ ] `../templates/feature-proposal.md` is filled completely — every screen has all six states, every repository method has named errors and retry-safety, every state is classified.
- [ ] Edge Case Catalog is fully marked applies/does not apply with reasons.
- [ ] Open Questions is empty before handoff.
- [ ] Handoff names every downstream agent in the correct order.
- [ ] Parallel agents agreed on hook/component signatures before both sides finished independently.
- [ ] `../commands/review-feature.md` was run before merge, with zero unresolved "blocking" follow-ups.

---

# 7. Common Mistakes

**Skipping straight to code.** The single most common failure mode: an engineer opens `src/features/` and starts a screen file before a plan exists. Every downstream agent then improvises a different interpretation of "done." Write the plan first, every time — even for a feature that feels obvious.

**Writing a happy-path-only plan.** A plan missing Error, Empty, or Offline states is a mockup description, not a feature plan (`../agents/10-feature-planner.md` § 17).

**Perpetuating the direct-axios pattern for a new feature.** `src/api/endpoints/*.ts` calls `client` directly with no repository interface — this is documented, inherited debt (see `../rules/architecture.md` Rule 4), not a template. New features always get a repository contract first.

**Promoting local state to global "just in case."** Rejected per `../agents/10-feature-planner.md` § 18's Bad Example — "in case we need it later" is not a justification.

**Treating all five publishing platforms as Instagram.** Any feature touching Publishing must model Instagram/Telegram/Bale/Rubika/Eita differences explicitly — see `adding-a-social-platform.md`.

**Merging before `reviewer` runs `../commands/review-feature.md`.** Acceptance criteria exist so review doesn't require re-reading the whole implementation from scratch; skipping it defeats the plan's purpose.

---

# 8. References

- `../constitution.md` — Feature Ownership, Mock First Development, Error Philosophy, Definition of Done
- `../context.md` — Primary Features, Development Philosophy (vertical slices)
- `../agents/00-chief-architect.md` — module boundary authority
- `../agents/10-feature-planner.md` — the full planning SOP this playbook operationalizes
- `../agents/20-react-native-engineer.md`, `../agents/22-ui-engineer.md` — downstream implementation agents
- `../rules/folders.md`, `../rules/architecture.md`, `../rules/naming.md` — structural rules every plan must respect
- `../templates/feature-proposal.md` — the document this playbook fills out, including the full Products worked example
- `../commands/review-feature.md` — the review gate
- `../knowledge/roadmap.md` — feature sequencing and readiness
- `./building-a-screen.md`, `./creating-a-repository.md`, `./creating-a-zustand-store.md`, `./adding-navigation.md` — playbooks for the individual implementation steps this one hands off to
