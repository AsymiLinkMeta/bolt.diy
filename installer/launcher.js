#!/usr/bin/env node

/**
 * AsymiLink AI - Local Launcher
 * Starts the Wrangler dev server and opens the browser automatically.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const APP_DIR = path.dirname(process.execPath !== process.argv[1]
  ? process.execPath
  : __filename);

const PORT = process.env.PORT || 5173;
const HOST = '127.0.0.1';
const APP_URL = `http://${HOST}:${PORT}`;

function openBrowser(url) {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      execSync(`start "" "${url}"`);
    } else if (platform === 'darwin') {
      execSync(`open "${url}"`);
    } else {
      execSync(`xdg-open "${url}"`);
    }
  } catch (_) {
  }
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

function buildBindingsArgs(envVars) {
  const args = [];
  for (const [key, value] of Object.entries(envVars)) {
    if (key && value) {
      args.push('--binding', `${key}=${value}`);
    }
  }
  return args;
}

function main() {
  console.log('==============================================');
  console.log('   AsymiLink AI - Starting local server...   ');
  console.log('==============================================');
  console.log(`App directory: ${APP_DIR}`);
  console.log(`Server URL: ${APP_URL}`);
  console.log('');

  const envFile = path.join(APP_DIR, '.env.local');
  const fallbackEnvFile = path.join(APP_DIR, '.env');
  const userEnv = fs.existsSync(envFile)
    ? readEnvFile(envFile)
    : readEnvFile(fallbackEnvFile);

  const bindingArgs = buildBindingsArgs(userEnv);

  const wranglerBin = path.join(APP_DIR, 'node_modules', '.bin', 'wrangler.cmd');
  const wranglerBinUnix = path.join(APP_DIR, 'node_modules', '.bin', 'wrangler');
  const wrangler = fs.existsSync(wranglerBin) ? wranglerBin : wranglerBinUnix;

  const clientBuildDir = path.join(APP_DIR, 'build', 'client');

  if (!fs.existsSync(clientBuildDir)) {
    console.error('ERROR: Build directory not found at', clientBuildDir);
    console.error('Please run the build step before launching.');
    process.exit(1);
  }

  const args = [
    'pages', 'dev', clientBuildDir,
    '--ip', HOST,
    '--port', String(PORT),
    '--no-show-interactive-dev-session',
    ...bindingArgs,
  ];

  console.log('Starting Wrangler server...');

  const child = spawn(wrangler, args, {
    cwd: APP_DIR,
    stdio: 'inherit',
    env: { ...process.env, ...userEnv },
    shell: true,
  });

  let browserOpened = false;
  setTimeout(() => {
    if (!browserOpened) {
      browserOpened = true;
      console.log(`\nOpening browser at ${APP_URL} ...\n`);
      openBrowser(APP_URL);
    }
  }, 2500);

  child.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  process.on('SIGINT', () => {
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
  });
}

main();
