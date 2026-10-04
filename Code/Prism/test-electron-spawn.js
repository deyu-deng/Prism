// 在 Electron 环境中测试进程启动
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

async function testInElectronContext() {
  console.log('=== 在 Electron 上下文中测试进程启动 ===\n');

  // 1. 检查环境变量
  console.log('1. 环境变量检查:');
  console.log(`   ANTHROPIC_API_KEY: ${process.env.ANTHROPIC_API_KEY ? '已设置' : '未设置'}`);
  console.log(`   PATH 包含 node_modules/.bin: ${process.env.PATH.includes('node_modules/.bin') ? '是' : '否'}`);

  // 2. 测试简单命令
  console.log('\n2. 测试简单命令...');
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-Command', 'echo "Hello from PowerShell"'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      console.log(`   退出代码: ${code}`);
      console.log(`   stdout: ${stdout.trim()}`);
      if (stderr) console.log(`   stderr: ${stderr.trim()}`);
      resolve(code === 0);
    });

    child.on('error', (err) => {
      console.log(`   ✗ 启动失败: ${err.message}`);
      resolve(false);
    });
  });
}

testInElectronContext().then((success) => {
  console.log(`\n=== 测试${success ? '成功' : '失败'} ===`);
});
