const { exec } = require('child_process');
const command = `start "" powershell.exe -NoExit -Command "Write-Host 'abc'"`;
exec(command, { stdio: 'ignore' });
console.log('Done');
process.exit(0);
