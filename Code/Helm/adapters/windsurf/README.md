# Windsurf Adapter for Plobi

## Setup

1. Copy `.windsurfrules` to your project root
2. Copy `prompts/` contents to a `.plobi-prompts/` folder in your project

## Usage

### Global Rules
Windsurf Cascade automatically reads `.windsurfrules` on every interaction.

### Session Resume
When starting a new conversation, reference the resume prompt first:
```
@.plobi-prompts/resume.md
```
This reconstructs project context from `.ai/SESSION.md` + `.ai/SESSION_TEMPLATES.md` and generates a complete opening message.

### Skill Prompts
In Cascade Chat, reference individual skill prompts with `@`:

```
@.plobi-prompts/grill.md
@.plobi-prompts/freeze.md
@.plobi-prompts/explore.md
```

### Session Management (Context Isolation)

Windsurf Cascade does not persist context across sessions. Use `@prompt` references for handoff:

**End session:**

```text
@.plobi-prompts/package.md
```

AI reads state, writes `.ai/SESSION.md` with completed work, blockers, and next session type.

**Start session:**

```text
@.plobi-prompts/resume.md
```

AI reads `.ai/SESSION.md` → `.ai/SESSION_TEMPLATES.md` → `.ai/CONTEXT.md` → `.docs/PROJECT.md`, generates complete opening message.

Supported session types and triggers:
- **Feature**: "Implement X", "Add Y feature" → auto-fill from PROJECT.md, PROGRESS.md
- **Debug**: "Bug in Z", "Error when..." → auto-fill from SESSION.md, error context
- **Environment**: "Install", "Setup conda/pip/npm" → auto-fill from package files
- **Explore**: "Explain how", "Read code" → auto-fill from ARCHITECTURE.md
- **Review**: "Check this", "Audit" → auto-fill from git diff, DESIGN.md
- **Meta Session**: "完善工作流", "改进 Helm", "Meta Session" → auto-fill from workflow goal, sandbox project name, feedback loop being observed

Never use generic phrases like "continue" or "pick up where we left off".

### Document Templates

Use templates from `../../docs/`:
- `.docs/RESEARCH.md`, `.ai/CONTEXT.md`, `.docs/PROJECT.md`, `.docs/DESIGN.md` → `.docs/`
- `.docs/PROGRESS.md`, `.ai/SESSION.md`, `.ai/SESSION_TEMPLATES.md` → project root

## Limitations vs Claude Code

| Feature | Windsurf | Notes |
|---|---|---|
| Guard (git interception) | Not available | Manual discipline or hooks |
| `/command` skills | Not available | Use `@prompt` references |
| Auto skill selection | Manual | You choose prompt |

## Recommended Workflow

Same as Cursor: paste rules, create docs folder, `@prompt` skills as needed.
