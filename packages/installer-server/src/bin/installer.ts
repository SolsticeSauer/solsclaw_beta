#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import open from 'open';
import { startServer } from '../index.js';

interface Pkg {
  version?: string;
}

function readVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkgPath = resolve(here, '..', '..', 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as Pkg;
    return pkg.version ?? '0.0.0-dev';
  } catch {
    return '0.0.0-dev';
  }
}

async function main(): Promise<void> {
  const noOpen = process.argv.includes('--no-open');
  const portArg = process.argv.findIndex((a) => a === '--port');
  const port = portArg !== -1 ? Number(process.argv[portArg + 1]) : 7842;

  const server = await startServer({
    port: Number.isFinite(port) && port > 0 ? port : 7842,
    installerVersion: readVersion(),
  });

  console.log(`\n  OpenClaw Installer ready at:\n    ${server.url}\n`);
  console.log('  (Press Ctrl+C to exit. The token is single-session and is regenerated next start.)\n');

  if (!noOpen) {
    try {
      await open(server.url);
    } catch (err) {
      console.warn(`Could not open browser automatically: ${err instanceof Error ? err.message : err}`);
    }
  }

  const shutdown = async (): Promise<void> => {
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((err) => {
  console.error('Installer failed to start:', err);
  process.exit(1);
});
