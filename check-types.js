const { execSync } = require('child_process');

try {
  const output = execSync('npx tsc --noEmit --skipLibCheck 2>&1', {
    cwd: 'c:\\Users\\FPT Shop\\Documents\\AppDemo1',
    encoding: 'utf8'
  });
  console.log(output);
} catch (error) {
  console.log(error.stdout || '');
  console.log(error.stderr || '');
  process.exit(error.status || 1);
}
