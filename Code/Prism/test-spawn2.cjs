const psCommand = `Write-Host 'Test from spawn' -ForegroundColor Cyan`;
require('child_process').spawn('cmd.exe', ['/c', 'start', '""', 'powershell.exe', '-NoExit', '-Command', psCommand], {
  cwd: __dirname,
  detached: true,
  stdio: 'ignore',
  windowsHide: false
}).unref();
console.log('done');
process.exit(0);
