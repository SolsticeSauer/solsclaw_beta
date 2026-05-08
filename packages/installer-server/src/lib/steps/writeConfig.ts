import { writeConfig } from '../openclawConfig.js';
import { findProvider } from '../providers.js';
import type { OpenclawConfig } from '../../schema/openclaw.schema.js';
import type { InstallerStep } from './index.js';

export const writeConfigStep: InstallerStep = {
  id: 'write-config',
  label: 'Write ~/.openclaw/openclaw.json',
  shouldRun: () => true,
  async run({ submission, bus, installerVersion }) {
    const provider = findProvider(submission.provider);
    const apiKeyRef =
      submission.provider === 'ollama' || submission.provider === 'lmstudio'
        ? 'none'
        : `keychain:openclaw-installer/provider:${submission.provider}`;

    const config: OpenclawConfig = {
      $schema: 'https://docs.openclaw.ai/schema/openclaw.json',
      agent: {
        model: submission.model,
        workspace: submission.workspace,
      },
      providers: {
        [submission.provider]: {
          type: provider.type,
          baseUrl: provider.baseUrl,
          apiKeyRef,
        },
      },
      gateway: {
        openaiCompat: {
          enabled: submission.optionalFeatures.openaiGateway,
          port: 18789,
        },
        tailscale: submission.optionalFeatures.tailscale.enabled
          ? {
              enabled: true,
              hostname: submission.optionalFeatures.tailscale.hostname,
              ephemeral: false,
            }
          : undefined,
      },
      telemetry: { enabled: submission.telemetry },
      installer: {
        version: installerVersion,
        installedAt: new Date().toISOString(),
        addons: submission.optionalFeatures.solana,
      },
    };

    const target = await writeConfig(config);
    bus.log(writeConfigStep.id, 'info', `Wrote config to ${target}`);
  },
};
