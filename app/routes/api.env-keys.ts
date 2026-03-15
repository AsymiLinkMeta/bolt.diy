import type { ActionFunction, LoaderFunction } from '@remix-run/cloudflare';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const ENV_FILE_NAMES = ['.env.local', '.env'];

function findAppDir(): string {
  if (process.env.APP_DIR) return process.env.APP_DIR;
  return process.cwd();
}

function findEnvFilePath(appDir: string): string {
  for (const name of ENV_FILE_NAMES) {
    const p = path.join(appDir, name);
    if (fs.existsSync(p)) return p;
  }
  return path.join(appDir, '.env.local');
}

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = value;
  }
  return result;
}

function serializeEnvFile(vars: Record<string, string>): string {
  const lines = ['# AsymiLink AI - Local Configuration', '# Managed by the app settings panel.', ''];
  for (const [key, value] of Object.entries(vars)) {
    lines.push(`${key}=${value}`);
  }
  return lines.join(os.EOL);
}

const ALLOWED_KEYS = new Set([
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'MISTRAL_API_KEY',
  'GROQ_API_KEY',
  'COHERE_API_KEY',
  'DEEPSEEK_API_KEY',
  'XAI_API_KEY',
  'PERPLEXITY_API_KEY',
  'TOGETHER_API_KEY',
  'FIREWORKS_API_KEY',
  'HUGGINGFACE_API_KEY',
  'OPEN_ROUTER_API_KEY',
  'OLLAMA_API_BASE_URL',
  'LMSTUDIO_API_BASE_URL',
  'PORT',
]);

export const loader: LoaderFunction = async () => {
  try {
    const appDir = findAppDir();
    const envPath = findEnvFilePath(appDir);
    const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const parsed = parseEnvFile(content);
    const keys: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (ALLOWED_KEYS.has(k)) keys[k] = v;
    }
    return Response.json({ keys, envPath });
  } catch {
    return Response.json({ keys: {}, envPath: null });
  }
};

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const body = await request.json() as { keys: Record<string, string> };
    const updates = body.keys || {};

    const appDir = findAppDir();
    const envPath = findEnvFilePath(appDir);
    const existing = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, 'utf8')) : {};

    for (const [k, v] of Object.entries(updates)) {
      if (ALLOWED_KEYS.has(k)) {
        if (v === '') {
          delete existing[k];
        } else {
          existing[k] = v;
        }
      }
    }

    fs.writeFileSync(envPath, serializeEnvFile(existing), 'utf8');
    return Response.json({ success: true, envPath });
  } catch (err: any) {
    return Response.json({ error: err.message || 'Failed to save' }, { status: 500 });
  }
};
