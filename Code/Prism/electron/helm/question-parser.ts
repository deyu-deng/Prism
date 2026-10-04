import * as yaml from 'yaml';
import type { PrismQuestion } from '../../src/types/helm';

/**
 * Parses [[PRISM_QUESTION]] blocks from raw text.
 *
 * - Strips surrounding Markdown code fences (```yaml / ```)
 * - Parses inner content as YAML
 * - Gracefully skips malformed blocks
 */
export function parseQuestionBlocks(raw: string): PrismQuestion[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }

  const regex = /\[\[PRISM_QUESTION\]\]([\s\S]*?)\[\[\/PRISM_QUESTION\]\]/g;
  const blocks: PrismQuestion[] = [];
  let match;

  while ((match = regex.exec(raw)) !== null) {
    try {
      let yamlContent = match[1].trim();
      
      // Strip surrounding ```yaml / ``` fences if present inside the block
      const codeFenceMatch = yamlContent.match(/^```(?:yaml)?\s*([\s\S]*?)```$/);
      if (codeFenceMatch) {
        yamlContent = codeFenceMatch[1].trim();
      }

      const parsed = yaml.parse(yamlContent);

      if (!parsed.id) {
        parsed.id = 'q_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      }

      blocks.push(parsed as PrismQuestion);
    } catch {
      // Gracefully skip malformed blocks
    }
  }

  return blocks;
}
