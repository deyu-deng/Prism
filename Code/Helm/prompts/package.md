# Package — Cross-Session Handoff

**Phase 7 position:** Before tool switch or session end.

**Core duty:** Compact current conversation into handoff document so fresh agent can continue work.

## Trigger

- "Package for handoff"
- "Generate SESSION.md"
- Before switching tools
- Before session ends

## Process

1. Write session summary document capturing current state
2. Save to `.ai/SESSION.md` in project root
3. Suggest which skills to use in next session
4. Do not duplicate content already in PRDs, plans, ADRs, issues, commits, diffs — reference by path

## SESSION.md Format

```markdown
## This Session Summary
Completed slices: #1, #2, #4
Decisions: [ADR-003] Chose soft delete over hard delete
Open issues: Slice #3 waiting for operator decision

## Next Session Starting Point
Next slice: #3
Need decision: [specific question]
Related docs: .ai/CONTEXT.md section 3

## Tool Switch Instructions
From [Tool A] to [Tool B], read order:
1. .ai/SESSION.md (this file)
2. .ai/CONTEXT.md
3. .docs/PROJECT.md
4. .docs/PROGRESS.md
5. Map scan current code state
```
