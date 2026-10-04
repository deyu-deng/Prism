# Cursor Adapter for Plobi

## Setup

1. Copy `.cursorrules` to your project root (or merge with existing `.cursorrules`)
2. Copy `prompts/` contents to a `.plobi-prompts/` folder in your project (or reference directly from this repo)

## Usage

### Global Rules
Cursor automatically reads `.cursorrules` on every interaction. This file contains:
- Plobi core principles
- Domain glossary
- The 8-phase workflow overview
- Iron rules (when to stop AI)

### Skill Prompts
In Cursor Chat or Composer, reference individual skill prompts with `@`:

```
@.plobi-prompts/grill.md  — start grilling session
@.plobi-prompts/freeze.md — begin TDD loop
@.plobi-prompts/explore.md — explore requirements
```

### Document Templates
Use the templates from `../../docs/`:
- Copy `.docs/RESEARCH.md`, `.ai/CONTEXT.md`, `.docs/PROJECT.md`, `.docs/DESIGN.md` to `.docs/`
- Copy `.docs/PROGRESS.md` and `.ai/SESSION.md` to project root

## Limitations vs Claude Code

| Feature | Cursor | Notes |
|---|---|---|
| Guard (git interception) | Not available | Use manual discipline or pre-commit hooks |
| `/command` skills | Not available | Use `@prompt` references instead |
| Multi-file editing | Composer | Use Composer for large refactors |
| Auto skill selection | Manual | You choose which prompt to reference |

### Session Management (Two-Command Handoff)

Cursor does not persist context across sessions. Use `@prompt` references:

**End session:**
```
@.plobi-prompts/package.md
```
AI reads state, writes `.ai/SESSION.md`.

**Start session:**
```
@.plobi-prompts/resume.md
```
AI reads `.ai/SESSION.md` → `.ai/SESSION_TEMPLATES.md` → generates opening.

## Recommended Workflow

1. Paste `.cursorrules` into project
2. Create `docs/` with templates
3. In Chat: "Let's start Phase 1. @.plobi-prompts/explore.md"
4. When ready to converge: "@.plobi-prompts/grill.md"
5. For coding: "@.plobi-prompts/freeze.md — implement slice #2"
