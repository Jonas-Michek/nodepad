const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Find all instances of ( ... ) => or function ( ... )
            const regex = /\(([^)]*)\)\s*=>|function\s*(\w*)\s*\(([^)]*)\)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const paramsStr = match[1] || match[3];
                if (!paramsStr) continue;
                const params = paramsStr.split(',').map(p => {
                    const clean = p.trim().split(':')[0].trim().split('=')[0].trim();
                     // Handle { id } destructuring in a very simple way
                    if (clean.startsWith('{')) return clean.replace(/[\{\}]/g, '').split(',')[0].trim();
                    return clean;
                });
                const seen = new Set();
                for (const p of params) {
                    if (p && seen.has(p) && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(p)) {
                        console.log(`FOUND!! ${fullPath} has duplicate parameter "${p}" in (${paramsStr})`);
                    }
                    seen.add(p);
                }
            }
        }
    });
}
walk('.');
