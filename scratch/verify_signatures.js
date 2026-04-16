const fs = require('fs');
const path = require('path');

function walk(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') walk(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            // Regex to find things that look like parameter lists
            // ( ... ) => or function ( ... )
            const regex = /\(([^)]*)\)\s*=>|function\s*\w*\s*\(([^)]*)\)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                const paramsStr = (match[1] || match[2]).split('\n').join(' ');
                // Clean up TypeScript types and defaults
                const cleanParams = paramsStr.split(',').map(p => {
                    return p.trim().split(':')[0].trim().split('=')[0].trim();
                }).join(',');
                
                try {
                    new Function(cleanParams, '');
                } catch (e) {
                    if (e.message.includes('Duplicate parameter name')) {
                        console.log(`FOUND BUG: ${fullPath} has duplicate parameter in (${paramsStr})`);
                    }
                }
            }
        }
    });
}
walk('.');
