import type { FeatureModule } from './types';

export const openaiGateway: FeatureModule = {
  id: 'openaiGateway',
  label: 'OpenAI-compatible gateway',
  description:
    'Exposes /v1/chat/completions, /v1/models, /v1/embeddings on port 18789 with a generated shared-secret token, so other tools (Open WebUI, LibreChat, etc.) can talk to OpenClaw as an LLM.',
  category: 'gateway',

  isEnabled: (d) => d.optionalFeatures.openaiGateway.enabled,

  toggle: (d, on) => ({
    ...d,
    optionalFeatures: {
      ...d.optionalFeatures,
      openaiGateway: { enabled: on },
    },
  }),
};
