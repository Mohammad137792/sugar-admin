---
id: docs-decisions-readme
title: Architecture Decision Records — Index
category: decision
status: Accepted
date: 2026-07-18
deciders: Engineering
---

# Architecture Decision Records (ADRs)

> "Every important engineering decision must be documented. If future developers must guess why something exists, documentation is missing." — `constitution.md`, Documentation

This folder contains Sugar Admin's Architecture Decision Records: permanent, numbered records of individual architectural decisions, each covering context, the decision itself, its consequences (including honest costs), and the alternatives that were rejected.

---

## What Belongs Here

An ADR is warranted when a decision is **expensive to reverse, or reconstructable only by reading a diff and guessing why**. Per the Constitution's Documentation section, silence on a decision like this is itself a defect. Concretely, that includes:

- Choosing one library, pattern, or architectural approach over a viable alternative (e.g. Zustand over Redux, Feature-First over Layer-First).
- A deliberate, load-bearing deviation from what another document (`context.md`, a prior ADR) says should be true.
- A pattern observed repeatedly in the codebase that is *de facto* policy but has never been written down as a decision — documenting it retroactively still counts, and must say so honestly.
- Accepting technical debt — per the Constitution's Technical Debt section, accepted debt requires a documented reason, a follow-up plan, and an understood impact; an ADR is where that documentation lives.

An ADR is **not** warranted for reversible implementation details (variable naming, which component owns a specific `useState` call, a one-off bug fix) — those belong in code comments or PR descriptions, not a permanent record.

---

## The ADR Process

1. A decision is proposed — usually by `00-chief-architect` via `.claude/templates/architecture-proposal.md`, or surfaced by `10-feature-planner` for a feature-scoped decision and escalated to `chief-architect` for sign-off.
2. Once the decision is actually reached (not while still being debated), it is written up using `.claude/templates/adr.md` — the template that defines the exact section structure every file in this folder follows.
3. The ADR is filed here as `adr-NNNN-<slug>.md`, numbered sequentially in the order the decision was recorded (not necessarily the order the underlying pattern first appeared in code — see ADR-0003 and ADR-0004 below, which document patterns that predate this ADR's filing date).
4. The decision is added to `.claude/knowledge/architecture-decisions.md`, the standing index that every agent reads before treating a decision as settled.
5. `60-documentation-engineer` owns keeping this folder and the index in sync with the real codebase over time — an ADR that no longer matches observed code reality is exactly the drift that role exists to catch.

---

## Numbering Convention

Files are named `adr-NNNN-<slug>.md`, where `NNNN` is a zero-padded, sequential, never-reused integer (`0001`, `0002`, ...) and `<slug>` is a short, lowercase, hyphenated summary of the decision. The number in the filename must match the `id` field in the file's frontmatter (`id: adr-NNNN-<slug>`) exactly, so a reference like "see ADR-0003" is unambiguous without opening the file.

If a decision is later reversed, the superseding ADR gets a new, higher number; the old ADR's `status` is updated to `Superseded by ADR-NNNN` rather than deleted — the historical record of "why we used to do it that way" has value even after the decision changes.

---

## Status Values

| Status | Meaning |
|---|---|
| `Proposed` | Under review; not yet binding. |
| `Accepted` | In force. New work should follow it. |
| `Rejected` | Considered and explicitly declined. Recorded so the option isn't re-litigated without new information. |
| `Superseded by ADR-NNNN` | Was `Accepted`, has since been replaced. |
| `Needs Reconciliation` | A real, observed discrepancy exists between what is documented elsewhere (e.g. `context.md`) and what the codebase actually does, and it has **not** been resolved either way — this status exists specifically so a drift is never silently normalized into either direction (silently "correcting" the docs, or silently migrating the code) without an explicit, reviewed decision. See ADR-0005. |

---

## Index

| # | Title | Status | Date | File |
|---|---|---|---|---|
| ADR-0001 | Feature-First Architecture Over Layer-First | Accepted | 2026-07-18 | [adr-0001-feature-first-architecture.md](./adr-0001-feature-first-architecture.md) |
| ADR-0002 | Mock-First Development | Accepted (policy; not yet implemented in code) | 2026-07-18 | [adr-0002-mock-first-development.md](./adr-0002-mock-first-development.md) |
| ADR-0003 | Zustand for Global State | Accepted | 2026-07-18 | [adr-0003-zustand-for-global-state.md](./adr-0003-zustand-for-global-state.md) |
| ADR-0004 | Hybrid Styling — NativeWind and StyleSheet | Accepted (de facto) | 2026-07-18 | [adr-0004-hybrid-styling-nativewind-and-stylesheet.md](./adr-0004-hybrid-styling-nativewind-and-stylesheet.md) |
| ADR-0005 | React Navigation Over Expo Router | Needs Reconciliation | 2026-07-18 | [adr-0005-react-navigation-over-expo-router.md](./adr-0005-react-navigation-over-expo-router.md) |

This table must stay in sync with the files actually present in this folder. `.claude/knowledge/architecture-decisions.md` maintains a longer-form summary of the same decisions plus additional observed patterns that do not yet have a numbered ADR (see that file's § 9) — if this table and that file's Decision Status Summary Table (§ 10) ever disagree on a filename or status, that disagreement is itself a documentation-drift bug and should be flagged to `60-documentation-engineer`.

---

## References

- `.claude/constitution.md` — Documentation, Technical Debt, Reviews
- `.claude/templates/adr.md` — the template every file in this folder follows exactly
- `.claude/templates/architecture-proposal.md` — the pre-decision document an ADR compresses down from
- `.claude/knowledge/architecture-decisions.md` — the standing summary index that references these files
- `.claude/agents/00-chief-architect.md` — § 6 (Communication Protocol), § 8 (Architectural Decision Process)
- `.claude/agents/60-documentation-engineer.md` — owns drift detection between this folder and the real codebase
