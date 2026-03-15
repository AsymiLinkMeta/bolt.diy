# AsymiLink AI - Installer Build Script (PowerShell)
# Run from project root: .\installer\build-installer.ps1
#
# Prerequisites:
#   - Node.js + pnpm installed
#   - Inno Setup 6 installed (https://jrsoftware.org/isinfo.php)

param(
    [string]$Version = "1.0.0",
    [string]$NodeVersion = "22.14.0",
    [string]$InnoSetupPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  AsymiLink AI Installer Builder" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $ProjectRoot

# Step 1: Build the app
Write-Host "[1/4] Building the app..." -ForegroundColor Yellow
pnpm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }
Write-Host "  Build complete." -ForegroundColor Green

# Step 2: Download portable Node.js if not cached
$NodeDir = Join-Path $ScriptDir "node"
$NodeZip = Join-Path $ScriptDir "node-portable.zip"
$NodeUrl = "https://nodejs.org/dist/v${NodeVersion}/node-v${NodeVersion}-win-x64.zip"

if (-not (Test-Path (Join-Path $NodeDir "node.exe"))) {
    Write-Host "[2/4] Downloading portable Node.js v${NodeVersion}..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path $NodeDir | Out-Null
    Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip -UseBasicParsing
    Write-Host "  Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $NodeZip -DestinationPath $ScriptDir -Force
    $ExtractedDir = Join-Path $ScriptDir "node-v${NodeVersion}-win-x64"
    Copy-Item -Path (Join-Path $ExtractedDir "*") -Destination $NodeDir -Recurse -Force
    Remove-Item $ExtractedDir -Recurse -Force
    Remove-Item $NodeZip -Force
    Write-Host "  Node.js ready." -ForegroundColor Green
} else {
    Write-Host "[2/4] Portable Node.js already downloaded, skipping." -ForegroundColor Gray
}

# Step 3: Create output directory
Write-Host "[3/4] Preparing installer output directory..." -ForegroundColor Yellow
$OutputDir = Join-Path $ProjectRoot "dist-installer"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Update version in .iss file
$IssFile = Join-Path $ScriptDir "AsymiLink.iss"
$IssContent = Get-Content $IssFile -Raw
$IssContent = $IssContent -replace '#define MyAppVersion ".*"', "#define MyAppVersion `"$Version`""
Set-Content -Path $IssFile -Value $IssContent

# Step 4: Run Inno Setup compiler
Write-Host "[4/4] Compiling installer with Inno Setup..." -ForegroundColor Yellow
if (-not (Test-Path $InnoSetupPath)) {
    Write-Host "" -ForegroundColor Red
    Write-Host "  ERROR: Inno Setup not found at:" -ForegroundColor Red
    Write-Host "    $InnoSetupPath" -ForegroundColor Red
    Write-Host "" -ForegroundColor Red
    Write-Host "  Please install Inno Setup 6 from:" -ForegroundColor Yellow
    Write-Host "    https://jrsoftware.org/isdl.php" -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Red
    throw "Inno Setup not found"
}

& $InnoSetupPath $IssFile
if ($LASTEXITCODE -ne 0) { throw "Inno Setup compilation failed" }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "  Installer created in: dist-installer\" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
