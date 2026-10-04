# Plobi — Engineering Sovereignty Workflow

**Human sovereignty, AI execution, physical documents against hallucination.**

[English](README.md) | [简体中文](README.zh-CN.md)

---

Plobi is a structured software development workflow designed for human-AI collaboration. It gives you (the human) strategic control over what gets built while letting AI handle tactical implementation within clearly defined boundaries.

## Quick Start

### 1. Pick Your Tool

| Tool | Setup | Instructions |
|------|-------|-------------|
| **Claude Code** | Copy `adapters/claude-code/` skills to `~/.claude/skills/` | [README](adapters/claude-code/README.md) |
| **Cursor** | Copy `.cursorrules` to project root | [README](adapters/cursor/README.md) |
| **Windsurf** | Copy `.windsurfrules` to project root | [README](adapters/windsurf/README.md) |
| **VSCode + Copilot** | Copy `copilot-instructions.md` to `.github/` | [README](adapters/vscode-copilot/README.md) |
| **Antigravity** | Reference prompts inline | [README](adapters/antigravity/README.md) |
| **Any other AI tool** | Use `prompts/` directly | Reference `core/principles.md` + `prompts/[skill].md` |

### 2. Initialize Your Project

```text
Phase 0: Init
  1. Guard     — protect against dangerous git operations
  2. Scaffold  — create .docs/ and .ai/ folders with templates
  3. Templates — copy session templates to .ai/SESSION_TEMPLATES.md (optional)
  4. Compress  — enable terse mode (optional)
```

### 3. Run the 6-Phase Workflow

```text
Phase 1: Design    → explore needs, grill until converged, write PROJECT.md
Phase 2: Plan      → UI spec, slice into vertical tasks
Phase 3: Develop   → TDD for new code, characterization tests for legacy
Phase 4: Extend    → L1-L4 feature additions
Phase 5: Fix       → 6-phase disciplined diagnosis
Phase 6: Optimize  → architecture scans, debt tracking
```

Full workflow documentation: [`core/workflow.md`](core/workflow.md) | [`core/workflow.zh.md`](core/workflow.zh.md)

## Repository Structure

```text
plobi/
├── core/                          # Tool-agnostic core
│   ├── principles.md              # Core principles
│   ├── glossary.md                # Domain terminology
│   ├── workflow.md                # Complete 6-phase workflow (English)
│   └── workflow.zh.md             # Complete 6-phase workflow (Chinese)
├── prompts/                       # Tool-agnostic skill prompts
│   ├── compress.md
│   ├── explore.md
│   ├── recon.md
│   ├── grill.md
│   ├── design.md
│   ├── synthesize.md
│   ├── slice.md
│   ├── freeze.md
│   ├── thaw.md                    # Legacy code onboarding
│   ├── dissect.md
│   ├── fuse.md
│   ├── map.md
│   ├── package.md
│   ├── tidy.md
│   ├── scaffold.md
│   └── forge.md
├── docs/                          # Document templates
│   ├── PROJECT.md                 # Project development book
│   ├── PROGRESS.md                # Task progress tracker
│   ├── ARCHITECTURE.md            # Architecture diagrams
│   ├── CONTEXT.md                 # Project context (for .ai/)
│   ├── DESIGN.md                  # UI design specification
│   └── RESEARCH.md                # Tech research
├── templates/                     # Session opening templates
│   └── SESSION_TEMPLATES.md       # Auto-filled opening messages
├── decisions/                     # Decision records (adopted + vetoed)
│   ├── adr/                       # Architecture Decision Records
│   └── veto/                      # Rejected decisions
├── adapters/                      # Tool-specific implementations
│   ├── claude-code/               # Native skill system
│   ├── cursor/                    # .cursorrules + @prompts
│   ├── windsurf/                  # .windsurfrules
│   ├── vscode-copilot/            # copilot-instructions.md
│   └── antigravity/               # Inline prompt references
└── examples/                      # Example project setups
```

## 18 Skills

| Skill | Phase | Purpose |
|-------|-------|---------|
| **guard** | 0 | Block dangerous git operations |
| **scaffold** | 0 | Create project structure and templates |
| **compress** | All | Ultra-terse communication mode |
| **explore** | 1 | Divergent requirement discovery |
| **recon** | 1 | Market and technology research |
| **grill** | 1, 2, 5 | Relentless interrogation until convergence |
| **design** | 2 | UI/UX design specification |
| **synthesize** | 2 | Generate PRD from context |
| **slice** | 2 | Break PRD into vertical slices |
| **freeze** | 3 | TDD red-green-refactor for new code |
| **thaw** | 3 | Legacy code onboarding and isolation |
| **dissect** | 5 | 6-phase bug diagnosis |
| **fuse** | 3, 6 | Architecture improvement scans |
| **map** | Any | Codebase module mapping |
| **package** | Any | Cross-session handoff (write SESSION.md) |
| **resume** | Any | Session initialization (read SESSION.md + generate opening) |
| **tidy** | Any | Enforce structure hygiene and naming conventions |
| **forge** | Meta | Create new skills |

## Key Concepts

### Document Layering
- `.docs/` — Operator view: PROJECT.md, PROGRESS.md, ARCHITECTURE.md, DESIGN.md
- `.ai/` — AI execution context: `.ai/CONTEXT.md`, `.ai/DECISIONS/`, `.ai/TESTS/`, `.ai/DEBT.md`, `.ai/SESSION.md`, `.ai/SESSION_TEMPLATES.md`

### Context Isolation (Session Management)

Different tasks get different conversation windows. One window, one thing.

| Session Type | Use For | Never Mix With |
|-------------|---------|---------------|
| **Feature** | Coding, design, implementation | Environment fixes, debugging |
| **Debug** | Bug diagnosis, error fixing | New requirements, feature work |
| **Environment** | Dependency install, toolchain setup | Business logic, code writing |
| **Explore** | Code reading, research, architecture | Implementation, code changes |
| **Review** | Code review, acceptance testing | Implementation changes |

**Split signals:** Topic change, 10+ rounds without resolution, AI cycling suggestions, architecture reversals.

**Cross-window handoff:** All state lives in `.ai/SESSION.md`. New windows start by reading SESSION.md + SESSION_TEMPLATES.md + PROJECT.md. Never rely on AI "memory."

### Vertical Slices
Each task is an end-to-end, demoable feature (database + API + UI + tests) — not a horizontal layer.

### Extension Levels
| Level | Type | Examples | Flow |
|-------|------|----------|------|
| **L1** | Configuration | Add Agent, change model | AI auto-executes |
| **L2** | Plugin | Install MCP tool | AI auto-executes |
| **L3** | Component | New preview type, UI panel | Simplified design |
| **L4** | Core | New protocol, architecture | Full Phase 1-3 |

### Freeze Line
Once a decision is written to `.ai/CONTEXT.md` or `.docs/PROJECT.md`, it's frozen. Can only append, never modify. To change: mini-grill + ADR explaining why.

### Veto
Rejected decisions are permanently recorded. Future sessions check before re-litigating.

### Feedback Format

Structured bug reports prevent "fix one, break two":

```text
[Location] Which page/feature
[Action] What I did
[Expected] What I thought would happen
[Actual] What actually happened
[Impact] Severity (blocks usage / bad experience / minor)
```

## Philosophy

1. **You decide what to build.** AI decides how to implement.
2. **Physical documents over memory.** All context lives in files. Sessions end; documents persist.
3. **Tests are the feedback loop.** No progress without a pass/fail signal.
4. **One slice at a time.** Complete and verify before moving on.
5. **Legacy code is not trash.** Characterize, isolate, replace — never rewrite without a safety net.

## Contributing

Plobi is a personal workflow evolved through real project use. To contribute:

1. Use it on a real project
2. Identify friction points
3. Propose changes via the workflow itself (explore → grill → synthesize → slice → freeze)

## License

MIT — Use, modify, share freely. Attribution appreciated.
