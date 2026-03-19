import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function* getFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      yield* getFiles(fullPath);
    } else if (file.endsWith('.js')) {
      yield fullPath;
    }
  }
}

const results = [];
for (const file of getFiles(path.join(__dirname, 'server'))) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.match(/require\s*\(/)) {
    const lines = content.split('\n');
    const fileResults = [];
    lines.forEach((line, i) => {
      if (line.match(/require\s*\(/)) {
        fileResults.push({
          lineNumber: i + 1,
          line: line.trim()
        });
      }
    });
    if (fileResults.length > 0) {
      results.push({
        file: file.replace(__dirname + path.sep, ''),
        matches: fileResults
      });
    }
  }
}

if (results.length === 0) {
  console.log('✅ NO COMMONJS require() FOUND IN SOURCE CODE');
  console.log('All source files use ES6 import/export syntax.');
} else {
  console.log('⚠️  FOUND require() IN:');
  results.forEach(res => {
    console.log(`\n📄 ${res.file}`);
    res.matches.forEach(match => {
      console.log(`   Line ${match.lineNumber}: ${match.line}`);
    });
  });
}
