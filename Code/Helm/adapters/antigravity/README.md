# Antigravity Adapter for Plobi

## Setup

1. Copy the relevant prompt files from `prompts/` to your Antigravity workspace
2. Reference them in your Antigravity conversations as needed

## Usage

Antigravity doesn't have a built-in rules file or skill system. Use these approaches:

### Option A: System Prompt
If Antigravity supports custom system prompts, paste the contents of `.antigravityrules` as your system prompt.

### Option B: Reference Files
Store Plobi prompts in your workspace and reference them:

```
[Reference: core/principles.md]
[Reference: prompts/freeze.md]

Implement slice #2 with TDD.
```

### Option C: Conversation Starter

Begin each session with a complete opening constructed from physical documents. Never use "continue" or "pick up where we left off".

**Handoff protocol (two steps):**

1. **End session:** Reference `prompts/package.md` → AI writes `.ai/SESSION.md` with state
2. **Start session:** Reference `prompts/resume.md` → AI reads `.ai/SESSION.md` → `.ai/SESSION_TEMPLATES.md` → `.ai/CONTEXT.md` → `.docs/PROJECT.md` → generates opening

**Session types:**
- **Feature Session**: "Implement X" → include tech stack, current phase, acceptance criteria
- **Debug Session**: "Bug in Y" → include system info, full error, attempted solutions
- **Environment Session**: "Setup Z" → include OS, versions, project path, error output
- **Explore Session**: "Explain W" → include scope, relevant files, output format
- **Review Session**: "Check V" → include change summary, focus areas, reference docs
- **Meta Session**: "完善工作流", "改进 Helm", "Meta Session" → include workflow goal, sandbox project name, feedback loop being observed

**Minimal starter template (if files unavailable):**
```
We're using the Plobi workflow. Key rules:
- Vertical slices only (end-to-end features)
- Tests first (red-green-refactor)
- Frozen decisions in CONTEXT.md
- Structured bug reports with [Location][Action][Expected][Actual][Impact]
- New sessions always construct self-contained openings from physical documents

Current phase: [X]. Next task: [Y].
```

## Document Templates

Use templates from `../../docs/`.

## Limitations

| Feature | Antigravity | Notes |
|---|---|---|
| Guard | Not available | Manual discipline |
| Persistent rules | Depends on setup | May need per-session context |
| Skill commands | Not available | Inline reference |

## Recommended Workflow

1. Set up Plobi principles in Antigravity's system prompt (if supported)
2. Create `docs/` folder with templates
3. Reference skill prompts at start of each task
4. Maintain `.docs/PROGRESS.md` and `.ai/SESSION.md` manually
