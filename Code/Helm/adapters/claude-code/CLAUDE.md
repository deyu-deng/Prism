# Plobi Skills Infrastructure

Skills live under `skills/` with the naming convention `plobi-<skill>/SKILL.md`:

- `plobi-guard/` — Block dangerous git operations
- `plobi-scaffold/` — Create project structure and templates
- `plobi-compress/` — Ultra-terse communication mode
- `plobi-explore/` — Divergent requirement discovery
- `plobi-recon/` — Market and technology research
- `plobi-grill/` — Relentless interrogation until convergence
- `plobi-design/` — UI/UX design specification
- `plobi-synthesize/` — Generate PRD from context
- `plobi-slice/` — Break PRD into vertical slices
- `plobi-freeze/` — TDD red-green-refactor for new code
- `plobi-thaw/` — Legacy code onboarding (characterization tests + isolation)
- `plobi-dissect/` — 6-phase bug diagnosis
- `plobi-fuse/` — Architecture improvement scans
- `plobi-map/` — Codebase module mapping
- `plobi-package/` — Cross-session handoff (write SESSION.md)
- `plobi-resume/` — Session initialization (read SESSION.md + templates, generate opening)
- `plobi-tidy/` — Enforce structure hygiene and naming conventions
- `plobi-forge/` — Create new skills

Every active skill follows the `plobi-<name>/SKILL.md` pattern. AI agents are strictly forbidden from creating top-level folders outside this structure.

## Installing Skills

Claude Code reads skills from the **global** `~/.claude/skills/` directory only.

```bash
# macOS / Linux
cp -r adapters/claude-code/skills/* ~/.claude/skills/

# Windows (PowerShell)
Copy-Item -Path "adapters\claude-code\skills\*" -Destination "$env:USERPROFILE\.claude\skills\" -Recurse -Force
```

After copying, restart Claude Code or run `/skill reload` to pick up new skills.

## Session Management (Context Isolation)

When the operator indicates a new session window or topic switch (phrases like "new session", "switch to", "let's start fresh", or when the topic clearly shifts from coding to environment setup to debugging), you MUST:

1. **Read** `.ai/SESSION_TEMPLATES.md` if it exists in the project
2. **Read** `.ai/SESSION.md` for current state and blockers
3. **Auto-generate** a complete opening message based on session type

Supported session types:

| Type | Trigger | Auto-fill from |
|------|---------|---------------|
| **Feature Session** | "Implement", "Add feature", "Write code" | PROJECT.md, PROGRESS.md, CONTEXT.md |
| **Debug Session** | "Bug", "Error", "Fix", "Broken" | SESSION.md, recent commits, error context |
| **Environment Session** | "Install", "Setup", "conda", "pip", "npm", "Toolchain" | package.json, requirements.txt, Cargo.toml, OS |
| **Explore Session** | "Explain", "How does", "Read code", "Understand" | ARCHITECTURE.md, file tree, module docs |
| **Review Session** | "Review", "Check", "Audit", "Verify" | git diff, DESIGN.md, TESTS/STRATEGY.md |
| **Meta Session** | "完善工作流", "改进 Helm", "Meta Session" | Workflow goal + sandbox project name + feedback loop being observed |

**Never** start a new session with generic phrases like "continue", "pick up where we left off", or "as we discussed". Always construct a self-contained opening from physical documents. All context must come from files, not AI memory.
