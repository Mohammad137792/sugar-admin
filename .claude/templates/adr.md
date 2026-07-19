---
id: template-adr
title: Architecture Decision Record Template
category: template
version: 1.0.0
status: active
last_updated: 2026-07-18
---

# Architecture Decision Record (ADR) Template

## Purpose

Use this template to permanently record a single architectural decision after it
has been made — the Constitution's Documentation section requires that "every
important engineering decision must be documented," and its Technical Debt section
requires that any accepted debt name "the reason," "a follow-up plan," and "the
impact." An ADR is how both requirements get satisfied in one durable artifact.

Filled out by `00-chief-architect` (or by `10-feature-planner` for a feature-scoped
decision, escalated to `chief-architect` for sign-off before the ADR is marked
`Accepted`). Use `.claude/templates/architecture-proposal.md` first if the decision
is still being debated — an ADR records a decision that has already been reached,
using that proposal's Recommendation section as its source. `architecture-proposal.md`
maps onto `.claude/agents/00-chief-architect.md` § 6's Communication Protocol
(Requirements/Goals/Constraints/Assumptions/Proposed Architecture/Alternatives/
Trade-offs/Risks/Recommendation/Handoff) — an ADR is that protocol's Context,
Decision, and Recommendation compressed into a permanent record.

Store completed ADRs at `.claude/docs/adr/<NNNN>-<slug>.md`, numbered sequentially
(e.g. `0001-repository-pattern-for-products.md`), so the ordering shows the history
of decisions over time.

## Instructions

1. **Title** — a short, decision-shaped sentence ("Choose X over Y"), not a topic
   name ("Navigation").
2. **Status** — one of `Proposed`, `Accepted`, `Rejected`, `Superseded by ADR-NNNN`.
   An ADR describing a decision that was made *without* going through review (e.g.
   documenting an existing discrepancy after the fact) should say so honestly in
   Status — do not backdate false process.
3. **Context** — the situation that forced a decision. Reference real files,
   real constraints, and (if relevant) the Constitution/context.md sections that
   apply. No hypotheticals.
4. **Decision** — the one sentence stating what was actually decided or done.
5. **Consequences** — both the benefits and the costs. An ADR that lists only
   upside is not honest — see the Constitution's Technical Debt rules.
6. **Alternatives Considered** — what else was on the table, and why it lost.
7. **Sign-off** — who approved this (name or role). A `Proposed` ADR has no
   sign-off yet; an `Accepted` one must.

An ADR documents a decision. It does not, by itself, resolve unrelated problems the
decision surfaces — if writing the ADR reveals that the decision should be changed,
stop and go back to `architecture-proposal.md`, then return to write the ADR once a
new decision is actually reached.

---

## The Template

```markdown
---
id: adr-<NNNN>
title: "<Decision-shaped title>"
status: Proposed | Accepted | Rejected | Superseded by ADR-<NNNN>
date: <YYYY-MM-DD>
deciders: <name(s) or role(s)>
---

# ADR-<NNNN>: <Decision-shaped title>

## Status
<Proposed | Accepted | Rejected | Superseded by ADR-NNNN>

## Context
<What situation forced this decision? Reference real files, constraints, and
relevant Constitution/context.md sections. No hypotheticals.>

## Decision
<One or two sentences: what was decided or what was actually done.>

## Consequences

**Positive:**
- <benefit>

**Negative / accepted debt:**
- <cost> — <is there a follow-up plan? per Constitution's Technical Debt rules,
  undocumented debt is prohibited, so this line is required if any cost exists>

## Alternatives Considered
- <alternative> — <why it lost>

## Sign-off
<Who approved this, and when. "Not yet reviewed" if Status is Proposed.>
```

---

## Filled Example: React Navigation vs. Expo Router

```markdown
---
id: adr-0001
title: "Document: React Navigation Is Used Instead of Expo Router"
status: Accepted
date: 2026-07-18
deciders: chief-architect (retroactive documentation — see Context)
---

# ADR-0001: Document: React Navigation Is Used Instead of Expo Router

## Status
Accepted — but see Context: this ADR documents an existing discrepancy after the
fact. It did not go through the normal `architecture-proposal.md` review cycle
before implementation. This ADR is written as a worked example for the template
system and would need real chief-architect and engineering sign-off in an actual
project before being treated as binding.

## Context
`context.md`'s Technology Stack section names **Expo Router** as the project's
navigation library. The actual codebase does not use Expo Router: there is no
`app/` directory, and `package.json` lists `@react-navigation/native` (7.3.1) and
`@react-navigation/native-stack` (7.17.3) instead. Navigation is implemented
imperatively in `src/navigation/AuthNavigator.tsx` and `src/navigation/
AppNavigator.tsx` using `createNativeStackNavigator`, with route names and param
lists hand-maintained in `src/navigation/types.ts` (`AuthStackParamList`,
`AppStackParamList`, `RootStackParamList`). This is a real, current discrepancy
between the stated target stack and the implemented stack, not a hypothetical one.

## Decision
The project continues with React Navigation (`@react-navigation/native` +
`native-stack`) as its actual navigation library. `context.md`'s Technology Stack
section is documented as inaccurate on this point rather than the code being
migrated, because a migration to Expo Router is a non-trivial architectural change
(file-based routing would restructure `src/navigation/` and `src/screens/` /
`src/features/*/screens/` entirely) that has not been proposed, reviewed, or
approved through `architecture-proposal.md`.

## Consequences

**Positive:**
- No migration risk or cost right now — the existing, working navigation setup
  (`AuthNavigator.tsx`, `AppNavigator.tsx`, `types.ts`) is left untouched.
- Route/param typing stays fully explicit and centralized in `src/navigation/
  types.ts`, which the Constitution's Explicit Beats Implicit principle favors —
  file-based routing trades some of that explicitness for convention.

**Negative / accepted debt:**
- Routing is imperative, not file-based — new screens require manually adding a
  `<Stack.Screen>` entry in the relevant `*Navigator.tsx` and a param list entry in
  `types.ts`, rather than being auto-registered by file location. This is more
  manual work per screen and is a real, ongoing cost.
- `context.md` is misleading to a new engineer until corrected — a new contributor
  reading the Technology Stack section will expect Expo Router and be confused by
  `src/navigation/`. Follow-up: `context.md`'s Technology Stack section should be
  updated to say "React Navigation" instead of "Expo Router" the next time
  `context.md` is revised, so the documentation matches reality (Constitution:
  "if code requires explanation, improve the code before improving the comments" —
  here the inverse applies: the doc needs correcting to match the code, since
  re-migrating working navigation code is the higher-cost option).
- No decision has yet been made about whether to actually migrate to Expo Router
  in the future. This ADR does not resolve that question — it only documents the
  current state honestly, per this template's Instructions ("document honestly,
  don't resolve it").

## Alternatives Considered
- **Migrate to Expo Router now to match `context.md`** — rejected for this ADR's
  purposes because it would require restructuring `src/navigation/` and every
  feature's `screens/` folder with no product requirement driving the change today;
  Simplicity Wins and avoiding unnecessary churn (constitution.md) argue against a
  migration with no immediate benefit to users.
- **Leave `context.md` unchanged and the code unchanged** — rejected because it
  leaves a known documentation/reality mismatch unrecorded, which the Constitution's
  Documentation section prohibits ("if future developers must guess why something
  exists, documentation is missing").

## Sign-off
Not yet reviewed — this ADR is a template-system worked example, not a binding
project decision. A real ADR on this topic requires `chief-architect` review and,
given the scope (navigation library choice), likely a full `architecture-proposal.md`
cycle before being marked genuinely `Accepted`.
```

---

## Checklist

- [ ] Title is decision-shaped, not a topic name
- [ ] Status is one of the four allowed values
- [ ] Context references real files/constraints, not hypotheticals
- [ ] Decision is stated in one or two sentences, unambiguous
- [ ] Consequences lists both Positive and Negative — an ADR with no negative consequence is incomplete
- [ ] Any accepted cost in Negative has a follow-up plan (Constitution's Technical Debt rule)
- [ ] At least one real Alternative Considered
- [ ] Sign-off states who approved it, or explicitly says it has not been reviewed yet

## References

- `.claude/constitution.md` — Documentation, Technical Debt
- `.claude/agents/00-chief-architect.md` — § 6 (Communication Protocol)
- `.claude/templates/architecture-proposal.md` — source of the decision an ADR records
- `.claude/context.md` — Technology Stack (see the discrepancy documented in the filled example above)
