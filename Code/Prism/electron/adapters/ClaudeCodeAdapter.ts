import { IDEAdapter } from './types';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { WebSocketServer, WebSocket } from 'ws';
import { parseQuestionBlocks } from '../helm/question-parser';
import { parsePhaseMarkers } from '../helm/phase-parser';
import { detectViolations } from '../helm/violation-detector';
import { checkContextWarning } from '../helm/context-monitor';
import { atomicUpdateTask } from '../doc-manager/mutator';
import { scanHelmDocs } from '../doc-manager/scanner';
import { writeADR } from '../doc-manager/adr-writer';

const execAsync = promisify(exec);

function sanitizeString(str: any, maxLength: number): string {
  if (typeof str !== 'string') {
    throw new Error('Invalid parameter type: expected string');
  }
  if (str.length > maxLength) {
    throw new Error(`Parameter exceeds maximum length of ${maxLength}`);
  }
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(str)) {
    throw new Error('Script tags are not allowed in parameters');
  }
  return str.replace(/<[^>]*>/g, '');
}


export class ClaudeCodeAdapter implements IDEAdapter {
  id = 'ClaudeExtension';
  name = 'Claude Code (Extension)';
  private server: Server;
  private sseTransports: Map<string, SSEServerTransport> = new Map();
  private app: express.Application;
  private httpServer: any;
  private pendingQuestions: Map<string, (answer: any) => void> = new Map();
  private sendQuestionCallback: ((data: any) => void) | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastOutboxSize = 0;
  private wss: WebSocketServer | null = null;
  private wsClients: Set<WebSocket> = new Set();
  private activeProjectRoot: string | null = null;
  constructor() {
    this.server = new Server(
      { name: 'prism-mcp', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    this.setupMcpServer();
    this.setupWebSocketServer();
  }

  private setupMcpServer() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'prism_read_context',
            description: 'Read the current project Helm document summaries.',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'prism_write_decision',
            description: 'Write a user decision to a physical ADR file in docs/adr/.',
            inputSchema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Title of the architecture decision' },
                context: { type: 'string', description: 'Context and problem description' },
                decision: { type: 'string', description: 'The decision and implementation details' },
                consequences: { type: 'string', description: 'Consequences and side effects of this decision' }
              },
              required: ['title', 'decision']
            }
          },
          {
            name: 'prism_ask_user',
            description: 'Ask the user a decision question via Prism UI. ALWAYS use this instead of writing text questions.',
            inputSchema: {
              type: 'object',
              properties: {
                questionType: { type: 'string', enum: ['choice', 'confirm', 'input', 'multi_select'] },
                title: { type: 'string', description: 'The question title' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      detail: { type: 'string' },
                      input: { type: 'boolean' }
                    },
                    required: ['label']
                  }
                }
              },
              required: ['questionType', 'title']
            }
          },
          {
            name: 'prism_update_task',
            description: 'Update the status of a slice in TASK.md.',
            inputSchema: {
              type: 'object',
              properties: {
                sliceId: { type: 'string' },
                newStatus: { type: 'string' }
              },
              required: ['sliceId', 'newStatus']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments as any;
      const activeIdeName = (global as any).activeIdeName;
      const adapterManager = (global as any).prismAdapterManager;
      const activeAdapter = adapterManager?.getAdapter(activeIdeName);
      const currentProjectRoot = (activeAdapter && (activeAdapter as any).activeProjectRoot) || this.activeProjectRoot;

      switch (request.params.name) {
        case 'prism_read_context': {
          if (!currentProjectRoot) {
            return {
              content: [{ type: 'text', text: 'No active project root found.' }]
            };
          }
          try {
            const possibleDirs = [
              path.join(currentProjectRoot, 'Helm', 'docs'),
              path.join(currentProjectRoot, 'docs'),
              path.join(currentProjectRoot),
            ];

            const foundFiles: { path: string; name: string }[] = [];
            const targetNames = ['CONTEXT.md', 'DECISION.md', 'RESEARCH.md', 'PRODUCT.md', 'DESIGN.md', 'TASK.md', 'HANDOFF.md'];

            for (const dir of possibleDirs) {
              try {
                const files = await fs.readdir(dir);
                for (const f of files) {
                  if (targetNames.includes(f) || f.endsWith('.md')) {
                    const fullPath = path.join(dir, f);
                    const stat = await fs.stat(fullPath);
                    if (stat.isFile() && !foundFiles.some(x => x.path === fullPath)) {
                      foundFiles.push({ path: fullPath, name: f });
                    }
                  }
                }
              } catch {
                // ignore
              }
            }

            if (foundFiles.length === 0) {
              return {
                content: [{ type: 'text', text: 'No Helm context or markdown documents found in the project.' }]
              };
            }

            const aggregated: string[] = [];
            for (const file of foundFiles) {
              try {
                const content = await fs.readFile(file.path, 'utf-8');
                aggregated.push(`### ${file.name}\n\n${content}`);
              } catch (err: any) {
                console.error(`Failed to read ${file.path}:`, err.message);
              }
            }

            return {
              content: [{ type: 'text', text: aggregated.join('\n\n---\n\n') }]
            };
          } catch (err: any) {
            return {
              content: [{ type: 'text', text: `Failed to read context: ${err.message || err}` }],
              isError: true
            };
          }
        }

        case 'prism_write_decision': {
          if (!currentProjectRoot) {
            return {
              content: [{ type: 'text', text: 'No active project root found.' }]
            };
          }
          try {
            const title = sanitizeString(args.title, 200);
            const decisionStr = sanitizeString(args.decision || args.content || '', 5000);
            const contextStr = args.context ? sanitizeString(args.context, 5000) : 'Recorded via Prism MCP tool.';
            const consequencesStr = args.consequences ? sanitizeString(args.consequences, 5000) : 'None specified.';

            const result = await writeADR(currentProjectRoot, {
              title: title,
              context: contextStr,
              decision: decisionStr,
              consequences: consequencesStr
            });
            return {
              content: [{ type: 'text', text: `Decision "${title}" recorded in ${result.fileName}.` }]
            };
          } catch (err: any) {
            return {
              content: [{ type: 'text', text: `Failed to record decision: ${err.message || err}` }],
              isError: true
            };
          }
        }

        case 'prism_ask_user': {
          try {
            const questionType = sanitizeString(args.questionType, 50);
            if (!['choice', 'confirm', 'input', 'multi_select'].includes(questionType)) {
              return {
                content: [{ type: 'text', text: 'Error: invalid questionType' }],
                isError: true
              };
            }
            const title = sanitizeString(args.title, 500);

            let options: any[] = [];
            if (args.options) {
              if (!Array.isArray(args.options)) {
                return {
                  content: [{ type: 'text', text: 'Error: options must be an array' }],
                  isError: true
                };
              }
              if (args.options.length > 50) {
                return {
                  content: [{ type: 'text', text: 'Error: too many options (max 50)' }],
                  isError: true
                };
              }
              for (const opt of args.options) {
                if (!opt || typeof opt !== 'object') {
                  return {
                    content: [{ type: 'text', text: 'Error: invalid option format' }],
                    isError: true
                  };
                }
                const label = sanitizeString(opt.label, 200);
                const detail = opt.detail ? sanitizeString(opt.detail, 1000) : undefined;
                const input = opt.input !== undefined ? !!opt.input : undefined;
                options.push({ label, detail, input });
              }
            }

            const qId = 'q_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
            return new Promise((resolve) => {
              const questionPayload = {
                id: qId,
                type: questionType,
                title,
                options
              };

              if (activeAdapter && activeAdapter.id !== 'ClaudeExtension') {
                const adapterAny = activeAdapter as any;
                if (!adapterAny.pendingQuestions) {
                  adapterAny.pendingQuestions = new Map();
                }
                adapterAny.pendingQuestions.set(qId, (answer: any) => {
                  resolve({
                    content: [{ type: 'text', text: JSON.stringify(answer) }]
                  });
                });

                if (adapterAny.sendQuestionCallback) {
                  adapterAny.sendQuestionCallback(questionPayload);
                }
              } else {
                this.pendingQuestions.set(qId, (answer: any) => {
                  resolve({
                    content: [{ type: 'text', text: JSON.stringify(answer) }]
                  });
                });

                if (this.sendQuestionCallback) {
                  this.sendQuestionCallback(questionPayload);
                }
              }

              this.broadcastWebSocket({
                type: 'question',
                ...questionPayload
              });
            });
          } catch (err: any) {
            return {
              content: [{ type: 'text', text: `Validation Error: ${err.message}` }],
              isError: true
            };
          }
        }

        case 'prism_update_task': {
          if (!currentProjectRoot) {
            return {
              content: [{ type: 'text', text: 'No active project root found.' }]
            };
          }
          try {
            await atomicUpdateTask(currentProjectRoot, args.sliceId, args.newStatus);
            return {
              content: [{ type: 'text', text: `Task ${args.sliceId} updated to ${args.newStatus}` }]
            };
          } catch (err: any) {
            return {
              content: [{ type: 'text', text: `Failed to update task: ${err.message || err}` }],
              isError: true
            };
          }
        }

        default:
          throw new Error('Tool not found');
      }
    });

    this.app.get('/sse', async (req, res) => {
      const transport = new SSEServerTransport('/message', res);
      await this.server.connect(transport);
      
      const sessId = transport.sessionId;
      this.sseTransports.set(sessId, transport);
      console.log(`[Prism MCP] Registered SSE Transport session: ${sessId}`);

      req.on('close', () => {
        this.sseTransports.delete(sessId);
        console.log(`[Prism MCP] Unregistered SSE Transport session: ${sessId}`);
      });
    });

    this.app.post('/message', async (req, res) => {
      const sessId = req.query.sessionId as string;
      if (!sessId) {
        res.status(400).send('Missing sessionId');
        return;
      }
      const transport = this.sseTransports.get(sessId);
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        console.warn(`[Prism MCP] Session not found for ID: ${sessId}`);
        res.status(404).send('Session not found');
      }
    });

    const isTest = typeof process.env.VITEST !== 'undefined' || process.env.NODE_ENV === 'test';
    if (!isTest) {
      this.httpServer = this.app.listen(1436, () => {
        console.log('Prism MCP Server listening on port 1436 (SSE)');
      }).on('error', (err: any) => {
        console.error('Failed to start Prism MCP Server on port 1436:', err.message);
      });
    }
  }

  private setupWebSocketServer() {
    const isTest = typeof process.env.VITEST !== 'undefined' || process.env.NODE_ENV === 'test';
    if (isTest) {
      console.log('Skipping WebSocket server port binding in test environment');
      return;
    }

    try {
      this.wss = new WebSocketServer({ port: 1437 });

      this.wss.on('connection', (ws) => {
        console.log('Prism VSCode bridge connected');
        this.wsClients.add(ws);

        ws.on('message', (messageRaw) => {
          try {
            const data = JSON.parse(messageRaw.toString());
            if (data.type === 'answer' && data.id) {
              console.log(`Received answer via WS for question ${data.id}:`, data.answer);
              this.answerPendingQuestion(data.id, data.answer);
            } else if (data.type === 'intent' && data.intentType && data.text && data.projectRoot) {
              console.log(`Received intent via WS: [${data.intentType}] ${data.text}`);
              this.dispatchIntent(data.intentType, data.text, data.projectRoot);
            }
          } catch (err: any) {
            console.error('Failed to parse WebSocket message:', err.message);
          }
        });

        ws.on('close', () => {
          this.wsClients.delete(ws);
          console.log('Prism VSCode bridge disconnected');
        });

        ws.on('error', (err) => {
          console.error('Prism VSCode bridge error:', err.message);
          this.wsClients.delete(ws);
        });
      });

      this.wss.on('error', (err) => {
        console.error('Failed to start Prism WebSocket server on port 1437:', err.message);
      });

      console.log('Prism WebSocket bridge listening on port 1437');
    } catch (err: any) {
      console.error('Failed to start Prism WebSocket server on port 1437:', err.message);
    }
  }

  private broadcastWebSocket(payload: any) {
    const raw = JSON.stringify(payload);
    for (const client of this.wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(raw);
        } catch {
          // ignore send error
        }
      }
    }
  }

  private broadcastIntent(intentType: string, text: string, projectRoot: string) {
    const payload = JSON.stringify({
      type: 'intent',
      intentType,
      text,
      projectRoot,
      timestamp: new Date().toISOString(),
    });

    for (const client of this.wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(payload);
        } catch {
          // ignore
        }
      }
    }

    // Cross-platform foreground focusing for VSCode
    try {
      if (process.platform === 'win32') {
        const psCommand = `(New-Object -ComObject WScript.Shell).AppActivate((Get-Process -Name 'Code' -ErrorAction SilentlyContinue | Select-Object -First 1).Id)`;
        exec(`powershell -Command "${psCommand}"`, (err) => {
          if (err) console.error('Failed to focus VSCode on Windows:', err.message);
        });
      } else if (process.platform === 'darwin') {
        exec(`osascript -e 'tell application "Visual Studio Code" to activate'`, (err) => {
          if (err) console.error('Failed to focus VSCode on macOS:', err.message);
        });
      } else {
        exec(`wmctrl -x -a "code.Code"`, (err) => {
          if (err) console.error('Failed to focus VSCode on Linux:', err.message);
        });
      }
    } catch (e: any) {
      console.error('Failed to run VSCode activation:', e.message);
    }
  }

  // ---------------------------------------------------------------------------
  // IDEAdapter interface
  // ---------------------------------------------------------------------------

  async detect(): Promise<boolean> {
    try {
      await execAsync('claude --version');
      return true;
    } catch {
      return false;
    }
  }

  async openSession(projectRoot: string, config: { intentType: string; text: string }): Promise<string> {
    this.activeProjectRoot = projectRoot;
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

    await this.injectClaudeConfig(projectRoot).catch((err) => {
      console.error('Failed to inject Claude config during openSession:', err.message);
    });

    return sessionId;
  }

  async sendMessage(projectRoot: string, _sessionId: string, message: string): Promise<void> {
    const aiDir = path.join(projectRoot, '.ai');
    await fs.mkdir(aiDir, { recursive: true });

    const inboxFile = path.join(aiDir, 'prism-inbox.md');
    const timestamp = new Date().toISOString();
    const entry = `\n[[PRISM_MESSAGE]]\nSESSION: ${_sessionId}\nTIMESTAMP: ${timestamp}\n${message}\n`;
    await fs.appendFile(inboxFile, entry, 'utf-8');
  }

  async getProjectRoot(projectRoot: string): Promise<string> {
    return projectRoot;
  }

  watchOutput(projectRoot: string, callback: (data: any) => void): void {
    this.activeProjectRoot = projectRoot;
    // Store callback for MCP questions
    this.sendQuestionCallback = callback;

    // Poll .ai/prism-outbox.md for QUESTION blocks
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    const outboxPath = path.join(projectRoot, '.ai', 'prism-outbox.md');
    this.lastOutboxSize = 0;

    this.pollTimer = setInterval(async () => {
      try {
        const stat = await fs.stat(outboxPath);
        if (stat.size <= this.lastOutboxSize) return;

        const buffer = Buffer.alloc(stat.size - this.lastOutboxSize);
        const fd = await fs.open(outboxPath, 'r');
        await fd.read(buffer, 0, buffer.length, this.lastOutboxSize);
        await fd.close();

        this.lastOutboxSize = stat.size;
        const newContent = buffer.toString('utf-8');

        const violations = detectViolations(newContent);
        if (violations.length > 0) {
          callback({ __violations: violations });
        }

        const contextWarning = checkContextWarning(newContent);
        if (contextWarning) {
          callback({ __contextWarning: contextWarning });
        }

        const phase = parsePhaseMarkers(newContent);
        if (phase) {
          callback({ __phase: phase });
        }

        const questions = parseQuestionBlocks(newContent);
        for (const q of questions) {
          callback(q);
        }
      } catch {
        // Outbox may not exist yet — ignore
      }
    }, 500);
  }

  stopWatchOutput(): void {
    this.sendQuestionCallback = null;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  dispose(): void {
    this.stopWatchOutput();
    for (const client of this.wsClients) {
      try {
        client.terminate();
      } catch {
        // ignore
      }
    }
    this.wsClients.clear();

    if (this.wss) {
      try {
        this.wss.close();
      } catch (err: any) {
        console.error('Error closing WebSocket Server:', err.message);
      }
      this.wss = null;
    }

    if (this.httpServer) {
      try {
        this.httpServer.close();
      } catch (err: any) {
        console.error('Error closing Express Server:', err.message);
      }
      this.httpServer = null;
    }
  }

  async answerPendingQuestion(questionId: string, answer: any) {
    const resolver = this.pendingQuestions.get(questionId);
    if (resolver) {
      resolver(answer);
      this.pendingQuestions.delete(questionId);

      // Broadcast resolution to WebSocket and Electron UI
      this.broadcastWebSocket({
        type: 'question_resolved',
        id: questionId,
        answer: answer
      });

      if (this.sendQuestionCallback) {
        this.sendQuestionCallback({
          __questionResolved: {
            id: questionId,
            answer: answer
          }
        });
      }
    } else {
      // Fallback for file-based questions
      if (this.activeProjectRoot) {
        try {
          const aiDir = path.join(this.activeProjectRoot, '.ai');
          await fs.mkdir(aiDir, { recursive: true });
          const intentFile = path.join(aiDir, 'prism-intent.md');
          const timestamp = new Date().toISOString();
          const content = `\n[[PRISM_ANSWER]]\nQUESTION_ID: ${questionId}\nANSWER: ${JSON.stringify(answer)}\nTIMESTAMP: ${timestamp}\n`;
          await fs.appendFile(intentFile, content, 'utf-8');
          console.log(`Fallback: wrote answer to file for question ${questionId}`);

          // Broadcast to WS as well to keep them in sync
          this.broadcastWebSocket({
            type: 'question_resolved',
            id: questionId,
            answer: answer
          });
        } catch (err: any) {
          console.error('Failed to write fallback answer file:', err.message);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Intent dispatch
  // ---------------------------------------------------------------------------

  async dispatchIntent(intentType: string, text: string, projectRoot: string): Promise<void> {
    const aiDir = path.join(projectRoot, '.ai');
    try { await fs.mkdir(aiDir, { recursive: true }); } catch (err: any) { if (err.code !== 'EEXIST') throw err; }
    const intentFile = path.join(aiDir, 'prism-intent.md');
    await fs.writeFile(intentFile, `[[PRISM_INTENT]]\nTYPE: ${intentType}\nINTENT: ${text}\nTIMESTAMP: ${new Date().toISOString()}\n`, 'utf-8');
    this.broadcastIntent(intentType, text, projectRoot);
  }

  // ---------------------------------------------------------------------------
  // System Prompt injection
  // ---------------------------------------------------------------------------

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
    console.log(`Successfully injected prism-mcp config to ${settingsPath}`);
  }

  async injectRules(projectRoot: string): Promise<void> {
    this.activeProjectRoot = projectRoot;
    const ruleContent = `
# Prism Control Rules (Injected for Roo Code / Claude)
1. You are driven by Prism. You MUST read intents from \`.ai/prism-intent.md\`.
2. When you need the user's input or decision, DO NOT output text questions.
3. Instead, you MUST CALL the MCP tool \`prism_ask_user\`!
4. Prism will render a UI for the user and return the result.
`.trim();
    await fs.writeFile(path.join(projectRoot, '.clinerules'), ruleContent, 'utf-8');
    await fs.writeFile(path.join(projectRoot, '.cursorrules'), ruleContent, 'utf-8');

    await this.injectClaudeConfig(projectRoot).catch((err) => {
      console.error('Failed to inject Claude config during injectRules:', err.message);
    });
  }
}
