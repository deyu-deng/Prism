const { exec } = require('child_process');
const projectRoot = __dirname;
const psCommand = `Write-Host '正在唤醒 Claude Code...' -ForegroundColor Cyan; claude -p '请读取 .ai/prism-intent.md 并执行其中的意图指令'; Write-Host '任务结束。' -ForegroundColor Green`;
const command = `start powershell.exe -NoExit -Command "${psCommand}"`;

exec(command, { cwd: projectRoot }, (error) => {
  if (error) {
    console.error('Failed to spawn:', error);
  } else {
    console.log('Spawned successfully. You should see a PowerShell window.');
  }
  process.exit();
});
