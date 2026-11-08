# Packaging script for DoH-Switcher Releases
$ErrorActionPreference = "Stop"

$rootDir = $PSScriptRoot
$distDir = Join-Path $rootDir "dist"
$manifestPath = Join-Path $rootDir "manifest.json"

if (-not (Test-Path $manifestPath)) {
    Write-Error "manifest.json not found in $rootDir"
}

$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$version = $manifest.version
$zipName = "DoH-Switcher-v$version.zip"
$zipPath = Join-Path $distDir $zipName
$stageDir = Join-Path $distDir "stage"

if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

if (Test-Path $stageDir) {
    Remove-Item -Recurse -Force $stageDir
}
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

$files = @("manifest.json", "background.js", "popup.html", "popup.css", "popup.js", "doh-host.exe", "com.doh.switcher.json", "install-host.bat", "clear-policy.bat", "README.md", "LICENSE")
foreach ($f in $files) {
    $src = Join-Path $rootDir $f
    if (Test-Path $src) {
        if ($f -eq "com.doh.switcher.json") {
            $jsonObj = Get-Content $src -Raw | ConvertFrom-Json
            $jsonObj.path = "doh-host.exe"
            $jsonObj | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $stageDir $f) -Encoding UTF8
        } else {
            Copy-Item $src -Destination $stageDir
        }
    }
}

$iconsDir = Join-Path $stageDir "icons"
New-Item -ItemType Directory -Path $iconsDir -Force | Out-Null
Copy-Item (Join-Path $rootDir "icons\*") -Destination $iconsDir

if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

Compress-Archive -Path "$stageDir\*" -DestinationPath $zipPath -Force
Remove-Item -Recurse -Force $stageDir

Write-Host ""
Write-Host ">>> [CYBER//BUILD SUCCESS]" -ForegroundColor Cyan
Write-Host "    Release ZIP created: $zipPath" -ForegroundColor Yellow
Write-Host ""
