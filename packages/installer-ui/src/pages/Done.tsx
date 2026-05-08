import type { InstallerState } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  state: InstallerState;
}

export default function Done({ data, state }: Props): JSX.Element {
  const gatewayUrl = data.optionalFeatures.openaiGateway ? 'http://localhost:18789/v1' : null;

  return (
    <div className="card">
      <h2>All set</h2>
      <p>OpenClaw is installed and the gateway daemon is registered.</p>

      <h3>Quickstart</h3>
      <pre className="log-stream">
        {`openclaw doctor
openclaw chat "Hello, who are you?"
`}
      </pre>

      {gatewayUrl && (
        <>
          <h3>OpenAI-compatible gateway</h3>
          <p>Point any OpenAI SDK or client at:</p>
          <pre className="log-stream">{`OPENAI_API_BASE=${gatewayUrl}
OPENAI_API_KEY=<token printed in the install logs>`}</pre>
        </>
      )}

      <h3>Config file</h3>
      <p>
        <code>{state.configPath}</code> — re-run this installer to update settings.
      </p>

      <p style={{ marginTop: 24, color: 'var(--muted)' }}>
        Provider: <strong>{data.provider}</strong> · Model: <strong>{data.model}</strong>
      </p>
    </div>
  );
}
