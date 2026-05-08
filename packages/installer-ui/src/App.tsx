import { useEffect, useState } from 'react';
import { Api, type InstallerState } from './lib/api';
import { DEFAULT_WIZARD, STEPS, type StepId, type WizardData } from './lib/wizardState';
import Welcome from './pages/Welcome';
import LlmProvider from './pages/LlmProvider';
import ApiKey from './pages/ApiKey';
import CoreParams from './pages/CoreParams';
import OptionalFeatures from './pages/OptionalFeatures';
import Review from './pages/Review';
import InstallProgress from './pages/InstallProgress';
import Done from './pages/Done';

export default function App(): JSX.Element {
  const [state, setState] = useState<InstallerState | null>(null);
  const [step, setStep] = useState<StepId>('welcome');
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Api.state()
      .then((s) => {
        setState(s);
        setData((d) => ({ ...d, workspace: defaultWorkspace(s.platform) }));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="app">
        <div className="card">
          <h1>Installer error</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  if (!state) {
    return (
      <div className="app">
        <div className="card">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goNext = (): void => {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };
  const goPrev = (): void => {
    const prev = STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  return (
    <div className="app">
      <h1>
        OpenClaw Installer <span style={{ color: 'var(--muted)', fontSize: 14 }}>· {state.platform}</span>
      </h1>
      <p style={{ marginBottom: 20 }}>
        {state.mode === 'install'
          ? 'Set up OpenClaw on this machine.'
          : 'Existing config detected — adjust settings or reinstall.'}
      </p>

      <div className="stepper">
        {STEPS.map((s, idx) => (
          <span
            key={s.id}
            className={`step ${idx === stepIndex ? 'active' : ''} ${idx < stepIndex ? 'done' : ''}`}
          >
            {idx + 1}. {s.label}
          </span>
        ))}
      </div>

      {step === 'welcome' && <Welcome state={state} onNext={goNext} />}
      {step === 'provider' && <LlmProvider data={data} setData={setData} onNext={goNext} onBack={goPrev} />}
      {step === 'api-key' && <ApiKey data={data} setData={setData} onNext={goNext} onBack={goPrev} />}
      {step === 'core' && <CoreParams data={data} setData={setData} onNext={goNext} onBack={goPrev} />}
      {step === 'optional' && (
        <OptionalFeatures data={data} setData={setData} onNext={goNext} onBack={goPrev} />
      )}
      {step === 'review' && <Review data={data} onNext={goNext} onBack={goPrev} />}
      {step === 'install' && <InstallProgress data={data} onDone={() => setStep('done')} />}
      {step === 'done' && <Done data={data} state={state} />}
    </div>
  );
}

function defaultWorkspace(platform: string): string {
  if (platform === 'win32') return '%USERPROFILE%\\OpenClaw';
  return '~/OpenClaw';
}
