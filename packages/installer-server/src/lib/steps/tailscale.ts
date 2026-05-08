import { execa } from 'execa';
import { stageScript } from '../downloader.js';
import type { InstallerStep } from './index.js';

async function isInstalled(): Promise<boolean> {
  try {
    await execa('tailscale', ['version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function installTailscale(
  platform: NodeJS.Platform,
  log: (level: 'info' | 'warn', msg: string) => void,
): Promise<void> {
  if (platform === 'darwin') {
    log('info', 'Installing Tailscale via Homebrew...');
    await execa('brew', ['install', '--cask', 'tailscale'], { stdio: 'inherit' });
    return;
  }
  if (platform === 'linux') {
    log('info', 'Downloading https://tailscale.com/install.sh...');
    const staged = await stageScript('https://tailscale.com/install.sh');
    log('info', `Staged at ${staged.path} (sha256=${staged.sha256}).`);
    await execa('sh', [staged.path], { stdio: 'inherit' });
    return;
  }
  if (platform === 'win32') {
    log('info', 'Installing Tailscale via winget...');
    await execa('winget', ['install', '--silent', '--id', 'tailscale.tailscale'], { stdio: 'inherit' });
    return;
  }
  throw new Error(`Tailscale install not supported on ${platform}`);
}

export const tailscaleStep: InstallerStep = {
  id: 'tailscale',
  label: 'Install Tailscale + register node',
  shouldRun: ({ submission }) => submission.optionalFeatures.tailscale.enabled,
  async run({ submission, bus, platform }) {
    if (!(await isInstalled())) {
      await installTailscale(platform, (level, m) => bus.log(tailscaleStep.id, level, m));
    } else {
      bus.log(tailscaleStep.id, 'info', 'Tailscale already installed, skipping install.');
    }

    const ts = submission.optionalFeatures.tailscale;
    const args = ['up', '--accept-routes'];
    if (ts.authKey) args.push(`--authkey=${ts.authKey}`);
    if (ts.hostname) args.push(`--hostname=${ts.hostname}`);

    bus.log(tailscaleStep.id, 'info', 'Bringing Tailscale up...');
    await execa('tailscale', args, { stdio: 'inherit' });

    // Auth keys are sensitive — drop reference once consumed.
    submission.optionalFeatures.tailscale.authKey = undefined;
  },
};
