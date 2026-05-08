import { useMemo, useState } from 'react';
import { streamInstall, type InstallerState, type PipelineEvent } from '../lib/api';
import { DEFAULT_WIZARD, type WizardData } from '../lib/wizardState';
import { CATEGORIES, CATEGORY_ORDER, FEATURES } from '../features';
import type { FeatureCategory, FeatureModule } from '../features';
import FeatureRow from '../features/FeatureRow';

interface Props {
  initial: WizardData;
  state: InstallerState;
  onBack?: () => void;
}

type Tab = 'config' | 'addons' | 'danger';

export default function Settings({ initial, state, onBack }: Props): JSX.Element {
  const [tab, setTab] = useState<Tab>('config');
  const [data, setData] = useState<WizardData>(initial);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'ok' | 'failed'>('idle');

  const dirty = useMemo(() => JSON.stringify(data) !== JSON.stringify(initial), [data, initial]);

  const apply = async (): Promise<void> => {
    setBusy(true);
    setLogs([]);
    setStatus('running');
    try {
      await streamInstall(data, (e: PipelineEvent) => {
        if (e.type === 'log') setLogs((p) => [...p, `[${e.step}] ${e.message ?? ''}`]);
        if (e.type === 'step') setLogs((p) => [...p, `· ${e.step}: ${e.status}`]);
        if (e.type === 'done') setStatus(e.ok ? 'ok' : 'failed');
      });
    } catch (err) {
      setStatus('failed');
      setLogs((p) => [...p, `error: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card">
      <div className="tabs">
        {onBack && (
          <button className="ghost" onClick={onBack} title="Back to home">
            ← Home
          </button>
        )}
        {(['config', 'addons', 'danger'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`tab ${tab === t ? 'active' : ''}`}
          >
            {t === 'config' ? 'Configuration' : t === 'addons' ? 'Add-ons' : 'Danger zone'}
          </button>
        ))}
      </div>

      {tab === 'config' && <ConfigTab data={data} setData={setData} />}
      {tab === 'addons' && <AddonsTab data={data} setData={setData} state={state} />}
      {tab === 'danger' && <DangerTab />}

      {tab !== 'danger' && (
        <div className="actions" style={{ marginTop: 24 }}>
          <button className="secondary" disabled={!dirty || busy} onClick={() => setData(initial)}>
            Reset
          </button>
          <button disabled={!dirty || busy} onClick={apply}>
            {busy ? 'Applying…' : 'Apply changes'}
          </button>
        </div>
      )}

      {status !== 'idle' && (
        <>
          <h3 style={{ marginTop: 16 }}>Pipeline</h3>
          <pre className="log-stream">{logs.join('\n')}</pre>
          {status === 'ok' && <p style={{ color: 'var(--ok)' }}>✓ Applied.</p>}
          {status === 'failed' && <p style={{ color: 'var(--err)' }}>✗ Pipeline failed.</p>}
        </>
      )}
    </div>
  );
}

function ConfigTab({
  data,
  setData,
}: {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
}): JSX.Element {
  return (
    <div>
      <label>LLM provider id</label>
      <input
        type="text"
        value={data.provider}
        onChange={(e) => setData((d) => ({ ...d, provider: e.target.value }))}
      />
      <label>Default model</label>
      <input
        type="text"
        value={data.model}
        onChange={(e) => setData((d) => ({ ...d, model: e.target.value }))}
      />
      <label>Workspace</label>
      <input
        type="text"
        value={data.workspace}
        onChange={(e) => setData((d) => ({ ...d, workspace: e.target.value }))}
      />
      <label>API key (only set this if you want to rotate)</label>
      <input
        type="password"
        value={data.apiKey}
        onChange={(e) => setData((d) => ({ ...d, apiKey: e.target.value }))}
        placeholder="leave empty to keep existing key"
        autoComplete="off"
      />
      <label style={{ marginTop: 16 }}>
        <input
          type="checkbox"
          checked={data.telemetry}
          onChange={(e) => setData((d) => ({ ...d, telemetry: e.target.checked }))}
          style={{ width: 'auto', marginRight: 8 }}
        />
        Allow anonymous telemetry
      </label>
    </div>
  );
}

function AddonsTab({
  data,
  setData,
  state,
}: {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  state: InstallerState;
}): JSX.Element {
  // Settings → Add-ons reuses the same FEATURES registry as the wizard, so
  // the two surfaces never drift. Adding a feature appears in both places
  // automatically.
  const grouped: Record<string, FeatureModule[]> = {};
  for (const feature of FEATURES) {
    (grouped[feature.category] ??= []).push(feature);
  }

  return (
    <div>
      {CATEGORY_ORDER.map((cat: FeatureCategory) => {
        const features = grouped[cat];
        if (!features?.length) return null;
        const meta = CATEGORIES[cat];
        return (
          <section key={cat} style={{ marginTop: 16 }}>
            <h3 style={{ margin: '0 0 4px' }}>{meta.label}</h3>
            {features.map((f) => (
              <FeatureRow key={f.id} feature={f} data={data} setData={setData} state={state} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function DangerTab(): JSX.Element {
  return (
    <div>
      <h3>Uninstall</h3>
      <p>The installer does not remove OpenClaw or its data automatically. Run the commands below in a shell.</p>
      <pre className="log-stream">{`openclaw onboard --uninstall-daemon
npm uninstall -g @openclaw/cli
rm -rf ~/.openclaw`}</pre>
      <p style={{ color: 'var(--warn)' }}>
        Clearing <code>~/.openclaw</code> deletes your config, conversations, and any cached state.
      </p>
    </div>
  );
}

// configToWizard rebuilds the wizard's in-memory state from a previously
// written openclaw.json. Field paths follow OpenClaw's real schema —
// agents.defaults.model and models.providers.X.apiKey, NOT the early
// TS-era guesses.
export function configToWizard(cfg: unknown, fallback: WizardData = DEFAULT_WIZARD): WizardData {
  if (!cfg || typeof cfg !== 'object') return fallback;
  const c = cfg as {
    models?: {
      providers?: Record<string, { baseUrl?: string; apiKey?: string }>;
    };
    agents?: { defaults?: { model?: string; workspace?: string } };
    gateway?: { http?: { endpoints?: { chatCompletions?: { enabled?: boolean } } } };
  };

  const providerKey = Object.keys(c.models?.providers ?? {})[0] ?? fallback.provider;

  return {
    installMode: fallback.installMode,
    provider: providerKey,
    // Never echo the existing key back to the form — saving without
    // touching it should leave the keychain entry alone.
    apiKey: '',
    model: c.agents?.defaults?.model ?? fallback.model,
    workspace: c.agents?.defaults?.workspace ?? fallback.workspace,
    telemetry: false,
    availableModels: [],
    optionalFeatures: {
      openaiGateway: { enabled: c.gateway?.http?.endpoints?.chatCompletions?.enabled ?? false },
      tailscale: { enabled: false },
      solanaCli: { enabled: false },
      x402Skill: { enabled: false },
      usxSkill: { enabled: false },
    },
  };
}
