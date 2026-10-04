# Dissect — Disciplined Diagnosis

**Phase 5 position:** Bug fix.

**Core duty:** Systematic 6-phase diagnosis for hard bugs and performance regressions. No guessing.

## Trigger

- "Diagnose this"
- "Debug this"
- "Something is broken"
- "Performance regression"

## Phase 1 — Build Feedback Loop

**This is the skill.** Everything else is mechanical.

If you have a fast, deterministic, agent-runnable pass/fail signal, you will find the cause. Without one, no amount of code staring will help.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Ways to construct a loop (try in order)

1. **Failing test** at seam reaching bug
2. **Curl / HTTP script** against running dev server
3. **CLI invocation** with fixture, diff stdout against snapshot
4. **Headless browser script** (Playwright / Puppeteer)
5. **Replay captured trace** — save real request/payload/event, replay in isolation
6. **Throwaway harness** — minimal subset exercising bug path
7. **Property / fuzz loop** — 1000 random inputs for "sometimes wrong" bugs
8. **Bisection harness** — automate "boot at state X, check, repeat" for git bisect
9. **Differential loop** — run input through old vs new version, diff outputs
10. **HITL script** — last resort, structure human's clicking

Build the right loop, bug is 90% fixed.

### Iterate on the loop

- Can I make it faster?
- Can I make signal sharper?
- Can I make it more deterministic?

A 30-second flaky loop is barely better than none. A 2-second deterministic loop is a superpower.

### Non-deterministic bugs

Goal is not clean repro but **higher reproduction rate**. Loop trigger 100x, parallelize, add stress, inject sleeps. 50% flake is debuggable; 1% is not.

### When genuinely cannot build loop

Stop. Say so explicitly. List what you tried. Ask user for: (a) access to repro environment, (b) captured artifact, (c) permission for temporary production instrumentation. **Do NOT proceed to hypothesis without a loop.**

## Phase 2 — Reproduce

Run loop. Watch bug appear.

- [ ] Loop produces failure mode **user** described — not a different nearby failure
- [ ] Failure reproducible across runs (or high enough rate for non-deterministic)
- [ ] Exact symptom captured (error message, wrong output, slow timing)

## Phase 3 — Hypothesize

Generate **3–5 ranked hypotheses** before testing any.

Each must be **falsifiable**: state prediction.

> Format: "If <X> is cause, then <changing Y> makes bug disappear / <changing Z> makes it worse."

Show ranked list to user before testing. They often have domain knowledge that re-ranks instantly.

## Phase 4 — Instrument

Each probe maps to specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:
1. Debugger / REPL inspection
2. Targeted logs at hypothesis-distinguishing boundaries
3. Never "log everything and grep"

**Tag every debug log** with unique prefix `[DEBUG-xxxx]`. Cleanup = single grep.

**Perf branch:** For performance regressions, logs are usually wrong. Establish baseline measurement first, then bisect. Measure first, fix second.

## Phase 5 — Fix + Regression Test

Write regression test **before fix** — but only if **correct seam** exists.

Correct seam: exercises **real bug pattern** as it occurs at call site. If only shallow seam available, regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Flag for architecture improvement.

If correct seam exists:
1. Turn minimized repro into failing test
2. Watch it fail
3. Apply fix
4. Watch it pass
5. Re-run Phase 1 loop against original scenario

## Phase 6 — Cleanup + Post-mortem

- [ ] Original repro no longer reproduces
- [ ] Regression test passes (or seam absence documented)
- [ ] All `[DEBUG-...]` removed
- [ ] Throwaway prototypes deleted
- [ ] Correct hypothesis stated in commit/PR message

**Then ask: what would have prevented this bug?** If answer involves architectural change, hand off to fuse with specifics. Make recommendation **after** fix, not before.
