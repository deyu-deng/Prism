---
name: plobi-package
description: End the current session and write a handoff document to .ai/SESSION.md for the next session to pick up.
user_invocable: true
auto_invocable: false
---

# /package — Session Handoff

End the current conversation window and persist all state to `.ai/SESSION.md`.

## Steps

1. Read `.ai/SESSION.md` if it exists (to preserve historical sessions)
2. Summarize what was completed in THIS session:
   - Files changed / created
   - Decisions made
   - Tests added or verified
3. List open issues and blockers:
   - Unresolved bugs
   - Pending decisions needing operator input
   - Environment problems
4. Write "Next Session Starting Point":
   - What the next session should do
   - Which session type to use (Feature / Debug / Environment / Explore / Review / Meta)
5. Write the updated `.ai/SESSION.md`

## Meta Session Special Handling

If the current window is a **Meta Session** (developing the workflow itself, e.g. improving Helm using Vaelis as testbed), the package output MUST split artifacts by project:

```markdown
## Completed This Session

### Meta Workflow (Helm)
1. [Changes to workflow / skills / docs in Helm repo]

### Sandbox Project (Vaelis)
1. [Changes to product code in Vaelis repo]
```

This separation lets future sessions reuse Meta insights without confusing them with sandbox-specific code.

## Output Format

```markdown
# Session Summary

## Completed This Session

1. **[Topic]** — [What was done]
2. ...

## Open Issues

- [P1/P2/P3] [Description]
- ...

## Next Session Starting Point

**新窗口操作：** [一句话说明新窗口该做什么]

**无需手动复制任何内容。**

## Decisions Pending Operator Input

None / [List HITL items]
```

## Rules

- Do NOT duplicate content already in PROJECT.md, PROGRESS.md, or ADRs. Reference by path.
- Preserve any historical sessions in the file (append, don't overwrite history).
- If no `.ai/` directory exists, create it.
- After writing, tell the user: "Session packaged. Open a new window and type `/resume` to continue."
