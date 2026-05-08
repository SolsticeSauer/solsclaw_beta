import type { FeatureModule } from './types';

export const solanaCli: FeatureModule = {
  id: 'solanaCli',
  label: 'Solana CLI',
  description:
    'Installs the Anza Solana CLI on the host (~/.local/share/solana/install/active_release/bin). Required for any Solana-side tooling.',
  category: 'crypto',

  isEnabled: (d) => d.optionalFeatures.solanaCli.enabled,

  toggle: (d, on) => ({
    ...d,
    optionalFeatures: {
      ...d.optionalFeatures,
      solanaCli: { enabled: on },
    },
  }),

  warn: (d) =>
    d.installMode === 'docker' && d.optionalFeatures.solanaCli.enabled
      ? 'Skipped in Docker mode — install the CLI inside your container or alongside on the host.'
      : null,
};
