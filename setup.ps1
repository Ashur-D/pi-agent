#requires -Version 5.1
$ErrorActionPreference = "Stop"

$TARGET_DIR = "$HOME\.pi\agent"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$T3_USERDATA = "$HOME\.t3\userdata"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     [*] Pi Agent + T3 Code Universal Manager (Windows)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Select an option:" -ForegroundColor Yellow
Write-Host "  [1] Install / Update (Pi Agent + T3 Code)"
Write-Host "  [2] Uninstall Everything"
Write-Host "  [3] Exit"
Write-Host ""
$choice = Read-Host "Enter choice [1-3] (default: 1)"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

if ($choice -eq "3") {
    Write-Host ":: Exiting." -ForegroundColor Yellow
    exit 0
}

# ========================================================
# UNINSTALL PROCEDURE
# ========================================================
if ($choice -eq "2") {
    Write-Host ""
    Write-Host ":: [!] UNINSTALL PROCEDURE" -ForegroundColor Red
    $confirm = Read-Host ":: Are you sure you want to completely remove Pi Agent and T3 Code? [y/N]"
    if ($confirm -notmatch "^[Yy]$") {
        Write-Host ":: Uninstall cancelled." -ForegroundColor Yellow
        exit 0
    }

    Write-Host ":: 1/5 Unlinking T3 Connect..." -ForegroundColor Cyan
    try {
        & t3 connect unlink 2>$null
    } catch {}

    Write-Host ":: 2/5 Removing Pi CLI globally..." -ForegroundColor Cyan
    try {
        npm uninstall -g @earendil-works/pi-coding-agent
    } catch {
        Write-Warning "Could not run npm uninstall: $_"
    }

    Write-Host ":: 3/5 Removing $HOME\.pi directory..." -ForegroundColor Cyan
    if (Test-Path "$HOME\.pi") {
        Remove-Item -Recurse -Force "$HOME\.pi" -ErrorAction SilentlyContinue
    }

    Write-Host ":: 4/5 Uninstalling T3 Code..." -ForegroundColor Cyan
    $uninstaller = "$env:LOCALAPPDATA\Programs\t3code\Uninstall t3code.exe"
    if (Test-Path $uninstaller) {
        Write-Host ":: Running T3 Code uninstaller..." -ForegroundColor Cyan
        Start-Process -FilePath $uninstaller -ArgumentList "/S" -Wait -ErrorAction SilentlyContinue
    }

    $t3Paths = @(
        "$HOME\.local\bin\t3.exe",
        "$HOME\.local\bin\t3",
        "$env:LOCALAPPDATA\t3",
        "$env:LOCALAPPDATA\Programs\t3code"
    )
    foreach ($p in $t3Paths) {
        if (Test-Path $p) {
            Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue
        }
    }

    Write-Host ":: 5/5 Removing $HOME\.t3 directory..." -ForegroundColor Cyan
    if (Test-Path "$HOME\.t3") {
        Remove-Item -Recurse -Force "$HOME\.t3" -ErrorAction SilentlyContinue
    }

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  [+] Uninstallation completed successfully!             " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    exit 0
}

# ========================================================
# INSTALL / UPDATE PROCEDURE
# ========================================================

function Test-CommandExists {
    param([string]$cmd)
    return (Get-Command $cmd -ErrorAction SilentlyContinue) -ne $null
}

# 1. Check & Install Prerequisites via Winget
Write-Host ""
Write-Host ":: Step 1/4: Checking core system dependencies..." -ForegroundColor Yellow

$hasWinget = Test-CommandExists "winget"

if (-not (Test-CommandExists "git")) {
    Write-Host ":: Git not found." -ForegroundColor Yellow
    if ($hasWinget) {
        Write-Host ":: Installing Git via winget..." -ForegroundColor Cyan
        winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
    } else {
        Write-Warning "winget not found. Please manually install Git for Windows: https://git-scm.com"
    }
}

if (-not (Test-CommandExists "node")) {
    Write-Host ":: Node.js not found." -ForegroundColor Yellow
    if ($hasWinget) {
        Write-Host ":: Installing Node.js LTS via winget..." -ForegroundColor Cyan
        winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    } else {
        Write-Warning "winget not found. Please manually install Node.js: https://nodejs.org"
    }
}

if (-not (Test-CommandExists "rg")) {
    if ($hasWinget) {
        Write-Host ":: Installing ripgrep for fast code search..." -ForegroundColor Cyan
        winget install --id BurntSushi.ripgrep.MSVC -e --accept-source-agreements --accept-package-agreements --silent
    }
}

# 2. Install Pi CLI
Write-Host ""
Write-Host ":: Step 2/4: Installing/updating Pi CLI globally..." -ForegroundColor Yellow
npm install -g @earendil-works/pi-coding-agent

# 3. Sync Pi configuration
Write-Host ""
Write-Host ":: Step 3/4: Setting up Pi configuration & skills..." -ForegroundColor Yellow
if ($SCRIPT_DIR -ne $TARGET_DIR) {
    Write-Host ":: Syncing files from $SCRIPT_DIR to $TARGET_DIR..." -ForegroundColor Cyan
    if (-not (Test-Path $TARGET_DIR)) {
        New-Item -ItemType Directory -Force -Path $TARGET_DIR | Out-Null
    }
    Copy-Item "$SCRIPT_DIR\settings.json" "$TARGET_DIR\" -Force -ErrorAction SilentlyContinue
    Copy-Item "$SCRIPT_DIR\web-search.json" "$TARGET_DIR\" -Force -ErrorAction SilentlyContinue
    Copy-Item "$SCRIPT_DIR\zentui.json" "$TARGET_DIR\" -Force -ErrorAction SilentlyContinue
    Copy-Item "$SCRIPT_DIR\keybindings.json" "$TARGET_DIR\" -Force -ErrorAction SilentlyContinue
    if (Test-Path "$SCRIPT_DIR\extensions") {
        Copy-Item "$SCRIPT_DIR\extensions" "$TARGET_DIR\" -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path "$SCRIPT_DIR\skills") {
        Copy-Item "$SCRIPT_DIR\skills" "$TARGET_DIR\" -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path "$SCRIPT_DIR\t3") {
        Copy-Item "$SCRIPT_DIR\t3" "$TARGET_DIR\" -Recurse -Force -ErrorAction SilentlyContinue
    }
} elseif (Test-Path "$TARGET_DIR\.git") {
    Write-Host ":: Pulling latest changes in $TARGET_DIR..." -ForegroundColor Cyan
    git -C "$TARGET_DIR" pull --ff-only 2>$null
}

Write-Host ":: Restoring declared Pi extensions & themes..." -ForegroundColor Cyan
Push-Location "$TARGET_DIR"
try {
    pi update --extensions
} catch {
    Write-Warning "Could not automatically restore extensions: $_"
}
Pop-Location

# 4. Optional: Configure T3 Code with Pi as default engine
Write-Host ""
Write-Host ":: Step 4/4: T3 Code integration..." -ForegroundColor Yellow
$setupT3 = Read-Host ":: Would you like to configure T3 Code to use Pi as its default agent engine? [Y/n]"
if ([string]::IsNullOrWhiteSpace($setupT3)) { $setupT3 = "Y" }

if ($setupT3 -match "^[Yy]$") {
    $isT3DesktopInstalled = (Test-Path "$env:LOCALAPPDATA\Programs\t3code\T3 Code.exe") -or (Test-Path "$env:LOCALAPPDATA\Programs\t3code\t3code.exe")

    if (-not $isT3DesktopInstalled) {
        Write-Host ":: T3 Code Desktop was not detected on this machine." -ForegroundColor Yellow
        $installT3 = Read-Host ":: Would you like to download and install T3 Code Nightly Desktop app now? [Y/n]"
        if ([string]::IsNullOrWhiteSpace($installT3)) { $installT3 = "Y" }

        if ($installT3 -match "^[Yy]$") {
            Write-Host ":: Fetching latest T3 Code Nightly Desktop release from GitHub..." -ForegroundColor Cyan
            try {
                $releases = Invoke-RestMethod -Uri "https://api.github.com/repos/pingdotgg/t3code/releases?per_page=20" -Headers @{ "User-Agent" = "t3-install" }
                $nightly = $releases | Where-Object { -not $_.draft -and $_.tag_name -match '^v\d+\.\d+\.\d+-nightly' } | Select-Object -First 1
                $asset = $nightly.assets | Where-Object { $_.name -match 'T3-Code-.*-x64\.exe$' } | Select-Object -First 1
                if ($asset) {
                    $installerPath = Join-Path $env:TEMP $asset.name
                    Write-Host ":: Downloading $($asset.name)..." -ForegroundColor Cyan
                    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installerPath
                    Write-Host ":: Launching T3 Code installer..." -ForegroundColor Cyan
                    Start-Process -FilePath $installerPath -Wait
                    Write-Host ":: T3 Code Desktop installation completed!" -ForegroundColor Green
                } else {
                    throw "Desktop installer asset not found in release."
                }
            } catch {
                Write-Warning "Could not fetch desktop installer directly: $_. Falling back to CLI installer..."
                $env:T3CODE_CHANNEL = "nightly"
                Invoke-Expression "& { $(Invoke-RestMethod 'https://t3.codes/install.ps1') }"
            }
        }
    } else {
        Write-Host ":: T3 Code Desktop is already installed." -ForegroundColor Green
    }

    Write-Host ":: Configuring T3 Code settings to use Pi engine..." -ForegroundColor Cyan
    if (-not (Test-Path $T3_USERDATA)) {
        New-Item -ItemType Directory -Force -Path $T3_USERDATA | Out-Null
    }
    foreach ($file in @("client-settings.json", "desktop-settings.json", "keybindings.json", "keybindings-migrations")) {
        $srcFile = Join-Path "$TARGET_DIR\t3" $file
        if (Test-Path $srcFile) {
            Copy-Item $srcFile "$T3_USERDATA\" -Force -ErrorAction SilentlyContinue
        }
    }
    if ((Test-Path "$TARGET_DIR\t3\settings.json") -and (-not (Test-Path "$T3_USERDATA\settings.json"))) {
        Copy-Item "$TARGET_DIR\t3\settings.json" "$T3_USERDATA\" -Force -ErrorAction SilentlyContinue
    }
    $settingsFile = Join-Path $T3_USERDATA "settings.json"
    $settings = @{}
    if (Test-Path $settingsFile) {
        try {
            $rawJson = Get-Content -Path $settingsFile -Raw
            $settings = ConvertFrom-Json $rawJson -AsHashtable
        } catch {
            $settings = @{}
        }
    }

    # Set default model to Pi
    $settings["defaultModelSelection"] = @{
        instanceId = "pi"
        model = "antigravity/gemini-3.8-flash"
    }

    # Ensure providerInstances.pi exists and is enabled
    if (-not $settings.ContainsKey("providerInstances") -or ($settings["providerInstances"] -eq $null)) {
        $settings["providerInstances"] = @{}
    }
    $settings["providerInstances"]["pi"] = @{
        driver = "pi"
        displayName = "Pi"
        enabled = $true
    }

    $updatedJson = ConvertTo-Json $settings -Depth 10
    Set-Content -Path $settingsFile -Value $updatedJson -Encoding UTF8
    Write-Host ":: Set Pi as default engine in $settingsFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [+] Setup completed successfully!                       " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
if (-not (Test-Path "$TARGET_DIR\auth.json")) {
    Write-Host ":: Next step: Run 'pi' in your terminal and type '/login' to authenticate." -ForegroundColor Yellow
} else {
    Write-Host ":: Credentials found. Pi is ready to use!" -ForegroundColor Green
}
