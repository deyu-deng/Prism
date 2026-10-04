---
name: plobi-forge
description: Create new agent skills with proper structure, progressive disclosure, and bundled resources. Use when user wants to create, write, or build a new skill.
---

# Writing Skills

## Process

1. **Gather requirements** - ask user about:
   - What task/domain does the skill cover?
   - What specific use cases should it handle?
   - Does it need executable scripts or just instructions?
   - Any reference materials to include?

2. **Draft the skill** - create:
   - SKILL.md with concise instructions
   - Additional reference files if content exceeds 500 lines
   - Utility scripts if deterministic operations needed

3. **Review with user** - present draft and ask:
   - Does this cover your use cases?
   - Anything missing or unclear?
   - Should any section be more/less detailed?

4. **Install the skill** - copy to Claude Code's global skills directory:
   ```powershell
   # Windows
   Copy-Item -Path "Helm/adapters/claude-code/skills/plobi-<name>" -Destination "C:\Users\<you>\.claude\skills\" -Recurse -Force
   # macOS/Linux
   cp -r Helm/adapters/claude-code/skills/plobi-<name> ~/.claude/skills/
   ```
   > **Important:** Claude Code only reads skills from `~/.claude/skills/`. Project-level `.claude/skills/` is ignored. Restart Claude Code or wait for skill cache refresh, then verify with `/skills`.

5. **Update Helm documentation** - any new skill must be registered in these files:
   - `core/workflow.md` — Add to "Skills Overview" table (English)
   - `core/workflow.zh.md` — Add to "技能概览" table (Chinese)
   - `README.md` / `README.zh-CN.md` — Add to "18 Skills" table
   - `adapters/claude-code/CLAUDE.md` — Add to "Plobi Skills Infrastructure" list
   - `adapters/claude-code/README.md` — Add to "Skills Reference" table
   - Check other adapters (cursor, windsurf, vscode-copilot, antigravity) for skill lists that need updating
   - If the skill introduces new concepts (like session types), update relevant sections in `core/principles.md` and adapter docs

## Skill Structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── REFERENCE.md       # Detailed docs (if needed)
├── EXAMPLES.md        # Usage examples (if needed)
└── scripts/           # Utility scripts (if needed)
    └── helper.js
```

## SKILL.md Template

```md
---
name: plobi-skillname
description: Brief description of capability. Use when [specific triggers].
---

# Skill Name

## Quick start

[Minimal working example]

## Workflows

[Step-by-step processes with checklists for complex tasks]

## Advanced features

[Link to separate files: See [REFERENCE.md](REFERENCE.md)]
```

## Description Requirements

The description is **the only thing your agent sees** when deciding which skill to load. It's surfaced in the system prompt alongside all other installed skills. Your agent reads these descriptions and picks the relevant skill based on the user's request.

**Goal**: Give your agent just enough info to know:

1. What capability this skill provides
2. When/why to trigger it (specific keywords, contexts, file types)

**Format**:

- Max 1024 chars
- Write in third person
- First sentence: what it does
- Second sentence: "Use when [specific triggers]"

**Good example**:

```
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

**Bad example**:

```
Helps with documents.
```

The bad example gives your agent no way to distinguish this from other document skills.

## When to Add Scripts

Add utility scripts when:

- Operation is deterministic (validation, formatting)
- Same code would be generated repeatedly
- Errors need explicit handling

Scripts save tokens and improve reliability vs generated code.

## When to Split Files

Split into separate files when:

- SKILL.md exceeds 100 lines
- Content has distinct domains (finance vs sales schemas)
- Advanced features are rarely needed

## Review Checklist

After drafting, verify:

- [ ] **Frontmatter `name:` starts with `plobi-`** — Claude Code uses this field as the skill identifier. `name: package` will not show up in `/skills`; `name: plobi-package` will.
- [ ] Description includes triggers ("Use when...")
- [ ] SKILL.md under 100 lines
- [ ] No time-sensitive info
- [ ] Consistent terminology
- [ ] Concrete examples included
- [ ] References one level deep
