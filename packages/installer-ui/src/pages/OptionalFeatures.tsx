import { useMemo } from 'react';
import type { InstallerState } from '../lib/api';
import type { WizardData } from '../lib/wizardState';
import { CATEGORIES, CATEGORY_ORDER, FEATURES } from '../features';
import type { FeatureCategory, FeatureModule } from '../features';
import FeatureRow from '../features/FeatureRow';

interface Props {
  state: InstallerState;
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function OptionalFeatures({ state, data, setData, onNext, onBack }: Props): JSX.Element {
  const grouped = useMemo(() => {
    const byCat: Record<string, FeatureModule[]> = {};
    for (const feature of FEATURES) {
      (byCat[feature.category] ??= []).push(feature);
    }
    return byCat;
  }, []);

  const blockingErrors = FEATURES.map((f) => f.validate?.(data, state))
    .filter((e): e is string => Boolean(e));

  return (
    <div className="card">
      <h2>Optional features</h2>
      <p>
        Each feature is independent. Toggle whichever apply — the install pipeline runs
        only the enabled ones.
      </p>

      {CATEGORY_ORDER.map((cat: FeatureCategory) => {
        const features = grouped[cat];
        if (!features?.length) return null;
        const meta = CATEGORIES[cat];
        return (
          <section key={cat} style={{ marginTop: 24 }}>
            <h3 style={{ margin: '0 0 4px' }}>{meta.label}</h3>
            {meta.description && (
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 4px' }}>
                {meta.description}
              </p>
            )}
            {features.map((f) => (
              <FeatureRow
                key={f.id}
                feature={f}
                data={data}
                setData={setData}
                state={state}
              />
            ))}
          </section>
        );
      })}

      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button onClick={onNext} disabled={blockingErrors.length > 0}>
          {blockingErrors.length > 0
            ? `Fix ${blockingErrors.length} issue${blockingErrors.length === 1 ? '' : 's'}`
            : 'Continue'}
        </button>
      </div>
    </div>
  );
}
