const fs = require('fs');
const path = require('path');

function checkFile(fullPath) {
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8');
    const regex = /\(([^)]+)\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const inner = match[1].trim();
        if (!inner || inner.includes('\n')) continue; // Skip multiline for now to keep it simple
        
        const parts = inner.split(',').map(p => {
            const clean = p.trim().split(':')[0].trim().split('=')[0].trim();
            return clean;
        });

        const seen = new Set();
        for (const name of parts) {
            if (name && seen.has(name) && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name)) {
                if (name === 'id' || name === 'p' || name === 'b' || name === 'e') {
                     const rest = content.slice(match.index + match[0].length, match.index + match[0].length + 15);
                     if (rest.includes('=>') || rest.includes('{') || rest.includes('async')) {
                        console.log(`FOUND: ${fullPath} -> Duplicate "${name}" in (${inner})`);
                     }
                }
            }
            seen.add(name);
        }
    }
}

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            checkFile(fullPath);
        }
    });
}
walk('.');
