import { execa } from 'execa';
import type { InstallerStep } from './index.js';

export const x402UsxStep: InstallerStep = {
  id: 'x402-usx-skills',
  label: 'Register x402 + USX skills with OpenClaw',
  shouldRun: ({ submission }) =>
    submission.optionalFeatures.solana.x402Skill || submission.optionalFeatures.solana.usxSkill,
  async run({ submission, bus }) {
    const skills: string[] = [];
    if (submission.optionalFeatures.solana.x402Skill) skills.push('@openclaw/skill-x402');
    if (submission.optionalFeatures.solana.usxSkill) skills.push('@solstice/skill-usx');

    for (const pkg of skills) {
      bus.log(x402UsxStep.id, 'info', `Installing skill ${pkg}...`);
      const sub = execa('openclaw', ['tools', 'install', pkg], { all: true });
      sub.all?.on('data', (chunk: Buffer) => {
        const text = chunk.toString().trimEnd();
        if (text) bus.log(x402UsxStep.id, 'info', text);
      });
      await sub;
    }
  },
};
