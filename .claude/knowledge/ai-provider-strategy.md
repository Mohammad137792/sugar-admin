---
id: knowledge-ai-provider-strategy
title: AI Provider Strategy
category: knowledge
version: 1.0.0
status: active
owner: Product & Engineering
last_updated: 2026-07-18
---

# AI Provider Strategy

> Deepening the Constitution's AI Philosophy and Replaceability principle into a concrete strategy for how Sugar Admin integrates AI capabilities.

---

## Table of Contents

1. Purpose
2. Scope
3. The Constitutional Basis
4. Capability-Oriented Abstraction, Not "Call OpenAI"
5. Provider Interface Sketch
6. Which Sugar Admin Features Depend on This
7. Fallback Behavior
8. Cost and Latency Tradeoffs Between Capabilities
9. Human-in-the-Loop by Default
10. Mock-First for AI, Too
11. Connecting to the Existing `AIChatScreen.tsx` Placeholder
12. Edge Cases (Per the Feature Planner's AI Catalog)
13. What This Document Does Not Decide
14. Summary Table
15. Checklist: Before Wiring a Feature to an AI Provider
16. References

---

# 1. Purpose

`constitution.md`'s Replaceability section gives AI Provider as its lead example: "OpenAI → Claude → Gemini should require minimal changes." Its AI First Development section states AI is "an engineering assistant... never the architect," and `context.md`'s AI Philosophy repeats this framing for product-level AI ("Never bypass architecture. Never introduce hidden complexity. Never invent APIs."). Neither document specifies *how* to build an interface that achieves this. This document does — a concrete provider abstraction sketch, fallback strategy, and cost/latency reasoning that AI Content, AI Images, and Chat Center's AI replies (per `context.md`'s Primary Features) can all be built against.

This document describes engineering-level AI provider replaceability. `constitution.md`'s AI First Development section (AI as a development assistant to engineers, not the architect) is a related but distinct topic and is not what this document is about.

---

# 2. Scope

In scope: the shape of an AI provider abstraction for Sugar Admin's product-facing AI capabilities (caption/hashtag/content generation, image generation/editing, chat reply drafting), fallback behavior, and cost/latency tradeoffs. Out of scope: choosing a specific AI provider or model (no such choice is asserted here — none is implied by `context.md` beyond the general "AI-powered" framing), and prompt engineering specifics for any individual capability.

---

# 3. The Constitutional Basis

Three sections of `constitution.md` combine to define the requirement this document fulfills:

- **Replaceability:** "Every dependency should be replaceable... AI Provider: OpenAI → Claude → Gemini should require minimal changes."
- **Separation of Concerns:** the Business Layer is "responsible for decisions, rules, workflows" and "must not know about UI"; the Data Layer is "responsible for persistence, networking, serialization" and "must not know about screens." An AI provider call is a Data Layer concern — a screen should never construct a prompt or call a provider SDK directly, exactly as a screen should never call axios directly (see `future-backend-migration.md` §6 for the parallel argument applied to backends).
- **AI First Development:** "AI generates proposals. Engineers approve architecture... AI accelerates development. AI never replaces engineering judgment." Applied to product-facing AI (not just development-assistant AI), this becomes the basis for §9's human-in-the-loop-by-default stance.

---

# 4. Capability-Oriented Abstraction, Not "Call OpenAI"

The core design move: Sugar Admin's code should never say "call OpenAI's chat completion endpoint." It should say "generate a caption for this product," and a provider-agnostic layer underneath decides which actual AI service fulfills that request. This mirrors `future-modules.md` §12's observation that nearly every Long-Term Vision module reduces to the same repository/provider abstraction pattern — AI is simply the first and most constitutionally explicit instance of that pattern (Payments, Shipping, and Accounting are the same shape, applied later).

Concretely, this means defining the abstraction around **capabilities** (`generateCaption`, `generateHashtags`, `generateImage`, `chatReply`, etc.) rather than around a specific provider's API surface. A capability method's signature should be expressed entirely in Sugar Admin's own domain vocabulary (a `Product`, a `Conversation`, a target `Platform`) — never in a specific provider's request/response shape.

---

# 5. Provider Interface Sketch

```ts
// Contract only — mirrors the Repository Contract Standard in
// .claude/agents/10-feature-planner.md §10. Implementation belongs to
// ai-engineer, mock-first, per constitution.md's Mock First Development.

interface AIContentProvider {
  /** Generates a caption for a product, tailored to the target platform's
   * tone and length conventions (Instagram vs. Telegram vs. Bale, etc. —
   * see § 6 and 10-feature-planner.md § 13's Platform edge case catalog). */
  generateCaption(input: {
    product: ProductSummary;
    platform: Platform;
    tone?: "professional" | "casual" | "playful";
    language: string;
  }): Promise<{ caption: string; providerId: string }>;

  /** Generates a ranked list of relevant hashtags. Returns an empty array,
   * never throws, if the platform does not support hashtags. */
  generateHashtags(input: {
    product: ProductSummary;
    platform: Platform;
    maxCount: number;
  }): Promise<string[]>;

  /** Rewrites existing text to a target tone/length without changing its
   * factual content. Throws ContentPolicyError if the input is rejected
   * by the provider's safety filters — callers must handle this distinctly
   * from a generic failure. */
  rewriteText(input: { text: string; tone: string; maxLength?: number }):
    Promise<{ text: string; providerId: string }>;
}

interface AIImageProvider {
  /** Generates or edits a product image per the requested operation.
   * Returns a URL/reference to the resulting asset, not raw binary data —
   * storage is a separate concern (Data Layer, not this interface). */
  generateImage(input: {
    sourceImageUrl?: string; // absent for pure generation, present for edits
    operation: "remove-background" | "replace-background" | "lifestyle" | "banner" | "enhance";
    prompt?: string;
  }): Promise<{ imageUrl: string; providerId: string }>;
}

interface AIChatProvider {
  /** Drafts a reply to a customer message. Per § 9, this is always a draft
   * for human approval unless the caller explicitly requests auto-send
   * behavior in a context where that has been deliberately enabled. */
  draftReply(input: {
    conversation: ConversationSummary;
    latestMessage: string;
    platform: Platform;
  }): Promise<{ draft: string; confidence: "high" | "medium" | "low"; providerId: string }>;
}
```

Every method returns a `providerId` alongside its result — this is deliberate: it lets Sugar Admin log, debug, and later analyze which provider actually served a given request, which is essential once §7's fallback behavior is in play (a caption generated by a fallback provider should be distinguishable from one generated by the primary provider, at least in logs/telemetry, even if the UI treats them identically).

Errors are named types (`ContentPolicyError`, and by implication `RateLimitError`, `ProviderTimeoutError`, `ProviderUnavailableError`), not generic throws — per the Feature Planner's Repository Contract Standard (`10-feature-planner.md` §10): "error cases the caller must handle (not just 'may throw')."

---

# 6. Which Sugar Admin Features Depend on This

- **AI Content** (`context.md` Primary Features) depends on `AIContentProvider` directly — this is its entire feature surface.
- **AI Images** depends on `AIImageProvider` directly.
- **Chat Center**'s "AI replies" capability depends on `AIChatProvider`.
- **Publishing** does not call an AI provider directly, but consumes AI Content's output — the interface boundary between AI Content and Publishing should be a plain string (the generated caption), not a live dependency on the AI provider itself, keeping Publishing decoupled from AI entirely (per Separation of Concerns, §3).
- **Marketing Automation and AI Sales Assistant** (`future-modules.md` §10–§11) are the furthest-future consumers of this same abstraction, at higher autonomy levels — see §9.

---

# 7. Fallback Behavior

Per `10-feature-planner.md` §13's AI edge case catalog: "AI provider unavailable — is there a non-AI fallback path?" This is answered per capability, not generically:

- **Caption/hashtag generation:** if the primary provider fails or times out, either retry against a secondary provider (if one is configured) or fall back to a non-AI path — e.g., a simple template-based caption assembled from the product's name/category/price, clearly presented to the user as a fallback, not silently swapped in as if it were AI-generated. The user should never be misled about whether AI actually produced the content they're about to publish.
- **Image generation/editing:** if unavailable, the fallback is simply "use the original, unedited product photo" — Publishing must never be blocked entirely by an AI Images failure, since a plain photo is always a valid, publishable fallback (see `roadmap.md` §9: "a business owner can publish with a plain product photo before AI Images exists").
- **Chat reply drafting:** if unavailable, the fallback is simply no draft — the owner types their own reply, which is the current (pre-AI) behavior already. Chat Center's core inbox functionality must never depend on AI availability to function at all.

The general principle: **AI capabilities should degrade gracefully to the pre-AI manual workflow, never block the underlying task entirely.** This is a direct consequence of AI being "an assistant, not a replacement" (`context.md`'s AI Philosophy) applied to runtime availability, not just to development process.

---

# 8. Cost and Latency Tradeoffs Between Capabilities

Different AI capabilities have meaningfully different cost/latency profiles, which should inform both provider selection (a future decision, not made here) and UX design (which *is* informed here):

- **Text generation (captions, hashtags, rewrites, translations)** is typically low-latency (roughly sub-second to a few seconds) and low-cost per request. This supports the product vision's goal (`product-vision.md` §5, AI Content) of generation feeling inline and immediate, "a creative collaborator sitting next to the owner" rather than a separate step with a waiting screen.
- **Image generation/editing** is typically higher-latency (potentially many seconds) and higher-cost per request than text generation. This is the direct reasoning behind `roadmap.md` §9 placing AI Images in Phase 4 rather than alongside AI Content in Phase 2 — it is not on the critical path to a first publishable post, and its heavier latency profile means its UX must be designed differently (e.g., a visible progress state, background processing with a notification on completion — see `technology-stack.md` §4, Expo Notifications' adoption trigger) rather than assumed to be instant like text generation.
- **Chat reply drafting** needs to be fast enough not to slow down the response-time-sensitive workflows described in `target-users.md` §9 ("response-time pressure" as a cross-persona pattern) — a slow AI draft is worse than no AI draft if it delays the owner's actual reply. This makes chat reply drafting closer to text generation's latency profile in priority, even though the underlying model task (understanding conversational context) may be more complex than a simple caption.

These tradeoffs should be revisited once a specific provider is selected, since actual latency/cost figures depend on the provider and model chosen — this document establishes the relative ordering and UX consequence, not absolute numbers.

---

# 9. Human-in-the-Loop by Default

Every capability sketched in §5 produces a **draft or proposal**, not a final, auto-committed action — directly mirroring `constitution.md`'s AI First Development framing ("AI generates proposals. Engineers approve architecture") applied to the product's own AI features: AI generates content/replies, the business owner approves before it reaches a customer or goes live. This is explicit in `AIChatProvider.draftReply`'s naming (`draft`, not `reply`) and in `product-vision.md` §5's Chat Center description ("always with the owner in control of what actually gets sent... AI drafts a reply; the owner approves the send unless explicitly configured otherwise").

The "unless explicitly configured otherwise" clause is deliberately narrow: any future move toward autonomous AI action (auto-publishing AI-generated captions without review, auto-sending AI-drafted replies) is the domain of Marketing Automation and AI Sales Assistant (`future-modules.md` §10–§11), and per that document, requires "an explicit, documented decision, not a default." Nothing in the current Primary Features list (`context.md`) calls for autonomous AI action — every AI Content, AI Images, and Chat Center capability described there is assistive.

---

# 10. Mock-First for AI, Too

Per `constitution.md`'s Mock First Development, AI provider calls are not exempt from the mock-first requirement. A mock `AIContentProvider`/`AIImageProvider`/`AIChatProvider` implementation should exist and be what UI development is built against initially — returning realistic, varied, sometimes-slow, sometimes-failing responses (simulating the latency profiles in §8 and the failure modes in §7), exactly as any other mock repository must per the Constitution's list (loading, latency, failures, empty states). This lets AI Content, AI Images, and Chat Center's UI and UX be built, tested, and demonstrated before any real AI provider integration or API key is available — directly enabling `roadmap.md` Phase 2's AI Content work to start without being blocked on a provider decision.

---

# 11. Connecting to the Existing `AIChatScreen.tsx` Placeholder

`src/features/ai-chat/screens/AIChatScreen.tsx` currently renders only a static "Coming soon..." message with no AI provider integration, no repository, and no chat functionality (see `current-limitations.md` §11). This is the concrete placeholder that Chat Center's real implementation (`roadmap.md` Phase 3) will replace. When that work begins, `AIChatProvider.draftReply` (§5) is the interface the feature should be built against — mock-first (§10) — rather than the current empty screen being incrementally filled in without a defined contract.

Note also that the folder name `ai-chat` and the feature name "Chat Center" (per `context.md`'s Primary Features) are not identical — this is worth resolving explicitly when Chat Center's real feature plan is written, since `10-feature-planner.md` §8 Step 2 requires confirming which existing feature module new work belongs to, and a folder rename or a decision to keep `ai-chat` as the permanent name should be made deliberately, not by default.

---

# 12. Edge Cases (Per the Feature Planner's AI Catalog)

Applying `10-feature-planner.md` §13's AI edge case catalog to this strategy directly:

- **AI provider timeout or rate limit** → handled by §7's fallback behavior; the caller receives a distinguishable error (`ProviderTimeoutError`/`RateLimitError`, per §5) rather than a generic failure, so the UI can present an accurate, specific message (per `constitution.md`'s Error Philosophy).
- **AI output requires human review before publishing** → this is the default behavior for every capability in this document, per §9, not an opt-in safeguard.
- **AI provider unavailable — is there a non-AI fallback path?** → yes, per capability, detailed in §7.

---

# 13. What This Document Does Not Decide

- Which specific AI provider(s) Sugar Admin will use — no provider is named or implied beyond the general "AI-powered" framing already in `context.md`.
- Prompt templates or model-specific tuning for any capability.
- Whether multiple providers run concurrently (for comparison/quality) versus a single primary-plus-fallback configuration — this is an implementation decision for `ai-engineer` once a feature plan reaches that stage, consistent with `10-feature-planner.md`'s handoff rule: "Hand off to `ai-engineer` whenever a repository method's implementation depends on an AI provider call — never let `network-engineer` improvise AI integration."

---

# 14. Summary Table

| Capability | Interface Method | Feature(s) | Latency Profile | Default Autonomy |
|---|---|---|---|---|
| Caption generation | `generateCaption` | AI Content | Low | Draft, human-approved |
| Hashtag generation | `generateHashtags` | AI Content | Low | Draft, human-approved |
| Text rewrite/translate | `rewriteText` | AI Content | Low | Draft, human-approved |
| Image generation/editing | `generateImage` | AI Images | High | Draft, human-approved |
| Chat reply drafting | `draftReply` | Chat Center | Low–medium | Draft, human-approved (default); autonomous only via explicit future decision (AI Sales Assistant) |

---

# 15. Checklist: Before Wiring a Feature to an AI Provider

- [ ] The capability is expressed in Sugar Admin's domain vocabulary (§4), not a specific provider's API shape.
- [ ] A mock implementation exists and is what the UI is built against first (§10).
- [ ] A fallback path is defined for provider unavailability (§7) — the underlying task must never be fully blocked by an AI outage.
- [ ] The result is presented as a draft/proposal requiring human approval, unless an explicit, documented decision says otherwise (§9).
- [ ] Errors are named, specific types, not generic throws (§5).
- [ ] `ai-engineer` (not `network-engineer`) owns the real provider integration, per `10-feature-planner.md`'s handoff rules.

---

# 16. References

- `../constitution.md` — Replaceability, AI First Development, Separation of Concerns, Mock First Development, Error Philosophy
- `../context.md` — AI Philosophy, Primary Features (AI Content, AI Images, Chat Center)
- `.claude/agents/10-feature-planner.md` §10 (Repository Contract Standard), §13 (AI edge case catalog)
- `./future-backend-migration.md` — the parallel provider-abstraction argument applied to backends
- `./future-modules.md` §12 — the shared repository/provider abstraction pattern across all future modules
- `./product-vision.md` §5 — the "creative collaborator" experience goal this strategy implements
- `./roadmap.md` — Phase 2 (AI Content) and Phase 4 (AI Images) scheduling rationale
- `./current-limitations.md` §11 — the current absence of any AI provider integration
- `../../src/features/ai-chat/screens/AIChatScreen.tsx` — the placeholder this strategy will eventually replace
