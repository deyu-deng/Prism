import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { HelmPhase, TaskType } from '../../src/types/helm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the directory that contains the `system-prompts/` folder.
 *
 * - In the TypeScript source tree the file lives at
 *   `electron/helm/template-engine.ts`, so `__dirname` is `electron/helm/`
 *   and the templates are right next to it.
 * - After bundling by Vite/Rollup the code is inlined into
 *   `dist-electron/main.cjs`, so `__dirname` becomes `dist-electron/`.
 *   The build plugin copies templates to `dist-electron/helm/system-prompts/`,
 *   hence we must add the `helm/` segment when running from the bundle.
 */
function resolveSystemPromptsDir(): string {
  const bundledPath = path.join(__dirname, 'helm', 'system-prompts');
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }
  return path.join(__dirname, 'system-prompts');
}

export interface ContextData {
  taskType: TaskType;
  currentPhase: HelmPhase;
  contextSummary: string;
  taskSummary: string;
}

/**
 * Renders a System Prompt by loading `{phase}.md` from system-prompts/
 * and substituting {{taskType}}, {{currentPhase}}, {{contextSummary}}, {{taskSummary}}.
 */
export function renderSystemPrompt(phase: HelmPhase, context: ContextData): string {
  const templatePath = path.join(resolveSystemPromptsDir(), `${phase}.md`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`System prompt template not found for phase: ${phase}`);
  }

  let template = fs.readFileSync(templatePath, 'utf-8');

  template = template.replace(/\{\{taskType\}\}/g, context.taskType);
  template = template.replace(/\{\{currentPhase\}\}/g, context.currentPhase);
  template = template.replace(/\{\{contextSummary\}\}/g, context.contextSummary);
  template = template.replace(/\{\{taskSummary\}\}/g, context.taskSummary);

  return template;
}
