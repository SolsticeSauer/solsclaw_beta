import type { InstallerState } from '../lib/api';
import type { WizardData } from '../lib/wizardState';
import type { FeatureModule } from './types';

interface Props {
  feature: FeatureModule;
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  state: InstallerState;
}

// FeatureRow is the generic renderer used by both OptionalFeatures (wizard)
// and Settings → Add-ons. Adding visual treatment here changes both surfaces
// at once.
export default function FeatureRow({ feature, data, setData, state }: Props): JSX.Element {
  const enabled = feature.isEnabled(data);
  const validation = feature.validate?.(data, state) ?? null;
  const warning = feature.warn?.(data, state) ?? null;

  return (
    <div
      style={{
        marginTop: 14,
        padding: '12px 14px',
        borderLeft: `3px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
        background: enabled ? 'rgba(249, 115, 22, 0.04)' : 'transparent',
        borderRadius: 4,
      }}
    >
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', margin: 0 }}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setData((d) => feature.toggle(d, e.target.checked))}
          style={{ width: 'auto', margin: '4px 0 0 0' }}
        />
        <span style={{ display: 'block' }}>
          <strong style={{ color: 'var(--fg)' }}>{feature.label}</strong>
          <span
            style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginTop: 2 }}
          >
            {feature.description}
          </span>
        </span>
      </label>

      {enabled && feature.Detail && (
        <feature.Detail data={data} setData={setData} state={state} />
      )}

      {validation && (
        <p style={{ marginTop: 8, marginBottom: 0, color: 'var(--err)', fontSize: 12 }}>
          ⨯ {validation}
        </p>
      )}
      {!validation && warning && (
        <p style={{ marginTop: 8, marginBottom: 0, color: 'var(--warn)', fontSize: 12 }}>
          ⚠ {warning}
        </p>
      )}
    </div>
  );
}
