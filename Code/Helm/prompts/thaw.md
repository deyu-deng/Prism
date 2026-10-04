# Thaw — Legacy Code Onboarding

**Phase 3 position:** For existing untested code, parallel to freeze.

**Core duty:** Characterize existing behavior, assess quality, isolate un-testable modules, and plan replacement.

## Trigger

- "We have existing code with no tests"
- "This module needs tests but is too tangled"
- "Legacy code onboarding"
- Before modifying untested modules

## Philosophy

Unlike freeze (which assumes green-field TDD), thaw acknowledges that existing code has value locked in behavior that may be wrong but must be preserved until intentionally changed.

**Characterization tests** are not correctness tests. They answer: "What does this code currently do?" not "What should this code do?" They are scaffolding, not architecture.

## Anti-Pattern: Rewrite Without Safety Net

**WRONG:**
```
"This code is messy, I'll rewrite it"
→ Delete old code
→ Write new code from scratch
→ Tests pass (but behavior changed silently)
```

**RIGHT (Thaw):**
```
1. Write characterization test for existing behavior
2. Run test → passes (locks current behavior)
3. Run fuse scan → assess module depth
4. If un-testable: mark LEGACY in DEBT.md
5. If testable: proceed with freeze to improve
```

## Workflow

### 1. Characterize

Write tests that exercise the public interface of the legacy module:
- Call the function/module with realistic inputs
- Record outputs (even if they seem wrong)
- Cover edge cases that are obvious from reading the code
- Do NOT fix bugs during characterization

### 2. Assess

Run fuse scan on the module:
- Is the interface small and clear? (Deep module candidate)
- Is the implementation mixed with unrelated concerns? (Shallow module)
- Can tests run in isolation? (Testable)
- Does it use module-level mutable state? (Hard to test)

### 3. Isolate (if needed)

If module is un-testable:
- Mark LEGACY in `.ai/DEBT.md` with reason and replacement plan
- Flag all modules that depend on it
- New slices MUST NOT depend on LEGACY modules
- If a new feature needs the LEGACY module, a replacement slice must be planned first

### 4. Replace (later)

Replacement slices use standard freeze (TDD):
- Write tests for the NEW desired behavior
- Implement new module alongside old one
- Run both old characterization tests and new tests
- Remove old module only after full parity

## Checklist Per Module

- [ ] Characterization test locks current behavior
- [ ] Fuse scan completed
- [ ] Depth rating assigned (deep / medium / shallow / god-function)
- [ ] If un-testable: LEGACY marker in DEBT.md
- [ ] Dependency audit completed (who depends on this?)
- [ ] Replacement planned (if LEGACY)
