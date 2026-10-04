import * as fs from 'fs/promises';
import * as path from 'path';

const PRE_PUSH_HOOK = `#!/bin/sh
# Prism Git Hook — pre-push
# Blocks AI-initiated pushes to protect remote branches

echo "AI push blocked by Prism"
exit 1
`;

const PRE_COMMIT_HOOK = `#!/bin/sh
# Prism Git Hook — pre-commit
# Detects dangerous patterns in staged changes

DANGEROUS_PATTERNS="rm -rf|DROP TABLE|DELETE FROM|truncate table|rm -rf /|dd if=|mkfs.|>:dev:null|curl.*|sh$|bash$"

STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
    exit 0
fi

# Check for dangerous commands in staged diff
if git diff --cached | grep -iE "$DANGEROUS_PATTERNS" > /dev/null 2>&1; then
    echo "[PRISM BLOCK] Dangerous pattern detected in commit. Review staged changes."
    exit 1
fi

exit 0
`;

/**
 * Install Prism Git hooks into the target project.
 */
export async function installGitHooks(projectRoot: string): Promise<void> {
  const hooksDir = path.join(projectRoot, '.git', 'hooks');
  await fs.mkdir(hooksDir, { recursive: true });

  const prePushPath = path.join(hooksDir, 'pre-push');
  const preCommitPath = path.join(hooksDir, 'pre-commit');

  await fs.writeFile(prePushPath, PRE_PUSH_HOOK, 'utf-8');
  await fs.writeFile(preCommitPath, PRE_COMMIT_HOOK, 'utf-8');

  // On Unix, make hooks executable. On Windows, this is a no-op.
  try {
    await fs.chmod(prePushPath, 0o755);
    await fs.chmod(preCommitPath, 0o755);
  } catch {
    // Windows may not support chmod; ignore
  }
}
