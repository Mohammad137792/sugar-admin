---
id: project-context
title: Sugar Admin Project Context
version: 1.0.0
status: active
owner: Engineering

description: >
  This document is the single source of truth for understanding the Sugar Admin
  project. Every AI agent must read this file before performing any task.

priority: highest

depends_on:
  - constitution.md

last_updated: 2026-07-18
---

# Sugar Admin

## Executive Summary

Sugar Admin is an AI-powered mobile application that helps online businesses manage their products, content, customers, and communication across multiple social media platforms.

The application combines artificial intelligence, automation, publishing tools, customer management, and analytics into a single mobile experience.

Sugar Admin is designed to become the primary operating platform for businesses that sell through social media rather than traditional e-commerce websites.

---

# Vision

Create the best AI-powered social commerce management platform for mobile devices.

The application should allow one person to manage an entire online business from a phone.

Everything should be optimized for speed, simplicity, and automation.

---

# Mission

Reduce the amount of repetitive work required to operate a social media business.

Instead of switching between multiple applications, users should perform everything from one place.

Examples:

• Create products

• Generate captions

• Generate images

• Publish content

• Schedule posts

• Reply to customers

• Track orders

• Analyze performance

---

# Current Development Phase

Current phase:

Foundation

Status:

Early Development

Backend:

Not implemented

Current backend strategy:

Mock API

Development strategy:

Backend Agnostic

---

# Target Users

Primary users:

- Instagram shops
- Telegram businesses
- Home businesses
- Clothing stores
- Cosmetic stores
- Handmade product sellers
- Food businesses
- Tourism agencies
- Digital product sellers
- Content creators
- Influencers

---

# Supported Platforms

Current targets:

- Instagram
- Telegram
- Bale
- Rubika
- Eita

Future possibilities:

- WhatsApp Business
- Facebook
- Threads
- TikTok
- X (Twitter)
- LinkedIn

The architecture must allow adding new providers without modifying unrelated modules.

---

# Primary Features

The first production release should include:

## Authentication

- Login
- Register
- Logout
- Token management

---

## Dashboard

Business overview

Quick actions

Recent activity

Statistics

---

## Products

Create

Update

Delete

Archive

Search

Categories

Inventory

Images

---

## AI Content

Generate captions

Generate hashtags

Rewrite text

Generate titles

Translate content

Generate stories

---

## AI Images

Background removal

Background replacement

Lifestyle images

Marketing banners

Story templates

Product enhancement

---

## Publishing

Publish immediately

Schedule publishing

Drafts

Publishing history

Retry failed publishing

---

## Customer Management

Customer profiles

Purchase history

Notes

Tags

Search

---

## Chat Center

Unified inbox

AI replies

Search

Labels

Attachments

---

## Analytics

Business performance

Post performance

Customer growth

Publishing statistics

Engagement

---

# Long-Term Vision

Future versions may include:

- CRM
- Accounting
- Inventory synchronization
- Shipping providers
- Payment gateways
- Loyalty systems
- Marketing automation
- AI sales assistant

The architecture should support these modules without major restructuring.

---

# Technology Stack

## Mobile

React Native

Expo

TypeScript

---

## State

Zustand

---

## Data Fetching

TanStack Query

---

## Forms

React Hook Form

Zod

---

## Styling

NativeWind

---

## Navigation

Expo Router

---

## Storage

MMKV

---

## Notifications

Expo Notifications

---

## Images

Expo Image

---

## Lists

FlashList

---

# Backend Strategy

No backend has been selected.

The application must assume that backend technology may change.

Possible future options:

- Express
- NestJS
- Supabase
- Firebase
- Custom REST API
- GraphQL

No frontend implementation may depend on one backend framework.

---

# Architecture Principles

The project follows:

Feature First Architecture

Repository Pattern

Dependency Isolation

Composition over inheritance

Backend independence

Mock-first development

Strong typing

Offline-aware design

---

# Mock API Strategy

All development initially uses repositories backed by mock data.

Repositories must simulate:

- delays
- failures
- authorization
- validation
- pagination
- server errors
- empty states

The UI must never know whether the repository is using mock data or a real backend.

---

# State Management Rules

Global state should be minimal.

Global state examples:

Authentication

Theme

Language

Session

Feature-specific state belongs inside each feature.

Never create global state for convenience.

---

# Design Goals

The application should feel:

Professional

Minimal

Fast

Reliable

Accessible

Modern

Animations should communicate state rather than decorate the interface.

---

# Development Philosophy

Every feature should be built in vertical slices.

Example:

Authentication

↓

Product Management

↓

AI Caption Generation

↓

Publishing

↓

Analytics

Avoid building isolated technical layers that cannot yet deliver user value.

---

# AI Philosophy

Artificial intelligence is an assistant.

Not a replacement for engineering.

AI should:

Generate

Review

Refactor

Document

Never bypass architecture.

Never introduce hidden complexity.

Never invent APIs.

Never ignore project standards.

---

# Quality Standards

Every feature must include:

Loading state

Empty state

Error state

Offline state

Accessibility considerations

Documentation updates

Strong typing

Review checklist

Future backend compatibility

---

# Performance Goals

Fast startup

Minimal rerenders

Efficient lists

Optimized images

Lazy loading

Reasonable memory usage

Smooth animations

Performance should be measured before optimization.

---

# Security Goals

Sensitive information should never be stored insecurely.

Authentication logic must remain isolated.

Networking should assume every response may fail.

Input validation should never rely solely on UI.

---

# Accessibility Goals

Support:

Dynamic text sizes

Screen readers

Reduced motion

Accessible color contrast

Large touch targets

Clear navigation

Accessibility is a core requirement.

---

# Folder Philosophy

The project uses Feature First organization.

Each feature owns:

- components
- hooks
- repositories
- services
- state
- types
- constants
- tests

Shared code exists only when it is genuinely reusable.

---

# Naming Philosophy

Names should communicate intent.

Avoid abbreviations.

Avoid generic names such as:

utils

helpers

manager

service1

component2

Every file should clearly describe its responsibility.

---

# Success Criteria

Sugar Admin succeeds when:

A new engineer can understand the project within one day.

A backend can be replaced without changing UI code.

A feature can be developed independently.

Business logic remains isolated.

The codebase stays maintainable as the application grows.

Every architectural decision should move the project closer to these goals.