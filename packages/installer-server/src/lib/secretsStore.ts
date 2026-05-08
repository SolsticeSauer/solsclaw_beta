// API keys live in the OS keychain so they never hit openclaw.json on disk.
// keytar is loaded lazily because the native build can be missing in containers
// or CI; we fall back to an env-file shim in those cases.

import fs from 'node:fs/promises';
import path from 'node:path';
import { openclawHome } from './platform.js';

const SERVICE = 'openclaw-installer';

interface KeytarLike {
  setPassword(service: string, account: string, password: string): Promise<void>;
  getPassword(service: string, account: string): Promise<string | null>;
  deletePassword(service: string, account: string): Promise<boolean>;
}

let keytarPromise: Promise<KeytarLike | null> | null = null;
async function loadKeytar(): Promise<KeytarLike | null> {
  if (!keytarPromise) {
    keytarPromise = import('keytar')
      .then((mod) => mod.default ?? (mod as unknown as KeytarLike))
      .catch(() => null);
  }
  return keytarPromise;
}

async function fallbackEnvFile(): Promise<string> {
  const dir = path.join(openclawHome(), 'secrets');
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  return path.join(dir, 'env');
}

export async function setSecret(account: string, value: string): Promise<{ ref: string; storage: 'keychain' | 'file' }> {
  const keytar = await loadKeytar();
  if (keytar) {
    await keytar.setPassword(SERVICE, account, value);
    return { ref: `keychain:${SERVICE}/${account}`, storage: 'keychain' };
  }

  // Fallback: write to a 0600 file. Better than nothing in headless installs.
  const envFile = await fallbackEnvFile();
  const lines = await fs.readFile(envFile, 'utf8').catch(() => '');
  const filtered = lines
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith(`${account}=`));
  filtered.push(`${account}=${value}`);
  await fs.writeFile(envFile, filtered.join('\n') + '\n', { mode: 0o600 });
  return { ref: `file:${envFile}#${account}`, storage: 'file' };
}

export async function getSecret(account: string): Promise<string | null> {
  const keytar = await loadKeytar();
  if (keytar) {
    return keytar.getPassword(SERVICE, account);
  }
  const envFile = await fallbackEnvFile();
  const lines = await fs.readFile(envFile, 'utf8').catch(() => '');
  for (const line of lines.split(/\r?\n/)) {
    if (line.startsWith(`${account}=`)) return line.slice(account.length + 1);
  }
  return null;
}

export async function deleteSecret(account: string): Promise<void> {
  const keytar = await loadKeytar();
  if (keytar) {
    await keytar.deletePassword(SERVICE, account);
    return;
  }
  const envFile = await fallbackEnvFile();
  const lines = await fs.readFile(envFile, 'utf8').catch(() => '');
  const filtered = lines.split(/\r?\n/).filter((l) => l && !l.startsWith(`${account}=`));
  await fs.writeFile(envFile, filtered.join('\n') + '\n', { mode: 0o600 });
}
