export type InstallMode = 'native' | 'docker';

export interface WizardData {
  installMode: InstallMode;
  provider: string;
  apiKey: string;
  model: string;
  workspace: string;
  telemetry: boolean;
  optionalFeatures: {
    openaiGateway: boolean;
    tailscale: { enabled: boolean; authKey?: string; hostname?: string };
    solana: { cli: boolean; x402Skill: boolean; usxSkill: boolean };
  };
}

export const DEFAULT_WIZARD: WizardData = {
  installMode: 'native',
  provider: 'tensorix',
  apiKey: '',
  model: 'tensorix/glm-4.6',
  workspace: '',
  telemetry: false,
  optionalFeatures: {
    openaiGateway: false,
    tailscale: { enabled: false },
    solana: { cli: false, x402Skill: false, usxSkill: false },
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
