import { IDEAdapter, SessionConfig } from './types';
import * as path from 'path';
import * as fs from 'fs/promises';
import { watch } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WebSocketServer, WebSocket } from 'ws';
import { scanHelmDocs } from '../doc-manager/scanner';
import { writeADR } from '../doc-manager/adr-writer';
import { atomicUpdateTask } from '../doc-manager/mutator';
import { parseQuestionBlocks } from '../helm/question-parser';
import { parsePhaseMarkers } from '../helm/phase-parser';
import { detectViolations } from '../helm/violation-detector';
import { checkContextWarning } from '../helm/context-monitor';

const execAsync = promisify(exec);

export class CursorAdapter implements IDEAdapter {
  id = 'Cursor';
  name = 'Cursor IDE Adapter';
  private sendQuestionCallback: ((data: any) => void) | null = null;
  private activeSessionId: string | null = null;
  private activeProjectRoot: string | null = null;
  private pendingQuestions: Map<string, (answer: any) => void> = new Map();
  private fileWatcher: any = null;

  // Static WebSocket Server to avoid EADDRINUSE during test runs or hot reloads
  private static wss: WebSocketServer | null = null;
  private static wsClients: Set<WebSocket> = new Set();
  private static activeAdapter: CursorAdapter | null = null;

  constructor() {
    CursorAdapter.activeAdapter = this;
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    if (CursorAdapter.wss) {
      return; // Already initialized
    }

    try {
      CursorAdapter.wss = new WebSocketServer({ port: 1439 });
      CursorAdapter.wss.on('connection', (ws: WebSocket) => {
        console.log('[CursorAdapter] MCP Client connected');
        CursorAdapter.wsClients.add(ws);

        ws.on('message', async (raw: string) => {
          try {
            const data = JSON.parse(raw);
            if (CursorAdapter.activeAdapter) {
              await CursorAdapter.activeAdapter.handleIncomingMessage(data, ws);
            } else {
              console.warn('[CursorAdapter] No active CursorAdapter instance to handle message');
            }
          } catch (err: any) {
            console.error('[CursorAdapter] Error parsing client message:', err.message);
          }
        });

        ws.on('close', () => {
          CursorAdapter.wsClients.delete(ws);
          console.log('[CursorAdapter] MCP Client disconnected');
        });

        ws.on('error', (err) => {
          console.error('[CursorAdapter] MCP Client WS error:', err.message);
          CursorAdapter.wsClients.delete(ws);
        });
      });

      CursorAdapter.wss.on('error', (err: any) => {
        console.error('[CursorAdapter] WebSocket server error on port 1439:', err.message);
        if (err.code === 'EADDRINUSE') {
          console.warn('[CursorAdapter] Port 1439 is already in use. Retrying or sharing is assumed.');
        }
      });
    } catch (err: any) {
      console.error('[CursorAdapter] Exception starting WebSocket server:', err.message);
    }
  }

  private async handleIncomingMessage(data: any, ws: WebSocket) {
    if (data.type === 'init') {
      this.activeSessionId = data.sessionId;
      this.activeProjectRoot = data.projectRoot;
      console.log(`[CursorAdapter] Session initialized: ${this.activeSessionId} in ${this.activeProjectRoot}`);
      return;
    }

    if (data.type === 'call_tool') {
      const { name, arguments: args, messageId, sessionId } = data;
      if (sessionId) {
        this.activeSessionId = sessionId;
      }
      const projectRoot = this.activeProjectRoot || '';

      try {
        switch (name) {
          case 'prism_read_context': {
            if (!projectRoot) {
              this.sendToolResponse(ws, messageId, {
                content: [{ type: 'text', text: 'No active project root found.' }]
              });
              return;
            }
            const docs = scanHelmDocs(projectRoot);
            const summaries = docs
              .map(d => `### ${d.title} [${d.status}]\n${d.content.slice(0, 500)}`)
              .join('\n\n');
            this.sendToolResponse(ws, messageId, {
              content: [{ type: 'text', text: summaries }]
            });
            break;
          }

          case 'prism_write_decision': {
            if (!projectRoot) {
              this.sendToolResponse(ws, messageId, {
                content: [{ type: 'text', text: 'No active project root found.' }]
              });
              return;
            }
            const result = await writeADR(projectRoot, {
              title: args.title,
              context: 'Recorded via Prism Cursor MCP tool.',
              decision: args.content,
              consequences: 'None specified.'
            });
            this.sendToolResponse(ws, messageId, {
              content: [{ type: 'text', text: `Decision "${args.title}" recorded in ${result.fileName}.` }]
            });
            break;
          }

          case 'prism_update_task': {
            if (!projectRoot) {
              this.sendToolResponse(ws, messageId, {
                content: [{ type: 'text', text: 'No active project root found.' }]
              });
              return;
            }
            await atomicUpdateTask(projectRoot, args.sliceId, args.newStatus);
            this.sendToolResponse(ws, messageId, {
              content: [{ type: 'text', text: `Task ${args.sliceId} updated to ${args.newStatus}` }]
            });
            break;
          }

          case 'prism_ask_user': {
            // Store resolver using messageId as the questionId
            this.pendingQuestions.set(messageId, (answer: any) => {
              this.sendToolResponse(ws, messageId, {
                content: [{ type: 'text', text: JSON.stringify(answer) }]
              });
            });

            if (this.sendQuestionCallback) {
              this.sendQuestionCallback({
                id: messageId,
                type: args.questionType,
                title: args.title,
                options: args.options
              });
            } else {
              console.warn('[CursorAdapter] sendQuestionCallback is not registered');
            }
            break;
          }

          default:
            this.sendToolResponse(ws, messageId, {
              content: [{ type: 'text', text: `Tool not found: ${name}` }],
              isError: true
            });
        }
      } catch (err: any) {
        this.sendToolResponse(ws, messageId, {
          content: [{ type: 'text', text: `Failed to execute tool: ${err.message || err}` }],
          isError: true
        });
      }
    }
  }

  private sendToolResponse(ws: WebSocket, messageId: string, result: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'tool_response',
        messageId,
        result
      }));
    }
  }

  answerPendingQuestion(questionId: string, answer: any) {
    const resolver = this.pendingQuestions.get(questionId);
    if (resolver) {
      resolver(answer);
      this.pendingQuestions.delete(questionId);
    }
  }

  async detect(projectRoot?: string): Promise<boolean> {
    // Check if cursor CLI exists
    try {
      await execAsync('cursor --version');
      return true;
    } catch {
      // Fallback: check if .cursor/ directory exists in project
      if (projectRoot) {
        try {
          await fs.access(path.join(projectRoot, '.cursor'));
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  }

  async openSession(projectRoot: string, config: SessionConfig): Promise<string> {
    const sessionId = 'cursor_' + Date.now();
    this.activeSessionId = sessionId;
    this.activeProjectRoot = projectRoot;
    
    // Dynamically update/inject rules and mcp.json with the actual active session ID
    await this.injectRules(projectRoot);

    const chatDir = path.join(projectRoot, '.cursor', 'chat', sessionId);
    await fs.mkdir(chatDir, { recursive: true });

    const inputFile = path.join(chatDir, 'input.md');
    try {
      await fs.access(inputFile);
    } catch {
      await fs.writeFile(inputFile, `[[PRISM_MESSAGE]]\nSESSION: ${sessionId}\nTIMESTAMP: ${new Date().toISOString()}\nINTENT: ${config.text}\n`, 'utf-8');
    }

    const sessionFile = path.join(chatDir, 'session.json');
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

    // Active Wakeup: Silently launch Cursor and focus on input.md
    try {
      await execAsync(`cursor --goto "${inputFile}"`);
      console.log(`[CursorAdapter] Active IDE wakeup succeeded for: ${inputFile}`);
    } catch (err: any) {
      console.error(`[CursorAdapter] Failed to wake up Cursor in openSession: ${err.message}`);
    }

    return sessionId;
  }

  async sendMessage(projectRoot: string, sessionId: string, message: string): Promise<void> {
    const chatDir = path.join(projectRoot, '.cursor', 'chat', sessionId);
    await fs.mkdir(chatDir, { recursive: true });

    const inputFile = path.join(chatDir, 'input.md');
    const timestamp = new Date().toISOString();
    const entry = `[[PRISM_MESSAGE]]\nSESSION: ${sessionId}\nTIMESTAMP: ${timestamp}\n${message}\n`;
    await fs.appendFile(inputFile, entry, 'utf-8');

    // Active Wakeup: Focus Cursor on input.md
    try {
      await execAsync(`cursor --goto "${inputFile}"`);
    } catch (err: any) {
      console.error(`[CursorAdapter] Failed to focus Cursor in sendMessage: ${err.message}`);
    }
  }

  async getProjectRoot(projectRoot: string): Promise<string> {
    const projectJson = path.join(projectRoot, '.cursor', 'project.json');
    try {
      const data = await fs.readFile(projectJson, 'utf-8');
      const parsed = JSON.parse(data);
      return parsed.projectPath || projectRoot;
    } catch {
      return projectRoot;
    }
  }

  watchOutput(projectRoot: string, callback: (data: any) => void): void {
    this.sendQuestionCallback = callback;
    this.activeProjectRoot = projectRoot;

    if (this.fileWatcher) {
      this.fileWatcher.close();
    }

    const chatDir = path.join(projectRoot, '.cursor', 'chat');
    
    // Ensure chat directory exists
    fs.mkdir(chatDir, { recursive: true }).then(() => {
      try {
        // High-frequency native fs.watch for near-zero (<50ms) file latency
        this.fileWatcher = watch(chatDir, { recursive: true }, async (eventType, filename) => {
          if (!filename || !filename.endsWith('output.md')) return;
          
          const filePath = path.join(chatDir, filename);
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
      } catch (err: any) {
        console.error('[CursorAdapter] Native fs.watch failed to start:', err.message);
      }
    });
  }

  async stopWatchOutput(): Promise<void> {
    this.sendQuestionCallback = null;
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }

    // Auto GC when stopping the watcher (session ends / task completed)
    if (this.activeProjectRoot && this.activeSessionId) {
      await this.closeSession(this.activeProjectRoot, this.activeSessionId);
    }
  }

  async closeSession(projectRoot: string, sessionId: string): Promise<void> {
    const chatDir = path.join(projectRoot, '.cursor', 'chat', sessionId);
    try {
      await fs.rm(chatDir, { recursive: true, force: true });
      console.log(`[CursorAdapter] GC: Successfully cleaned up temporary session directory: ${chatDir}`);
    } catch (err: any) {
      console.error(`[CursorAdapter] GC: Failed to delete temporary session directory: ${chatDir}`, err.message);
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

    // Active Wakeup: If there is an active session, focus Cursor on its input.md
    if (this.activeSessionId) {
      const inputFile = path.join(projectRoot, '.cursor', 'chat', this.activeSessionId, 'input.md');
      try {
        await execAsync(`cursor --goto "${inputFile}"`);
      } catch (err: any) {
        console.error(`[CursorAdapter] Failed to focus Cursor in dispatchIntent: ${err.message}`);
      }
    }
  }

  async injectSystemPrompt(
    projectRoot: string,
    prompt: string,
    mode: 'override' | 'append'
  ): Promise<void> {
    const cursorRulesPath = path.join(projectRoot, '.cursorrules');
    const cursorDirRules = path.join(projectRoot, '.cursor', 'rules');

    await fs.mkdir(path.join(projectRoot, '.cursor'), { recursive: true });

    if (mode === 'override') {
      await fs.writeFile(cursorRulesPath, prompt, 'utf-8');
      await fs.writeFile(cursorDirRules, prompt, 'utf-8');
      return;
    }

    let existing = '';
    try {
      existing = await fs.readFile(cursorRulesPath, 'utf-8');
    } catch {
      // file doesn't exist yet
    }
    const combined = `${existing.trim()}\n\n---\n\n${prompt}`.trim();
    await fs.writeFile(cursorRulesPath, combined, 'utf-8');
    await fs.writeFile(cursorDirRules, combined, 'utf-8');
  }

  async injectRules(projectRoot: string): Promise<void> {
    // 1. Generate/update .cursor/mcp.json
    await this.injectMcpJson(projectRoot);

    // 2. Minimal rules to guide the model to use the MCP tools
    const ruleContent = `
# Prism Control Rules (Injected for Cursor)
1. You are driven by Prism. You MUST read intents from \`.ai/prism-intent.md\`.
2. When you need the user's input or decision, DO NOT output text questions.
3. Instead, you MUST CALL the MCP tool \`prism_ask_user\`!
4. Prism will render a UI for the user and return the result.
`.trim();
    await fs.writeFile(path.join(projectRoot, '.cursorrules'), ruleContent, 'utf-8');
    await fs.mkdir(path.join(projectRoot, '.cursor'), { recursive: true });
    await fs.writeFile(path.join(projectRoot, '.cursor', 'rules'), ruleContent, 'utf-8');
  }

  private async injectMcpJson(projectRoot: string): Promise<void> {
    const cursorDir = path.join(projectRoot, '.cursor');
    await fs.mkdir(cursorDir, { recursive: true });

    const mcpJsonPath = path.join(cursorDir, 'mcp.json');
    let existingData: any = {};

    try {
      const content = await fs.readFile(mcpJsonPath, 'utf-8');
      existingData = JSON.parse(content);
    } catch {
      // file doesn't exist or is invalid JSON
    }

    if (!existingData.mcpServers) {
      existingData.mcpServers = {};
    }

    const sessId = this.activeSessionId || ('cursor_' + Date.now());

    existingData.mcpServers.prism = {
      command: 'node',
      args: [path.join(projectRoot, 'dist', 'mcp-server.js')],
      env: {
        PRISM_SESSION_ID: sessId,
        PRISM_PROJECT_ROOT: projectRoot
      }
    };

    await fs.writeFile(mcpJsonPath, JSON.stringify(existingData, null, 2), 'utf-8');
  }

  dispose(): void {
    if (CursorAdapter.activeAdapter === this) {
      CursorAdapter.activeAdapter = null;
    }
    for (const client of CursorAdapter.wsClients) {
      client.terminate();
    }
    CursorAdapter.wsClients.clear();
    if (CursorAdapter.wss) {
      CursorAdapter.wss.close();
      CursorAdapter.wss = null;
    }
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }

    // Auto GC on dispose
    if (this.activeProjectRoot && this.activeSessionId) {
      this.closeSession(this.activeProjectRoot, this.activeSessionId).catch(() => {});
    }
  }
}
