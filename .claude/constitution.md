---
id: constitution
title: Sugar Admin Engineering Constitution
version: 1.0.0
status: active
owner: Engineering

description: >
  The Constitution defines the permanent engineering philosophy of Sugar Admin.
  Every AI agent, engineer, reviewer, and contributor must follow these principles.
  This document takes precedence over all other project documentation.

priority: highest

applies_to:
  - all_agents
  - all_features
  - all_services
  - all_documentation
  - all_reviews

last_updated: 2026-07-18
---

# Sugar Admin Engineering Constitution

> This document is the highest engineering authority in the project.

Whenever another document conflicts with this constitution,
the constitution wins.

---

# Mission

Sugar Admin is not simply another mobile application.

Sugar Admin is an AI-powered business operating system that enables online businesses to manage products, customers, content, conversations, and publishing from a single mobile application.

The objective is not to ship features quickly.

The objective is to build software that remains understandable, maintainable, and scalable for years.

Every engineering decision should increase the long-term quality of the project.

---

# Core Values

Engineering decisions must follow this order.

1. Correctness
2. Simplicity
3. Maintainability
4. Readability
5. Testability
6. Scalability
7. Performance
8. Developer Experience
9. Delivery Speed

Never sacrifice a higher priority for a lower one without documenting the reason.

---

# Engineering Philosophy

## Software is Read More Than It Is Written

Every line of code should optimize for future readers.

Future developers should understand code without needing historical context.

If code requires explanation,
improve the code before improving the comments.

---

## Simplicity Wins

Always choose the simplest solution that satisfies the requirements.

Avoid unnecessary abstraction.

Avoid unnecessary patterns.

Avoid unnecessary configuration.

Avoid unnecessary dependencies.

---

## Explicit Beats Implicit

Prefer explicit behavior.

Avoid hidden side effects.

Avoid magical utilities.

Avoid surprising APIs.

Every function should clearly communicate its intent.

---

## Small Units

Large modules become difficult to maintain.

Prefer many focused modules over one large module.

---

## Single Responsibility

Every file should have one reason to change.

Every component should have one responsibility.

Every hook should solve one problem.

Every repository should represent one domain.

---

## Predictability

Developers should be able to predict where new code belongs.

Folder organization should never surprise contributors.

Naming should be consistent.

Architecture should remain stable.

---

# Mobile First

Sugar Admin is a mobile application.

Desktop concepts should not drive architecture.

Every feature must consider:

- touch interactions
- small screens
- network interruptions
- device performance
- battery usage
- accessibility
- offline scenarios

before implementation.

---

# AI First Development

Artificial Intelligence is an engineering assistant.

It is never the architect.

AI generates proposals.

Engineers approve architecture.

AI writes code.

Engineers review code.

AI accelerates development.

AI never replaces engineering judgment.

---

# Backend Independence

The frontend must never depend on a specific backend implementation.

Every backend should be replaceable.

Current development uses Mock APIs.

Future implementations may use:

- REST
- GraphQL
- gRPC
- Serverless Functions

Migration should require changing repositories, not UI.

---

# Mock First Development

Every feature must be fully functional using mock repositories.

Mock implementations are not temporary hacks.

Mocks are first-class citizens.

Mocks should simulate:

- loading
- pagination
- latency
- authorization
- validation
- failures
- empty states
- server errors

A mock that always succeeds is not realistic.

---

# Separation of Concerns

Every layer owns one responsibility.

Presentation Layer

Responsible for:

- rendering
- interactions
- animations

Must not contain business logic.

Business Layer

Responsible for:

- decisions
- rules
- workflows

Must not know about UI.

Data Layer

Responsible for:

- persistence
- networking
- serialization

Must not know about screens.

---

# Replaceability

Every dependency should be replaceable.

Examples

AI Provider

OpenAI

↓

Claude

↓

Gemini

should require minimal changes.

Storage

MMKV

↓

SecureStore

↓

SQLite

should be isolated.

Authentication

JWT

↓

Firebase

↓

Supabase

should not affect UI.

---

# State Philosophy

State is expensive.

Only store information that must survive.

Derived values should be computed.

Avoid duplicated state.

Avoid synchronization problems.

Avoid global state when local state is sufficient.

---

# Feature Ownership

Each feature owns:

- components
- hooks
- repository
- services
- state
- types
- constants
- tests

Cross-feature imports should happen through public APIs only.

---

# Design Principles

The interface should feel:

Fast.

Predictable.

Consistent.

Minimal.

Accessible.

Animations should communicate state.

Never decorate for decoration's sake.

---

# Error Philosophy

Errors are expected.

Every feature must define:

Loading

Empty

Error

Success

Retry

Offline

Timeout

Unauthorized

States before implementation begins.

---

# Performance Philosophy

Performance is designed.

Not optimized afterward.

Avoid:

Premature memoization.

Unnecessary rerenders.

Large component trees.

Expensive effects.

Blocking rendering.

Measure first.

Optimize second.

---

# Security Philosophy

Never trust:

Client input.

Local storage.

Route parameters.

Mock validation.

All validation rules should exist independently from presentation.

---

# Accessibility

Accessibility is mandatory.

Support:

Dynamic font scaling.

Screen readers.

Keyboard navigation where applicable.

High contrast.

Reduced motion.

Touch target guidelines.

Accessibility bugs are functional bugs.

---

# Documentation

Every important engineering decision must be documented.

If future developers must guess why something exists,

documentation is missing.

---

# Reviews

Every pull request should answer:

What changed?

Why?

Alternatives considered?

Risks?

Future impact?

Reviewers should challenge architecture,

not coding style alone.

---

# Technical Debt

Technical debt may be accepted only if:

The reason is documented.

A follow-up plan exists.

The impact is understood.

Undocumented technical debt is prohibited.

---

# Definition of Done

A feature is complete only when:

- Requirements are satisfied.
- Architecture is respected.
- Code is reviewed.
- Documentation is updated.
- Tests are written where appropriate.
- Accessibility is verified.
- Performance impact is acceptable.
- Mock implementation exists.
- Future backend integration is possible.

Anything less is incomplete.

---

# Final Principle

The goal is not to build the fastest application.

The goal is to build the application that is easiest to improve five years from now.

Every engineering decision should make future work easier, not harder.