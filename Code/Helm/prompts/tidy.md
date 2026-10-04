# Tidy — Structure & Naming Hygiene

**Core duty:** Enforce file structure hygiene and naming conventions. Scan repo for inconsistencies, propose and execute renames/moves/reorganizations.

## Trigger

- "Tidy up"
- "Clean up structure"
- "Rename files"
- "Organize folders"
- "Naming convention"
- "File structure"
- "This is messy"

## Naming Rules

### Directories

- **kebab-case**, lowercase, no spaces
- **Meaningful**: name describes content, not role
- **No nesting bloat**: max depth 4

### Files

| Type | Convention | Example |
|------|------------|---------|
| Markdown docs | UPPER_SNAKE_CASE or kebab-case | `README.md`, `context-map.md` |
| Config files | kebab-case | `.cursorrules`, `tsconfig.json` |
| Source code | Language convention | `userService.ts` |
| Scripts | kebab-case | `link-skills.sh` |

**Prohibited:** spaces, Chinese punctuation, mixed case without reason, redundant words, version numbers in names.

## Structural Rules

1. **No empty directories**
2. **No orphaned files** — every file must have a clear purpose
3. **README per major dir**
4. **Flat over deep** — prefer breadth over depth
5. **Co-locate related files**
6. **Consistent siblings** — all files in a dir share a pattern

## Process

### 1. Scan

Report violations grouped by:
- **Naming violations** — bad filenames
- **Structural violations** — empty dirs, nesting bloat, orphans
- **Consistency violations** — mixed patterns in same dir

### 2. Propose

Present numbered plan. Each item shows current path, proposed path, and rule violated.

### 3. Execute

Rename/move one at a time. Update all internal references (links, imports, scripts) after each move. Never rename without updating references.

### 4. Verify

- Confirm git tracks moves as renames
- Confirm no stale references remain
- Spot-check moved files

## Pre-Change Protocol (Mandatory)

**Before creating, moving, or renaming any user-visible file, pause and check:**

1. **Location check** — Does this file belong here? Would a user expect to find it here?
   - `.ai/SESSION.md` / `.docs/PROGRESS.md` → root
   - Templates → `.docs/`
   - Decisions → `.ai/DECISIONS/` or `.ai/VETO/`
   - Prompts → `prompts/`
   - Tool-specific → `adapters/<tool>/`

2. **Naming check** — Does the filename follow convention?

3. **Depth check** — Nesting deeper than 4 levels?

4. **Consistency check** — Do siblings share the same naming pattern?

**If any check fails, propose the correct location/name before proceeding.**
