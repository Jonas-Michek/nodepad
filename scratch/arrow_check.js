const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Regex to find arrow function parameter lists
            const regex = /\(([^)]+)\)\s*=>/gs;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const paramsStr = match[1];
                // Remove comments inside parameter list
                const cleanParamsStr = paramsStr.replace(/\/\/.*|\/\*.*?\*\//g, '');
                const params = cleanParamsStr.split(',').map(p => {
                    // Extract name from "name: type", "{ name }", or "name = default"
                    let name = p.trim();
                    if (name.startsWith('{') || name.startsWith('[')) return null; // skip complex destructuring for now
                    return name.split(':')[0].trim().split('=')[0].trim();
                });
                const seen = new Set();
                for (const p of params) {
                    if (p && seen.has(p) && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(p)) {
                        console.log(`FOUND: ${fullPath} - Duplicate parameter "${p}" in (${paramsStr})`);
                    }
                    seen.add(p);
                }
            }
        }
    });
}
walk('.');
