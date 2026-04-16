import os, re
# Pattern for duplicate word in parentheses: (a, a) or (a, b, a) or (a: string, b: number, a: string)
# Handles optional types and spacing.
pattern = re.compile(r'\(\s*([a-zA-Z_$][\w$]*)\s*(?::[^,)]+)?\s*,\s*(?:[a-zA-Z_$][\w$]*\s*(?::[^,)]+)?\s*,\s*)*\1\s*(?::[^,)]+)?\s*[,)]')

found = False
for root, _, files in os.walk('.'):
    if any(d in root for d in ['node_modules', '.next', '.git']): continue
    for f in files:
        if f.endswith(('.ts', '.tsx', '.js', '.mjs')):
            p = os.path.join(root, f)
            try:
                with open(p, 'r', encoding='utf-8') as file:
                    content = file.read()
                    matches = pattern.finditer(content)
                    for m in matches:
                        line_no = content[:m.start()].count('\n') + 1
                        print(f"FOUND!! {p}:{line_no} -> {m.group(0)}")
                        found = True
            except:
                pass
if not found:
    print("NO DUPLICATES FOUND")
