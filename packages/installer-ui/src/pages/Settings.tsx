import { useMemo, useState } from 'react';
import { streamInstall, type PipelineEvent } from '../lib/api';
import { DEFAULT_WIZARD, type WizardData } from '../lib/wizardState';

interface Props {
  initial: WizardData;
}

type Tab = 'config' | 'addons' | 'danger';

export default function Settings({ initial }: Props): JSX.Element {
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {(['config', 'addons', 'danger'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? '' : 'secondary'}
            style={{ borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0 }}
          >
            {t === 'config' ? 'Configuration' : t === 'addons' ? 'Add-ons' : 'Danger zone'}
          </button>
        ))}
      </div>

      {tab === 'config' && <ConfigTab data={data} setData={setData} />}
      {tab === 'addons' && <AddonsTab data={data} setData={setData} />}
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
}: {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
}): JSX.Element {
  const opt = data.optionalFeatures;
  const setOpt = (patch: Partial<WizardData['optionalFeatures']>): void =>
    setData((d) => ({ ...d, optionalFeatures: { ...d.optionalFeatures, ...patch } }));

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={opt.openaiGateway}
          onChange={(e) => setOpt({ openaiGateway: e.target.checked })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        OpenAI-compatible gateway endpoint
      </label>
      <label>
        <input
          type="checkbox"
          checked={opt.tailscale.enabled}
          onChange={(e) => setOpt({ tailscale: { ...opt.tailscale, enabled: e.target.checked } })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        Tailscale remote access
      </label>
      <label>
        <input
          type="checkbox"
          checked={opt.solana.cli}
          onChange={(e) => setOpt({ solana: { ...opt.solana, cli: e.target.checked } })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        Solana CLI
      </label>
      <label>
        <input
          type="checkbox"
          checked={opt.solana.x402Skill}
          onChange={(e) => setOpt({ solana: { ...opt.solana, x402Skill: e.target.checked } })}
          style={{ width: 'auto', marginRight: 8 }}
        />
        x402 skill
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

export function configToWizard(cfg: unknown, fallback: WizardData = DEFAULT_WIZARD): WizardData {
  if (!cfg || typeof cfg !== 'object') return fallback;
  const c = cfg as {
    agent?: { model?: string; workspace?: string };
    providers?: Record<string, unknown>;
    gateway?: { openaiCompat?: { enabled?: boolean }; tailscale?: { enabled?: boolean; hostname?: string } };
    telemetry?: { enabled?: boolean };
    installer?: { addons?: { cli?: boolean; x402Skill?: boolean; usxSkill?: boolean } };
  };
  const provider = Object.keys(c.providers ?? {})[0] ?? fallback.provider;
  return {
    installMode: fallback.installMode,
    provider,
    apiKey: '',
    model: c.agent?.model ?? fallback.model,
    workspace: c.agent?.workspace ?? fallback.workspace,
    telemetry: c.telemetry?.enabled ?? false,
    optionalFeatures: {
      openaiGateway: c.gateway?.openaiCompat?.enabled ?? false,
      tailscale: {
        enabled: c.gateway?.tailscale?.enabled ?? false,
        hostname: c.gateway?.tailscale?.hostname,
      },
      solana: {
        cli: c.installer?.addons?.cli ?? false,
        x402Skill: c.installer?.addons?.x402Skill ?? false,
        usxSkill: c.installer?.addons?.usxSkill ?? false,
      },
    },
  };
}
