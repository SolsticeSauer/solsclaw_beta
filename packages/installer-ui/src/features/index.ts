// Feature registry.
//
// Each feature module is imported once here and listed in FEATURES in the
// order it should appear inside its category. The OptionalFeatures wizard
// page and the Settings → Add-ons tab read this list directly.
//
// To add a feature: create `<id>.tsx`, import it below, append it to
// FEATURES. To re-categorise: change the module's `category` field — the
// renderer picks it up automatically.

import type { CategoryMeta, FeatureCategory, FeatureModule } from './types';
import { openaiGateway } from './openaiGateway';
import { tailscale } from './tailscale';
import { solanaCli } from './solanaCli';
import { x402Skill } from './x402Skill';
import { usxSkill } from './usxSkill';

export const FEATURES: FeatureModule[] = [
  openaiGateway,
  tailscale,
  solanaCli,
  x402Skill,
  usxSkill,
];

export const CATEGORY_ORDER: FeatureCategory[] = [
  'gateway',
  'remote-access',
  'crypto',
];

export const CATEGORIES: Record<FeatureCategory, CategoryMeta> = {
  gateway: {
    label: 'API gateways',
    description: 'Surfaces other tools and clients can connect to.',
  },
  'remote-access': {
    label: 'Remote access',
    description: 'Reach OpenClaw from outside this host.',
  },
  crypto: {
    label: 'Crypto & Web3',
    description: 'Solana-side tooling.',
  },
};

export type { FeatureModule, FeatureCategory, CategoryMeta } from './types';
