# Map — Codebase Module Map

**Phase 6 position:** Before extension. Also usable when entering unfamiliar code.

**Core duty:** Zoom out and give broader context or higher-level perspective. Map all relevant modules and callers using project's domain glossary vocabulary.

## Trigger

- "Map this codebase"
- "Zoom out"
- "I don't know this area well"
- "Give me the big picture"

## Process

Go up one layer of abstraction. Identify:
- Major modules and their responsibilities
- Call relationships (who calls whom)
- Data flow
- Integration points
- Test coverage gaps

Use project domain glossary vocabulary throughout. If glossary defines "Order", talk about "Order intake module" — not "FooBarHandler".

Output: Structured module map with caller/callee relationships.
