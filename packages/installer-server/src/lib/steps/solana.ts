import { execa } from 'execa';
import { stageScript } from '../downloader.js';
import type { InstallerStep } from './index.js';

const ANZA_INSTALL_URL = 'https://release.anza.xyz/stable/install';

export const solanaStep: InstallerStep = {
  id: 'solana-cli',
  label: 'Install Solana CLI (Anza release channel)',
  shouldRun: ({ submission }) => submission.optionalFeatures.solana.cli,
  async run({ bus, platform }) {
    if (platform === 'win32') {
      bus.log(
        solanaStep.id,
        'warn',
        'Solana CLI on native Windows requires WSL; skipping. Re-run inside WSL2 to install.',
      );
      return;
    }

    bus.log(solanaStep.id, 'info', `Downloading installer from ${ANZA_INSTALL_URL}...`);
    const staged = await stageScript(ANZA_INSTALL_URL);
    bus.log(solanaStep.id, 'info', `Staged at ${staged.path} (sha256=${staged.sha256}, ${staged.size} bytes).`);

    const sub = execa('sh', [staged.path], { all: true });
    sub.all?.on('data', (chunk: Buffer) => {
      const text = chunk.toString().trimEnd();
      if (text) bus.log(solanaStep.id, 'info', text);
    });
    await sub;

    bus.log(solanaStep.id, 'info', 'Add ~/.local/share/solana/install/active_release/bin to PATH.');
  },
};
