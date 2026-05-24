const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/id: Date\.now\(\)/g, "id: Date.now() + Math.random()");
code = code.replace(/id: `rem-\$\{Date\.now\(\)\}`/g, "id: `rem-${Date.now() + Math.random()}`");
code = code.replace(/id: `log-\$\{Date\.now\(\)\}/g, "id: `log-${Date.now() + Math.random()}");
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed Date.now() occurrences!');
