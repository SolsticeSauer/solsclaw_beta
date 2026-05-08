// Feature-module contract.
//
// Every optional feature offered in the wizard's "Optional" step (and its
// equivalent in Settings → Add-ons) is represented by exactly one
// FeatureModule object. The wizard pages know nothing about specific
// features; they iterate the registry exported from ./index.ts.
//
// Adding a feature:
//   1. Create src/features/<id>.tsx with `export const <id>: FeatureModule = ...`
//   2. Append it to FEATURES in src/features/index.ts
//   3. Add a matching slot to WizardData.optionalFeatures in
//      src/lib/wizardState.ts
//   4. (If it touches the install pipeline) add a corresponding Step on
//      the Go side.
//
// Removing a feature: delete the file + the registry entry + the wizard
// slot. The renderer skips missing slots gracefully via the FeatureModule
// API itself, so partial removals never crash mid-render.

import type { JSX } from 'react';
import type { InstallerState } from '../lib/api';
import type { WizardData } from '../lib/wizardState';

export type FeatureCategory = 'gateway' | 'remote-access' | 'crypto';

export interface FeatureContext {
  data: WizardData;
  setData: (updater: (d: WizardData) => WizardData) => void;
  state: InstallerState;
}

export interface FeatureModule {
  /** Stable identifier. Matches the JSON key in WizardData.optionalFeatures. */
  id: string;
  label: string;
  description: string;
  category: FeatureCategory;
  /** Returns true if the feature is currently enabled in the wizard data. */
  isEnabled(d: WizardData): boolean;
  /** Returns updated wizard data with the enabled flag flipped. */
  toggle(d: WizardData, on: boolean): WizardData;
  /** Optional inline detail panel rendered when the feature is enabled. */
  Detail?: (ctx: FeatureContext) => JSX.Element | null;
  /**
   * Optional submission-blocking validation. Return a human-readable error
   * string when the feature's current configuration would not work, or null.
   */
  validate?: (d: WizardData, state: InstallerState) => string | null;
  /**
   * Optional informational warning. Surfaces inline next to the toggle but
   * does NOT block the wizard from advancing.
   */
  warn?: (d: WizardData, state: InstallerState) => string | null;
}

export interface CategoryMeta {
  label: string;
  description?: string;
}
