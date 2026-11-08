// Packaging script for GitHub Releases
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = __dirname;
const distDir = path.join(rootDir, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));
const version = pkg.version || '1.0.0';
const zipName = `DoH-Switcher-v${version}.zip`;
const zipPath = path.join(distDir, zipName);

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Temporary staging directory
const stageDir = path.join(distDir, 'stage');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// Files and folders to include in distribution
const filesToCopy = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'doh-host.exe',
  'com.doh.switcher.json',
  'install-host.bat',
  'clear-policy.bat',
  'README.md',
  'LICENSE'
];

for (const f of filesToCopy) {
  const src = path.join(rootDir, f);
  if (fs.existsSync(src)) {
    if (f === 'com.doh.switcher.json') {
      const manifestObj = JSON.parse(fs.readFileSync(src, 'utf8'));
      manifestObj.path = 'doh-host.exe';
      fs.writeFileSync(path.join(stageDir, f), JSON.stringify(manifestObj, null, 2));
    } else {
      fs.copyFileSync(src, path.join(stageDir, f));
    }
  }
}

// Copy icons directory
const srcIcons = path.join(rootDir, 'icons');
const dstIcons = path.join(stageDir, 'icons');
fs.mkdirSync(dstIcons, { recursive: true });
for (const icon of fs.readdirSync(srcIcons)) {
  fs.copyFileSync(path.join(srcIcons, icon), path.join(dstIcons, icon));
}

// Create ZIP using PowerShell Compress-Archive on Windows
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

try {
  const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCmd, { stdio: 'inherit' });
  console.log(`\n>>> SUCCESS: Release package created at:`);
  console.log(`    ${zipPath}\n`);
} catch (err) {
  console.error('Failed to create archive:', err);
} finally {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
