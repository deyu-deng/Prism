import * as fs from 'fs';
import * as path from 'path';

/**
 * Helm document status — strictly aligned with PRISM_PROJECT.md §6.3
 */
export type DocStatus =
  | 'ACTIVE'
  | 'LOCKED'
  | 'PENDING'
  | 'EMPTY'
  | 'STALE';

export interface HelmDoc {
  title: string;
  status: DocStatus;
  content: string;
  lastModified?: Date;
}

/**
 * Core Helm documents per PRISM_PROJECT.md §5.1
 *
 * {projectRoot}/
 * ├── docs/
 * │   ├── RESEARCH.md
 * │   ├── CONTEXT.md
 * │   ├── PRODUCT.md
 * │   ├── DESIGN.md
 * │   └── adr/
 * ├── TASK.md
 * └── HANDOFF.md
 */
const DOCS_IN_SUBFOLDER = [
  'RESEARCH.md',
  'CONTEXT.md',
  'PRODUCT.md',
  'DESIGN.md',
] as const;

const DOCS_IN_ROOT = [
  'TASK.md',
  'HANDOFF.md',
] as const;

function resolveDocPath(projectRoot: string, title: string): string {
  if ((DOCS_IN_ROOT as readonly string[]).includes(title)) {
    return path.join(projectRoot, title);
  }
  return path.join(projectRoot, 'docs', title);
}

/**
 * Scans the target project root for Helm documents.
 *
 * @param projectRoot The absolute path to the project root directory
 * @returns An array of HelmDoc objects representing the 6 core documents
 */
export function scanHelmDocs(projectRoot: string): HelmDoc[] {
  const results: HelmDoc[] = [];

  for (const docName of [...DOCS_IN_SUBFOLDER, ...DOCS_IN_ROOT]) {
    const docPath = resolveDocPath(projectRoot, docName);
    let status: DocStatus = 'EMPTY';
    let content = '';

    if (fs.existsSync(docPath)) {
      try {
        const stat = fs.statSync(docPath);
        if (stat.isFile()) {
          content = fs.readFileSync(docPath, 'utf-8');
          if (content.trim().length > 0) {
            status = 'ACTIVE';
          }
        }
      } catch (e) {
        // Fallback to EMPTY if read fails
      }
    }

    results.push({
      title: docName,
      status,
      content,
    });
  }

  return results;
}
