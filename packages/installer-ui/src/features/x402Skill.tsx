import type { FeatureModule } from './types';

export const x402Skill: FeatureModule = {
  id: 'x402Skill',
  label: 'x402 payment skill',
  description:
    'Coinbase HTTP-402 payment protocol bridge for OpenClaw — pay-to-call APIs and machine-to-machine settlement on Solana.',
  category: 'crypto',

  isEnabled: (d) => d.optionalFeatures.x402Skill.enabled,

  toggle: (d, on) => ({
    ...d,
    optionalFeatures: {
      ...d.optionalFeatures,
      x402Skill: { enabled: on },
    },
  }),

  warn: (d) =>
    d.installMode === 'docker' && d.optionalFeatures.x402Skill.enabled
      ? 'Skipped in Docker mode — `openclaw tools install` happens on the host today.'
      : null,
};
