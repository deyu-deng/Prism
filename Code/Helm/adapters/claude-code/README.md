# Plobi Skills for Claude Code

## Installation

Claude Code reads skills from the **global** `~/.claude/skills/` directory only.
Project-level `.claude/skills/` is currently ignored.

### macOS / Linux

```bash
# Copy skills to global directory
cp -r path/to/Helm/adapters/claude-code/skills/* ~/.claude/skills/

# Or symlink (auto-syncs when Helm updates)
./Helm/adapters/claude-code/scripts/link-skills.sh
```

### Windows

```powershell
# Copy skills to global directory
Copy-Item -Path "path\to\Helm\adapters\claude-code\skills\*" -Destination "$env:USERPROFILE\.claude\skills\" -Recurse -Force
```

> **Note:** Windows symbolic links require Developer Mode or admin privileges. Use `Copy-Item` unless you have Developer Mode enabled.

### Verification

After installation, run `/skills` in Claude Code. You should see:

- `plobi-package` — End session, write `.ai/SESSION.md`
- `plobi-resume` — Start session, read `.ai/SESSION.md`
- `plobi-grill` — Interrogation until convergence
- `plobi-freeze` — TDD red-green-refactor
- ...and all other Plobi skills

If skills don't appear, restart Claude Code or wait for the skill cache to refresh.

## Session Management Quick Start

1. **End a session:** Type `/package` — AI writes handoff doc to `.ai/SESSION.md`
2. **Start a new session:** Open new window, type `/resume` — AI reads docs, generates opening
3. **Continue work:** Confirm or correct the opening, then proceed

## Skills Reference

| Skill | Command | Purpose |
|-------|---------|---------|
| guard | `/guard` | Block dangerous git operations |
| scaffold | `/scaffold` | Create project structure |
| compress | `/compress` | Ultra-terse mode |
| explore | `/explore` | Divergent requirement discovery |
| recon | `/recon` | Market and technology research |
| grill | `/grill` | Relentless interrogation until convergence |
| design | `/design` | UI/UX design specification |
| synthesize | `/synthesize` | Generate PRD from context |
| slice | `/slice` | Break PRD into vertical slices |
| freeze | `/freeze` | TDD red-green-refactor |
| thaw | `/thaw` | Legacy code onboarding |
| dissect | `/dissect` | 6-phase bug diagnosis |
| fuse | `/fuse` | Architecture improvement scans |
| map | `/map` | Codebase module mapping |
| tidy | `/tidy` | Enforce structure hygiene |
| package | `/package` | Cross-session handoff (write SESSION.md) |
| resume | `/resume` | Session initialization (read SESSION.md) |
| forge | `/forge` | Create new skills |

## Architecture

Each skill is a directory under `skills/` containing:

```
skills/plobi-<name>/
  SKILL.md           # Required. Frontmatter + prompt body
  DEEPENING.md       # Optional. Extended context for complex cases
  scripts/           # Optional. Helper scripts
  templates/         # Optional. Reusable templates
```

The `SKILL.md` frontmatter follows the [Agent Skills Open Standard](https://code.claude.com/docs/en/skills):

```yaml
---
name: skill-name
description: What this skill does
user_invocable: true      # Allow /skill-name invocation
auto_invocable: false     # Allow auto-trigger from natural language
---
```
