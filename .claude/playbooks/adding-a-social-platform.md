---
id: playbook-adding-a-social-platform
title: Adding A Social Platform Playbook
category: playbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# Adding A Social Platform Playbook

> "The architecture must allow adding new providers without modifying unrelated modules." — `../context.md`, Supported Platforms

---

# Table of Contents

1. Purpose
2. When To Use This Playbook
3. Prerequisites
4. Step-by-Step Workflow
5. Worked Example: Adding WhatsApp Business as a Sixth Platform
6. Checklist
7. Common Mistakes
8. References

---

# 1. Purpose

`../context.md` names five current publishing targets — Instagram, Telegram, Bale, Rubika, Eita — and six named future candidates: WhatsApp Business, Facebook, Threads, TikTok, X (Twitter), LinkedIn. It states the requirement plainly: adding a new provider must not require modifying unrelated modules.

**No Publishing feature exists in `src/features/` yet.** There is no `PublishingRepository`, no platform provider abstraction, no `src/features/publishing/` folder at all. This playbook does two things: it defines the target provider-abstraction shape every platform (the first five, and every one added after) must be built against, and it is the concrete procedure for adding platform number six-and-beyond once Publishing exists. If Publishing itself doesn't exist yet, this playbook's target shape is what `building-a-feature.md`'s Publishing plan should design toward from day one — see § 2.

---

# 2. When To Use This Playbook

Use this playbook when:

- Publishing already exists as a feature and a new platform (from `../context.md`'s future-possibilities list, or a genuinely new one) needs to be added to it.
- Publishing is being planned for the first time via `building-a-feature.md`, and you need the target provider shape so the initial five platforms are built as five interchangeable implementations of one contract, not five special cases hand-coded into `PublishingRepository`.

Do not use this playbook to add platform-specific UI copy or icons only — that is a `ui-engineer`/`react-native-engineer` concern once the provider itself is registered. This playbook covers the data/business-logic seam, not visual presentation.

---

# 3. Prerequisites

- `../context.md`'s Publishing section (Primary Features) and Supported Platforms section read in full.
- `../agents/10-feature-planner.md` § 13's Edge Case Catalog, Platform section, read and understood — every plan touching Publishing must model Instagram/Telegram/Bale/Rubika/Eita differences explicitly, not treat all five as Instagram.
- `creating-a-repository.md` read in full — the provider abstraction below is the Repository Pattern applied one level deeper (one interface, many implementations, one factory), not a new pattern invented from scratch.
- If Publishing doesn't exist yet: `../agents/00-chief-architect.md` has approved (or is approving, via `../templates/architecture-proposal.md`) the module boundary for `src/features/publishing/`.
- If Publishing already exists: confirm the current provider registry location and existing platform implementations before adding a sixth.

---

# 4. Step-by-Step Workflow

## Step 1 — Design the shared contract, not per-platform special cases

Every platform implements one interface. Draft it the way `10-feature-planner.md` § 10 requires any repository contract — named inputs, named outputs, named errors:

```ts
// src/features/publishing/providers/PlatformPublisher.ts (target shape)
export interface PlatformPublisher {
  readonly platformId: PlatformId; // "instagram" | "telegram" | "bale" | "rubika" | "eita" | ...
  readonly capabilities: PlatformCapabilities;

  isConnected(accountId: string): Promise<boolean>;
  publish(accountId: string, content: PublishableContent): Promise<PublishResult>;
  schedule(accountId: string, content: PublishableContent, at: Date): Promise<ScheduledPost>;
  getStatus(postId: string): Promise<PublishStatus>;
  disconnect(accountId: string): Promise<void>;
}
```

Method names describe domain actions (`publish`, `schedule`), never platform-specific HTTP verbs or SDK method names — the same discipline `../handbook/repository-pattern.md` § 11's FAQ applies to ordinary repositories applies here too.

## Step 2 — Model platform differences as data, not branching code

Per-platform constraints (character limits, supported media formats, rate limits — `../agents/10-feature-planner.md` § 13's named Platform edge case) live in a `PlatformCapabilities` value, not in `if (platformId === "telegram")` branches scattered through `PublishingRepository`:

```ts
// src/features/publishing/providers/PlatformCapabilities.ts (target shape)
export interface PlatformCapabilities {
  maxCaptionLength: number;
  supportedMediaTypes: ("image" | "video" | "carousel" | "story")[];
  maxMediaPerPost: number;
  supportsScheduling: boolean;
  rateLimitPerHour: number;
}
```

**Why this matters more than it looks:** this is the literal mechanism by which "adding a new provider without modifying unrelated modules" becomes true instead of aspirational. A screen or hook that reads `provider.capabilities.maxCaptionLength` to show a live character counter never needs a code change when platform six is added — it already generalizes.

## Step 3 — One folder per platform, implementing the shared interface

```
src/features/publishing/providers/
  PlatformPublisher.ts          # interface (Step 1)
  PlatformCapabilities.ts       # capabilities shape (Step 2)
  registry.ts                   # the ONE place every platform is listed
  instagram/
    InstagramPublisher.ts       # real implementation (wraps the platform's actual API/SDK)
    mockInstagramPublisher.ts   # mock, first-class, per constitution's Mock First Development
  telegram/
    TelegramPublisher.ts
    mockTelegramPublisher.ts
  bale/ ...
  rubika/ ...
  eita/ ...
```

Each platform folder is self-contained. Nothing outside `providers/<platform>/` and one line in `registry.ts` (Step 4) ever needs to change to add a platform — this is the concrete, file-level test of `../context.md`'s stated requirement.

## Step 4 — Register the platform in one place: the registry

```ts
// src/features/publishing/providers/registry.ts (target shape)
import { mockInstagramPublisher } from "./instagram/mockInstagramPublisher";
import { mockTelegramPublisher } from "./telegram/mockTelegramPublisher";
// ...

export const platformRegistry: Record<PlatformId, PlatformPublisher> = {
  instagram: mockInstagramPublisher,
  telegram:  mockTelegramPublisher,
  bale:      mockBalePublisher,
  rubika:    mockRubikaPublisher,
  eita:      mockEitaPublisher,
};
```

`PublishingRepository` (or a `usePlatforms()` hook) reads from `platformRegistry`, never imports a specific platform's publisher directly. A platform-selection screen renders `Object.values(platformRegistry)` and their `capabilities` — it does not hardcode a list of five names anywhere.

## Step 5 — Mock first, per platform, per the Constitution

Every platform's mock simulates the same eight things every mock must (`../handbook/mock-api.md` § 4): latency, a non-zero failure rate, and — specific to Publishing — a simulated "platform account disconnected or token revoked" state and a simulated per-platform content-limit rejection, since these are named, real edge cases (`../agents/10-feature-planner.md` § 13, Platform section) that differ across Instagram/Telegram/Bale/Rubika/Eita and must be exercised individually, not lumped into one generic failure path.

## Step 6 — Model the multi-platform partial-failure case explicitly

`../agents/10-feature-planner.md` § 13 names it directly: "publishing succeeds on some platforms and fails on others in the same request." A `PublishingRepository.publishToMultiple(accountIds, content)`-style method (if the plan calls for one) returns a per-platform result array, never a single boolean — the UI needs to render "succeeded on Instagram, failed on Telegram: rate limited" as a real, first-class state, not an afterthought.

## Step 7 — Flag security review for every platform's connection flow

Every platform's `isConnected`/token-handling logic touches credential storage — always route this to `security-reviewer` per `../agents/30-reviewer.md` § 9 ("security-reviewer when the diff touches... any token/credential handling").

## Step 8 — Hand off

`network-engineer` (or `ai-engineer` if the platform's publish step involves AI content generation) implements the platform folder; `reviewer` verifies the new platform touched only its own folder plus one line in `registry.ts`, per this playbook's core promise.

---

# 5. Worked Example: Adding WhatsApp Business as a Sixth Platform

Assume Publishing already exists, built against §§ 1–4's target shape for the initial five platforms (Instagram, Telegram, Bale, Rubika, Eita). WhatsApp Business is the first of `../context.md`'s named future candidates to be added.

**Step 1.** No interface change needed — `PlatformPublisher` already generalizes. WhatsApp Business's `platformId` is `"whatsapp-business"`.

**Step 2.** WhatsApp Business Platform's real API differs meaningfully from the initial five: message-template restrictions for business-initiated conversations, stricter opt-in requirements, and a smaller media-type set than Instagram's. All of this is expressed as a `PlatformCapabilities` value — `maxCaptionLength`, `supportedMediaTypes`, `supportsScheduling: false` (if the real API doesn't support native scheduling), `rateLimitPerHour` set to whatever the actual WhatsApp Business API tier allows. No new branching is added to any shared file.

**Step 3.** New folder: `src/features/publishing/providers/whatsapp/WhatsAppPublisher.ts` (real, wraps the WhatsApp Business Cloud API) and `mockWhatsAppPublisher.ts` (mock-first, simulating the Constitution's eight required behaviors plus the platform-specific "message template not pre-approved" rejection, WhatsApp's real-world equivalent of a validation failure).

**Step 4.** `registry.ts` gains exactly one new entry: `"whatsapp-business": mockWhatsAppPublisher`. No other file in `src/features/publishing/` changes.

**Step 5.** `mockWhatsAppPublisher.ts` simulates latency (150–800ms jitter default), a non-zero failure rate, a disconnected-account state, and the template-approval validation failure — following the exact discipline `../handbook/mock-api.md` § 4 requires of every mock, applied to WhatsApp Business's real constraints rather than generic ones.

**Step 6.** If the feature plan includes multi-platform publish, WhatsApp Business's result slots into the existing per-platform result array with no shape change.

**Step 7.** `security-reviewer` is flagged for `WhatsAppPublisher.ts`'s token/credential handling, per Step 7 above.

**Step 8.** `network-engineer` builds the folder; `reviewer` confirms the diff touches only `providers/whatsapp/` plus one `registry.ts` line — the concrete proof that `../context.md`'s "without modifying unrelated modules" requirement held.

---

# 6. Checklist

- [ ] The platform implements the shared `PlatformPublisher` interface — no platform-specific method names leaked into the shared contract.
- [ ] Platform-specific constraints are expressed as `PlatformCapabilities` data, not `if (platformId === ...)` branches in shared code.
- [ ] The platform's files live entirely inside its own `providers/<platform>/` folder.
- [ ] Exactly one line was added to `registry.ts`; no other shared file changed.
- [ ] A mock implementation exists and simulates all eight Constitution-required behaviors, plus this platform's real-world equivalent of a validation/authorization failure.
- [ ] The multi-platform partial-failure case still works with the new platform included, if the feature supports publishing to multiple platforms in one action.
- [ ] `security-reviewer` was flagged for the platform's credential/connection handling.
- [ ] The Edge Case Catalog's Platform section (`../agents/10-feature-planner.md` § 13) was re-checked against this specific platform's real constraints, not copied from another platform's answers.

---

# 7. Common Mistakes

**Adding a new platform by editing `PublishingRepository`'s core publish logic.** If adding platform six requires touching the same `publish()` method that platforms one through five share, the abstraction has already failed — the fix belongs in the interface or capabilities shape, not another `if` branch.

**Treating platform differences as edge cases to handle "later."** `../agents/10-feature-planner.md`'s Anti Patterns name this directly: "treating all five platforms as Instagram." A plan or implementation that only really works for Instagram is incomplete for any publishing-adjacent feature, worked example or not.

**Skipping the mock for a new platform "since the pattern is already proven."** Each platform's mock is still first-class and still required to simulate real failure — a platform's actual API often has different rate limits, media constraints, and auth flows than the platforms already mocked; a generic reused mock hides that.

**Hardcoding a platform list in a UI component instead of reading `registry.ts`.** A `["instagram", "telegram", "bale", "rubika", "eita"]` array typed directly into a screen means every new platform requires a UI change too — defeating the entire point of the registry.

**Skipping `security-reviewer` because "it's just adding a platform."** Every platform's connection/token flow is exactly the kind of change `../agents/30-reviewer.md` § 9 requires routing to a specialist for, regardless of how mechanical the rest of the change feels.

---

# 8. References

- `../context.md` — Supported Platforms, Publishing (Primary Features)
- `../agents/10-feature-planner.md` § 13 — Edge Case Catalog, Platform section
- `../agents/00-chief-architect.md` § 7, Principle 7 — Replaceability, applied to providers
- `../agents/30-reviewer.md` § 9 — specialist routing triggers
- `./creating-a-repository.md` — the Repository Pattern this playbook applies one level deeper
- `./building-a-feature.md` — where Publishing itself, as a whole feature, gets planned
- `../handbook/mock-api.md` — mock simulation requirements every platform's mock must meet
- `../handbook/repository-pattern.md` — naming and factory-pattern conventions this playbook mirrors
