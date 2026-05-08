import type { InstallerState } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  state: InstallerState;
}

export default function Done({ data, state }: Props): JSX.Element {
  const gatewayUrl = data.optionalFeatures.openaiGateway ? 'http://localhost:18789/v1' : null;
  const isDocker = data.installMode === 'docker';

  return (
    <div className="card">
      <h2>All set</h2>
      <p>
        {isDocker
          ? 'OpenClaw is running in a Docker container with state mounted on the host.'
          : 'OpenClaw is installed and the gateway daemon is registered.'}
      </p>

      <h3>Quickstart</h3>
      <pre className="log-stream">
        {isDocker
          ? `cd ~/.solsclaw/docker
docker compose logs -f openclaw
docker compose exec openclaw openclaw chat "Hello, who are you?"
docker compose down              # stop
docker compose up -d --build     # rebuild after editing the Dockerfile`
          : `openclaw doctor
openclaw chat "Hello, who are you?"`}
      </pre>

      {gatewayUrl && (
        <>
          <h3>OpenAI-compatible gateway</h3>
          <p>Point any OpenAI SDK or client at:</p>
          <pre className="log-stream">{`OPENAI_API_BASE=${gatewayUrl}
OPENAI_API_KEY=<token printed in the install logs>`}</pre>
        </>
      )}

      <h3>Where things live</h3>
      <pre className="log-stream">
        {isDocker
          ? `Dockerfile + compose:  ~/.solsclaw/docker/
OpenClaw state:        ~/.solsclaw/docker/openclaw-data/
.env (secrets):        ~/.solsclaw/docker/.env`
          : state.configPath}
      </pre>

      <p style={{ marginTop: 24, color: 'var(--muted)' }}>
        Mode: <strong>{data.installMode}</strong> · Provider: <strong>{data.provider}</strong> ·
        Model: <strong>{data.model}</strong>
      </p>

      <div className="actions">
        <button onClick={() => window.location.reload()}>Open home</button>
      </div>
    </div>
  );
}
