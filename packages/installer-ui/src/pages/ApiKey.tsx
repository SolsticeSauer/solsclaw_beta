import { useState } from 'react';
import { Api } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function ApiKey({ data, setData, onNext, onBack }: Props): JSX.Element {
  const [testing, setTesting] = useState(false);
  const [verified, setVerified] = useState<null | 'ok' | 'failed' | 'skipped'>(null);
  const [reason, setReason] = useState<string>('');

  const isLocal = data.provider === 'ollama' || data.provider === 'lmstudio';

  const test = async (): Promise<void> => {
    setTesting(true);
    setVerified(null);
    setReason('');
    try {
      const res = await Api.testKey(data.provider, data.apiKey);
      if (res.verified) {
        setVerified('ok');
      } else if (res.reason === 'no-test-endpoint') {
        setVerified('skipped');
        setReason('Provider does not expose a list-models endpoint; key will be verified on first call.');
      } else {
        setVerified('failed');
        setReason(res.error ?? `HTTP ${res.status}`);
      }
    } catch (err) {
      setVerified('failed');
      setReason(err instanceof Error ? err.message : String(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card">
      <h2>API key</h2>
      {isLocal ? (
        <p>Local providers don't need a key. You can continue.</p>
      ) : (
        <>
          <p>Stored in your OS keychain (macOS Keychain / Windows Credential Manager / libsecret).</p>
          <label>API key for {data.provider}</label>
          <input
            type="password"
            value={data.apiKey}
            onChange={(e) => setData((d) => ({ ...d, apiKey: e.target.value }))}
            placeholder="sk-…"
            autoComplete="off"
          />
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="secondary" disabled={!data.apiKey || testing} onClick={test}>
              {testing ? 'Testing…' : 'Test key'}
            </button>
            {verified === 'ok' && <span style={{ color: 'var(--ok)' }}>✓ Key verified</span>}
            {verified === 'failed' && <span style={{ color: 'var(--err)' }}>✗ {reason}</span>}
            {verified === 'skipped' && <span style={{ color: 'var(--warn)' }}>⚠ {reason}</span>}
          </div>
        </>
      )}
      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button disabled={!isLocal && !data.apiKey} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
}
