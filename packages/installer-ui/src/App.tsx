import { useEffect, useState } from 'react';
import { Api, type InstallerState } from './lib/api';
import { DEFAULT_WIZARD, STEPS, type StepId, type WizardData } from './lib/wizardState';
import Welcome from './pages/Welcome';
import InstallMode from './pages/InstallMode';
import LlmProvider from './pages/LlmProvider';
import ApiKey from './pages/ApiKey';
import CoreParams from './pages/CoreParams';
import OptionalFeatures from './pages/OptionalFeatures';
import Review from './pages/Review';
import InstallProgress from './pages/InstallProgress';
import Done from './pages/Done';
import Settings, { configToWizard } from './pages/Settings';

export default function App(): JSX.Element {
  const [state, setState] = useState<InstallerState | null>(null);
  const [step, setStep] = useState<StepId>('welcome');
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Api.state()
      .then((s) => {
        setState(s);
        if (s.mode === 'settings' && s.existingConfig) {
          setData(configToWizard(s.existingConfig, { ...DEFAULT_WIZARD, workspace: defaultWorkspace(s.platform) }));
        } else {
          setData((d) => ({ ...d, workspace: defaultWorkspace(s.platform) }));
        }
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

      {state.mode === 'settings' ? (
        <Settings initial={data} />
      ) : (
        <>
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

          {renderWizardStep()}
        </>
      )}
    </div>
  );

  function renderWizardStep(): JSX.Element | null {
    if (!state) return null;
    switch (step) {
      case 'welcome':
        return <Welcome state={state} onNext={goNext} />;
      case 'install-mode':
        return <InstallMode state={state} data={data} setData={setData} onNext={goNext} onBack={goPrev} />;
      case 'provider':
        return <LlmProvider data={data} setData={setData} onNext={goNext} onBack={goPrev} />;
      case 'api-key':
        return <ApiKey data={data} setData={setData} onNext={goNext} onBack={goPrev} />;
      case 'core':
        return <CoreParams data={data} setData={setData} onNext={goNext} onBack={goPrev} />;
      case 'optional':
        return <OptionalFeatures data={data} setData={setData} onNext={goNext} onBack={goPrev} />;
      case 'review':
        return <Review data={data} onNext={goNext} onBack={goPrev} />;
      case 'install':
        return <InstallProgress data={data} onDone={() => setStep('done')} />;
      case 'done':
        return <Done data={data} state={state} />;
      default:
        return null;
    }
  }
}

function defaultWorkspace(platform: string): string {
  if (platform === 'windows' || platform === 'win32') return '%USERPROFILE%\\OpenClaw';
  return '~/OpenClaw';
}
