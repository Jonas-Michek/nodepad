Get-ChildItem -Recurse -Include *.tsx,*.ts | Where-Object { $_.FullName -notmatch "node_modules|.next" } | ForEach-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $matches = [regex]::Matches($content, "\(([^)]+)\)")
    foreach ($m in $matches) {
        $p = $m.Groups[1].Value -replace "\n", " "
        $parts = $p.Split(",") | ForEach-Object { 
            $name = $_.Trim().Split(":")[0].Trim().Split("=")[0].Trim()
            if ($name -match "^\s*\{.*\}\s*$") {
                # Simple destructuring check: { a, b, a }
                $inner = $name -replace "[\{\}]", ""
                $innerParts = $inner.Split(",") | ForEach-Object { $_.Trim().Split(":")[0].Trim() }
                return $innerParts
            }
            return $name
        }
        $counts = $parts | Group-Object | Where-Object { $_.Count -gt 1 -and $_.Name -match "^[a-zA-Z_]\w*$" -and $_.Name -notmatch "string|number|any|void|boolean|React|unknown|object|any" }
        if ($counts) {
            Write-Host "FOUND in $($_.FullName): $($counts.Name) in ($p)"
        }
    }
}
