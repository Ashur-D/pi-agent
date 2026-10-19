#requires -Version 5.1
$ErrorActionPreference = "Stop"

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$T3_USERDATA = "$HOME\.t3\userdata"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Sync Live T3 Code Settings to Project Repo               " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $T3_USERDATA) {
    Write-Host ":: Syncing T3 Code configs from $T3_USERDATA -> $SCRIPT_DIR\t3..." -ForegroundColor Cyan
    $destDir = Join-Path $SCRIPT_DIR "t3"
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    }

    foreach ($file in @("client-settings.json", "desktop-settings.json", "keybindings.json", "keybindings-migrations")) {
        $src = Join-Path $T3_USERDATA $file
        if (Test-Path $src) {
            Copy-Item $src (Join-Path $destDir $file) -Force
            Write-Host "   [+] $file" -ForegroundColor Green
        }
    }

    $settingsPath = Join-Path $T3_USERDATA "settings.json"
    if (Test-Path $settingsPath) {
        try {
            $data = Get-Content -Raw $settingsPath | ConvertFrom-Json
            if ($data.providerInstances) {
                foreach ($prop in $data.providerInstances.PSObject.Properties) {
                    if ($prop.Value.config -and $prop.Value.config.apiKey) {
                        $prop.Value.config.apiKey = ""
                    }
                }
            }
            $data | ConvertTo-Json -Depth 20 | Set-Content (Join-Path $destDir "settings.json") -Encoding UTF8
            Write-Host "   [+] settings.json (sanitized secrets)" -ForegroundColor Green
        } catch {
            Write-Host "   [!] Error sanitizing settings.json: $_" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host ":: T3 Code userdata directory not found: $T3_USERDATA" -ForegroundColor Yellow
}

Write-Host ""
if (Get-Command git -ErrorAction SilentlyContinue) {
    git -C "$SCRIPT_DIR" status --short
}

Write-Host ""
Write-Host "Sync complete! You can now commit changes." -ForegroundColor Cyan
