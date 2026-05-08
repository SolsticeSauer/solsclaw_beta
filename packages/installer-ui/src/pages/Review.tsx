import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  onNext: () => void;
  onBack: () => void;
}

export default function Review({ data, onNext, onBack }: Props): JSX.Element {
  // Render a redacted view — the API key never leaves this UI in the clear.
  const safeData = {
    ...data,
    apiKey: data.apiKey ? '••••' + data.apiKey.slice(-4) : '(none)',
    optionalFeatures: {
      ...data.optionalFeatures,
      tailscale: {
        ...data.optionalFeatures.tailscale,
        authKey: data.optionalFeatures.tailscale.authKey ? '••••' : undefined,
      },
    },
  };

  return (
    <div className="card">
      <h2>Review</h2>
      <p>This is what we'll apply. Nothing has been written yet.</p>
      <pre className="log-stream">{JSON.stringify(safeData, null, 2)}</pre>
      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button onClick={onNext}>Install</button>
      </div>
    </div>
  );
}
