export type InstallMode = 'native' | 'docker';

export interface WizardData {
  installMode: InstallMode;
  provider: string;
  apiKey: string;
  model: string;
  workspace: string;
  telemetry: boolean;
  // Populated by the API-key test step when the provider exposes
  // /v1/models. Bare IDs (no provider prefix). Empty array means we don't
  // know the list and the UI falls back to free-text entry.
  availableModels: string[];
  // One named slot per optional feature. Each slot at minimum has
  // { enabled: boolean }; features that need extra inputs (Tailscale auth
  // key) extend the shape. Adding a new feature: add a slot here and a
  // module under src/features/ — nothing else in the wizard pages
  // needs to know.
  optionalFeatures: {
    openaiGateway: { enabled: boolean };
    tailscale: { enabled: boolean; authKey?: string; hostname?: string };
    solanaCli: { enabled: boolean };
    x402Skill: { enabled: boolean };
    usxSkill: { enabled: boolean };
  };
}

export const DEFAULT_WIZARD: WizardData = {
  installMode: 'native',
  provider: 'tensorix',
  apiKey: '',
  model: 'tensorix/glm-4.6',
  workspace: '',
  telemetry: false,
  availableModels: [],
  optionalFeatures: {
    openaiGateway: { enabled: false },
    tailscale: { enabled: false },
    solanaCli: { enabled: false },
    x402Skill: { enabled: false },
    usxSkill: { enabled: false },
  },
};

export const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'install-mode', label: 'Install Mode' },
  { id: 'provider', label: 'LLM Provider' },
  { id: 'api-key', label: 'API Key' },
  { id: 'core', label: 'Core Settings' },
  { id: 'optional', label: 'Optional' },
  { id: 'review', label: 'Review' },
  { id: 'install', label: 'Install' },
  { id: 'done', label: 'Done' },
] as const;

export type StepId = (typeof STEPS)[number]['id'];
