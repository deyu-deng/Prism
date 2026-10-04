#!/usr/bin/env bash
set -euo pipefail

# Copies all skills in the repository to ~/.claude/skills so that
# they can be used by Claude Code.
#
# Claude Code ONLY reads skills from the global ~/.claude/skills/ directory.
# Project-level .claude/skills/ is currently ignored.
#
# Usage:
#   link-skills.sh

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$HOME/.claude/skills"

echo "Copying skills to global directory: $DEST"

# Ensure destination exists
mkdir -p "$DEST"

find "$REPO/skills" -name SKILL.md -not -path '*/node_modules/*' -not -path '*/deprecated/*' -print0 |
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  name="$(basename "$src")"
  target="$DEST/$name"

  # Remove old copy if exists
  if [ -e "$target" ]; then
    rm -rf "$target"
  fi

  # Copy instead of symlink (works on all platforms without special permissions)
  cp -r "$src" "$target"
  echo "copied $name"
done

echo ""
echo "Done. Run '/skills' in Claude Code to verify."
echo "If skills don't appear, restart Claude Code."
