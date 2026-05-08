import { useState } from 'react';
import { Api, type InstallerState } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

interface Props {
  state: InstallerState;
  data: WizardData;
  onConfigure: () => void;
  onReinstall: () => void;
}

// Home is the default landing view once OpenClaw is set up. It replaces the
// previous behaviour of jumping straight into the Settings tabs on every
// re-run, and gives the user a clear "you're set" surface with quick
// actions for the things they'll actually want to do.
export default function Home({ state, data, onConfigure, onReinstall }: Props): JSX.Element {
  const isDocker = data.installMode === 'docker';
  const gatewayBase = data.optionalFeatures.openaiGateway.enabled
    ? 'http://127.0.0.1:18789'
    : null;
  const [quitting, setQuitting] = useState<'idle' | 'pending' | 'done' | 'failed'>('idle');

  const onQuit = async (): Promise<void> => {
    setQuitting('pending');
    try {
      await Api.shutdown();
      setQuitting('done');
    } catch (err) {
      // The server may close the connection before our response handler
      // reads — that's a successful exit, not an error. We treat any
      // network failure here as "the binary is gone".
      console.warn('shutdown call:', err);
      setQuitting('done');
    }
  };

  return (
    <>
      <div className="card" style={{ borderColor: 'var(--ok)' }}>
        <h2 style={{ color: 'var(--ok)' }}>OpenClaw is ready</h2>
        <p>
          {isDocker
            ? 'Container is running with state mounted on the host. The daemon restarts automatically across reboots.'
            : 'Daemon is registered with your init system and will come back up on reboot.'}
        </p>
        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: '12px 0 0' }}>
          <li>
            Provider: <strong>{data.provider}</strong>
          </li>
          <li>
            Default model: <strong>{data.model}</strong>
          </li>
          <li>
            Mode: <strong>{data.installMode}</strong>
          </li>
          <li style={{ color: 'var(--muted)' }}>
            Config: <code>{state.configPath}</code>
          </li>
        </ul>
      </div>

      <div className="provider-grid">
        <div className="provider-card" onClick={onConfigure} role="button" tabIndex={0}>
          <strong>Settings</strong>
          <div className="desc">
            Edit provider, rotate the API key, toggle add-ons (OpenAI gateway, Tailscale,
            Solana stack).
          </div>
        </div>

        {gatewayBase && (
          <a
            className="provider-card"
            href={`${gatewayBase}/v1/models`}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <strong>Test gateway</strong>
            <div className="desc">
              Open <code>{gatewayBase}/v1/models</code> — should return the configured
              model list as JSON.
            </div>
          </a>
        )}

        <a
          className="provider-card"
          href="https://docs.openclaw.ai"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          <strong>OpenClaw docs</strong>
          <div className="desc">
            Skills catalogue, channel setup, agent configuration.
          </div>
        </a>

        <div
          className="provider-card"
          onClick={onReinstall}
          role="button"
          tabIndex={0}
          style={{ borderColor: 'var(--warn)' }}
        >
          <strong>Reinstall from scratch</strong>
          <div className="desc">
            Re-run the wizard. Your existing <code>openclaw.json</code> is backed up
            with a timestamp before being overwritten.
          </div>
        </div>
      </div>

      <h3 style={{ marginTop: 32 }}>Quickstart</h3>
      <pre className="log-stream">
        {isDocker
          ? `cd ~/.solsclaw/docker
docker compose logs -f openclaw                       # tail logs
docker compose exec openclaw openclaw chat "hi"        # talk to your agent
docker compose down                                    # stop
docker compose up -d --build                           # rebuild + start`
          : `openclaw chat "hi"
openclaw doctor
openclaw gateway status`}
      </pre>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Done browsing?</h3>
        <p>
          OpenClaw itself keeps running in the background — it was registered as a
          {isDocker ? ' Docker service' : ' user-level system service'} during install.
          Quitting Solsclaw only stops this setup UI; you can re-launch it any time with{' '}
          <code>~/.solsclaw/solsclaw</code> or the original{' '}
          <code>curl … | bash</code> one-liner.
        </p>
        <div className="actions">
          <button
            disabled={quitting !== 'idle'}
            onClick={onQuit}
            style={{ background: quitting === 'done' ? 'var(--ok)' : undefined }}
          >
            {quitting === 'idle' && 'Quit Solsclaw'}
            {quitting === 'pending' && 'Stopping…'}
            {quitting === 'done' && 'Stopped — you can close this tab'}
            {quitting === 'failed' && 'Quit failed'}
          </button>
        </div>
      </div>

      <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 24 }}>
        Solsclaw — your OpenClaw assistant launcher.
      </p>
    </>
  );
}
