# Fuse — Improve Codebase Architecture

**Phase 8 position:** Milestone, threshold, or manual trigger. Also usable during Phase 3.

**Core duty:** Surface architectural friction and propose deepening opportunities — refactors that turn shallow modules into deep ones. Aim: testability and navigability.

## Glossary

Use these terms exactly in every suggestion. Consistent language is the point.

- **Module** — anything with interface and implementation (function, class, package, slice)
- **Interface** — everything caller must know: types, invariants, error modes, ordering, config. Not just type signature.
- **Implementation** — code inside.
- **Depth** — leverage at interface: lots of behavior behind small interface. **Deep** = high leverage. **Shallow** = interface nearly as complex as implementation.
- **Seam** — where interface lives; place behavior can be altered without editing in place.
- **Adapter** — concrete thing satisfying interface at seam.
- **Leverage** — what callers get from depth.
- **Locality** — what maintainers get from depth: change, bugs, knowledge concentrated in one place.

**Key principles:**
- **Deletion test**: imagine deleting module. If complexity vanishes, it was pass-through. If complexity reappears across N callers, it earned its keep.
- **The interface is the test surface.**
- **One adapter = hypothetical seam. Two adapters = real seam.**

## Process

### 1. Explore

Read project domain glossary and ADRs first.

Then explore codebase organically. Note friction:
- Understanding one concept requires bouncing between many small modules?
- Modules **shallow** — interface nearly as complex as implementation?
- Pure functions extracted for testability but real bugs hide in how they're called (no **locality**)?
- Tightly-coupled modules leak across seams?
- Untested or hard-to-test through current interface?

Apply **deletion test** to suspects.

### 2. Present Candidates

Numbered list of deepening opportunities. Each:
- **Files** — involved files/modules
- **Problem** — why current architecture causes friction
- **Solution** — plain English description of change
- **Benefits** — in terms of locality, leverage, test improvement

**Use `.ai/CONTEXT.md` vocabulary for domain, architecture vocabulary for structure.**

**ADR conflicts:** if candidate contradicts existing ADR, only surface when friction warrants reopening. Mark clearly: *"contradicts ADR-0007 — worth reopening because..."*

Do NOT propose interfaces yet. Ask: "Which would you like to explore?"

### 3. Grilling Loop

Once user picks candidate, grilling conversation. Walk design tree — constraints, dependencies, shape of deepened module, what sits behind seam, what tests survive.

Side effects inline:
- New concept not in `.ai/CONTEXT.md`? Add it.
- Sharpening fuzzy term? Update `.ai/CONTEXT.md`.
- User rejects with load-bearing reason? Offer ADR.
- Alternative interfaces? See interface-design docs.
