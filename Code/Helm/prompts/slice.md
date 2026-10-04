# Slice — Break Plan into Vertical Slices

**Phase 2 position:** After synthesize (PRD exists), before grill round 2.

**Core duty:** Break PRD into independently implementable vertical slice issues using tracer-bullet approach.

## Trigger

- "Slice the work"
- "Break this into tasks"
- "Create implementation tickets"

## Process

### 1. Gather Context

Work from conversation context. If user passes an issue reference, fetch and read full body and comments.

### 2. Explore Codebase (Optional)

If not already explored, do so to understand current state. Use project domain glossary, respect ADRs.

### 3. Draft Vertical Slices

Break plan into **tracer bullet** issues. Each slice is a thin vertical cut through ALL integration layers end-to-end, NOT a horizontal slice of one layer.

Slices may be **HITL** or **AFK**:
- **HITL**: Requires human interaction (architectural decision, design review)
- **AFK**: Can be implemented autonomously
- Prefer AFK over HITL where possible

**Vertical slice rules:**
- Each slice delivers narrow but COMPLETE path through every layer (schema, API, UI, tests)
- A completed slice is demoable or verifiable on its own
- Prefer many thin slices over few thick ones

### 4. Quiz User

Present proposed breakdown as numbered list. For each slice:
- **Title**: short descriptive name
- **Type**: HITL / AFK
- **Blocked by**: which other slices must complete first
- **User stories covered**: which stories this addresses

Ask:
- Granularity feel right? (too coarse / too fine)
- Dependency relationships correct?
- Any slices to merge or split?
- HITL/AFK labels correct?

Iterate until user approves.

### 5. Publish Issues

For each approved slice, publish to issue tracker. Use issue body template. Publish in dependency order (blockers first).

**Issue Template:**
```markdown
## Parent
Reference to parent issue (if source was existing issue, otherwise omit)

## What to build
Concise description of vertical slice. Describe end-to-end behavior, not layer-by-layer.

Avoid specific file paths or code snippets — they go stale fast. Exception: prototype snippets encoding decisions.

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Blocked by
- Reference to blocking ticket
Or "None - can start immediately"
```

Do NOT close or modify parent issue.
