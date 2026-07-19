---
id: knowledge-roadmap
title: Product & Engineering Roadmap
category: knowledge
version: 1.0.0
status: active
owner: Product & Engineering
last_updated: 2026-07-18
---

# Product & Engineering Roadmap

> Phasing the nine Primary Features from `context.md` into a realistic build sequence, given what actually exists in the codebase today.

---

## Table of Contents

1. Purpose
2. Scope
3. Method: How This Roadmap Was Derived
4. Current State Snapshot (Ground Truth)
5. Phase 0 — Current Foundation
6. Phase 1 — Core Commerce
7. Phase 2 — AI Content & Publishing
8. Phase 3 — Customer Management & Chat Center
9. Phase 4 — Analytics & AI Images
10. Phase 5 — Long-Term Vision Modules
11. Ordering Rationale (Why Not a Different Order)
12. Cross-Cutting Work That Spans Every Phase
13. Risks to the Sequence
14. Summary Table
15. Checklist: Is a Feature Ready to Start?
16. References

---

# 1. Purpose

`context.md` lists nine Primary Features for the first production release (Authentication, Dashboard, Products, AI Content, AI Images, Publishing, Customer Management, Chat Center, Analytics) and a further set of Long-Term Vision modules. It does not specify build order. This document proposes a phased sequence, grounded in what is actually implemented in the codebase today (not aspirational), with explicit rationale for why each phase depends on the one before it.

This is a planning document, not an architecture approval. Any phase boundary that implies a new feature module must still go through the Chief Architect per `.claude/agents/00-chief-architect.md`, and any feature within a phase must still go through the Feature Planner per `.claude/agents/10-feature-planner.md` before implementation begins.

---

# 2. Scope

In scope: sequencing of the nine Primary Features and the Long-Term Vision modules into phases, and the reasoning for that sequence.

Out of scope: screen-by-screen specs, repository contracts, and acceptance criteria for any individual feature — those are produced per-feature by the Feature Planner when a phase is actually started. Out of scope: firm dates or sprint estimates — this roadmap is ordered, not scheduled, because Sugar Admin's Core Values (`constitution.md`) explicitly rank Delivery Speed last among engineering priorities.

---

# 3. Method: How This Roadmap Was Derived

Two inputs were combined:

1. **What `context.md` says should exist eventually** — the nine Primary Features and the Long-Term Vision list.
2. **What actually exists in the codebase today** — verified directly, not assumed (see §4).

The sequencing principle is dependency-driven: a feature is scheduled after the features it structurally depends on to be meaningful. For example, Publishing is scheduled after Products and AI Content because there is nothing coherent to publish without a product to describe and content to describe it with. This mirrors the Development Philosophy in `context.md`: "Every feature should be built in vertical slices... Avoid building isolated technical layers that cannot yet deliver user value."

---

# 4. Current State Snapshot (Ground Truth)

As of this writing, the codebase contains:

- `src/features/auth/screens/LoginScreen.tsx` — a Login screen exists; Register does not. `authStore` (`src/store/authStore.ts`) implements `login`, `logout`, `hydrate`, but token storage is in-memory only (`globalThis.__authToken`), not persisted — see `current-limitations.md`.
- `src/features/dashboard/screens/DashboardScreen.tsx` — a Dashboard screen exists as a placeholder; it is not wired to real Quick Actions, Recent Activity, or Statistics data sources.
- `src/features/content/screens/ContentScreen.tsx` — a Content screen exists as a placeholder for AI Content; no AI provider integration exists yet.
- `src/features/reports/screens/ReportsScreen.tsx` — a Reports screen exists as a placeholder for Analytics.
- `src/features/ai-chat/screens/AIChatScreen.tsx` — a placeholder screen with literal "Coming soon..." text; no Chat Center functionality exists.
- **No feature folders exist yet** for Products, AI Images, Publishing, Customer Management, or a full Chat Center — these five of the nine Primary Features have zero code today.
- Every existing feature folder contains only a `screens/` subfolder — none has the full feature-owned structure (components, hooks, repository, services, state, types, constants, tests) the Constitution's Feature Ownership section describes. See `current-limitations.md`.
- `src/api/endpoints/{auth,content,reports}.ts` call `client` (axios) directly — no Repository Pattern, no mock layer, despite `context.md`'s Mock API Strategy stating all development should initially use mock-backed repositories.
- `src/screens/HomeScreen.tsx` exists outside the feature-first structure entirely, as a legacy landing screen.

This snapshot is the honest starting line for the roadmap below. Phase 0 exists precisely because pretending otherwise would make every later phase's estimate wrong.

---

# 5. Phase 0 — Current Foundation

**Goal:** Make the existing skeleton structurally sound before adding the five missing Primary Features on top of it.

**Includes:**
- Establish the Repository Pattern (mock-first) for the three features that already call the API directly (Auth, Content, Reports), per `architecture-decisions.md` §6a (tracked as a not-yet-filed ADR, proposed as `adr-0006-repository-pattern.md`).
- Give `authStore` real persistence (replacing the in-memory `globalThis.__authToken` pattern) so a session survives an app restart — see `current-limitations.md`.
- Resolve the Navigation stack decision: `context.md` names Expo Router as the target, but `@react-navigation/native` + `native-stack` is what is actually installed and in use. This must be resolved as an explicit decision (stay on React Navigation, or migrate) before more screens are built on top of either — see ADR `adr-0005-react-navigation-over-expo-router.md` and `technology-stack.md`.
- Fill out each existing feature folder (`auth`, `content`, `dashboard`, `reports`, `ai-chat`) to the full feature-owned structure the Constitution describes, instead of `screens/`-only.
- Retire or relocate `src/screens/HomeScreen.tsx` into the feature-first structure.
- Introduce a test framework — none exists today (see `current-limitations.md`).

**Why this phase exists:** Building five new Primary Features on top of a foundation that already violates the Constitution's Feature Ownership, Mock First Development, and Backend Independence principles would multiply the debt instead of containing it. Phase 0 is the "pay down what's already owed" phase.

---

# 6. Phase 1 — Core Commerce

**Includes:** Products (full CRUD, categories, inventory, images, search, archive), plus finishing Authentication (Register, real token lifecycle) and wiring Dashboard to real data (via the repositories established in Phase 0).

**Why Products first among the five missing features:** Products is the foundational domain object every other missing feature depends on. AI Content needs something to generate a caption *for*. AI Images needs a product photo to enhance. Publishing needs a product-derived post to publish. Customer Management's purchase history needs products to reference. Building any of those before Products exists would mean building against a hypothetical data shape that Products will later define for real.

**Dashboard** is included here (rather than Phase 0) because a Dashboard showing real Quick Actions and Statistics is only meaningful once there is real product/business data to summarize — a Dashboard wired to empty mocks provides little validation value.

---

# 7. Phase 2 — AI Content & Publishing

**Includes:** AI Content (captions, hashtags, rewrite, titles, translate, stories) and Publishing (immediate, scheduled, drafts, history, retry) across the five current platforms (Instagram, Telegram, Bale, Rubika, Eita).

**Why AI Content before Publishing, and both before Chat/Analytics:** Publishing needs content to publish, and content is most valuably produced with AI assistance from the start (per `product-vision.md` §5, AI Content is meant to be woven into the same flow as creating a post, not bolted on afterward). Building Publishing against manually-typed captions first and retrofitting AI generation later would mean redesigning the compose flow twice. Publishing is scheduled directly after AI Content, in the same phase, because the two are natural halves of one vertical slice: "create content, then get it in front of customers" — consistent with the Development Philosophy's vertical-slice ordering in `context.md` (Authentication → Product Management → AI Caption Generation → Publishing → Analytics).

This phase is also the first to require the AI provider abstraction described in `ai-provider-strategy.md` to actually be implemented, not just designed — Phase 0/1 can proceed without it, Phase 2 cannot.

---

# 8. Phase 3 — Customer Management & Chat Center

**Includes:** Customer Management (profiles, purchase history, notes, tags, search) and a full Chat Center (unified inbox, AI replies, search, labels, attachments) — replacing the current `AIChatScreen.tsx` placeholder entirely.

**Why after Publishing, not before:** Chat Center's value is realized when there are real published posts generating real customer conversations to manage. Building a unified inbox before Publishing exists means testing it against synthetic conversations disconnected from any actual product or post — a weaker foundation for validating the unified-inbox UX described in `product-vision.md` §5. Customer Management's purchase history field also depends on Products (Phase 1) and, ideally, real order/conversation activity from Publishing (Phase 2) to have anything meaningful to show.

**Why Customer Management and Chat Center are grouped together:** both are fundamentally about the ongoing relationship with a customer after a sale is initiated — one is the structured record (Customer Management), the other is the unstructured conversation (Chat Center). They share underlying customer identity data and are natural to design together to avoid divergent customer data models.

---

# 9. Phase 4 — Analytics & AI Images

**Includes:** Analytics (business performance, post performance, customer growth, publishing statistics, engagement) and AI Images (background removal/replacement, lifestyle images, marketing banners, story templates, product enhancement).

**Why Analytics is scheduled last among the original nine:** Analytics is a feedback-loop feature — per `product-vision.md` §5, it "depends on the other features already generating real activity to analyze." Building Analytics before Products, Publishing, and Chat Center produce real data would force it to be built and validated against mock data indefinitely, which risks the metrics and visualizations being wrong for real usage patterns discovered only after Phases 1–3 ship.

**Why AI Images is grouped here rather than with AI Content in Phase 2:** AI Images (image generation/editing) is technically a heavier, higher-latency, higher-cost AI capability than AI Content's text generation (see `ai-provider-strategy.md`'s cost/latency discussion), and it is not on the critical path to a first publishable post — a business owner can publish with a plain product photo before AI Images exists. Deferring it lets Phase 2 ship a usable Publishing flow sooner, with AI Images arriving as an enhancement once the core loop (Product → Content → Publish) is proven.

This grouping is a proposal, not a hard rule — if user feedback after Phase 2 shows AI Images is more urgent than Analytics, the two items within Phase 4 can be reordered without disturbing Phases 0–3.

---

# 10. Phase 5 — Long-Term Vision Modules

**Includes:** CRM, Accounting, Inventory synchronization, Shipping providers, Payment gateways, Loyalty systems, Marketing automation, AI sales assistant — per `context.md`'s Long-Term Vision section, expanded individually in `future-modules.md`.

**Why last:** every one of these modules extends or depends on data structures established in Phases 1–4 (products, customers, orders/conversations, publishing history). None of them can be meaningfully designed, let alone built, before their prerequisite domain data exists. `future-modules.md` details the specific architectural readiness (e.g., a Payments repository abstraction) each module requires — that readiness work can and should begin during Phases 1–4 even though the modules themselves ship in Phase 5.

---

# 11. Ordering Rationale (Why Not a Different Order)

A natural objection: why not build Chat Center early, since "reply to customers" is named first in `context.md`'s Mission examples list? The answer is that Chat Center without Products and Publishing upstream of it has nothing business-specific to be "about" — it would be a generic multi-platform inbox, which is a smaller and less differentiated product than the one described in `business-vision.md`'s wedge. Sequencing Products and Publishing first ensures Chat Center, when built, is a chat experience anchored to real commerce activity (a customer asking about a specific product they saw in a specific post), which is Sugar Admin's actual differentiator versus a generic inbox app.

A second natural objection: why not build Analytics early to "measure everything from day one"? The Constitution's Performance Philosophy principle ("Measure first. Optimize second.") applies to runtime performance, not to product-metrics infrastructure — there is nothing to measure yet in Phase 0/1 that later analytics work can't reconstruct from Phase 1–3 data once it exists.

---

# 12. Cross-Cutting Work That Spans Every Phase

Some work does not belong to a single phase because every phase depends on it:

- **Repository Pattern discipline** (per `architecture-decisions.md`) — every new feature in every phase must define its repository contract mock-first, per the Feature Planner's SOP (`.claude/agents/10-feature-planner.md` §10).
- **Platform abstraction** — any feature touching publishing or content (Phases 2 onward) must model Instagram/Telegram/Bale/Rubika/Eita differences explicitly, never assume Instagram's constraints generalize (Feature Planner §13, Edge Case Catalog).
- **Accessibility and the seven required states** (Loading/Empty/Error/Offline/Unauthorized/Success/Retry) — required for every screen in every phase per the Constitution's Error Philosophy.
- **AI provider abstraction** (`ai-provider-strategy.md`) — needed starting Phase 2, but should be designed early enough that Phase 0/1 code doesn't need to be reworked to accommodate it.

---

# 13. Risks to the Sequence

- **Backend availability:** the current backend strategy is Mock API with no backend selected (`context.md`, Current Development Phase). If a real backend becomes available earlier than expected, phases could reorder around what the backend team ships first, provided the Repository Pattern (Phase 0) is in place to absorb that change (see `future-backend-migration.md`).
- **Platform API changes:** Instagram, Telegram, Bale, Rubika, or Eita could change their publishing APIs or terms of service at any point, which could force Phase 2 (Publishing) work to be reprioritized independent of this sequence.
- **AI provider cost/availability shifts:** a significant price or capability change from AI providers could accelerate or delay Phase 2 (AI Content) or Phase 4 (AI Images) — see `ai-provider-strategy.md`.

---

# 14. Summary Table

| Phase | Features | Depends On | Primary Rationale |
|---|---|---|---|
| 0 | Foundation hardening (repository pattern, persistence, navigation decision, feature structure, tests) | — | Cannot safely build new features on a foundation already violating the Constitution |
| 1 | Products, finish Authentication, real Dashboard | Phase 0 | Every later feature needs a real product/business data model |
| 2 | AI Content, Publishing | Phase 1 | Nothing to publish without products and content; AI Content belongs in the compose flow from the start |
| 3 | Customer Management, Chat Center | Phase 2 | Conversations and customer records are most meaningful once real posts/products exist |
| 4 | Analytics, AI Images | Phase 3 | Analytics needs real activity to analyze; AI Images is an enhancement, not on the critical publishing path |
| 5 | CRM, Accounting, Inventory sync, Shipping, Payments, Loyalty, Marketing automation, AI sales assistant | Phases 1–4 | Every module extends domain data established earlier |

---

# 15. Checklist: Is a Feature Ready to Start?

- [ ] The feature's phase prerequisites (per this document) are actually shipped, not just planned.
- [ ] The Chief Architect has approved the module boundary (`.claude/agents/00-chief-architect.md`).
- [ ] The Feature Planner has produced a full feature plan (`.claude/agents/10-feature-planner.md`) with all screens, states, repository contracts, and edge cases defined.
- [ ] The repository contract is designed mock-first, per `architecture-decisions.md`.
- [ ] Platform differences are addressed if the feature touches publishing or content.

---

# 16. References

- `../context.md` — Primary Features, Long-Term Vision, Development Philosophy (vertical slices)
- `../constitution.md` — Feature Ownership, Mock First Development, Core Values (Delivery Speed last)
- `.claude/agents/00-chief-architect.md`, `.claude/agents/10-feature-planner.md`
- `./current-limitations.md` — the Phase 0 ground truth in full detail
- `./architecture-decisions.md` — the Repository Pattern and other decisions Phase 0 must complete
- `./future-modules.md` — detail behind Phase 5
- `./ai-provider-strategy.md` — the abstraction Phase 2/4 depend on
