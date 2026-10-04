# Explore — Divergent Exploration

**Phase 1 position:** Before grill (convergence).

**Core duty:** From user's initial idea, through persistent questions and proactive recommendations, help discover real needs and missed features. Output a feature candidate list for later grill convergence.

## Trigger

- "I have an initial idea..."
- "Help me explore requirements"
- "Not sure what to build, but I want to solve X"
- "Help me think about features"
- User describes a pain point or scenario without concrete product concept

## Process

### Step 1: Receive Initial Idea

User says anything unstructured. Extract:
- **Core pain point**: What hurts most for the user (or user's user)?
- **Current workaround**: How do they solve this now? (Excel? Manual? Another app?)
- **Trigger scenario**: When would they use this product?

If description is too simple, ask these three questions first before recommending features.

### Step 2: Persistent Questions

Ask one at a time, wait for answer before next.

- "How do you handle this now? What's the most painful step?"
- "If this tool works, how many times daily? For how long?"
- "Who are your users? What's their tech level?"
- "Any competitor product you particularly hate? Why?"
- "Any competitor product you particularly like? Why?"
- "Is this for yourself or for others?"

**Principles:**
- One question at a time
- When user says "don't know", give two options instead of continuing to ask
- After 3-5 rounds, proceed to Step 3

### Step 3: Recommend Candidate Features

Based on answers, proactively recommend 3-5 features at a time:

```
Based on what you said, I recommend these features. You decide:

① [Feature name]
   What: [one sentence]
   Why: [reason based on user's words, e.g. "you said you manage with Excel now, this replaces that step"]
   → Keep / Drop / Later

② [Feature name]
   ...
```

**Principles:**
- Recommend with reasons, reasons must come from user's words or obvious scenario inference
- Don't recommend "looks cool but unrelated to scenario" features
- Clearly label "you might have missed this" vs "directly inferred from what you said"
- Record user "Drop" decisions for grill Veto mechanism

### Step 4: Organize Feature Candidate List

After user selection, output formatted candidate list (in chat, not file — later synthesize writes to PRD):

```markdown
## Feature Candidate List (explore output, pending grill convergence)

### Confirmed
- [Feature] — [one sentence]

### Later
- [Feature] — [one sentence]

### Explicitly Rejected (Veto record)
- [Feature] — User's exact words: "[quote]"

### Needs Clarification (grill will ask)
- [Fuzzy need] — Unclear: [specifically what]
```

### Step 5: Hand Off to Grill

At explore end, tell user:

```
Exploration complete. Feature candidate list organized.

Next step is grill: AI will ask about fuzzy definitions one by one,
turning the candidate list into freezable precise requirements.

Ready? Say "grill me" or "help me think this through".
```

## Notes

- **Explore does not freeze.** Don't say "this feature is decided" during explore. All decisions are candidates; grill handles freezing.
- **Disable compression.** Explore needs full natural language. No compressed output. Resume compression after explore ends.
- **Keep Veto records.** User "Drop" features must be recorded with exact words for later grill and Phase 6 extension Veto checks.
- **Don't recommend more than 5 features at once.** Causes choice fatigue. Batch recommendations.
- **When user says "whatever" or "you decide":** Give your recommendation with reasons. Don't kick the question back.
