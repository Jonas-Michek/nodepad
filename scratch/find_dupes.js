const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Advanced regex to catch multiline function parameters
            const regex = /(?:function\s*[a-zA-Z0-9_]*\s*|\([^)]*\)\s*=>)\s*\(([^)] *)\)/gs;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const paramsStr = match[1];
                const params = paramsStr.split(',').map(p => p.trim().split(':')[0].trim().split('=')[0].trim());
                const seen = new Set();
                for (const p of params) {
                    if (p && seen.has(p) && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(p)) {
                        console.log(`FOUND: ${fullPath} has duplicate parameter "${p}" in (${paramsStr})`);
                    }
                    seen.add(p);
                }
            }
        }
    });
}
walk('.');
