import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface InitSummary {
  created: string[];
}

export interface MigrateSummary {
  migrated: string[];
  manualReview: string[];
}

const TEMPLATE_NAMES = [
  'RESEARCH.md',
  'CONTEXT.md',
  'PRODUCT.md',
  'DESIGN.md',
  'TASK.md',
  'HANDOFF.md',
] as const;

const DOCS_IN_ROOT = ['TASK.md', 'HANDOFF.md'] as const;

async function copyTemplate(projectRoot: string, docName: string): Promise<string> {
  const templatePath = path.join(__dirname, 'templates', `${docName}.template`);
  const isRootDoc = (DOCS_IN_ROOT as readonly string[]).includes(docName);
  const targetDir = isRootDoc ? projectRoot : path.join(projectRoot, 'docs');
  const targetPath = path.join(targetDir, docName);

  await fs.mkdir(targetDir, { recursive: true });

  let content: string;
  try {
    content = await fs.readFile(templatePath, 'utf-8');
  } catch {
    // Fallback if template missing
    content = `# ${docName}\n\n<!-- Prism auto-generated template -->\n`;
  }

  await fs.writeFile(targetPath, content, 'utf-8');
  return isRootDoc ? docName : `docs/${docName}`;
}

/**
 * Initialize a fresh project with standard Helm document templates.
 */
export async function initializeProject(projectRoot: string): Promise<InitSummary> {
  const created: string[] = [];

  // Ensure docs/ and docs/adr/ exist
  await fs.mkdir(path.join(projectRoot, 'docs', 'adr'), { recursive: true });
  created.push('docs/adr/');

  for (const docName of TEMPLATE_NAMES) {
    const relPath = await copyTemplate(projectRoot, docName);
    created.push(relPath);
  }

  return { created };
}

/**
 * Migrate an existing project to Helm structure.
 * Detects README.md, TODO.md, CHANGELOG.md, design*.md and migrates content.
 */
export async function migrateProject(projectRoot: string): Promise<MigrateSummary> {
  const migrated: string[] = [];
  const manualReview: string[] = [];

  await fs.mkdir(path.join(projectRoot, 'docs'), { recursive: true });

  // README.md → CONTEXT.md
  const readmePath = path.join(projectRoot, 'README.md');
  if (await fileExists(readmePath)) {
    const readme = await fs.readFile(readmePath, 'utf-8');
    const context = `# CONTEXT.md\n\n## Migrated from README.md\n\n${readme}\n`;
    await fs.writeFile(path.join(projectRoot, 'docs', 'CONTEXT.md'), context, 'utf-8');
    migrated.push('README.md → CONTEXT.md');
  }

  // TODO.md / TODO / CHANGELOG.md → TASK.md
  const todoPath = path.join(projectRoot, 'TODO.md');
  const changelogPath = path.join(projectRoot, 'CHANGELOG.md');
  let taskContent = '# TASK.md\n\n## Migrated Items\n\n';
  let hasTaskContent = false;

  if (await fileExists(todoPath)) {
    const todo = await fs.readFile(todoPath, 'utf-8');
    taskContent += `### From TODO.md\n\n${todo}\n\n`;
    hasTaskContent = true;
    migrated.push('TODO.md → TASK.md');
  }

  if (await fileExists(changelogPath)) {
    const changelog = await fs.readFile(changelogPath, 'utf-8');
    taskContent += `### From CHANGELOG.md\n\n${changelog}\n\n`;
    hasTaskContent = true;
    migrated.push('CHANGELOG.md → TASK.md');
  }

  if (hasTaskContent) {
    await fs.writeFile(path.join(projectRoot, 'TASK.md'), taskContent, 'utf-8');
  }

  // Design docs → DESIGN.md
  const entries = await fs.readdir(projectRoot, { withFileTypes: true });
  const designFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().startsWith('design') && e.name.endsWith('.md'))
    .map((e) => e.name);

  if (designFiles.length > 0) {
    let designContent = '# DESIGN.md\n\n## Migrated Design Documents\n\n';
    for (const df of designFiles) {
      const content = await fs.readFile(path.join(projectRoot, df), 'utf-8');
      designContent += `### ${df}\n\n${content}\n\n`;
    }
    await fs.writeFile(path.join(projectRoot, 'docs', 'DESIGN.md'), designContent, 'utf-8');
    migrated.push(`${designFiles.join(', ')} → DESIGN.md`);
  }

  // List remaining markdown files for manual review
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const alreadyHandled = [
        'README.md',
        'TODO.md',
        'CHANGELOG.md',
        'TASK.md',
        'HANDOFF.md',
      ].includes(entry.name);
      const isDesign = entry.name.toLowerCase().startsWith('design');
      if (!alreadyHandled && !isDesign) {
        manualReview.push(entry.name);
      }
    }
  }

  return { migrated, manualReview };
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
