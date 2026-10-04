import { IDEAdapter, SessionConfig } from './types';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { parseQuestionBlocks } from '../helm/question-parser';
import { parsePhaseMarkers } from '../helm/phase-parser';
import { detectViolations } from '../helm/violation-detector';
import { checkContextWarning } from '../helm/context-monitor';
import chokidar from 'chokidar';

const execAsync = promisify(exec);

/**
 * Resolve the Windsurf executable path without hard-coding any user-specific
 * install location. Lookup order:
 *   1. PRISM_WINDSURF_PATH env var (explicit override, e.g. CI / custom installs)
 *   2. Common Windows install locations (LOCALAPPDATA / PROGRAMFILES)
 * Returns the first existing candidate, or null if Windsurf is not installed.
 */
export function resolveWindsurfExecutable(): string | null {
  const envOverride = process.env.PRISM_WINDSURF_PATH;
  if (envOverride && fsSync.existsSync(envOverride)) {
    return envOverride;
  }

  const candidates: string[] = [];
  const local = process.env.LOCALAPPDATA;
  const pf = process.env['PROGRAMFILES'];
  const pfx86 = process.env['PROGRAMFILES(X86)'];

  if (local) {
    candidates.push(path.join(local, 'Programs', 'Windsurf', 'Windsurf.exe'));
    candidates.push(path.join(local, 'Programs', 'Windsurf', '_', 'Windsurf.exe'));
  }
  if (pf) {
    candidates.push(path.join(pf, 'Windsurf', 'Windsurf.exe'));
  }
  if (pfx86) {
    candidates.push(path.join(pfx86, 'Windsurf', 'Windsurf.exe'));
  }

  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c;
  }
  return null;
}

export class WindsurfAdapter implements IDEAdapter {
  id = 'Windsurf';
  name = 'Windsurf IDE Adapter';
  private watcher: any = null;
  public sendQuestionCallback: ((data: any) => void) | null = null;
  private activeSessionId: string | null = null;
  public pendingQuestions: Map<string, (answer: any) => void> = new Map();
  public activeProjectRoot: string | null = null;
  private executablePath: string | null = null;

  private getMcpConfigPath(): string {
    const userHome = process.env.USERPROFILE || process.env.HOME || '';
    return path.join(userHome, '.codeium', 'windsurf', 'mcp_config.json');
  }

  async injectMcpConfig(): Promise<void> {
    const configPath = this.getMcpConfigPath();
    try {
      await fs.mkdir(path.dirname(configPath), { recursive: true });

      let config: any = {};
      try {
        const content = await fs.readFile(configPath, 'utf-8');
        if (content.trim()) {
          config = JSON.parse(content);
        }
      } catch (err) {
        // File does not exist or invalid JSON — initialize fresh config
      }

      if (!config || typeof config !== 'object') {
        config = {};
      }
      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        config.mcpServers = {};
      }

      config.mcpServers['prism'] = {
        serverUrl: 'http://127.0.0.1:1436/sse'
      };

      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to inject Windsurf MCP config:', err);
    }
  }

  async clearMcpConfig(): Promise<void> {
    const configPath = this.getMcpConfigPath();
    try {
      let content = '';
      try {
        content = await fs.readFile(configPath, 'utf-8');
      } catch {
        return; // File doesn't exist, nothing to clear
      }

      let config: any = {};
      try {
        config = JSON.parse(content);
      } catch {
        return; // Invalid JSON, skip clearing
      }

      if (config && config.mcpServers && config.mcpServers['prism']) {
        delete config.mcpServers['prism'];
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Failed to clear Windsurf MCP config:', err);
    }
  }

  async detect(projectRoot?: string): Promise<boolean> {
    // 1. Try to resolve the Windsurf executable via standard install locations
    //    (or PRISM_WINDSURF_PATH override). No CLI probe: Windsurf does not
    //    ship a `windsurf` command on Windows.
    this.executablePath = resolveWindsurfExecutable();
    let detected = this.executablePath !== null;

    // 2. Fallback: a .windsurf/ directory in the project implies the user
    //    is already running Windsurf on it — we can still watch output and
    //    inject intents, just can't auto-launch.
    if (!detected && projectRoot) {
      try {
        await fs.access(path.join(projectRoot, '.windsurf'));
        detected = true;
      } catch {
        detected = false;
      }
    }

    if (detected) {
      await this.injectMcpConfig();
    }
    return detected;
  }

  private async garbageCollectSessions(projectRoot: string, activeSessionId: string): Promise<void> {
    const sessionsDir = path.join(projectRoot, '.windsurf', 'sessions');
    try {
      const entries = await fs.readdir(sessionsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== activeSessionId) {
          const dirPath = path.join(sessionsDir, entry.name);
          await fs.rm(dirPath, { recursive: true, force: true });
        }
      }
    } catch {
      // Sessions directory might not exist yet — ignore
    }
  }

  async openSession(projectRoot: string, config: SessionConfig): Promise<string> {
    this.activeProjectRoot = projectRoot;
    const sessionId = 'windsurf_' + Date.now();
    this.activeSessionId = sessionId;

    // Prune discarded sessions
    await this.garbageCollectSessions(projectRoot, sessionId);

    // Dynamically update/inject rules with the actual active session ID
    await this.injectRules(projectRoot);

    const sessionDir = path.join(projectRoot, '.windsurf', 'sessions', sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const sessionFile = path.join(sessionDir, 'session.json');
    await fs.writeFile(
      sessionFile,
      JSON.stringify(
        {
          sessionId,
          intentType: config.intentType,
          text: config.text,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf-8'
    );

    return sessionId;
  }

  async sendMessage(projectRoot: string, sessionId: string, message: string): Promise<void> {
    const sessionDir = path.join(projectRoot, '.windsurf', 'sessions', sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const inputFile = path.join(sessionDir, 'input.md');
    const timestamp = new Date().toISOString();
    const entry = `[[PRISM_MESSAGE]]\nSESSION: ${sessionId}\nTIMESTAMP: ${timestamp}\n${message}\n`;
    await fs.appendFile(inputFile, entry, 'utf-8');

    // Bring Windsurf to the foreground on the project so Cascade can pick up
    // the newly written input.md. Windsurf does not accept a --goto flag, so
    // we just launch it with the project root. detached + unref so the
    // Electron main process is not held back by the child.
    if (this.executablePath) {
      try {
        spawn(this.executablePath, [projectRoot], {
          detached: true,
          stdio: 'ignore',
        }).unref();
      } catch (err) {
        console.error('Failed to launch Windsurf:', err);
      }
    }
  }

  async getProjectRoot(projectRoot: string): Promise<string> {
    return projectRoot;
  }

  watchOutput(projectRoot: string, callback: (data: any) => void): void {
    this.activeProjectRoot = projectRoot;
    this.sendQuestionCallback = callback;

    if (this.watcher) {
      this.watcher.close();
    }

    const sessionsDir = path.join(projectRoot, '.windsurf', 'sessions');
    this.watcher = chokidar
      .watch(path.join(sessionsDir, '**', 'output.md'), {
        ignoreInitial: false,
        awaitWriteFinish: { stabilityThreshold: 300 },
      })
      .on('change', async (filePath: string) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');

          const violations = detectViolations(content);
          if (violations.length > 0) {
            callback({ __violations: violations });
          }

          const contextWarning = checkContextWarning(content);
          if (contextWarning) {
            callback({ __contextWarning: contextWarning });
          }

          const phase = parsePhaseMarkers(content);
          if (phase) {
            callback({ __phase: phase });
          }

          const questions = parseQuestionBlocks(content);
          for (const q of questions) {
            callback(q);
          }
        } catch {
          // ignore read errors
        }
      });
  }

  stopWatchOutput(): void {
    this.sendQuestionCallback = null;
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  async dispatchIntent(intentType: string, text: string, projectRoot: string): Promise<void> {
    const aiDir = path.join(projectRoot, '.ai');
    try {
      await fs.mkdir(aiDir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }
    const intentFile = path.join(aiDir, 'prism-intent.md');
    await fs.writeFile(
      intentFile,
      `[[PRISM_INTENT]]\nTYPE: ${intentType}\nINTENT: ${text}\nTIMESTAMP: ${new Date().toISOString()}\n`,
      'utf-8'
    );
  }

  async injectSystemPrompt(projectRoot: string, prompt: string, mode: 'override' | 'append'): Promise<void> {
    const rulesPath = path.join(projectRoot, '.windsurfrules');

    if (mode === 'override') {
      await fs.writeFile(rulesPath, prompt, 'utf-8');
      return;
    }

    let existing = '';
    try {
      existing = await fs.readFile(rulesPath, 'utf-8');
    } catch {
      // file doesn't exist yet
    }
    const combined = `${existing.trim()}\n\n---\n\n${prompt}`.trim();
    await fs.writeFile(rulesPath, combined, 'utf-8');
  }

  async injectRules(projectRoot: string): Promise<void> {
    const ruleContent = `
# Prism Control Rules (Injected for Windsurf)
1. You are driven by Prism. You MUST read intents from \`.ai/prism-intent.md\`.
2. When you need the user's input or decision, DO NOT output text questions.
3. Instead, you MUST CALL the MCP tool \`prism_ask_user\`!
4. Prism will render a UI for the user and return the result.
`.trim();
    await fs.writeFile(path.join(projectRoot, '.windsurfrules'), ruleContent, 'utf-8');
    await this.injectMcpConfig();
  }

  answerPendingQuestion(questionId: string, answer: any): void {
    const resolver = this.pendingQuestions.get(questionId);
    if (resolver) {
      resolver(answer);
      this.pendingQuestions.delete(questionId);
    }
  }

  clearMcpConfigSync(): void {
    const configPath = this.getMcpConfigPath();
    try {
      if (!fsSync.existsSync(configPath)) {
        return;
      }
      const content = fsSync.readFileSync(configPath, 'utf-8');
      let config: any = {};
      try {
        config = JSON.parse(content);
      } catch {
        return; // Invalid JSON, skip clearing to prevent corruption
      }

      if (config && config.mcpServers && config.mcpServers['prism']) {
        delete config.mcpServers['prism'];
        fsSync.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      }
    } catch (err) {
      console.error('Failed to clear Windsurf MCP config synchronously:', err);
    }
  }

  dispose(): void {
    this.stopWatchOutput();
    this.clearMcpConfigSync();

    // Clear sessions synchronously on quit if activeProjectRoot is set
    if (this.activeProjectRoot) {
      const sessionsDir = path.join(this.activeProjectRoot, '.windsurf', 'sessions');
      for (let i = 0; i < 5; i++) {
        try {
          if (fsSync.existsSync(sessionsDir)) {
            fsSync.rmSync(sessionsDir, { recursive: true, force: true });
          }
          break;
        } catch (err: any) {
          if (i === 4) {
            console.error('Failed to clear sessions directory on dispose:', err.message);
          } else {
            // Synchronous spin-wait for 50ms before retry
            const start = Date.now();
            while (Date.now() - start < 50) {}
          }
        }
      }
    }
  }
}
