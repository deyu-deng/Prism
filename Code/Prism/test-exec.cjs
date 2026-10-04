const { exec } = require('child_process');
const psCommand = `Write-Host '正在唤醒 Claude Code...' -ForegroundColor Cyan; claude -p '请读取 .ai/prism-intent.md 并执行其中的意图指令'; Write-Host '任务结束。' -ForegroundColor Green`;
const command = `start powershell.exe -NoExit -Command "${psCommand}"`;
console.log('Executing:', command);
exec(command, { cwd: __dirname }, (error) => {
  if (error) {
    console.error('Failed to spawn Claude Terminal:', error);
  } else {
    console.log('Spawned successfully.');
  }
});
