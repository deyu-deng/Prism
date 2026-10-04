const { spawn } = require('child_process');
const psCommand = `Write-Host '正在唤醒 Claude Code...' -ForegroundColor Cyan; claude -p '请读取 .ai/prism-intent.md 并执行其中的意图指令'; Write-Host '任务结束。' -ForegroundColor Green`;
const child = spawn('powershell.exe', ['-NoExit', '-Command', psCommand], {
  cwd: __dirname,
  detached: true,
  stdio: 'ignore',
  shell: true
});
child.unref();
console.log('Spawned successfully.');
process.exit();
