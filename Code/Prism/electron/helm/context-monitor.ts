export interface ContextWarning {
  usage: string;
  decisions: string[];
}

/**
 * Scan IDE output for [[CONTEXT_WARNING]] blocks.
 */
export function checkContextWarning(output: string): ContextWarning | null {
  const match = output.match(/\[\[CONTEXT_WARNING\]\]([\s\S]*?)\[\[\/CONTEXT_WARNING\]\]/);
  if (!match) return null;
  return parseContextWarning(match[1].trim());
}

/**
 * Parse the inner content of a CONTEXT_WARNING block.
 */
export function parseContextWarning(block: string): ContextWarning {
  const usageMatch = block.match(/Usage:\s*(.+)/);
  const usage = usageMatch?.[1]?.trim() ?? 'unknown';

  const decisions: string[] = [];
  const lines = block.split('\n');
  let inDecisions = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('Decisions:')) {
      inDecisions = true;
      // Check inline array format: Decisions: ["a", "b"]
      const arrayMatch = trimmed.match(/\[\s*(.*?)\s*\]/);
      if (arrayMatch) {
        const items = arrayMatch[1]
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        decisions.push(...items);
      }
      continue;
    }
    if (inDecisions && trimmed.startsWith('- ')) {
      decisions.push(trimmed.slice(2).trim());
    } else if (inDecisions && trimmed.length > 0 && !trimmed.startsWith('-')) {
      inDecisions = false;
    }
  }

  return { usage, decisions };
}
