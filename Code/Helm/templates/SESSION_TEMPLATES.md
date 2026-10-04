# Session Opening Templates

> Usage: Tell the AI "open [type] session". The AI auto-reads this file + SESSION.md + PROJECT.md and assembles a complete opening message.
> You only need to confirm or add 1-2 sentences.

---

## Feature Session (Write Features / Design)

```
I am the developer of {{PROJECT_NAME}}. Current need: {{ONE_SENTENCE_NEED}}.

Project background:
- Tech stack: {{TECH_STACK}}
- Current phase: {{CURRENT_PHASE}}
- Relevant docs: {{RELEVANT_DOCS}}

Please help me implement: {{SPECIFIC_TASK}}
Requirements:
1. {{ACCEPTANCE_1}}
2. {{ACCEPTANCE_2}}
3. Do not modify unrelated files

Blockers: {{BLOCKERS}}
```

**Auto-filled by AI:**
- `PROJECT_NAME` → from `.docs/PROJECT.md`
- `TECH_STACK` → from `.ai/CONTEXT.md`
- `CURRENT_PHASE` → from `.docs/PROGRESS.md`
- `BLOCKERS` → from `.ai/SESSION.md`

**You provide (1-2 sentences):**
- `ONE_SENTENCE_NEED`: one sentence describing the need
- `SPECIFIC_TASK`: what exactly to do

---

## Debug Session (Fix Bugs / Diagnose Errors)

```
I am the developer of {{PROJECT_NAME}}, encountering an error in {{MODULE}}.

System info:
- OS: {{OS}}
- Language/tool version: {{VERSION}}
- Project path: {{PROJECT_PATH}}

Problem:
{{FULL_ERROR}}

I have tried:
{{TRIED_SOLUTIONS}}

Please help me diagnose the root cause and provide specific fix commands.
```

**Auto-filled by AI:**
- `PROJECT_NAME`, `PROJECT_PATH` → known
- `OS` → current system
- `VERSION` → inferred from package.json / requirements.txt

**You provide (copy-paste):**
- `FULL_ERROR`: full error message
- `TRIED_SOLUTIONS`: solutions you tried (write "none" if none)

---

## Environment Session (Install Dependencies / Fix Toolchain)

```
I am the developer of {{PROJECT_NAME}}, experiencing environment configuration issues.

System info:
- OS: {{OS}}
- Shell: {{SHELL}}
- Python: {{PYTHON_VERSION}}
- Node: {{NODE_VERSION}}
- Project path: {{PROJECT_PATH}}

Problem:
{{FULL_ERROR}}

Expected outcome:
{{EXPECTED}}

Please help me diagnose and fix, with specific commands.
```

**Auto-filled by AI:** all auto-detected

**You provide:**
- `FULL_ERROR`: error message
- `EXPECTED`: desired state (e.g. "conda activates normally")

---

## Explore Session (Read Code / Research)

```
I want to understand how {{MODULE}} works in {{PROJECT_NAME}}.

Scope: {{SCOPE}}
Relevant files: {{FILES}}

Please help me analyze: {{QUESTION}}
Output format: {{FORMAT}}
```

**You provide (1-2 sentences):**
- `MODULE` / `QUESTION`: what you want to understand
- `SCOPE` (optional): limit the scope

---

## Review Session (Code Review / Acceptance)

```
Please help me review the following changes in {{PROJECT_NAME}}:

Change summary:
{{SUMMARY}}

Focus areas:
{{FOCUS}}

Reference docs:
{{REFS}}

Please check: code quality, DESIGN.md compliance, side effects.
```

**You provide:**
- `SUMMARY`: what changed (or paste git diff)
- `FOCUS`: what to specifically check (optional)

---

## Meta Session (Refine Workflow / Improve Helm)

```
I am the developer of {{PROJECT_NAME}}, running a Meta Session to refine the workflow itself.

Meta context:
- Workflow goal: {{WORKFLOW_GOAL}}
- Sandbox project: {{SANDBOX_PROJECT}}
- Feedback loop observed: {{FEEDBACK_LOOP}}

What I want to improve:
{{IMPROVEMENT_DESCRIPTION}}

Current workflow step causing friction:
{{FRICTION_POINT}}

Please help me refine: {{SPECIFIC_IMPROVEMENT}}
```

**Auto-filled by AI:**

- `PROJECT_NAME` → from `.docs/PROJECT.md`
- `SANDBOX_PROJECT` → from `.ai/SESSION.md` or current project
- `FEEDBACK_LOOP` → from `.ai/SESSION.md`

**You provide (1-2 sentences):**

- `WORKFLOW_GOAL`: what the workflow should achieve
- `IMPROVEMENT_DESCRIPTION`: what you want to improve
- `FRICTION_POINT`: where the current workflow causes friction (optional)

---

## Shortcut Commands (Say These)

| You Say | AI Auto-Does |
|---------|-------------|
| "Open Feature Session" | Assembles Feature template, waits for your need |
| "Fix environment" / "conda broken" | Assembles Environment template, waits for error paste |
| "Look at this bug" | Assembles Debug template, waits for error paste |
| "Explain X module" | Assembles Explore template, auto-finds relevant files |
| "Review this code" | Assembles Review template, waits for change summary |
| "Meta Session" / "完善工作流" / "改进 Helm" | Assembles Meta template, waits for workflow goal and feedback loop |

---

*Auto-read and filled by AI. Human only confirms or supplements.*
