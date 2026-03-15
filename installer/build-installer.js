#!/usr/bin/env node

/**
 * AsymiLink AI - Cross-platform installer build helper
 *
 * Usage:
 *   node installer/build-installer.js
 *
 * This script:
 *   1. Builds the Remix app (pnpm run build)
 *   2. Downloads portable Node.js for Windows
 *   3. Runs Inno Setup compiler (if on Windows or wine available)
 *
 * Requires: Inno Setup 6 installed on Windows
 *   https://jrsoftware.org/isdl.php
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createWriteStream } = require('fs');

const NODE_VERSION = '22.14.0';
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-win-x64.zip`;
const INSTALLER_DIR = __dirname;
const PROJECT_ROOT = path.dirname(INSTALLER_DIR);
const NODE_DIR = path.join(INSTALLER_DIR, 'node');
const INNO_SETUP_PATH = 'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe';

function run(cmd, opts = {}) {
  console.log(`  > ${cmd}`);
  const result = spawnSync(cmd, { shell: true, stdio: 'inherit', cwd: PROJECT_ROOT, ...opts });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function downloadNode() {
  const nodeExe = path.join(NODE_DIR, 'node.exe');
  if (fs.existsSync(nodeExe)) {
    console.log('  Portable Node.js already exists, skipping download.');
    return;
  }

  console.log(`  Downloading portable Node.js v${NODE_VERSION}...`);
  fs.mkdirSync(NODE_DIR, { recursive: true });

  const zipPath = path.join(INSTALLER_DIR, 'node-portable.zip');
  await downloadFile(NODE_URL, zipPath);
  console.log('  Download complete. Extracting...');

  run(`tar -xf "${zipPath}" -C "${INSTALLER_DIR}"`, { cwd: INSTALLER_DIR });

  const extractedDir = path.join(INSTALLER_DIR, `node-v${NODE_VERSION}-win-x64`);
  const files = fs.readdirSync(extractedDir);
  for (const file of files) {
    fs.renameSync(path.join(extractedDir, file), path.join(NODE_DIR, file));
  }
  fs.rmdirSync(extractedDir);
  fs.unlinkSync(zipPath);
  console.log('  Node.js ready.');
}

async function main() {
  console.log('============================================');
  console.log('  AsymiLink AI Installer Builder');
  console.log('============================================');
  console.log('');

  console.log('[1/3] Building the Remix app...');
  run('pnpm run build');
  console.log('  Build complete.');
  console.log('');

  console.log('[2/3] Preparing portable Node.js...');
  await downloadNode();
  console.log('');

  console.log('[3/3] Compiling installer...');

  const outputDir = path.join(PROJECT_ROOT, 'dist-installer');
  fs.mkdirSync(outputDir, { recursive: true });

  if (process.platform === 'win32') {
    if (!fs.existsSync(INNO_SETUP_PATH)) {
      console.error('');
      console.error('  ERROR: Inno Setup 6 not found.');
      console.error('  Please install it from: https://jrsoftware.org/isdl.php');
      console.error('  Then re-run this script.');
      process.exit(1);
    }
    const issFile = path.join(INSTALLER_DIR, 'AsymiLink.iss');
    run(`"${INNO_SETUP_PATH}" "${issFile}"`);
  } else {
    console.log('  NOTE: Inno Setup only runs on Windows.');
    console.log('  To build the installer, run this script on Windows or use:');
    console.log('    installer\\build-installer.ps1');
    console.log('');
    console.log('  The build output is ready in: build/');
    console.log('  Copy the project + node/ dir to Windows and run build-installer.ps1');
  }

  console.log('');
  console.log('============================================');
  console.log('  Done!');
  if (process.platform === 'win32') {
    console.log('  Installer saved to: dist-installer\\');
  }
  console.log('============================================');
}

main().catch((err) => {
  console.error('\nERROR:', err.message);
  process.exit(1);
});
