import type { FeatureModule } from './types';

export const usxSkill: FeatureModule = {
  id: 'usxSkill',
  label: 'USX stablecoin skill',
  description:
    'Solstice USX skill — query balances, lock/unlock yield, prepare payment instructions on Solana.',
  category: 'crypto',

  isEnabled: (d) => d.optionalFeatures.usxSkill.enabled,

  toggle: (d, on) => ({
    ...d,
    optionalFeatures: {
      ...d.optionalFeatures,
      usxSkill: { enabled: on },
    },
  }),

  warn: (d) =>
    d.installMode === 'docker' && d.optionalFeatures.usxSkill.enabled
      ? 'Skipped in Docker mode — `openclaw tools install` happens on the host today.'
      : null,
};
