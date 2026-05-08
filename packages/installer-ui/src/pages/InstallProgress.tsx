import { useEffect, useRef, useState } from 'react';
import { streamInstall, type PipelineEvent } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  onDone: () => void;
}

interface StepState {
  id: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
}

export default function InstallProgress({ data, onDone }: Props): JSX.Element {
  const [steps, setSteps] = useState<StepState[]>([]);
  const [logs, setLogs] = useState<{ step: string; level: string; message: string }[]>([]);
  const [finalStatus, setFinalStatus] = useState<'pending' | 'ok' | 'failed'>('pending');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    void streamInstall(data, (e: PipelineEvent) => {
      if (e.type === 'step') {
        setSteps((prev) => {
          const existing = prev.find((s) => s.id === e.step);
          if (existing) {
            return prev.map((s) => (s.id === e.step ? { id: s.id, status: e.status ?? 'pending' } : s));
          }
          return [...prev, { id: e.step ?? 'unknown', status: e.status ?? 'pending' }];
        });
      } else if (e.type === 'log') {
        setLogs((prev) => [...prev, { step: e.step ?? '', level: e.level ?? 'info', message: e.message ?? '' }]);
      } else if (e.type === 'done') {
        setFinalStatus(e.ok ? 'ok' : 'failed');
      }
    }).catch((err: Error) => {
      setLogs((prev) => [...prev, { step: 'pipeline', level: 'error', message: err.message }]);
      setFinalStatus('failed');
    });
  }, [data]);

  return (
    <div className="card">
      <h2>Installing</h2>
      <div>
        {steps.map((s) => (
          <div key={s.id} className={`step-row ${s.status}`}>
            <span className="dot" />
            <span>{s.id}</span>
            <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {s.status}</span>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 16 }}>Logs</h3>
      <pre className="log-stream">
        {logs.map((l, i) => (
          <div key={i} className={`log-line ${l.level}`}>
            [{l.step}] {l.message}
          </div>
        ))}
      </pre>
      <div className="actions">
        <button disabled={finalStatus === 'pending'} onClick={onDone}>
          {finalStatus === 'ok' ? 'Continue' : finalStatus === 'failed' ? 'Show summary' : 'Working…'}
        </button>
      </div>
    </div>
  );
}
