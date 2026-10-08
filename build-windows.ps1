# Local build on Windows 10/11 (needs: Node 24+, pnpm, Rust, VS Build Tools C++, JDK 17, Git)
$ErrorActionPreference = 'Stop'
$env:SQLX_OFFLINE = 'true'

# Official Modrinth App for Windows was built with CRLF in the 4 oldest SQL migrations.
# Convert them so checksums match an existing ModrinthApp\app.db (idempotent).
foreach ($f in '20240711194701_init','20240813205023_drop-active-unique','20240930001852_disable-personalized-ads','20241222013857_feature-flags') {
    $p = "packages\app-lib\migrations\$f.sql"
    $t = [IO.File]::ReadAllText($p) -replace "`r`n","`n" -replace "`n","`r`n"
    [IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))
}
# force Rust to re-embed migrations
(Get-Item packages\app-lib\src\state\db.rs).LastWriteTime = Get-Date

Copy-Item packages/app-lib/.env.prod packages/app-lib/.env -Force
pnpm install --no-frozen-lockfile --filter "@modrinth/app" --filter "@modrinth/app-frontend"
if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
pnpm --filter "@modrinth/app" exec tauri build --bundles nsis
if ($LASTEXITCODE -ne 0) { throw "tauri build failed" }
Write-Host "Done: target\release\Nova Launcher.exe and target\release\bundle\nsis\"
