import crypto from 'node:crypto';
import { execa } from 'execa';
import { setSecret } from '../secretsStore.js';
import type { InstallerStep } from './index.js';

export const openaiGatewayStep: InstallerStep = {
  id: 'openai-gateway',
  label: 'Enable OpenClaw OpenAI-compatible gateway endpoint',
  shouldRun: ({ submission }) => submission.optionalFeatures.openaiGateway,
  async run({ bus }) {
    const token = `oc_${crypto.randomBytes(24).toString('hex')}`;
    const { ref } = await setSecret('gateway:openai-compat-token', token);
    bus.log(openaiGatewayStep.id, 'info', `Issued shared-secret token (${ref}).`);

    // Tell OpenClaw to enable the OpenAI-compatible surface and reload its
    // config. The CLI subcommand documented in the gateway runbook keeps the
    // installer free of direct mutation against an already-running daemon.
    await execa('openclaw', ['gateway', 'set-openai-compat', '--enable', '--token-ref', ref], { stdio: 'inherit' }).catch(
      (err: unknown) => {
        // If the subcommand differs in this OpenClaw version, leave a hint —
        // the config we wrote earlier already contains gateway.openaiCompat.
        const message = err instanceof Error ? err.message : String(err);
        bus.log(openaiGatewayStep.id, 'warn', `Daemon-side toggle skipped: ${message}`);
      },
    );
  },
};
