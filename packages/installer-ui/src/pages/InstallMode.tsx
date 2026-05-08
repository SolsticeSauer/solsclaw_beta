import type { InstallerState } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

interface Props {
  state: InstallerState;
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function InstallMode({ state, data, setData, onNext, onBack }: Props): JSX.Element {
  const isMac = state.platform === 'darwin';
  const isDocker = data.installMode === 'docker';

  const select = (mode: 'native' | 'docker'): void => {
    setData((d) => ({ ...d, installMode: mode }));
  };

  return (
    <div className="card">
      <h2>How should OpenClaw run?</h2>
      <p>Pick one — you can re-run the installer later to switch.</p>

      <div className="provider-grid" style={{ marginTop: 16 }}>
        <div
          className={`provider-card ${data.installMode === 'native' ? 'selected' : ''}`}
          onClick={() => select('native')}
        >
          <strong>Native</strong>
          <span className="badge">Recommended</span>
          <div className="desc">
            Installs directly on this host: a portable Node 22 under{' '}
            <code>~/.solsclaw/runtime</code>, OpenClaw via npm, daemon registered with
            launchd / systemd. Fastest path; full access to host-integration skills
            (Apple Notes, iMessage, etc. on macOS).
          </div>
        </div>

        <div
          className={`provider-card ${data.installMode === 'docker' ? 'selected' : ''}`}
          onClick={() => select('docker')}
        >
          <strong>Docker (sandboxed)</strong>
          <div className="desc">
            Generates a Dockerfile + <code>docker-compose.yml</code> under{' '}
            <code>~/.solsclaw/docker</code>, builds the image locally, runs OpenClaw
            in a container with state mounted as a volume. Tailscale becomes a
            sidecar service.{' '}
            <strong>You must have Docker + Compose installed on this host.</strong>
          </div>
        </div>
      </div>

      {isDocker && isMac && (
        <div
          className="card"
          style={{
            marginTop: 16,
            border: '1px solid var(--warn)',
            background: 'rgba(210, 153, 34, 0.06)',
          }}
        >
          <h3 style={{ color: 'var(--warn)', marginTop: 0 }}>Heads-up for macOS users</h3>
          <p style={{ color: 'var(--fg)' }}>
            Docker on macOS runs Linux containers in a VM, so macOS-host skills won't
            work from inside the container — anything that talks to AppleScript or system
            frameworks: <code>apple-notes</code>, <code>apple-reminders</code>,{' '}
            <code>imsg</code>, voice wake, the menu-bar app. If those features matter to
            you, pick <strong>Native</strong> instead.
          </p>
        </div>
      )}

      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button onClick={onNext}>Continue</button>
      </div>
    </div>
  );
}
