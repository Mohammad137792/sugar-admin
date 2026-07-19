---
id: handbook-ai-integration
title: AI Integration Handbook
category: handbook
version: 1.0.0
status: active
owner: Engineering
last_updated: 2026-07-18
---

# AI Integration Handbook

> "The feature should never know which AI provider answered it, and it should always know what to do when none of them do." — `.claude/agents/25-ai-engineer.md`

---

# Table of Contents

1. Purpose
2. Scope
3. Principles
4. The Current State: Zero AI Integration
5. Two Different Meanings of "AI" in This Project
6. Capability-Oriented Design, Worked Through
7. Mock-First for AI: Why It's Harder and More Necessary
8. Human-in-the-Loop, Concretely
9. Connecting to `AIChatScreen.tsx`
10. Good Examples
11. Bad Examples
12. Decision Trees
13. Real Project Examples
14. Common Mistakes
15. Best Practices
16. Checklist
17. References

---

# 1. Purpose

`constitution.md` states AI First Development's core stance in eight short lines: "AI generates proposals. Engineers approve architecture. AI writes code. Engineers review code. AI accelerates development. AI never replaces engineering judgment." Its Replaceability section names AI Provider as the lead example of a dependency that must be swappable: "OpenAI → Claude → Gemini should require minimal changes."

`.claude/knowledge/ai-provider-strategy.md` already turns that into a concrete design — capability-oriented interfaces (`generateCaption`, `generateHashtags`, `generateImage`, `chatReply`), a provider abstraction sketch, fallback behavior per capability, and cost/latency reasoning. `.claude/agents/25-ai-engineer.md` already owns implementing that design end to end. This handbook does not repeat either — it exists to walk an engineer who has read both but hasn't yet built anything through the reasoning gaps between "here is the target interface" and "here is exactly how I decide what belongs inside vs. outside that interface, and why," using the one real, live piece of AI-adjacent code in this codebase (`AIChatScreen.tsx`) as the concrete anchor.

---

# 2. Scope

In scope: how to think about the boundary between AI-touching and non-AI-touching code, how mock-first applies specifically to AI (which is harder to mock convincingly than a REST endpoint), and how the existing `AIChatScreen.tsx` placeholder relates to the target `AIChatProvider` interface.

Out of scope: the interface signatures themselves (`.claude/knowledge/ai-provider-strategy.md` § 5 is the source of truth), the agent-level SOP for building AI features (`.claude/agents/25-ai-engineer.md`), and any specific provider selection (undecided, per both documents).

---

# 3. Principles

Grounded in:

- **AI First Development** (constitution.md) — AI is an engineering assistant, never the architect; this document extends the same posture to Sugar Admin's *product* AI features (`.claude/knowledge/ai-provider-strategy.md` § 3 makes this extension explicit — it is a related but distinct application of the same principle).
- **Replaceability** (constitution.md) — the AI Provider example is not illustrative flavor text; it is the literal requirement this handbook exists to satisfy in practice.
- **Separation of Concerns** (constitution.md) — an AI provider call is a Data Layer concern. A screen must never construct a prompt or call a provider SDK directly, for exactly the same reason a screen must never call `axios` directly (`architecture.md` § 5).
- **Mock First Development** (constitution.md) — AI provider calls are not exempt; a mock AI provider is a first-class citizen, not a stub to delete later.

---

# 4. The Current State: Zero AI Integration

Stated as plainly as `.claude/agents/25-ai-engineer.md` § 9 states it, because understating this gap produces the exact failure mode this handbook exists to prevent: `package.json` has no OpenAI, Anthropic, Google Generative AI, or any other AI provider SDK dependency. There is no `src/ai/` folder. There is no prompt file, no streaming utility, no `AIProvider` interface implementation anywhere in `src/`. `src/features/ai-chat/screens/AIChatScreen.tsx` — read in full below — renders two lines of static text and nothing else.

This means every sentence in `.claude/knowledge/ai-provider-strategy.md` describing "the target interface" and every responsibility in `.claude/agents/25-ai-engineer.md` describes work that has not started, not a pattern to extend. The first engineer to build an AI-touching feature is establishing the pattern from a blank slate, not following precedent — treat every decision in §§ 5–13 there as a decision with real weight, not a formality to rubber-stamp.

---

# 5. Two Different Meanings of "AI" in This Project

It is worth naming a distinction explicitly, because the two are easy to conflate and the constitution deliberately keeps them separate:

**AI as a development assistant** — Claude Code (or an equivalent) generating this codebase's own source files, reviewed by engineers before merge. This is what `constitution.md`'s AI First Development section is primarily about, and it is what every `.claude/agents/*.md` file in this workspace governs.

**AI as a product feature** — Sugar Admin's own AI Content, AI Images, and Chat Center capabilities, which generate captions, images, and chat replies *for the app's end users* (shop owners), not for the engineers building the app. This is what `.claude/knowledge/ai-provider-strategy.md` and this handbook are about.

The two share the same underlying philosophy — proposals over autonomous action, human review before commitment — but they are implemented completely differently: one runs inside Claude Code's own tooling, the other runs as a repository method inside Sugar Admin's own `src/` at runtime, on a real user's device, calling a real (eventually) or mocked (today) provider over the network. Confusing them in a design discussion ("the AI already reviews its own captions, so we don't need human approval" — conflating dev-assistant review with product-feature review) is a real, plausible mistake to guard against.

---

# 6. Capability-Oriented Design, Worked Through

`.claude/knowledge/ai-provider-strategy.md` § 4 states the core move: code should say "generate a caption for this product," never "call OpenAI's chat completion endpoint." Here is the reasoning that makes that concrete when you're actually deciding a method signature.

Ask: **does this method's signature, read in isolation, reveal anything about which provider fulfills it?** `generateCaption(input: { product: ProductSummary; platform: Platform; tone?: ...; language: string })` passes this test — nothing in the signature assumes a specific request/response shape, a specific model name, or a specific SDK's parameter naming. A signature like `generateCaption(input: { prompt: string; model: "gpt-4o" | "gpt-4o-mini"; temperature: number })` fails it immediately — `model` and `temperature` are OpenAI's vocabulary, not Sugar Admin's, and swapping to Claude would mean either lying about what `model` means or rewriting every call site.

This test applies just as strictly to error types. `.claude/knowledge/ai-provider-strategy.md` § 5 names `ContentPolicyError`, `RateLimitError`, `ProviderTimeoutError`, `ProviderUnavailableError` — generic, provider-agnostic names a caller can branch on regardless of which underlying provider threw them. A caller that does `if (e.response?.data?.error?.code === "content_policy_violation")` has leaked a specific provider's error shape straight through the abstraction, defeating the entire point.

The `providerId` field returned alongside every result (`.claude/knowledge/ai-provider-strategy.md` § 5) is the one deliberate, narrow exception to "never expose which provider answered" — and it's there for observability (logging, debugging, future analytics on fallback frequency per § 7), not for the caller to branch on behavior. A caller that does `if (result.providerId === "openai") { ... }` has smuggled provider-specific logic back into feature code through the one field meant only for telemetry — don't do this.

---

# 7. Mock-First for AI: Why It's Harder and More Necessary

Mocking a `ProductRepository.list()` call is mechanical — return a realistic array with the right shape, simulate latency and an occasional failure, done. Mocking an `AIContentProvider.generateCaption()` call is a genuinely harder problem, and skipping it because it's harder is exactly backwards.

**Why it's harder:** a real caption generator produces varied, contextually plausible text — different length, different tone, occasionally awkward phrasing, occasionally excellent. A mock that always returns the string `"Generated caption"` (named explicitly as an anti-pattern in `.claude/agents/25-ai-engineer.md` § 15) lets a screen render successfully without ever exercising what the UI actually needs to handle: multi-line captions that wrap differently, captions near a platform's character limit, captions in Farsi vs. English, a caption regenerated twice producing two different results.

**Why it's more necessary, not less:** per `.claude/knowledge/ai-provider-strategy.md` § 10, a working mock is what lets AI Content's UI be built, reviewed, and demonstrated *before* any API key or provider contract exists — which is the actual, current situation (§ 4). If the mock is weak, either the feature is blocked entirely on a provider decision that belongs to `chief-architect` (per `.claude/agents/25-ai-engineer.md` § 5), or someone builds against a live provider prematurely just to see realistic output, which reintroduces exactly the coupling this whole document exists to prevent.

The practical target, per `.claude/agents/25-ai-engineer.md` § 10's `mockAIProvider` sketch: vary output by input (different product name/tone/platform genuinely produces different text, not templated substitution into one fixed sentence), simulate realistic latency (400–1500ms, matching § 8's text-generation latency profile from `ai-provider-strategy.md`), and simulate an actual failure rate — not zero, per the Constitution's Mock First Development list.

---

# 8. Human-in-the-Loop, Concretely

`.claude/knowledge/ai-provider-strategy.md` § 9 states the default: every capability produces a **draft**, never an auto-committed action. What this means in code, concretely, for the three current AI-adjacent Primary Features:

- **AI Content:** a generated caption populates a text field the business owner can still edit before it's attached to a post. The repository method's return type should make "this is a suggestion" visible in the type itself where possible (e.g., a `{ caption: string; providerId: string }` result consumed by a form field with an existing value, not a value that silently replaces user input already typed).
- **AI Images:** a generated/edited image becomes a candidate the user selects or discards, never the image that's already attached to a live post.
- **Chat Center's AI replies:** `AIChatProvider.draftReply` — the method name itself encodes the constraint. The result populates a compose box the owner reviews and can edit before sending; it is never auto-sent. `.claude/knowledge/ai-provider-strategy.md` § 9 notes the "unless explicitly configured otherwise" clause is deliberately narrow and belongs to a *future*, separately-decided module (AI Sales Assistant, `.claude/knowledge/future-modules.md`) — nothing in `context.md`'s current Primary Features list calls for autonomous sending, and building it in without that explicit, separate decision is scope creep on whatever feature is being built.

---

# 9. Connecting to `AIChatScreen.tsx`

The entire current file, for reference:

```tsx
// src/features/ai-chat/screens/AIChatScreen.tsx — current, real, complete file
export default function AIChatScreen() {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.root}>
      <Text style={[styles.title, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "دستیار هوشمند" : "AI Assistant"}
      </Text>
      <Text style={[styles.sub, { textAlign: isRTL ? "right" : "left" }]}>
        {isRTL ? "به زودی..." : "Coming soon..."}
      </Text>
    </View>
  );
}
```

Two observations worth drawing out for anyone about to build the real feature behind this screen:

**It is registered and reachable, unlike `AuthNavigator.tsx`.** Per `architecture.md` § 4's finding, `AuthNavigator.tsx` is fully built and never mounted — a "dead" screen. `AIChatScreen.tsx` is the opposite: a live, reachable placeholder with no functionality behind it. Don't confuse the two kinds of gap when planning work here — this route already works, it just renders nothing real yet.

**The folder name `ai-chat` and the feature name "Chat Center" (per `context.md`'s Primary Features) are not identical**, and `.claude/knowledge/ai-provider-strategy.md` § 11 flags this explicitly as a decision to make deliberately, not by default, when Chat Center's real feature plan is written — per `.claude/agents/10-feature-planner.md` § 8 Step 2's requirement to confirm which existing feature module new work belongs to. Don't silently start building "Chat Center" functionality inside `ai-chat/` without that confirmation being made explicit in the feature plan.

When real work begins here, it is built against `AIChatProvider.draftReply` (the target interface, `.claude/knowledge/ai-provider-strategy.md` § 5), mock-first (§ 7 above), following `.claude/agents/25-ai-engineer.md`'s SOP — not incrementally filled in ad hoc against whatever seems easiest to wire up first.

---

# 10. Good Examples

**Good: a capability call that reveals nothing about the provider.**

```ts
const result = await aiContentRepository.generateCaption({
  product: productSummary,
  platform: "instagram",
  tone: "casual",
  language: "fa",
});
// result: { caption: string; providerId: string }
```

Nothing here would need to change if the underlying provider changed tomorrow — exactly the Replaceability property this handbook exists to protect.

**Good: a fallback path stated in code, not assumed.**

```ts
try {
  return await aiContentRepository.generateCaption(input);
} catch (e) {
  if (isProviderUnavailableError(e)) {
    return { caption: buildTemplateCaption(input.product), providerId: "template-fallback" };
  }
  throw e;
}
```

Matches `.claude/knowledge/ai-provider-strategy.md` § 7's stated fallback for caption generation — a template-based caption, clearly distinguishable via `providerId`, never silently presented as if it were AI-generated.

---

# 11. Bad Examples

**Bad: an SDK call reachable from a screen.**

```tsx
// Inside a screen component — never do this
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: ENV.OPENAI_KEY });
const res = await openai.chat.completions.create({ /* ... */ });
```

Named explicitly in `.claude/agents/25-ai-engineer.md` § 16 as the single most important anti-pattern to avoid, precisely because this layer doesn't exist yet — every feature built this way becomes the template the next feature copies.

**Bad: a mock that always returns the same string.**

```ts
export const mockAIProvider = {
  generateText: async () => ({ text: "Generated caption", finishReason: "complete" }),
};
```

Passes a smoke test, teaches nobody anything about how the real screen behaves with varied-length output, and gives a false impression the feature is UI-complete when only its narrowest case has ever been exercised.

---

# 12. Decision Trees

## Does this new logic belong inside the `AIProvider` abstraction, or in feature code that calls it?

```
Does this logic decide WHICH provider/model answers, or HOW to talk to
that provider's API (auth, request shape, response parsing)?
  → Yes: it belongs inside an adapter (src/ai/adapters/*), never in
    feature/repository code.
Does this logic decide WHAT to ask for (a prompt's variables, which
capability to call, how to interpret the domain-level result)?
  → Yes: it belongs in the feature's repository method, calling the
    AIProvider abstraction — this is feature code, not provider code.
```

## Does this AI-touching feature need a fallback design decision, or is one already specified?

```
Is this one of the three named capabilities in ai-provider-strategy.md § 5/§ 7
(caption/hashtag generation, image generation/editing, chat reply drafting)?
  → Yes: the fallback behavior is already specified there — implement it,
    don't invent a new one.
  → No, it's a new AI capability not yet covered:
      → Escalate to feature-planner to define the fallback behavior as
        part of the feature plan's edge case catalog (10-feature-planner.md
        § 13) before implementation — per ai-engineer.md's SOP § 8 Step 6.
```

---

# 13. Real Project Examples

- **`src/features/ai-chat/screens/AIChatScreen.tsx`** — the one real, live AI-adjacent file in the codebase today; a placeholder with zero AI wiring (§ 9).
- **`.claude/knowledge/ai-provider-strategy.md`** — the full interface sketch, fallback table, and cost/latency reasoning this handbook builds on rather than repeats.
- **`.claude/agents/25-ai-engineer.md` § 10** — the target `AIProvider`/`mockAIProvider`/adapter file shapes.
- **`package.json`** — verified to contain zero AI provider SDK dependencies, grounding § 4's "greenfield" framing.

---

# 14. Common Mistakes

- Designing a repository method's signature around a specific provider's request shape "because that's the provider we'll probably use," defeating Replaceability before the first line of implementation exists.
- Treating a mock AI provider as a formality — a single hardcoded string return — instead of the realistic, varied surface `ui-engineer`/`react-native-engineer` actually need to build against.
- Auto-sending or auto-publishing AI-generated content without an explicit user confirmation step, even "just for the demo."
- Conflating "AI as development assistant" review practices (this workspace's own agent files) with "AI as product feature" review practices (`.claude/agents/25-ai-engineer.md`) — they are related but not interchangeable.
- Starting to build "Chat Center" functionality inside `ai-chat/` without first resolving the naming question `.claude/knowledge/ai-provider-strategy.md` § 11 flags.

---

# 15. Best Practices

- Before writing any AI-touching repository method, run § 6's test on its signature: does it reveal anything about the underlying provider? If yes, redesign before implementing.
- Build the mock adapter first, and make it good enough that a reviewer looking only at the screen (not the mock's source) can't tell the difference between mock and real output quality.
- State the fallback behavior explicitly in the repository method's own documentation/comments, not only in a design doc — the code should be legible about what happens when AI is unavailable without cross-referencing another file.
- When a feature plan doesn't specify AI fallback behavior, treat that as a plan gap and escalate to `feature-planner`, per `.claude/agents/25-ai-engineer.md` § 8 — don't invent one silently.

---

# 16. Checklist

- [ ] The capability's method signature is expressed in Sugar Admin's own domain vocabulary, not a specific provider's API shape.
- [ ] A mock implementation exists with varied, realistic output and a simulated failure/latency profile — not a single static string.
- [ ] A fallback path is defined and reachable for provider timeout, rate-limit, and full unavailability.
- [ ] AI-generated content requires explicit human approval before it reaches a customer or a public post — no auto-send, no auto-publish.
- [ ] Errors are named, provider-agnostic types, not generic throws or provider-specific shapes leaked through.
- [ ] `providerId` (or equivalent) is used for observability only, never branched on by feature code.
- [ ] `ai-engineer` (not `network-engineer`) owns the actual provider integration, per `.claude/agents/10-feature-planner.md`'s handoff rules.

---

# 17. References

- [constitution.md](../constitution.md) — AI First Development, Replaceability, Separation of Concerns, Mock First Development.
- [context.md](../context.md) — AI Philosophy, Primary Features (AI Content, AI Images, Chat Center).
- [.claude/knowledge/ai-provider-strategy.md](../knowledge/ai-provider-strategy.md) — the full interface, fallback, and cost/latency design this handbook deepens.
- [.claude/agents/25-ai-engineer.md](../agents/25-ai-engineer.md) — implementation ownership, SOP, provider abstraction standard.
- [.claude/agents/10-feature-planner.md](../agents/10-feature-planner.md) § 13 — AI edge case catalog.
- [architecture.md](./architecture.md) — Separation of Concerns applied to the Data layer generally.
- [../../src/features/ai-chat/screens/AIChatScreen.tsx](../../src/features/ai-chat/screens/AIChatScreen.tsx) — the current placeholder discussed in § 9.
