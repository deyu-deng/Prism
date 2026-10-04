# Plobi Core Principles

## Human Sovereignty, AI Execution

The operator holds strategic sovereignty — what to build, how it should look, how it should feel. The AI executes tactical sprints within boundaries the operator defines. Physical documents defend against AI hallucination: rules are written into files, not left to AI self-discipline.

## Role Contract

| Role | Responsibility | Input | Output |
|------|---------------|-------|--------|
| **Operator** (You) | Strategic decisions | Ideas, choices, feedback | Vision, approval, rejection |
| **AI** | Tactical execution | Operator input + documents | Code, tests, docs, updates |

**You never need to:** write code, read tests, understand architecture, fix merge conflicts, or memorize skill names.

**You always need to:** describe what you want, choose between options AI presents, and say "pass" or "fix this" after seeing results.

## The 6 Phases

1. **Init** — Guardrails, scaffold, document templates
2. **Design** — Diverge, then converge into PROJECT.md
3. **Plan** — UI spec, vertical slices, task breakdown
4. **Develop** — TDD for new code, characterization tests for legacy
5. **Extend** — Add features (L1-L4 depending on complexity)
6. **Fix** — Disciplined diagnosis with 6-phase dissect

## Key Mechanics

### Document Layering

- `.docs/` — Operator view: PROJECT.md, PROGRESS.md, ARCHITECTURE.md, DESIGN.md
- `.ai/` — AI execution context: `.ai/CONTEXT.md`, `.ai/DECISIONS/`, `.ai/TESTS/`, `.ai/DEBT.md`, `.ai/SESSION.md`

### Vertical Slices

Each slice is an end-to-end, demoable feature (database + API + UI + tests). Not horizontal layers.

**Exception:** Phase 0.5 Infrastructure Slices are allowed for pure scaffolding (max 2-3 per project).

### Freeze Line

Once a decision is written into `.ai/CONTEXT.md` or `.docs/PROJECT.md`, it is frozen. Can only append, never modify. To change: mini-grill + ADR explaining why.

**Errata lane:** Typos, broken links, outdated references may be fixed without ADR. Log the change in SESSION.md.

### Veto

Rejected decisions are recorded permanently in `.ai/DECISIONS/VETO-*.md`. Future sessions check veto files before re-opening closed branches.

### Feedback Loop

No progress without a pass/fail signal. Tests first. Always.

### Physical Documents

All context lives in files, not in AI memory. Session ends, memory resets, documents persist.

### Legacy Code (Thaw)

Existing untested code is onboarded via `thaw`:

1. Write characterization test to lock current behavior
2. If un-testable: mark LEGACY in DEBT.md, isolate from new slices
3. Replace via dedicated slices using standard `freeze` (TDD)

### Extension Levels

| Level | Type | Examples | Flow |
|-------|------|----------|------|
| L1 | Configuration | Add Agent, change model | AI auto-executes |
| L2 | Plugin | Install MCP tool | AI auto-executes |
| L3 | Component | New preview type, UI panel | Simplified design → slice → develop |
| L4 | Core | New protocol, architecture | Full Phase 1-3 |

### Quality Gate

Un-testable code cannot enter freeze. Fuse scan flags shallow modules; new slices must not depend on LEGACY modules.

### Context Isolation

Different task types get different session windows. One window, one thing.

- **Feature Session** for coding, **Debug Session** for errors, **Environment Session** for tooling — never mix them
- Open a new window when: topic changes, 10+ rounds without resolution, AI starts cycling, or architecture decisions need reversal
- End sessions with `/package` → writes `.ai/SESSION.md` with full state
- Start sessions with `/resume` → reads `.ai/SESSION.md` + templates, rebuilds context from files
- Never rely on AI "memory" with phrases like "continue" — all context comes from physical documents

### Acceptance

- **Checklist** (default): AI provides 3-5 verification steps, you click through and reply "pass"
- **Screenshot** (visual/UI): You run app, screenshot, AI compares against DESIGN.md
