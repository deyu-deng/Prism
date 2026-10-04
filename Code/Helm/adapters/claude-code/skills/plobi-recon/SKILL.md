---
name: plobi-recon
description: Market and technology research skill. Web research on competitor features, technology stacks, or API capabilities. Results mandatory written to `docs/RESEARCH.md`. Use when user says "research X", "what tools exist for Y", "can technology Z do this", "compare competitors", or during Phase 1 parallel with explore. Runs parallel to explore, feeding market reality into the grill convergence.
---

# Recon — Market & Technology Research

## Trigger

- "Research X"
- "What feedback tools exist for designers?"
- "Can Figma's comment API get all historical comments?"
- "Compare competitors"
- "What tech stack should I use?"
- Phase 1, parallel with explore

## Position in Workflow

**Phase 1, parallel with explore.** Recon feeds market reality into grill convergence.

Explore discovers what the user wants. Recon discovers what the market already offers. Grill reconciles the two.

## Process

### 1. Understand Research Scope

If user asks broad question ("research project management tools"), ask narrowing questions:
- "What specific aspect? Features, pricing, tech stack, or API?"
- "Any competitors you already know?"
- "What's your budget range or scale?"

If user asks specific question ("Can Supabase handle 100k concurrent WebSocket?"), research directly.

### 2. Execute Research

Web search and analysis. Focus on:
- **Competitor features** — what exists, what's missing, differentiation gaps
- **Technology evaluation** — maturity, community, performance, lock-in risk
- **API documentation** — capabilities, limits, pricing
- **Market trends** — adoption curves, deprecated technologies

### 3. Write to docs/RESEARCH.md

**Mandatory.** Never deliver recon results only in conversation.

```markdown
# RESEARCH.md

## Research Target
[What was researched]

## Competitor Analysis

| Product | Key Features | Strengths | Weaknesses | Relevance |
|---------|-------------|-----------|------------|-----------|
| [Name]  | [List]      | [List]    | [List]     | [High/Med/Low] |

## Technology Evaluation

| Technology | Maturity | Community | Fit for Project | Notes |
|------------|----------|-----------|-----------------|-------|
| [Name]     | [Stable/Beta/Alpha] | [Large/Med/Small] | [Good/Med/Poor] | [Notes] |

## Recommendations

1. **[Recommendation]** — [Rationale]
2. **[Recommendation]** — [Rationale]

## References

- [Link] — [Description]
```

### 4. Hand Off to Grill

After writing RESEARCH.md, summarize key findings for grill:

```
Recon complete. Key findings:
- [Finding 1 that affects feature decisions]
- [Finding 2 that affects tech stack]

These findings should be considered during grill convergence.
```

## Coordination with Explore

When running parallel to explore:
- If explore discovers a feature need, check if recon already covered it
- If recon finds a market gap, feed it to explore as a "you might have missed this"
- Both paths converge at grill — recon provides market reality, explore provides user needs

## Iron Rule

All recon output must persist to `RESEARCH.md`. Never deliver recon results only in conversation.
