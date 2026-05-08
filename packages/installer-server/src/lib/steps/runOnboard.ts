import { execa } from 'execa';
import type { InstallerStep } from './index.js';

export const runOnboardStep: InstallerStep = {
  id: 'onboard-daemon',
  label: 'Register OpenClaw daemon (launchd / systemd / Windows service)',
  shouldRun: () => true,
  async run({ bus }) {
    const sub = execa('openclaw', ['onboard', '--install-daemon', '--non-interactive'], { all: true });
    sub.all?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trimEnd();
      if (text) bus.log(runOnboardStep.id, 'info', text);
    });
    await sub;
  },
};
