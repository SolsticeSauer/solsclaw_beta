import { execa } from 'execa';
import type { InstallerStep } from './index.js';

export const verifyStep: InstallerStep = {
  id: 'verify',
  label: 'Run `openclaw doctor`',
  shouldRun: () => true,
  async run({ bus }) {
    try {
      const { stdout } = await execa('openclaw', ['doctor'], { all: true });
      bus.log(verifyStep.id, 'info', stdout || 'doctor reported no issues.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Doctor exits non-zero on warnings too — surface it but don't fail
      // the entire pipeline; the user should see the report and decide.
      bus.log(verifyStep.id, 'warn', `doctor reported issues: ${message}`);
    }
  },
};
