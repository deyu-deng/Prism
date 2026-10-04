# VETO-001 — Interrogation depth is unbounded by design

## Status

Permanently rejected.

## Date

2026-05-20

## Proposal

Impose a configurable ceiling on the number of questions `/plobi-grill` can ask during interrogation.

## Rationale for Rejection

Interrogation terminates only when every branch of the decision tree has been resolved. Some surgical plans require three incisions; others require fifty. A hard cap would amputate valid exploration on complex architectures or leave simpler plans unnecessarily truncated.

Session control mechanisms already exist:

- The operator may abort at any stage and accept the current plan state.
- The operator may issue a natural-language directive to summarize and advance — this is the intended control surface, not a numeric gate.

A hard cap conflates two distinct failure modes: a model asking many questions because the plan is structurally under-specified (correct behavior) versus a model asking redundant questions (a prompt-quality defect, not a quantity defect). The latter is fixed in the skill prompt, not a counter.

## Prior Requests

- #44 — "Codex just asked me 200 questions"

## Related

- `prompts/grill.md` — Skill prompt quality is the correct fix vector
