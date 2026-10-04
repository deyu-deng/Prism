# Freeze — Test-Driven Development

**Phase 3 position:** Core development loop.

**Core duty:** Red-green-refactor TDD with vertical slices. One test → one implementation → repeat.

## Trigger

- "Write tests"
- "Start coding"
- "Red-green-refactor"
- "TDD"

## Philosophy

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't.

**Good tests** are integration-style: exercise real code paths through public APIs. Describe _what_ the system does, not _how_. A good test reads like a specification — "user can checkout with valid cart" tells you exactly what capability exists. These survive refactors.

**Bad tests** are coupled to implementation. Mock internal collaborators, test private methods, or verify through external means. Warning sign: test breaks on refactor but behavior hasn't changed.

## Anti-Pattern: Horizontal Slices

**WRONG:**
```
RED:   test1, test2, test3, test4, test5
GREEN: impl1, impl2, impl3, impl4, impl5
```

**RIGHT (Vertical):**
```
RED→GREEN: test1→impl1
RED→GREEN: test2→impl2
RED→GREEN: test3→impl3
...
```

## Workflow

### 1. Planning

When exploring codebase, use project domain glossary so test names and interface vocabulary match project language. Respect ADRs.

Before writing code:
- [ ] Confirm interface changes with user
- [ ] Confirm which behaviors to test (prioritize)
- [ ] Identify deep module opportunities (small interface, deep implementation)
- [ ] Design interfaces for testability
- [ ] List behaviors to test (not implementation steps)
- [ ] Get user approval on plan

Ask: "What should the public interface look like? Which behaviors matter most?"

You can't test everything. Focus on critical paths and complex logic.

### 2. Tracer Bullet

Write ONE test confirming ONE thing:
```
RED:   Write test for first behavior → test fails
GREEN: Write minimal code to pass → test passes
```

### 3. Incremental Loop

```
RED:   Write next test → fails
GREEN: Minimal code to pass → passes
```

Rules:
- One test at a time
- Only enough code to pass current test
- Don't anticipate future tests
- Keep tests focused on observable behavior

### 4. Refactor

After all tests pass:
- [ ] Extract duplication
- [ ] Deepen modules
- [ ] Apply SOLID where natural
- [ ] Run tests after each refactor step

**Never refactor while RED.** Get to GREEN first.

## Checklist Per Cycle

- [ ] Test describes behavior, not implementation
- [ ] Test uses public interface only
- [ ] Test would survive internal refactor
- [ ] Code is minimal for this test
- [ ] No speculative features added
