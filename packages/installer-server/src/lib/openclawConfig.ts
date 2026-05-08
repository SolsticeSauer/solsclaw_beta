import fs from 'node:fs/promises';
import path from 'node:path';
import { OpenclawConfigSchema, type OpenclawConfig } from '../schema/openclaw.schema.js';
import { openclawConfigPath, openclawHome } from './platform.js';

export async function readConfig(): Promise<OpenclawConfig | null> {
  try {
    const raw = await fs.readFile(openclawConfigPath(), 'utf8');
    return OpenclawConfigSchema.parse(JSON.parse(raw));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeConfig(config: OpenclawConfig): Promise<string> {
  await fs.mkdir(openclawHome(), { recursive: true });
  const target = openclawConfigPath();

  const existing = await readConfig().catch(() => null);
  if (existing) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.copyFile(target, `${target}.bak.${stamp}`);
  }

  // Validate before writing — fail loudly if a step builds an invalid config.
  const parsed = OpenclawConfigSchema.parse(config);

  const tmp = path.join(openclawHome(), `.openclaw.json.tmp-${process.pid}`);
  await fs.writeFile(tmp, JSON.stringify(parsed, null, 2), 'utf8');
  await fs.rename(tmp, target);
  return target;
}
