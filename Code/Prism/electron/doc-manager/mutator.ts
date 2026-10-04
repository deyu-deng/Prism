import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Pure function to update the status of a specific slice in a Markdown table.
 * Assumes the table has columns like: | ID | Description | Status | Type | Notes |
 * It matches the row where the first column (ID) matches `sliceId` exactly (trimming spaces).
 * It replaces the 3rd column (Status) with `newStatus`.
 */
export function updateMarkdownTableStatus(markdown: string, sliceId: string, newStatus: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];
  let found = false;

  for (const line of lines) {
    if (line.trim().startsWith('|')) {
      const cells = line.split('|');
      // A standard row has at least 3 columns (meaning 4 pipe separators, resulting in length >= 4)
      // cell[0] is empty string before first pipe
      // cell[1] is ID
      // cell[2] is Description
      // cell[3] is Status
      if (cells.length >= 4) {
        const currentId = cells[1].trim();
        if (currentId === sliceId) {
          const oldCellLength = cells[3].length;
          let newCell = ` ${newStatus} `;
          if (newCell.length < oldCellLength) {
            newCell = newCell.padEnd(oldCellLength, ' ');
          }
          cells[3] = newCell;
          result.push(cells.join('|'));
          found = true;
          continue;
        }
      }
    }
    result.push(line);
  }

  if (!found) {
    throw new Error(`Slice ID ${sliceId} not found in markdown table.`);
  }

  return result.join('\n');
}

export async function atomicUpdateTask(projectRoot: string, sliceId: string, newStatus: string): Promise<void> {
  const taskPath = path.join(projectRoot, 'TASK.md');
  const tmpPath = `${taskPath}.tmp`;

  let content: string;
  try {
    content = await fs.readFile(taskPath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read TASK.md: ${err}`);
  }

  const updatedContent = updateMarkdownTableStatus(content, sliceId, newStatus);

  await fs.writeFile(tmpPath, updatedContent, 'utf-8');
  // Atomic rename overwrites the original file safely
  await fs.rename(tmpPath, taskPath);
}
