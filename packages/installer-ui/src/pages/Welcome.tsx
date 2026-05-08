import type { InstallerState } from '../lib/api';

interface Props {
  state: InstallerState;
  onNext: () => void;
}

export default function Welcome({ state, onNext }: Props): JSX.Element {
  const platformLabel =
    state.platform === 'darwin' ? 'macOS' : state.platform === 'linux' ? 'Linux' : 'Windows';

  return (
    <div className="card">
      <h2>System check</h2>
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        <li>✓ Platform: {platformLabel}</li>
        <li>✓ Solsclaw runtime: {state.goVersion}</li>
        <li>✓ Config target: {state.configPath}</li>
        <li>{state.mode === 'settings' ? '⚙ Existing config detected' : '○ Fresh install'}</li>
      </ul>
      <p>
        This wizard will write <code>{state.configPath}</code>, install OpenClaw via your global
        package manager, and register the gateway daemon. API keys are stored in your OS keychain,
        not in the config file. Node.js is required for the OpenClaw CLI install step itself —
        if it's missing, that step will fail with a clear message and you can install it before
        retrying.
      </p>
      <div className="actions">
        <button onClick={onNext}>Continue</button>
      </div>
    </div>
  );
}
