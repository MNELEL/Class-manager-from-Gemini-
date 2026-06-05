const cp = require('child_process');
const child = cp.spawn('node', ['dist/server.cjs'], {
  env: { ...process.env, process, NODE_ENV: 'production' }
});
child.stdout.on('data', d => console.log(d.toString()));
child.stderr.on('data', d => console.error(d.toString()));
child.on('close', code => console.log('Exited with', code));
setTimeout(() => child.kill(), 3000);
