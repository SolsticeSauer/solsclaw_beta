import { execa } from 'execa';
import type { InstallerStep } from './index.js';

async function detectPackageManager(): Promise<'pnpm' | 'bun' | 'npm'> {
  for (const candidate of ['pnpm', 'bun'] as const) {
    try {
      await execa(candidate, ['--version'], { stdio: 'ignore' });
      return candidate;
    } catch {
      // try next
    }
  }
  return 'npm';
}

export const installOpenclawStep: InstallerStep = {
  id: 'install-openclaw',
  label: 'Install OpenClaw CLI globally',
  shouldRun: () => true,
  async run({ bus }) {
    const pm = await detectPackageManager();
    bus.log(installOpenclawStep.id, 'info', `Using package manager: ${pm}`);

    const args =
      pm === 'pnpm'
        ? ['add', '-g', '@openclaw/cli@latest']
        : pm === 'bun'
          ? ['add', '-g', '@openclaw/cli@latest']
          : ['install', '-g', '@openclaw/cli@latest'];

    const sub = execa(pm, args, { all: true });
    sub.all?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trimEnd();
      if (text) bus.log(installOpenclawStep.id, 'info', text);
    });
    await sub;
  },
};
