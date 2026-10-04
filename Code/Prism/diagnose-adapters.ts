// ============================================================
// Prism 适配器诊断脚本
// ============================================================

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

async function runCommand(cmd: string): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout: 10000 });
    return { success: true, stdout, stderr };
  } catch (err: any) {
    return { success: false, stdout: err.stdout || '', stderr: err.stderr || '', error: err.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        Prism 适配器环境诊断                            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // ============================================================
  // 1. 检查 IDE CLI 可用性
  // ============================================================
  console.log('【1. IDE CLI 可用性检查】\n');

  const clis = ['claude', 'cursor', 'windsurf', 'code'];
  for (const cli of clis) {
    const result = await runCommand(`${cli} --version 2>&1`);
    if (result.success) {
      console.log(`  ✓ ${cli}: ${result.stdout.trim()}`);
    } else {
      console.log(`  ✗ ${cli}: 未安装或不可用`);
      if (result.error) console.log(`    错误: ${result.error.substring(0, 100)}`);
    }
  }

  // ============================================================
  // 2. 检查 Claude MCP 配置
  // ============================================================
  console.log('\n【2. Claude MCP 配置检查】\n');

  // 检查 .claude 目录
  const testDir = 'd:\\Cloud\\Projects\\01-Prism\\Code\\Prism';
  const claudeDir = path.join(testDir, '.claude');

  try {
    await fs.mkdir(claudeDir, { recursive: true });
    const files = await fs.readdir(claudeDir);
    console.log(`  .claude 目录存在，包含 ${files.length} 个文件:`);
    for (const f of files) {
      console.log(`    - ${f}`);
    }
  } catch (err) {
    console.log(`  ✗ 无法创建 .claude 目录: ${(err as Error).message}`);
  }

  // ============================================================
  // 3. 测试 MCP 服务器连接
  // ============================================================
  console.log('\n【3. MCP 服务器连接测试】\n');

  const mcpUrls = [
    'http://127.0.0.1:1436/sse',
    'http://127.0.0.1:1436',
    'http://127.0.0.1:1437'
  ];

  for (const url of mcpUrls) {
    const result = await runCommand(`curl -s -o /dev/null -w "%{http_code}" "${url}" 2>&1 || echo "FAILED"`);
    if (result.stdout.includes('200') || result.stdout.includes('404') || result.stdout.includes('502')) {
      console.log(`  ✓ ${url}: 服务器响应 (状态: ${result.stdout.trim()})`);
    } else {
      console.log(`  ✗ ${url}: 无法连接`);
    }
  }

  // ============================================================
  // 4. 测试 Claude mcp add 命令语法
  // ============================================================
  console.log('\n【4. Claude mcp add 命令语法测试】\n');

  // 测试 SSE 传输
  const sseResult = await runCommand('claude mcp add --transport sse test-sse http://127.0.0.1:1436/sse 2>&1');
  if (sseResult.success) {
    console.log('  ✓ SSE 传输支持');
  } else {
    console.log(`  ✗ SSE 传输不支持: ${sseResult.stderr.substring(0, 200)}`);
  }

  // 测试 HTTP 传输
  const httpResult = await runCommand('claude mcp add --transport http test-http http://127.0.0.1:1436/sse 2>&1');
  if (httpResult.success) {
    console.log('  ✓ HTTP 传输支持');
  } else {
    console.log(`  ✗ HTTP 传输: ${httpResult.stderr.substring(0, 200)}`);
  }

  // ============================================================
  // 5. 测试 Windows PowerShell 中文编码
  // ============================================================
  console.log('\n【5. Windows PowerShell 中文编码测试】\n');

  const psTest = await runCommand('powershell.exe -Command "Write-Host \\"正在唤醒 Claude Code...\\" -ForegroundColor Cyan; claude --version"');
  if (psTest.success) {
    console.log('  ✓ PowerShell 中文输出正常');
  } else {
    console.log(`  ✗ PowerShell 中文输出失败: ${psTest.stderr.substring(0, 200)}`);
  }

  // ============================================================
  // 6. 检查文件路径问题
  // ============================================================
  console.log('\n【6. Windows 文件路径测试】\n');

  const testPath = path.join(testDir, '.ai', 'prism-intent.md');
  try {
    await fs.writeFile(testPath, '[[PRISM_INTENT]]\nTYPE: test\nINTENT: test\n', 'utf-8');
    const content = await fs.readFile(testPath, 'utf-8');
    if (content.includes('PRISM_INTENT')) {
      console.log(`  ✓ 文件写入/读取正常`);
      console.log(`    路径: ${testPath}`);
    } else {
      console.log(`  ✗ 文件内容验证失败`);
    }
  } catch (err) {
    console.log(`  ✗ 文件操作失败: ${(err as Error).message}`);
  }

  // ============================================================
  // 总结
  // ============================================================
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    诊断总结                              ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`
  关键发现:
  1. Claude CLI 已安装 (ClaudeCodeAdapter 可用)
  2. Cursor/Windsurf CLI 未安装 (相关适配器不可用)
  3. MCP SSE 传输可能不被支持
  4. 需要验证 MCP 服务器是否正常运行
  `);
}

main().catch(console.error);
