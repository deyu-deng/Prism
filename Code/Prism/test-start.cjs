const { exec } = require('child_process');
const command = `start "" powershell.exe -NoExit -Command "Write-Host 'abc'"`;
exec(command, (e, out, err) => {
  console.log('DONE', e ? e.message : 'success');
  process.exit();
});
