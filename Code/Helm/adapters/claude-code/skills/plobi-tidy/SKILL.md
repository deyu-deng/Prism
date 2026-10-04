---
name: plobi-tidy
description: Enforce file structure hygiene and naming conventions. Scans the repo for structural inconsistencies, naming violations, empty directories, orphaned files, and nesting bloat. Proposes and executes renames, moves, and reorganizations. Use when user says "tidy up", "clean up structure", "rename files", "organize folders", "naming convention", "file structure", or when the repo feels messy.
---

# Tidy — Structure & Naming Hygiene

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

- **kebab-case**, lowercase, no spaces: `adapters/`, `decisions/`, `core/`
- **Meaningful**: name describes content, not role (`utils/` = bad, `git-hooks/` = good)
- **No nesting bloat**: max depth 4. Deeper = restructure candidate.

### Files

| Type | Convention | Example |
|------|------------|---------|
| Markdown docs | UPPER_SNAKE_CASE or kebab-case | `README.md`, `context-map.md` |
| Config files | kebab-case | `.cursorrules`, `tsconfig.json` |
| Source code | Language convention | `userService.ts`, `auth_middleware.py` |
| Scripts | kebab-case, executable bit | `link-skills.sh`, `block-dangerous-git.sh` |
| Tests | Same as source + `.test.` or `.spec.` | `userService.test.ts` |

**Prohibited in all names:**
- Spaces
- Chinese punctuation
- Mixed case without reason (`MyFile.txt`)
- Redundant words (`utils-helpers/`)
- Version numbers in filenames (`v2/`, `backup-old/`)

## Structural Rules

1. **No empty directories** — if empty, flag for deletion
2. **No orphaned files** — every file must have a sibling or a clear parent purpose
3. **README per major dir** — `adapters/` needs `adapters/README.md`; `core/` needs `core/README.md`
4. **Flat over deep** — prefer `adapters/cursor/.cursorrules` over `adapters/ide-tools/cursor/config/.cursorrules`
5. **Co-locate related files** — tests next to source, scripts next to what they operate on
6. **Consistent siblings** — all files in a dir should share a naming pattern. One outlier = flag.

## Process

### 1. Scan

```
# List structure
tree -L 4 --dirsfirst

# Find empty dirs
find . -type d -empty -not -path './.git/*'

# Find files with bad names
find . -type f | grep -E '[[:space:]]|[一-鿿]' | grep -v '.git/'
```

Report violations grouped by category:
- **Naming violations** — bad filenames
- **Structural violations** — empty dirs, nesting bloat, orphans
- **Consistency violations** — mixed patterns in same dir

### 2. Propose

Present numbered plan. Each item:
- **Current**: `old/path/to/file.md`
- **Proposed**: `new/path/file.md`
- **Reason**: which rule it violates

Ask: "Execute all / select numbers / modify / skip?"

### 3. Execute

Rename/move one at a time. Update internal references after each move:
- Relative links in markdown
- Import paths in code
- Script references

**Never rename without updating references.**

### 4. Verify

After execution:
- `git status` — confirm moves are tracked as renames (not delete+create)
- `grep -r "old-filename" .` — confirm no stale references
- Spot-check 3-5 moved files open correctly

## Pre-Change Protocol (Mandatory)

**Before creating, moving, or renaming any file that the user will see, pause and check:**

1. **Location check** — Does this file belong in the proposed directory? Would a user expect to find it here?
   - `.ai/SESSION.md` / `.docs/PROGRESS.md` → root (not `.docs/`)
   - Templates → `.docs/`
   - Decisions → `.ai/DECISIONS/` or `.ai/VETO/`
   - Prompts → `prompts/`
   - Tool-specific → `adapters/<tool>/`

2. **Naming check** — Does the filename follow convention?
   - Directory: kebab-case
   - Doc template: UPPER_SNAKE_CASE.md
   - Prompt: kebab-case.md
   - Skill: kebab-case/SKILL.md
   - Script: kebab-case.sh

3. **Depth check** — Does this create nesting deeper than 4 levels?

4. **Consistency check** — Do siblings in the target directory share the same naming pattern?

**If any check fails, propose the correct location/name before proceeding.**

## Post-Tidy

Write `STRUCTURE.md` at repo root if user wants persistent documentation:

```markdown
# Repository Structure

## Naming Convention
- Directories: kebab-case
- Docs: UPPER_SNAKE_CASE.md
- Source: language convention

## Top-Level Layout
- `core/` — ...
- `adapters/` — ...
```
