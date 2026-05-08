import type { InstallerState } from '../lib/api';

interface Props {
  state: InstallerState;
  onNext: () => void;
}

export default function Welcome({ state, onNext }: Props): JSX.Element {
  const nodeMajor = parseInt(state.nodeVersion.split('.')[0] ?? '0', 10);
  const nodeOk = nodeMajor >= 20;
  const platformLabel =
    state.platform === 'darwin' ? 'macOS' : state.platform === 'linux' ? 'Linux' : 'Windows';

  return (
    <div className="card">
      <h2>System check</h2>
      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
        <li>✓ Platform: {platformLabel}</li>
        <li>{nodeOk ? '✓' : '✗'} Node.js: {state.nodeVersion} (need ≥20)</li>
        <li>✓ Config target: {state.configPath}</li>
        <li>{state.mode === 'settings' ? '⚙ Existing config detected' : '○ Fresh install'}</li>
      </ul>
      <p>
        This wizard will write <code>{state.configPath}</code>, install OpenClaw via your global
        package manager, and register the gateway daemon. API keys are stored in your OS keychain,
        not in the config file.
      </p>
      <div className="actions">
        <button disabled={!nodeOk} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
}
