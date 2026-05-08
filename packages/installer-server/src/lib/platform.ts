import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export type Platform = 'darwin' | 'linux' | 'win32';

export function currentPlatform(): Platform {
  const p = process.platform;
  if (p !== 'darwin' && p !== 'linux' && p !== 'win32') {
    throw new Error(`Unsupported platform: ${p}`);
  }
  return p;
}

export function openclawHome(): string {
  return path.join(os.homedir(), '.openclaw');
}

export function openclawConfigPath(): string {
  return path.join(openclawHome(), 'openclaw.json');
}

export function defaultWorkspace(): string {
  return path.join(os.homedir(), 'OpenClaw');
}

export function isInstalled(): boolean {
  return fs.existsSync(openclawConfigPath());
}
