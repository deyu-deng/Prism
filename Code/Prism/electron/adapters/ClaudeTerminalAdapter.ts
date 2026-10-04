import { IDEAdapter } from './types';
import { exec, spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import { promisify } from 'util';
import { parseQuestionBlocks } from '../helm/question-parser';
import { parsePhaseMarkers } from '../helm/phase-parser';
import { detectViolations } from '../helm/violation-detector';
import { checkContextWarning } from '../helm/context-monitor';

const execAsync = promisify(exec);

export class ClaudeTerminalAdapter implements IDEAdapter {
  id = 'ClaudeTerminal';
  name = 'Claude Code (Terminal)';

  private pollTimer: NodeJS.Timeout | null = null;
  private lastOutboxSize = 0;
  private activeProcess: any | null = null;
  private outputCallback: ((data: any) => void) | null = null;

  async detect(): Promise<boolean> {
    try {
      await execAsync('claude --version');
      return true;
    } catch {
      return false;
    }
  }

  async openSession(projectRoot: string, config: { intentType: string; text: string }): Promise<string> {
    const aiDir = path.join(projectRoot, '.ai');
    await fs.mkdir(aiDir, { recursive: true });

    const sessionId = 'sess_' + Date.now();
    const sessionFile = path.join(aiDir, 'prism-session.json');
    await fs.writeFile(sessionFile, JSON.stringify({
      sessionId,
      intentType: config.intentType,
      text: config.text,
      createdAt: new Date().toISOString(),
    }, null, 2), 'utf-8');

    return sessionId;
  }

  sendMessage?: undefined;

  async getProjectRoot(projectRoot: string): Promise<string> {
    return projectRoot;
  }

  watchOutput(projectRoot: string, callback: (data: any) => void): void {
    this.outputCallback = callback;
  }

  stopWatchOutput(): void {
    this.outputCallback = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  dispose(): void {
    this.stopWatchOutput();
    this.killActiveProcess().catch(() => {});
  }

  private async killActiveProcess(): Promise<void> {
    if (this.activeProcess) {
      const proc = this.activeProcess;
      this.activeProcess = null;
      try {
        if (proc.pid) {
          if (process.platform === 'win32') {
            await execAsync(`taskkill /F /T /PID ${proc.pid}`);
          } else {
            try {
              process.kill(proc.pid, 'SIGKILL');
            } catch {
              proc.kill('SIGKILL');
            }
          }
        } else {
          proc.kill('SIGKILL');
        }
      } catch (err) {
        console.error('Error killing active process:', err);
      }
    }
  }

  async dispatchIntent(intentType: string, text: string, projectRoot: string): Promise<void> {
    const aiDir = path.join(projectRoot, '.ai');
    try { await fs.mkdir(aiDir, { recursive: true }); } catch (err: any) { if (err.code !== 'EEXIST') throw err; }
    
    const intentFile = path.join(aiDir, 'prism-intent.md');
    await fs.writeFile(intentFile, `[[PRISM_INTENT]]\nTYPE: ${intentType}\nINTENT: ${text}\nTIMESTAMP: ${new Date().toISOString()}\n`, 'utf-8');
    
    // 在 CLI 拉起前，自动生成并注入项目所需的问答重定向规则
    await this.injectRules(projectRoot).catch((err) => {
      console.error('Failed to inject rules before launching CLI:', err);
    });

    // 静默挂载 Prism SSE 节点
    try {
      await execAsync('claude mcp add --transport sse prism-mcp http://127.0.0.1:1436/sse', { cwd: projectRoot });
    } catch (err: any) {
      console.error('Failed to add MCP server prism-mcp:', err.message || err);
    }

    // 确保杀掉先前的进程树
    await this.killActiveProcess();

    // 完美的跨平台终端唤起与进程绑定
    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    let child;
    if (isWindows) {
      const psCommand = `Write-Host '正在唤醒 Claude Code...' -ForegroundColor Cyan; claude -p '请读取 .ai/prism-intent.md 并执行其中的意图指令'; Write-Host '任务结束。' -ForegroundColor Green`;
      child = spawn('powershell.exe', ['-NoExit', '-Command', psCommand], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else if (isMac) {
      const command = `cd "${projectRoot}" && echo "正在唤醒 Claude Code..." && claude -p "请读取 .ai/prism-intent.md 并执行其中的意图指令"; exec bash`;
      child = spawn('osascript', ['-e', `tell app "Terminal" to do script "${command.replace(/"/g, '\\"')}"`], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      const command = `cd "${projectRoot}" && echo "正在唤醒 Claude Code..." && claude -p "请读取 .ai/prism-intent.md 并执行其中的意图指令"; exec bash`;
      child = spawn('gnome-terminal', ['--', 'bash', '-c', command], {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }

    this.activeProcess = child;

    const cleanUp = () => {
      if (child.pid) {
        try {
          if (process.platform === 'win32') {
            require('child_process').execSync(`taskkill /F /T /PID ${child.pid}`);
          } else {
            try {
              process.kill(child.pid, 'SIGKILL');
            } catch {
              child.kill('SIGKILL');
            }
          }
        } catch {}
      }
    };

    process.on('exit', cleanUp);
    process.on('SIGINT', cleanUp);

    child.on('exit', (code, signal) => {
      console.log(`Claude CLI process exited with code ${code} and signal ${signal}`);
      if (this.activeProcess === child) {
        this.activeProcess = null;
      }
      process.off('exit', cleanUp);
      process.off('SIGINT', cleanUp);
    });

    child.on('error', (err) => {
      console.error('Claude CLI process error:', err);
      if (this.activeProcess === child) {
        this.activeProcess = null;
      }
      process.off('exit', cleanUp);
      process.off('SIGINT', cleanUp);
    });

    let stdoutAccumulator = '';
    let processedLength = 0;

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      process.stdout.write(chunk);
      stdoutAccumulator += text;
      
      const newContent = stdoutAccumulator.slice(processedLength);
      if (newContent && this.outputCallback) {
        processedLength = stdoutAccumulator.length;

        const violations = detectViolations(newContent);
        if (violations.length > 0) {
          this.outputCallback({ __violations: violations });
        }

        const contextWarning = checkContextWarning(newContent);
        if (contextWarning) {
          this.outputCallback({ __contextWarning: contextWarning });
        }

        const phase = parsePhaseMarkers(newContent);
        if (phase) {
          this.outputCallback({ __phase: phase });
        }

        const questions = parseQuestionBlocks(newContent);
        for (const q of questions) {
          this.outputCallback(q);
        }
      }
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
  }

  async injectSystemPrompt(projectRoot: string, prompt: string, mode: 'override' | 'append'): Promise<void> {
    const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');

    if (mode === 'override') {
      await fs.writeFile(claudeMdPath, prompt, 'utf-8');
      return;
    }

    let existing = '';
    try {
      existing = await fs.readFile(claudeMdPath, 'utf-8');
    } catch {
      // File doesn't exist yet — treat as empty
    }

    const sectionMarker = '## 当前任务上下文';
    const sectionStart = existing.indexOf(sectionMarker);

    if (sectionStart === -1) {
      const combined = `${prompt}\n\n---\n\n${existing}`.trim();
      await fs.writeFile(claudeMdPath, combined, 'utf-8');
      return;
    }

    const nextH2 = existing.indexOf('\n## ', sectionStart + sectionMarker.length);
    const beforeSection = existing.slice(0, sectionStart);
    const afterSection = nextH2 === -1 ? '' : existing.slice(nextH2);

    const newSectionStart = prompt.indexOf(sectionMarker);
    let newSection = prompt;
    if (newSectionStart !== -1) {
      const newNextH2 = prompt.indexOf('\n## ', newSectionStart + sectionMarker.length);
      newSection = newNextH2 === -1 ? prompt.slice(newSectionStart) : prompt.slice(newSectionStart, newNextH2);
    }

    const combined = `${beforeSection.trim()}\n\n${newSection.trim()}\n\n${afterSection.trim()}`.trim();
    await fs.writeFile(claudeMdPath, combined, 'utf-8');
  }

  private async injectClaudeConfig(projectRoot: string): Promise<void> {
    const claudeDir = path.join(projectRoot, '.claude');
    try {
      await fs.mkdir(claudeDir, { recursive: true });
    } catch {
      // ignore if exists
    }

    const settingsPath = path.join(claudeDir, 'settings.local.json');
    let config: any = {};
    try {
      const content = await fs.readFile(settingsPath, 'utf-8');
      config = JSON.parse(content);
    } catch {
      // file doesn't exist or is invalid JSON, start fresh
    }

    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    config.mcpServers['prism-mcp'] = {
      type: 'sse',
      url: 'http://127.0.0.1:1436/sse'
    };

    await fs.writeFile(settingsPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  async injectRules(projectRoot: string): Promise<void> {
    const ruleContent = `
# Prism Control Rules (Injected for Claude CLI)
1. You are driven by Prism. You MUST read intents from \`.ai/prism-intent.md\`.
2. When you need the user's input or decision, DO NOT output text questions or wait for stdin prompts.
3. Instead, you MUST CALL the MCP tool \`prism_ask_user\`!
4. Prism will render a UI for the user and return the result.
`.trim();

    await this.injectSystemPrompt(projectRoot, ruleContent, 'append');
    await this.injectClaudeConfig(projectRoot).catch(() => {});
  }
}
