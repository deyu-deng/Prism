# Forge — Create New Skill

**Meta-skill.** Create new agent skills with proper structure, progressive disclosure, and bundled resources.

## Trigger

- "Forge a new skill"
- "Create a skill for X"

## Process

1. **Gather requirements**
   - What task/domain does skill cover?
   - Specific use cases?
   - Executable scripts or just instructions?
   - Reference materials?

2. **Draft skill**
   - SKILL.md with concise instructions
   - Additional reference files if content exceeds 500 lines
   - Utility scripts if deterministic operations needed

3. **Review with user**
   - Does this cover use cases?
   - Anything missing or unclear?
   - More/less detail needed?

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
name: skill-name
description: Brief description. Use when [specific triggers].
---

# Skill Name

## Quick start
[Minimal working example]

## Workflows
[Step-by-step processes with checklists]

## Advanced features
[Link to separate files]
```

## Description Requirements

Description is **the only thing agent sees** when deciding which skill to load.

**Goal:** Give agent just enough info to know:
1. What capability this provides
2. When/why to trigger it

**Format:**
- Max 1024 chars
- Third person
- First sentence: what it does
- Second sentence: "Use when [specific triggers]"

**Good:**
```
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

**Bad:**
```
Helps with documents.
```

## When to Add Scripts

- Operation is deterministic (validation, formatting)
- Same code would be generated repeatedly
- Errors need explicit handling

## When to Split Files

- SKILL.md exceeds 100 lines
- Content has distinct domains
- Advanced features rarely needed

## Review Checklist

- [ ] Description includes triggers ("Use when...")
- [ ] SKILL.md under 100 lines
- [ ] No time-sensitive info
- [ ] Consistent terminology
- [ ] Concrete examples included
- [ ] References one level deep
