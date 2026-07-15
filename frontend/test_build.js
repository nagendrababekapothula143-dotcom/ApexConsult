const { execSync } = require('child_process');
const fs = require('fs');
try {
  const output = execSync('npx vite build', { encoding: 'utf-8' });
  fs.writeFileSync('build_output.txt', output);
} catch (e) {
  fs.writeFileSync('build_output.txt', e.stdout + '\n\n' + e.stderr + '\n\n' + e.message);
}
