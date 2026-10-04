# ADR-001 — Explicit `/plobi-scaffold` pointer only for hard dependencies

## Status

Accepted

## Date

2026-05-20

## Context

Skills depend on per-repo config (issue tracker, triage label vocabulary, domain doc layout) seeded by `/plobi-scaffold`. Some skills cannot meaningfully function without that config — they have to publish to a specific issue tracker or apply a specific label string. Others only use it to sharpen output (vocabulary, ADR awareness) and degrade gracefully without it.

## Decision

Split skills into **hard-dependency** and **soft-dependency** categories:

- **Hard dependency** (`plobi-slice`, `plobi-synthesize`) — include an explicit one-liner: *"… should have been provided to you — run `/plobi-scaffold` if not."* Without the mapping, output is wrong, not just fuzzy.
- **Soft dependency** (`plobi-dissect`, `plobi-freeze`, `plobi-fuse`, `plobi-map`) — reference "the project's domain glossary" and "ADRs in the area you're touching" in vague prose only. If the docs aren't there, the skill still works; output is just less sharp.

The split keeps soft-dependency skills token-light and avoids cargo-culting the setup pointer into places where it isn't load-bearing.

## Consequences

### Positive

- Hard-dependency skills fail fast with clear remediation
- Soft-dependency skills remain usable on partial setups
- Token budgets preserved for soft-dependency prompts

### Negative / Risks

- Requires manual audit of each skill to determine dependency level
- May drift if new config dependencies are added without review

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| All skills reference scaffold explicitly | Token bloat; most skills degrade gracefully |
| No skills reference scaffold | Hard-dependency skills produce incorrect output silently |

## Related

- `core/principles.md` — Document layering principle
