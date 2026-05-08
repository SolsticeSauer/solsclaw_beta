import type { FeatureModule } from './types';

export const tailscale: FeatureModule = {
  id: 'tailscale',
  label: 'Tailscale remote access',
  description:
    'Reach this OpenClaw instance from any tailnet device. In Docker mode a sidecar container holds the Tailscale identity; in native mode tailscale is installed on the host.',
  category: 'remote-access',

  isEnabled: (d) => d.optionalFeatures.tailscale.enabled,

  toggle: (d, on) => ({
    ...d,
    optionalFeatures: {
      ...d.optionalFeatures,
      tailscale: { ...d.optionalFeatures.tailscale, enabled: on },
    },
  }),

  Detail: ({ data, setData }) => {
    const ts = data.optionalFeatures.tailscale;
    return (
      <div style={{ marginTop: 12 }}>
        <label>Auth key{data.installMode === 'docker' ? ' (required for Docker)' : ' (optional)'}</label>
        <input
          type="password"
          value={ts.authKey ?? ''}
          onChange={(e) =>
            setData((d) => ({
              ...d,
              optionalFeatures: {
                ...d.optionalFeatures,
                tailscale: { ...d.optionalFeatures.tailscale, authKey: e.target.value || undefined },
              },
            }))
          }
          placeholder="tskey-auth-…"
          autoComplete="off"
        />
        <label>Hostname (optional)</label>
        <input
          type="text"
          value={ts.hostname ?? ''}
          onChange={(e) =>
            setData((d) => ({
              ...d,
              optionalFeatures: {
                ...d.optionalFeatures,
                tailscale: { ...d.optionalFeatures.tailscale, hostname: e.target.value || undefined },
              },
            }))
          }
          placeholder="my-openclaw"
        />
      </div>
    );
  },

  validate: (d) => {
    if (
      d.installMode === 'docker' &&
      d.optionalFeatures.tailscale.enabled &&
      !d.optionalFeatures.tailscale.authKey?.trim()
    ) {
      return 'Tailscale auth key is required for Docker mode (the sidecar can\'t authenticate interactively).';
    }
    return null;
  },
};
