const cp = require('child_process');
const http = require('http');

console.log("Spawning server...");
const server = cp.spawn('node', ['dist/server.cjs'], { 
  env: { ...process.env, NODE_ENV: 'production', PORT: '3501' }
});

server.stdout.on('data', d => console.log('STDOUT:', d.toString()));
server.stderr.on('data', d => console.error('STDERR:', d.toString()));
server.on('exit', code => console.log('EXITED:', code));

setTimeout(() => {
  console.log("Making HTTP request to /...");
  http.get('http://127.0.0.1:3501/', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("RESPONSE:", res.statusCode, data.substring(0, 200));
      server.kill();
    });
  }).on('error', err => {
    console.error("HTTP ERROR:", err);
    server.kill();
  });
}, 2000);
