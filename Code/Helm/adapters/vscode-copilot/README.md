# VSCode + GitHub Copilot Adapter for Plobi

## Setup

1. Copy `copilot-instructions.md` to your project as `.github/copilot-instructions.md`
2. Or add to VSCode settings: `github.copilot.chat.codeGeneration.instructions`

## Usage

### Global Instructions
Copilot reads `copilot-instructions.md` for context on every interaction.

### Skill Prompts
Copilot doesn't have a built-in `@prompt` system like Cursor. Use these approaches:

**Option A: Inline reference**
Paste the relevant skill prompt content into chat before your request:

```
[ paste content of prompts/freeze.md ]

Now implement slice #2: user can delete todos.
```

**Option B: Workspace files**
Copy `prompts/` to `.plobi-prompts/` in your project. Reference them in chat:

```
Read .plobi-prompts/grill.md and start grilling this design.
```

### Session Management (Two-Command Handoff)

Copilot does not persist context across sessions. Use inline prompts:

**End session:** Paste content of `prompts/package.md` into chat.
AI reads state, writes `.ai/SESSION.md`.

**Start session:** Paste content of `prompts/resume.md` into chat.
AI reads `.ai/SESSION.md` → `.ai/SESSION_TEMPLATES.md` → generates opening.

### Document Templates
Use templates from `../../docs/`.

## Limitations

| Feature | Copilot | Notes |
|---|---|---|
| Guard | Not available | Use manual discipline |
| Multi-file orchestration | Limited | Use Copilot Edits or Chat + Apply |
| Skill commands | Not available | Inline prompts only |
| Persistent docs | Manual | You manage file creation |

## Recommended Workflow

1. Set up `copilot-instructions.md` with Plobi rules
2. Create `docs/` folder with templates
3. In Copilot Chat, paste skill prompt inline before request
4. Use "Apply in Editor" for code changes
5. Manually verify tests pass
