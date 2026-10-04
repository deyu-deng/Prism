# Plobi Domain Glossary

## Baseline
A pristine git commit state with zero uncommitted changes. The absolute, immutable starting point before surgery.
_Avoid_: dirty tree, loose changes.

## Surgical Dissection
The process of isolating a regression or defect by freezing a 2-second deterministic fail-to-pass feedback loop before executing implementation fixes.
_Avoid_: loose debugging, vibe guessing.

## Deep Fusion
The architectural practice of collapsing scattered shallow components into high-leverage modules with minimal interface footprints to save cognitive load.
_Avoid_: shallow abstraction, boilerplate pass-through.

## Freeze
Test-driven development with a red-green-refactor loop. Write one failing test, write minimal code to pass, repeat. Never refactor while RED.

## Thaw
Legacy code onboarding process. Write characterization tests to lock existing behavior, assess quality via fuse scan, mark un-testable modules as LEGACY in DEBT.md, and plan replacement slices.
_Avoid_: rewriting legacy without characterization tests, allowing new slices to depend on LEGACY modules.

## Veto
A permanently recorded rejection of a feature request or design direction. Prevents repeated re-litigation across sessions.

## Vertical Slice
An end-to-end, independently demoable feature that cuts through all layers (schema, API, UI, tests). Preferred over horizontal layer-by-layer implementation.

## Infrastructure Slice
A Phase 0.5 exception for pure scaffolding work (e.g., "Setup Tailwind", "Configure database") that unlocks subsequent vertical slices. Maximum 2-3 per project.

## HITL vs AFK
- **HITL** (Human In The Loop): Requires human decision before proceeding.
- **AFK** (Away From Keyboard): AI can complete autonomously.

## Guard
Physical interception of dangerous operations (git push, reset --hard, clean, branch -D) at the tool level, not the policy level.

## Compression
Ultra-terse communication mode that drops filler while preserving full technical accuracy. Used to conserve token budget during implementation phases.

## Package
Cross-session handoff document (`.ai/SESSION.md`) that allows a fresh agent to continue work without context loss.

## Extension Levels (L1-L4)
Classification system for feature additions based on complexity and risk:
- **L1** — Configuration changes (no code, JSON only)
- **L2** — Plugin installations (external dependency, no core change)
- **L3** — Component additions (within existing extension points)
- **L4** — Core changes (new protocols, schemas, architectures)

## Characterization Test
A test that documents existing behavior of legacy code without judging correctness. Used in thaw to create a safety net before refactoring.

## Deep Module
A module with a small, simple interface that hides significant implementation complexity. The ideal module shape.
_Avoid_: shallow modules (large interface, little hidden complexity).

## Shallow Module
A module with a complex interface that does not hide much complexity. Anti-pattern. Example: a 333-line React component that mixes UI, parsing, HTTP, and file system calls.

## God Function
A single function that handles too many concerns, becoming untestable and unmaintainable. Common symptom of shallow architecture.
_Avoid_: functions over 50 lines that mix HTTP, DB, business logic, and side effects.
