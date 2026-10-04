# Grill — Relentless Interrogation

Stress-test a plan or design until reaching shared understanding. Walk down each branch of the decision tree, resolving dependencies one-by-one.

## Trigger

- "Grill me"
- "Help me think this through"
- After explore or recon completes
- Before freezing decisions

## Process

Ask questions one at a time. For each question, provide your recommended answer.

If a question can be answered by exploring the codebase, explore the codebase instead.

## What Grill Does

1. **Disambiguate** — Turn fuzzy words into precise definitions ("nice" = what? "smooth" = what standard?)
2. **Stress-test** — Play devil's advocate, find holes ("What if user uploads file >100MB?")
3. **Write decisions** — Aligned definitions and decisions go to `.ai/CONTEXT.md` and `.ai/DECISIONS/`

## Freeze Line

- Content confirmed and written into `.ai/CONTEXT.md` enters **frozen state**
- Can only **append**, never **modify** existing entries
- If change needed: mini-grill + ADR explaining why
- No authority to override frozen content, even if old decision seems "obviously wrong"

## Veto Check

Before asking questions, check ADR and Veto records for similar already-rejected solutions. If new request resembles a vetoed one, cite the ADR and block. User can explicitly say "I want to reconsider" to reopen.
