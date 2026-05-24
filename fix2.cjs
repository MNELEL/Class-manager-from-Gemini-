const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/id: Date\.now\(\)\.toString\(\)/g, "id: (Date.now() + Math.random()).toString()");
code = code.replace(/id: String\(Date\.now\(\)\)/g, "id: String(Date.now() + Math.random())");
fs.writeFileSync('src/App.tsx', code);
console.log('Fixed toString and String occurrences!');
