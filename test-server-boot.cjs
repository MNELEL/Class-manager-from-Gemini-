const cp = require('child_process');
const child = cp.spawn('npx', ['node', 'dist/server.cjs'], {
  env: { ...process.env, process, NODE_ENV: 'production' }
});

child.stdout.on('data', d => console.log(d.toString()));
child.stderr.on('data', d => console.error(d.toString()));
child.on('close', code => console.log('Exited with', code));

setTimeout(async () => {
    try {
        const fetch = require('node-fetch');
        const res = await fetch('http://localhost:3000/api/health');
        const text = await res.text();
        console.log('Health check response:', text);
    } catch(e) {
        console.error('Fetch error:', e);
    }
    child.kill();
}, 2000);
