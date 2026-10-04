# Synthesize — Generate PRD

**Phase 2 position:** After design, before slice.

**Core duty:** Take current conversation context and codebase understanding, produce PRD. Do NOT interview user — synthesize what is already known.

## Trigger

- "Write the PRD"
- "Generate the product requirements doc"
- After grill confirms requirements

## Process

1. Explore repo to understand codebase state, if not already done. Use project domain glossary throughout PRD, respect any ADRs in the area.
2. Sketch major modules to build or modify. Actively look for opportunities to extract deep modules (simple, testable interfaces that rarely change).
3. Check with user that modules match expectations. Check which modules need tests.
4. Write PRD using template below, publish to issue tracker. Apply `ready` label.

## PRD Template

### Problem Statement

The problem from the user's perspective.

### Solution

The solution from the user's perspective.

### User Stories

A LONG, numbered list. Format:
```
1. As an <actor>, I want a <feature>, so that <benefit>
```

Extensive, covering all aspects.

### Implementation Decisions

- Modules to build/modify
- Interfaces to modify
- Technical clarifications
- Architectural decisions
- Schema changes
- API contracts
- Specific interactions

Do NOT include specific file paths or code snippets. They go stale quickly.

Exception: if a prototype produced a snippet encoding a decision more precisely than prose (state machine, reducer, schema, type shape), inline it and note it came from a prototype. Trim to decision-rich parts.

### Testing Decisions

- What makes a good test (only test external behavior, not implementation details)
- Which modules will be tested
- Prior art for tests (similar tests in codebase)

### Out of Scope

What is explicitly not included.

### Further Notes

Any additional notes.
