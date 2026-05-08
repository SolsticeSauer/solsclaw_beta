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
    <div className={`feature-row ${enabled ? 'on' : ''}`}>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setData((d) => feature.toggle(d, e.target.checked))}
        />
        <span>
          <span className="feature-title">{feature.label}</span>
          <span className="feature-desc">{feature.description}</span>
        </span>
      </label>

      {enabled && feature.Detail && (
        <feature.Detail data={data} setData={setData} state={state} />
      )}

      {validation && <div className="feature-error">⨯ {validation}</div>}
      {!validation && warning && <div className="feature-warn">⚠ {warning}</div>}
    </div>
  );
}
