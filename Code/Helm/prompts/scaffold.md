# Scaffold — Project Bootstrap

**Phase 0 position:** First step after guard.

**Core duty:** Set up per-repo configuration that skills need: issue tracker, triage labels, domain doc layout.

## Trigger

- First use of project
- Missing context about issue tracker, labels, or domain docs

## Process

### 1. Explore

- `git remote -v` — GitHub? GitLab? Self-hosted?
- Check existing `AGENTS.md` / `CLAUDE.md` / `PLOBI.md`
- Check `.ai/CONTEXT.md`, `.ai/CONTEXT-MAP.md`
- Check `.ai/DECISIONS/`, `.ai/agents/`
- Check `.scratch/` — local markdown tracker convention?

### 2. Present and Ask

Summarize present vs missing. Walk user through three decisions **one at a time**.

Assume user doesn't know these terms. Each section starts with short explainer.

**Section A — Issue tracker.**

Default posture: designed for GitHub. If `git remote` points at GitHub, propose that. If GitLab, propose GitLab. Otherwise:
- **GitHub** — uses `gh` CLI
- **GitLab** — uses `glab` CLI
- **Local markdown** — files under `.scratch/<feature>/`
- **Other** — user describes workflow in one paragraph

**Section B — Triage labels.**

Five canonical roles:
- `needs-triage` — maintainer needs to evaluate
- `needs-info` — waiting on reporter
- `ready` — fully specified, can be picked up autonomously
- `ready-for-human` — needs human implementation
- `wontfix` — will not be actioned

Default: each role string equals name. Ask if override needed.

**Section C — Domain docs.**

- **Single-context** — one `.ai/CONTEXT.md` + `.ai/DECISIONS/` at root
- **Multi-context** — `.ai/CONTEXT-MAP.md` at root pointing to per-context files (monorepo)

### 3. Confirm and Edit

Show draft of:
- Agent skills block
- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`

Let user edit before writing.

### 4. Write Entry Document

Create `.docs/README.md` as the human-facing entry point. It serves as:

- Project homepage for GitHub/GitLab
- Unified index to all `.docs/` and `.ai/` documents
- Feature overview for non-technical operators

Template includes:

- One-sentence vision
- Feature panorama (shipped + backlog)
- Document index table (links to PROJECT.md, PROGRESS.md, ARCHITECTURE.md, DESIGN.md)
- Tech stack
- Quick start
- Project structure

### 5. Write Agent Config

Pick file to edit:
- If `PLOBI.md` exists, edit it
- Else if `AGENTS.md` exists, edit it
- Else ask user which to create

Never create duplicate. Update in-place if block already exists.

Agent skills block:
```markdown
## Agent skills

### Issue tracker
[one-line summary]. See `docs/agents/issue-tracker.md`.

### Triage labels
[one-line summary]. See `docs/agents/triage-labels.md`.

### Domain docs
[one-line summary]. See `docs/agents/domain.md`.
```

Write three docs files from seed templates:
- `issue-tracker-[github|gitlab|local].md`
- `triage-labels.md`
- `domain.md`

For "other" trackers, write from scratch using user description.

### 5. Done

Tell user setup complete. Mention they can edit `docs/agents/*.md` directly — re-run only if switching trackers or restarting.
