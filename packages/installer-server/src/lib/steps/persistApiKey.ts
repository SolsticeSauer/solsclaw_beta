import { setSecret } from '../secretsStore.js';
import type { InstallerStep } from './index.js';

export const persistApiKeyStep: InstallerStep = {
  id: 'persist-api-key',
  label: 'Store API key in OS keychain',
  shouldRun: ({ submission }) => {
    if (submission.provider === 'ollama' || submission.provider === 'lmstudio') return false;
    // Empty apiKey in settings-mode means "keep existing key" — skip the rotation.
    return submission.apiKey.trim().length > 0;
  },
  async run({ submission, bus }) {
    const account = `provider:${submission.provider}`;
    const { storage } = await setSecret(account, submission.apiKey);
    bus.log(persistApiKeyStep.id, 'info', `Saved API key (${storage}) as ${account}.`);
  },
};
