import type { WizardSubmission } from '../../schema/openclaw.schema.js';
import type { PipelineBus } from '../eventBus.js';
import { writeConfigStep } from './writeConfig.js';
import { persistApiKeyStep } from './persistApiKey.js';
import { installOpenclawStep } from './installOpenclaw.js';
import { runOnboardStep } from './runOnboard.js';
import { openaiGatewayStep } from './openaiGateway.js';
import { tailscaleStep } from './tailscale.js';
import { solanaStep } from './solana.js';
import { x402UsxStep } from './x402Usx.js';
import { verifyStep } from './verify.js';

export interface StepContext {
  submission: WizardSubmission;
  bus: PipelineBus;
  platform: NodeJS.Platform;
  installerVersion: string;
}

export interface InstallerStep {
  id: string;
  label: string;
  shouldRun(ctx: StepContext): boolean;
  run(ctx: StepContext): Promise<void>;
}

export const ALL_STEPS: InstallerStep[] = [
  persistApiKeyStep,
  writeConfigStep,
  installOpenclawStep,
  runOnboardStep,
  openaiGatewayStep,
  tailscaleStep,
  solanaStep,
  x402UsxStep,
  verifyStep,
];

export async function runPipeline(ctx: StepContext): Promise<{ ok: boolean; failed?: string }> {
  for (const step of ALL_STEPS) {
    if (!step.shouldRun(ctx)) {
      ctx.bus.emitStep(step.id, 'skipped');
      continue;
    }
    ctx.bus.emitStep(step.id, 'running');
    try {
      await step.run(ctx);
      ctx.bus.emitStep(step.id, 'done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.bus.log(step.id, 'error', message);
      ctx.bus.emitStep(step.id, 'failed', message);
      return { ok: false, failed: step.id };
    }
  }
  return { ok: true };
}
