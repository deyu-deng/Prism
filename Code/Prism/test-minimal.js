// 极简测试：验证完整的 dispatchIntent 流程
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  console.log('=== 极简端到端测试 ===\n');

  const testDir = 'd:\\Cloud\\Projects\\01-Prism\\Code\\Prism\\test-minimal';
  
  // 1. 创建测试目录和 intent 文件
  console.log('1. 创建 intent 文件...');
  await fs.mkdir(path.join(testDir, '.ai'), { recursive: true });
  const intentFile = path.join(testDir, '.ai', 'prism-intent.md');
  await fs.writeFile(intentFile, `[[PRISM_INTENT]]\nTYPE: feature\nINTENT: 简单测试\nTIMESTAMP: ${new Date().toISOString()}\n`, 'utf-8');
  console.log('   ✓ 创建成功');

  // 2. 测试 Claude CLI 直接执行
  console.log('\n2. 测试 Claude CLI 直接执行...');
  const psCommand = `claude -p "请读取 .ai/prism-intent.md 文件，分析其中的意图，然后用中文简单回复"`;
  
  const child = spawn('powershell.exe', ['-Command', psCommand], {
    cwd: testDir,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    console.log(`   stdout: ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.log(`   stderr: ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    console.log(`\n3. 进程退出，代码: ${code}`);
    
    if (code === 0) {
      console.log('   ✓ Claude CLI 执行成功');
    } else {
      console.log('   ✗ Claude CLI 执行失败');
      console.log('   可能原因：');
      console.log('   - Claude CLI 需要 API 密钥配置');
      console.log('   - 网络连接问题');
      console.log('   - 输入输出格式问题');
    }
    
    // 清理
    fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });

  child.on('error', (err) => {
    console.log(`   ✗ 进程启动失败: ${err.message}`);
    fs.rm(testDir, { recursive: true, force: true }).catch(() => {});
  });
}

main().catch(console.error);
