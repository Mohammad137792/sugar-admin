---
id: knowledge-glossary
title: Glossary
category: knowledge
version: 1.0.0
status: active
owner: Product & Engineering
last_updated: 2026-07-18
---

# Glossary

> A real glossary of terms used across `constitution.md`, `context.md`, the agent files, and the wider `.claude/knowledge/` workspace. Alphabetized. One paragraph per term.

---

## Table of Contents

1. Purpose
2. Scope
3. Glossary A–Z
4. Summary Table (Term → Primary Source Document)
5. References

---

# 1. Purpose

Sugar Admin's `.claude/` workspace uses a specific, consistent vocabulary — "Feature-First," "Repository Pattern," "Mock-First," "Vertical Slice," "ADR," and more — across the Constitution, the Context document, the agent definitions, and this knowledge folder. This glossary defines each term once, precisely, so that no AI agent or engineer has to infer meaning from context or, worse, use a term inconsistently with how the rest of the workspace uses it.

---

# 2. Scope

In scope: terms that are either defined implicitly by `constitution.md` / `context.md` / the agent files, or that this knowledge workspace introduces and uses repeatedly (e.g., in `architecture-decisions.md`, `current-limitations.md`). Out of scope: generic React Native / JavaScript terminology that is not specific to Sugar Admin's usage (e.g., "component," "hook" in the general React sense are used conventionally and are not redefined here except where Sugar Admin gives them a specific meaning, as with "Global State").

---

# 3. Glossary A–Z

**ADR (Architecture Decision Record)**
A short document that records one architectural decision, the alternatives considered, and the reasoning — per `constitution.md`'s Documentation and Reviews sections ("Every important engineering decision must be documented" / "Alternatives considered?"). Sugar Admin's ADRs live in `docs/decisions/`, filed as `adr-NNNN-<slug>.md` (e.g., `adr-0001-feature-first-architecture.md`). `architecture-decisions.md` in this knowledge folder is the index that points to individual ADRs; it is not itself an ADR.

**AI Provider**
A third-party or first-party service that performs an AI capability (text generation, image generation, chat) on Sugar Admin's behalf — e.g., an LLM API for captions/hashtags/chat replies, or an image-generation API for AI Images. Per `constitution.md`'s Replaceability principle, the specific AI Provider behind a capability (OpenAI, Claude, Gemini, or others) must be swappable without UI changes. See `ai-provider-strategy.md` for the concrete abstraction.

**Backend Agnostic / Backend Independence**
The principle, stated in `constitution.md`, that "the frontend must never depend on a specific backend implementation" and that migrating backends "should require changing repositories, not UI." `context.md` names this as the current Development Strategy ("Backend Agnostic") during the Foundation phase, where no backend has yet been selected. See `future-backend-migration.md`.

**Chat Center**
One of the nine Primary Features (`context.md`): a unified inbox that aggregates customer conversations across Sugar Admin's Supported Platforms (Instagram, Telegram, Bale, Rubika, Eita) into one screen, with AI-assisted replies, search, labels, and attachments. Distinct from `AIChatScreen.tsx`'s current placeholder, which is a stand-in for this eventual feature — see `current-limitations.md` and `roadmap.md` Phase 3.

**Constitution**
Refers to `.claude/constitution.md`, "the highest engineering authority in the project" — it takes precedence over every other document, including `context.md` and every file in `.claude/knowledge/`, when they conflict.

**Context Document**
Refers to `.claude/context.md`, the "single source of truth for understanding the Sugar Admin project" that every AI agent must read before performing any task. It depends on (but does not override) the Constitution.

**Feature-First Architecture**
The organizing principle (`context.md`'s Architecture Principles and Folder Philosophy) whereby code is grouped by product feature (e.g., `src/features/products/`) rather than by technical layer (e.g., a top-level `components/`, `hooks/`, `services/` split across the whole app). Each feature folder owns its own components, hooks, repository, services, state, types, constants, and tests. See ADR `adr-0001-feature-first-architecture.md` and `architecture-decisions.md`.

**Global State**
State managed in a Zustand store that must survive navigation and be readable from more than one screen or feature — per `context.md`'s State Management Rules, limited to genuine cross-cutting concerns like Authentication, Theme, Language, and Session. Contrasted with Local State and Server Cache below. "Never create global state for convenience" (`constitution.md`).

**Local State**
Component-scoped state (`useState`, `useReducer`) that does not need to survive navigation and is not read by any other screen. The Feature Planner's default assumption (`10-feature-planner.md` §11) is that new state is Local or Server Cache unless a specific, non-speculative justification promotes it to Global.

**Mock API Strategy / Mock-First Development**
The practice, mandated by `constitution.md`'s "Mock First Development" section and `context.md`'s "Mock API Strategy," that every feature must be fully functional against a mock repository before (or independent of) any real backend existing. Mocks must simulate loading, pagination, latency, authorization, validation, failures, empty states, and server errors — "a mock that always succeeds is not realistic." See ADR `adr-0002-mock-first-development.md`.

**Platform**
In Sugar Admin's vocabulary, a specific social or messaging network Sugar Admin publishes to or receives messages from — currently Instagram, Telegram, Bale, Rubika, Eita, with WhatsApp Business, Facebook, Threads, TikTok, X, and LinkedIn as future targets (`context.md`, Supported Platforms). Not to be confused with "platform" in the general software-engineering sense (e.g., "mobile platform"). Every feature touching publishing or content must model per-Platform differences explicitly rather than assuming Instagram's constraints generalize (Feature Planner §13).

**Repository (Repository Pattern)**
An interface that abstracts data access for one domain (e.g., `ProductRepository`), exposing methods like `list`, `getById`, `create`, `update`, `archive` with explicit input/output/error shapes — independent of whether the implementation behind it is a mock or a real network call. `context.md` names Repository Pattern as an Architecture Principle; as of this writing it is a target pattern, not yet implemented anywhere in the codebase (`src/api/endpoints/*.ts` call axios directly instead — see `current-limitations.md` and `architecture-decisions.md` §6a, which tracks this as a not-yet-filed ADR, proposed as `adr-0006-repository-pattern.md`).

**Replaceability**
The Constitution's principle that every dependency — AI Provider, Storage, Authentication, backend, analytics — should be swappable with minimal change elsewhere in the codebase (`constitution.md`, "Replaceability" section, with the worked example "OpenAI → Claude → Gemini should require minimal changes"). This is the design principle behind the Repository Pattern, the AI Provider abstraction, and the Long-Term Vision modules' provider abstractions (see `future-modules.md` §12).

**Server Cache**
Data owned by a server and fetched over the network, held in TanStack Query's cache rather than in Zustand — per the Feature Planner's decision tree (§16): "Is the data owned by a server and fetched over the network? → Yes, regardless of the above: it belongs in TanStack Query cache, not in Zustand."

**State Philosophy**
The Constitution's section establishing that "state is expensive" — only store what must survive, compute derived values, avoid duplicated state and global state used for convenience. Underlies the Global State / Local State / Server Cache distinction above.

**Vertical Slice**
A unit of feature development that touches every layer of the app end-to-end (UI, state, network, and where relevant, AI) and delivers real user value on its own, as opposed to building isolated technical layers first. `context.md`'s Development Philosophy names an example sequence: Authentication → Product Management → AI Caption Generation → Publishing → Analytics. `10-feature-planner.md` exists specifically to plan features as complete vertical slices.

---

# 4. Summary Table (Term → Primary Source Document)

| Term | Primary Source |
|---|---|
| ADR | `constitution.md` (Documentation/Reviews), `architecture-decisions.md` |
| AI Provider | `constitution.md` (Replaceability), `ai-provider-strategy.md` |
| Backend Independence | `constitution.md`, `context.md`, `future-backend-migration.md` |
| Chat Center | `context.md` (Primary Features), `roadmap.md` |
| Constitution | `constitution.md` |
| Context Document | `context.md` |
| Feature-First Architecture | `context.md` (Architecture Principles), `architecture-decisions.md` |
| Global State | `context.md` (State Management Rules), `10-feature-planner.md` §11 |
| Local State | `10-feature-planner.md` §11 |
| Mock API Strategy | `constitution.md`, `context.md`, `architecture-decisions.md` |
| Platform | `context.md` (Supported Platforms), `10-feature-planner.md` §13 |
| Repository (Repository Pattern) | `context.md` (Architecture Principles), `current-limitations.md` |
| Replaceability | `constitution.md` |
| Server Cache | `10-feature-planner.md` §16 |
| State Philosophy | `constitution.md` |
| Vertical Slice | `context.md` (Development Philosophy), `10-feature-planner.md` |

---

# 5. References

- `../constitution.md`
- `../context.md`
- `.claude/agents/00-chief-architect.md`, `.claude/agents/10-feature-planner.md`
- `./architecture-decisions.md`
- `./ai-provider-strategy.md`
- `./future-backend-migration.md`
