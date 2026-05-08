import type { WizardData } from '../lib/wizardState';

interface Props {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function CoreParams({ data, setData, onNext, onBack }: Props): JSX.Element {
  return (
    <div className="card">
      <h2>Core settings</h2>

      <label>Default model</label>
      {data.availableModels.length > 0 ? (
        <>
          <select
            value={data.model}
            onChange={(e) => setData((d) => ({ ...d, model: e.target.value }))}
          >
            {data.availableModels.map((id) => {
              const value = `${data.provider}/${id}`;
              return (
                <option key={value} value={value}>
                  {id}
                </option>
              );
            })}
          </select>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            {data.availableModels.length} models reported by{' '}
            <code>{data.provider}</code> on the previous step.
          </p>
        </>
      ) : (
        <>
          <input
            type="text"
            value={data.model}
            onChange={(e) => setData((d) => ({ ...d, model: e.target.value }))}
            placeholder="provider/model-id"
          />
          <p style={{ fontSize: 12, marginTop: 4 }}>
            Format: <code>provider/model-id</code>. We couldn't enumerate this provider's
            catalogue — type the ID you want as the default agent model.
          </p>
        </>
      )}

      <label>Workspace path</label>
      <input
        type="text"
        value={data.workspace}
        onChange={(e) => setData((d) => ({ ...d, workspace: e.target.value }))}
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

      <div className="actions">
        <button className="secondary" onClick={onBack}>
          Back
        </button>
        <button disabled={!data.model || !data.workspace} onClick={onNext}>
          Continue
        </button>
      </div>
    </div>
  );
}
