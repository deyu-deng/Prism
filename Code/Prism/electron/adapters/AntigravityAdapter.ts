import { IDEAdapter, SessionConfig } from './types';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as yaml from 'yaml';
import { parseQuestionBlocks } from '../helm/question-parser';
import { parsePhaseMarkers } from '../helm/phase-parser';
import { detectViolations } from '../helm/violation-detector';
import { checkContextWarning } from '../helm/context-monitor';

export class AntigravityAdapter implements IDEAdapter {
  id = 'Antigravity';
  name = 'Antigravity IDE Adapter';
  public sendQuestionCallback: ((data: any) => void) | null = null;
  public pendingQuestions: Map<string, (answer: any) => void> = new Map();
  public activeProjectRoot: string | null = null;
  public activeSessionId: string | null = null;
  private watcher: any = null;
  private lastReadSize = 0;

  private getMcpConfigPath(): string {
    const userHome = process.env.USERPROFILE || process.env.HOME || '';
    return path.join(userHome, '.gemini', 'config', 'mcp_config.json');
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
      console.error('Failed to inject Antigravity MCP config:', err);
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
      console.error('Failed to clear Antigravity MCP config:', err);
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
      console.error('Failed to clear Antigravity MCP config synchronously:', err);
    }
  }

  async detect(projectRoot?: string): Promise<boolean> {
    let detected = false;
    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('agy', ['--version']);
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Exit code ${code}`));
        });
        child.on('error', (err) => reject(err));
      });
      detected = true;
    } catch {
      if (projectRoot) {
        try {
          await fs.access(path.join(projectRoot, '.antigravity'));
          detected = true;
        } catch {
          detected = false;
        }
      }
    }
    if (detected) {
      await this.injectMcpConfig();
    }
    return detected;
  }

  async openSession(projectRoot: string, config: SessionConfig): Promise<string> {
    this.activeProjectRoot = projectRoot;
    const sessionId = 'antigravity_' + Date.now();
    this.activeSessionId = sessionId;

    await this.injectRules(projectRoot);

    const sessionDir = path.join(projectRoot, '.antigravity', 'sessions', sessionId);
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
    const sessionDir = path.join(projectRoot, '.antigravity', 'sessions', sessionId);
    await fs.mkdir(sessionDir, { recursive: true });

    const inputFile = path.join(sessionDir, 'input.md');
    const timestamp = new Date().toISOString();
    const entry = `[[PRISM_MESSAGE]]\nSESSION: ${sessionId}\nTIMESTAMP: ${timestamp}\n${message}\n`;
    await fs.appendFile(inputFile, entry, 'utf-8');

    // Safe spawn wake-up with drive switching for Windows platform
    if (process.platform === 'win32') {
      const drive = projectRoot.substring(0, 2);
      const cmdStr = `"${drive}" && cd "${projectRoot}" && antigravity chat "收到新消息，请读取对应的 session input.md" -r`;
      const child = spawn('cmd.exe', ['/s', '/c', cmdStr], { shell: false });
      child.on('error', (err1) => {
        const fallbackCmdStr = `"${drive}" && cd "${projectRoot}" && agy chat "收到新消息，请读取对应的 session input.md" -r`;
        const childFallback = spawn('cmd.exe', ['/s', '/c', fallbackCmdStr], { shell: false });
        childFallback.on('error', (err2) => {
          console.error('Failed to wake up Antigravity via antigravity or agy:', err1, err2);
        });
      });
    } else {
      const child = spawn('antigravity', ['chat', '收到新消息，请读取对应的 session input.md', '-r'], { cwd: projectRoot });
      child.on('error', (err1) => {
        const childFallback = spawn('agy', ['chat', '收到新消息，请读取对应的 session input.md', '-r'], { cwd: projectRoot });
        childFallback.on('error', (err2) => {
          console.error('Failed to wake up Antigravity via antigravity or agy:', err1, err2);
        });
      });
    }
  }

  async getProjectRoot(projectRoot: string): Promise<string> {
    return projectRoot;
  }

  async dispatchIntent(intentType: string, text: string, projectRoot: string): Promise<void> {
    const aiDir = path.join(projectRoot, '.ai');
    try {
      await fs.mkdir(aiDir, { recursive: true });
    } catch (err: any) {
      if (err.code !== 'EEXIST') throw err;
    }

    const intentFile = path.join(aiDir, 'prism-intent.md');
    const timestamp = new Date().toISOString();

    const content = `[[PRISM_INTENT]]\nTYPE: ${intentType}\nINTENT: ${text}\nTIMESTAMP: ${timestamp}\n`;
    await fs.writeFile(intentFile, content, 'utf-8');

    // Safe spawn wake-up with drive switching for Windows platform
    if (process.platform === 'win32') {
      const drive = projectRoot.substring(0, 2);
      const cmdStr = `"${drive}" && cd "${projectRoot}" && antigravity chat "意图已更新，请读取 .ai/prism-intent.md" -r`;
      const child = spawn('cmd.exe', ['/s', '/c', cmdStr], { shell: false });
      child.on('error', (err1) => {
        const fallbackCmdStr = `"${drive}" && cd "${projectRoot}" && agy chat "意图已更新，请读取 .ai/prism-intent.md" -r`;
        const childFallback = spawn('cmd.exe', ['/s', '/c', fallbackCmdStr], { shell: false });
        childFallback.on('error', (err2) => {
          console.error('Failed to wake up Antigravity via antigravity or agy:', err1, err2);
        });
      });
    } else {
      const child = spawn('antigravity', ['chat', '意图已更新，请读取 .ai/prism-intent.md', '-r'], { cwd: projectRoot });
      child.on('error', (err1) => {
        const childFallback = spawn('agy', ['chat', '意图已更新，请读取 .ai/prism-intent.md', '-r'], { cwd: projectRoot });
        childFallback.on('error', (err2) => {
          console.error('Failed to wake up Antigravity via antigravity or agy:', err1, err2);
        });
      });
    }
  }

  async injectSystemPrompt(projectRoot: string, prompt: string, mode: 'override' | 'append'): Promise<void> {
    const rulesPath = path.join(projectRoot, '.antigravity', 'rules.md');
    await fs.mkdir(path.join(projectRoot, '.antigravity'), { recursive: true });

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
    // 1. Create .antigravity/ directory
    const antigravityDir = path.join(projectRoot, '.antigravity');
    await fs.mkdir(antigravityDir, { recursive: true });

    // 2. Create plugin.json
    const pluginJsonPath = path.join(antigravityDir, 'plugin.json');
    const pluginJson = {
      name: 'prism-antigravity-plugin',
      version: '0.1.0',
      description: 'Prism Integration Plugin for Antigravity',
      author: {
        name: 'Prism'
      },
      license: 'MIT'
    };
    await fs.writeFile(pluginJsonPath, JSON.stringify(pluginJson, null, 2), 'utf-8');

    // 3. Create skills/rules.md
    const skillsDir = path.join(antigravityDir, 'skills');
    await fs.mkdir(skillsDir, { recursive: true });

    const ruleContent = `
# Prism Control Rules for Antigravity
1. You are driven by Prism. You MUST read intents from \`.ai/prism-intent.md\`.
2. When you need the user's input or decision, DO NOT output text questions.
3. Instead, you MUST CALL the MCP tool \`prism_ask_user\`!
4. Prism will render a UI for the user and return the result.
`.trim();
    await fs.writeFile(path.join(skillsDir, 'rules.md'), ruleContent, 'utf-8');

    // 4. Silently install the plugin using safe spawn with drive switching for Windows platform
    if (process.platform === 'win32') {
      const drive = projectRoot.substring(0, 2);
      const cmdStr = `"${drive}" && cd "${projectRoot}" && agy plugin install "${antigravityDir}"`;
      const child = spawn('cmd.exe', ['/s', '/c', cmdStr], { shell: false });
      child.on('error', (err) => {
        console.error('Failed to install Antigravity plugin silently via spawn:', err);
      });
    } else {
      const child = spawn('agy', ['plugin', 'install', antigravityDir], { cwd: projectRoot });
      child.on('error', (err) => {
        console.error('Failed to install Antigravity plugin silently via spawn:', err);
      });
    }

    // 5. Inject MCP config
    await this.injectMcpConfig();
  }

  async watchOutput(projectRoot: string, callback: (data: any) => void): Promise<void> {
    this.sendQuestionCallback = callback;
    this.activeProjectRoot = projectRoot;

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    const transcriptFile = await this.getLatestTranscriptPath();
    const chokidar = require('chokidar');

    if (!transcriptFile) {
      // Fallback: watch .antigravity/sessions/*/output.md
      const sessionsDir = path.join(projectRoot, '.antigravity', 'sessions');
      await fs.mkdir(sessionsDir, { recursive: true });

      this.watcher = chokidar.watch(path.join(sessionsDir, '**', 'output.md'), {
        ignoreInitial: false,
        awaitWriteFinish: { stabilityThreshold: 300 },
      });

      const handleFallbackUpdate = async (filePath: string) => {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          this.processContent(content, callback);
        } catch {
          // ignore
        }
      };

      this.watcher.on('add', handleFallbackUpdate);
      this.watcher.on('change', handleFallbackUpdate);
      return;
    }

    try {
      const stats = await fs.stat(transcriptFile);
      this.lastReadSize = stats.size;
    } catch {
      this.lastReadSize = 0;
    }

    this.watcher = chokidar.watch(transcriptFile, {
      ignoreInitial: true,
    });

    const handleUpdate = async () => {
      try {
        const stat = await fs.stat(transcriptFile);
        if (stat.size > this.lastReadSize) {
          const fd = await fs.open(transcriptFile, 'r');
          const buffer = Buffer.alloc(stat.size - this.lastReadSize);
          await fd.read(buffer, 0, buffer.length, this.lastReadSize);
          await fd.close();

          this.lastReadSize = stat.size;
          const newData = buffer.toString('utf-8');
          const lines = newData.split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.content) {
                this.processContent(json.content, callback);
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.error('Error reading transcript:', err);
      }
    };

    this.watcher.on('change', handleUpdate);
  }

  private processContent(content: string, callback: (data: any) => void): void {
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

    const blocks = this.parseInlineQuestionBlocks(content);
    for (const block of blocks) {
      callback(block);
    }
  }

  stopWatchOutput(): void {
    this.sendQuestionCallback = null;
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  private async getLatestTranscriptPath(): Promise<string | null> {
    const os = require('os');
    const possibleHomeDirs = [];
    if (process.env.GEMINI_HOME) {
      possibleHomeDirs.push(process.env.GEMINI_HOME);
    }
    possibleHomeDirs.push(path.join(os.homedir(), '.gemini'));

    for (const baseDir of possibleHomeDirs) {
      const possibleBrainDirs = [
        path.join(baseDir, 'antigravity-ide', 'brain'),
        path.join(baseDir, 'brain')
      ];
      for (const brainDir of possibleBrainDirs) {
        try {
          const entries = await fs.readdir(brainDir, { withFileTypes: true });
          const dirNames = entries.filter(d => d.isDirectory()).map(d => d.name);

          let latestFile = null;
          let latestTime = 0;
          for (const dirName of dirNames) {
            const transcriptPath = path.join(brainDir, dirName, '.system_generated', 'logs', 'transcript.jsonl');
            try {
              const stat = await fs.stat(transcriptPath);
              if (stat.mtimeMs > latestTime) {
                latestTime = stat.mtimeMs;
                latestFile = transcriptPath;
              }
            } catch {
              // ignore
            }
          }
          if (latestFile) {
            return latestFile;
          }
        } catch {
          // ignore
        }
      }
    }
    return null;
  }

  private parseInlineQuestionBlocks(content: string): any[] {
    const regex = /\[\[PRISM_QUESTION\]\]([\s\S]*?)\[\[\/PRISM_QUESTION\]\]/g;
    const blocks: any[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      try {
        const yamlContent = match[1].trim();
        const parsed = yaml.parse(yamlContent);
        if (!parsed.id) {
          parsed.id = 'q_' + Date.now() + Math.floor(Math.random() * 1000);
        }
        blocks.push(parsed);
      } catch (e) {
        console.error('Failed to parse PRISM_QUESTION yaml', e);
      }
    }
    return blocks;
  }

  answerPendingQuestion(questionId: string, answer: any): void {
    const resolver = this.pendingQuestions.get(questionId);
    if (resolver) {
      resolver(answer);
      this.pendingQuestions.delete(questionId);
    }
  }

  dispose(): void {
    this.stopWatchOutput();
    this.clearMcpConfigSync();
  }
}

