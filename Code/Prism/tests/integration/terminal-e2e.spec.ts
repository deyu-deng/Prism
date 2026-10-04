import { describe, it, expect, afterAll } from 'vitest';
import { ClaudeTerminalAdapter } from '../electron/adapters/ClaudeTerminalAdapter';
import * as path from 'path';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('ClaudeTerminalAdapter 真实环境测试', () => {
  const testDir = path.join(process.cwd(), 'test-terminal-e2e');
  const adapter = new ClaudeTerminalAdapter();

  afterAll(async () => {
    adapter.dispose();
    await fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  it('1. detect() 应该检测到 Claude CLI', async () => {
    const detected = await adapter.detect();
    expect(detected).toBe(true);
  });

  it('2. injectRules() 应该创建 CLAUDE.md 和 .claude/settings.local.json', async () => {
    await fs.mkdir(testDir, { recursive: true });
    await adapter.injectRules(testDir);

    const claudeMd = await fs.readFile(path.join(testDir, 'CLAUDE.md'), 'utf-8');
    expect(claudeMd).toContain('Prism');

    const settings = await fs.readFile(path.join(testDir, '.claude', 'settings.local.json'), 'utf-8');
    const parsed = JSON.parse(settings);
    expect(parsed.mcpServers).toBeDefined();
    expect(parsed.mcpServers['prism-mcp']).toBeDefined();
  });

  it('3. openSession() 应该创建 session 文件', async () => {
    await fs.mkdir(testDir, { recursive: true });
    const sessionId = await adapter.openSession(testDir, {
      intentType: 'feature',
      text: 'Test'
    });

    expect(sessionId).toBeTruthy();
    const sessionFile = path.join(testDir, '.ai', 'prism-session.json');
    const session = await fs.readFile(sessionFile, 'utf-8');
    expect(session).toContain('sessionId');
  });

  it('4. sendMessage() 应该追加到 inbox 文件', async () => {
    await adapter.sendMessage(testDir, 'test-session', 'Hello World');
    const inbox = await fs.readFile(path.join(testDir, '.ai', 'prism-inbox.md'), 'utf-8');
    expect(inbox).toContain('Hello World');
  });

  it('5. dispatchIntent() 应该创建 intent 文件', async () => {
    await adapter.dispatchIntent('feature', 'Test Feature', testDir);

    const intentFile = path.join(testDir, '.ai', 'prism-intent.md');
    const intent = await fs.readFile(intentFile, 'utf-8');
    expect(intent).toContain('[[PRISM_INTENT]]');
    expect(intent).toContain('feature');
    expect(intent).toContain('Test Feature');
  });

  it('6. Claude CLI 应该能读取 intent 文件', async () => {
    // 先创建 intent 文件
    const intentFile = path.join(testDir, '.ai', 'prism-intent.md');
    await fs.writeFile(intentFile, `[[PRISM_INTENT]]\nTYPE: test\nINTENT: 简单测试\n`, 'utf-8');

    // 测试 Claude CLI 能否读取文件
    const result = await execAsync(
      'claude -p "Read the file .ai/prism-intent.md and just say OK"',
      { cwd: testDir, timeout: 10000 }
    );

    // CLI 应该执行成功（不检查具体输出，因为 AI 响应不确定）
    expect(result.stdout || result.stderr).toBeTruthy();
  }, 15000);
});
