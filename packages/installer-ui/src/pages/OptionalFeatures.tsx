import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function OptionalFeatures({ data, setData, onNext, onBack }: Props): JSX.Element {
  const opt = data.optionalFeatures;

  const setOpt = (patch: Partial<WizardData['optionalFeatures']>): void => {
    setData((d) => ({ ...d, optionalFeatures: { ...d.optionalFeatures, ...patch } }));
  };

  return (
    <div className="card">
      <h2>Optional features</h2>
      <p>All optional. You can install them later from the settings UI.</p>

      <label>
        <input
          type="checkbox"
          checked={opt.openaiGateway}
          onChange={(e) => setOpt({ openaiGateway: e.target.checked })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        <strong>OpenAI-compatible gateway</strong>
      </label>
      <p style={{ marginLeft: 24, fontSize: 12 }}>
        Exposes <code>/v1/chat/completions</code>, <code>/v1/models</code>, <code>/v1/embeddings</code> on
        port 18789 with a generated shared-secret token, so other tools (Open WebUI, LibreChat, etc.) can
        talk to OpenClaw as an LLM.
      </p>

      <label style={{ marginTop: 16 }}>
        <input
          type="checkbox"
          checked={opt.tailscale.enabled}
          onChange={(e) => setOpt({ tailscale: { ...opt.tailscale, enabled: e.target.checked } })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        <strong>Tailscale remote access</strong>
      </label>
      {opt.tailscale.enabled && (
        <div style={{ marginLeft: 24 }}>
          <label>Auth key (optional)</label>
          <input
            type="password"
            value={opt.tailscale.authKey ?? ''}
            onChange={(e) =>
              setOpt({ tailscale: { ...opt.tailscale, authKey: e.target.value || undefined } })
            }
            placeholder="tskey-auth-…"
            autoComplete="off"
          />
          <label>Hostname (optional)</label>
          <input
            type="text"
            value={opt.tailscale.hostname ?? ''}
            onChange={(e) =>
              setOpt({ tailscale: { ...opt.tailscale, hostname: e.target.value || undefined } })
            }
            placeholder="my-openclaw"
          />
        </div>
      )}

      <h3 style={{ marginTop: 20 }}>Solana stack</h3>
      <label>
        <input
          type="checkbox"
          checked={opt.solana.cli}
          onChange={(e) => setOpt({ solana: { ...opt.solana, cli: e.target.checked } })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        Solana CLI (Anza)
      </label>
      <label>
        <input
          type="checkbox"
          checked={opt.solana.x402Skill}
          onChange={(e) => setOpt({ solana: { ...opt.solana, x402Skill: e.target.checked } })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        x402 payment skill
      </label>
      <label>
        <input
          type="checkbox"
          checked={opt.solana.usxSkill}
          onChange={(e) => setOpt({ solana: { ...opt.solana, usxSkill: e.target.checked } })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        USX stablecoin skill
      </label>

      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button onClick={onNext}>Continue</button>
      </div>
    </div>
  );
}
