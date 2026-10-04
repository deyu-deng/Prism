# Guard — Setup Git Guardrails

Sets up hooks that intercept and block dangerous git commands before they execute.

## What Gets Blocked

- `git push` (all variants including `--force`)
- `git reset --hard`
- `git clean -f` / `git clean -fd`
- `git branch -D`
- `git checkout .` / `git restore .`

When blocked, the tool sees a message telling it that it does not have authority to access these commands.

## Steps

1. Ask scope: install for **this project only** or **all projects**?
2. Copy the hook script to target location
3. Add hook to tool settings
4. Ask about customization (add/remove patterns)
5. Verify with test
