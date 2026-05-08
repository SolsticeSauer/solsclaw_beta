import { useEffect, useState } from 'react';
import { Api, type ProviderInfo } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function LlmProvider({ data, setData, onNext, onBack }: Props): JSX.Element {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    Api.providers().then((res) => setProviders(res.providers));
  }, []);

  if (!providers) return <div className="card">Loading providers…</div>;

  const visible = providers.filter((p) =>
    [p.label, p.id, p.description].some((s) => s.toLowerCase().includes(filter.toLowerCase())),
  );

  // Always pin tensorix to the top regardless of filter ordering, so it stays
  // the visual default.
  visible.sort((a, b) => Number(b.isDefault ?? false) - Number(a.isDefault ?? false));

  const select = (p: ProviderInfo): void => {
    // Clear any models we previously fetched for the old provider — they
    // won't apply here, and a stale list would mislead CoreParams.
    setData((d) => ({ ...d, provider: p.id, model: p.defaultModel, availableModels: [] }));
  };

  return (
    <div className="card">
      <h2>Pick an LLM provider</h2>
      <p>Tensorix is the default. You can change this later in settings.</p>
      <input
        type="text"
        placeholder="Filter providers…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginBottom: 16 }}
      />
      <div className="provider-grid">
        {visible.map((p) => (
          <div
            key={p.id}
            className={`provider-card ${data.provider === p.id ? 'selected' : ''}`}
            onClick={() => select(p)}
          >
            <strong>{p.label}</strong>
            {p.isDefault && <span className="badge">Default</span>}
            <div className="desc">{p.description}</div>
          </div>
        ))}
      </div>
      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button onClick={onNext}>Continue</button>
      </div>
    </div>
  );
}
