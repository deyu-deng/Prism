---
name: plobi-resume
description: Start a new session by reading .ai/SESSION.md and generating a self-contained opening message. Never rely on AI memory.
user_invocable: true
auto_invocable: false
---

# /resume — Session Initialization

## Core duty

When a new conversation window opens, reconstruct full context from physical documents and generate a self-contained opening message. Never rely on AI "memory."

## Process

### Step 1: Read Physical Documents (mandatory order)

```
1. .ai/SESSION.md      → last session state, blockers, next steps
2. .ai/SESSION_TEMPLATES.md → templates for opening messages
3. .ai/CONTEXT.md      → tech stack, API contracts, data models
4. .docs/PROJECT.md    → vision, shipped features, backlog
5. .docs/PROGRESS.md   → current slice status
```

**If SESSION_TEMPLATES.md does not exist:** Generate a basic opening from SESSION.md + PROJECT.md + CONTEXT.md.

### Step 2: Determine Session Type

| User Input Pattern | Session Type | Template Section |
|-------------------|-------------|------------------|
| "Implement", "Add feature", "Write code", "Build" | Feature Session | `## Feature Session` |
| "Bug", "Error", "Fix", "Broken", "Crash", "Not working" | Debug Session | `## Debug Session` |
| "Install", "Setup", "conda", "pip", "npm", "Toolchain", "Environment" | Environment Session | `## Environment Session` |
| "Explain", "How does", "Read code", "Understand", "Research" | Explore Session | `## Explore Session` |
| "Review", "Check", "Audit", "Verify", "Look at this code" | Review Session | `## Review Session` |
| "完善工作流", "改进 Helm", "Meta Session", "refine workflow" | Meta Session | `## Meta Session` |
| "Continue", "Resume", "Pick up", "Next" (ambiguous) | Read SESSION.md "Next Session Starting Point" | Use indicated type, or ask user |

### Step 3: Auto-Fill Variables

Extract from documents and fill template variables:

| Variable | Source Document | Extraction Method |
|----------|----------------|-------------------|
| `PROJECT_NAME` | PROJECT.md | First H1 heading |
| `TECH_STACK` | CONTEXT.md | "Tech stack" section or inferred from files |
| `CURRENT_PHASE` | PROGRESS.md | "Current Sprint" table, first pending/in-progress item |
| `BLOCKERS` | SESSION.md | "Open issues" or "Blockers" section |
| `OS` | Environment | Detect from system (Windows/macOS/Linux) |
| `VERSION` | package.json / requirements.txt / Cargo.toml | Read version field |
| `PROJECT_PATH` | Working directory | Current working directory |

### Step 4: Generate Opening Message

Assemble the complete opening from template + filled variables. **Do not show the template with brackets** — output a clean, ready-to-send message.

**Example output for Environment Session:**

```
I am the developer of Plobi Agent, experiencing environment configuration issues.

System info:
- OS: Windows 11
- Shell: PowerShell
- Python: Miniconda (D:\Development\Miniconda)
- Node: v20.x
- Project path: D:\Projects\Code\Plobi\Vaelis

Problem:
[Waiting for user to paste error]

Expected outcome:
[Waiting for user to describe desired state]

Please help me diagnose and fix, with specific commands.
```

### Step 5: Execute or Confirm

**If user input is explicit (clear intent + context):**
- Skip confirmation. Generate opening internally, then proceed directly to execution.
- Examples of explicit input: "修环境", "conda 坏了", "看这个 Bug", "开 Feature Session"

**If user input is ambiguous ("continue", "resume", "pick up"):**
- Present the generated opening for confirmation.
- Wait for user "send" or "fix X" before proceeding.

## Anti-Patterns (Forbidden)

1. **Never say** "As we discussed before..." or "Continuing from earlier..." — AI has no memory of previous conversations.
2. **Never output** a template with unfilled `{{variables}}` — always fill or omit.
3. **Never guess** project state if documents are missing — state clearly: "SESSION.md not found. Please describe current state."
4. **Never proceed** without user confirmation of the opening message — this is the quality gate.

## Fallback (Missing Documents)

If `.ai/SESSION.md` does not exist:

```
I could not find `.ai/SESSION.md`. Starting fresh.

Please provide:
1. Project name and current goal
2. What you were working on last
3. Any blockers or errors

Or run the scaffold skill to create document templates.
```
