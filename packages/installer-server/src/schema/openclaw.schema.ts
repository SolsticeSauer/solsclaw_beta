import { z } from 'zod';

export const ProviderIdSchema = z.enum([
  'tensorix',
  'anthropic',
  'openai',
  'google',
  'mistral',
  'deepseek',
  'groq',
  'together',
  'perplexity',
  'xai',
  'ollama',
  'lmstudio',
]);
export type ProviderId = z.infer<typeof ProviderIdSchema>;

export const TailscaleConfigSchema = z.object({
  enabled: z.boolean(),
  hostname: z.string().min(1).optional(),
  ephemeral: z.boolean().default(false),
});

export const OpenAiGatewayConfigSchema = z.object({
  enabled: z.boolean(),
  port: z.number().int().min(1024).max(65535).default(18789),
  tokenRef: z.string().min(1).optional(),
});

export const SolanaStackConfigSchema = z.object({
  cli: z.boolean().default(false),
  x402Skill: z.boolean().default(false),
  usxSkill: z.boolean().default(false),
});

export const OpenclawConfigSchema = z.object({
  $schema: z.string().optional(),
  agent: z.object({
    model: z.string().min(1),
    workspace: z.string().min(1).optional(),
  }),
  providers: z.record(
    z.string(),
    z.object({
      type: z.enum(['openai-compatible', 'native']).default('native'),
      baseUrl: z.string().url().optional(),
      apiKeyRef: z.string().min(1),
    }),
  ),
  gateway: z
    .object({
      openaiCompat: OpenAiGatewayConfigSchema.optional(),
      tailscale: TailscaleConfigSchema.optional(),
    })
    .optional(),
  telemetry: z.object({ enabled: z.boolean().default(false) }).optional(),
  installer: z
    .object({
      version: z.string(),
      installedAt: z.string(),
      addons: SolanaStackConfigSchema.optional(),
    })
    .optional(),
});

export type OpenclawConfig = z.infer<typeof OpenclawConfigSchema>;

export const WizardSubmissionSchema = z.object({
  provider: ProviderIdSchema,
  // Empty string allowed: in settings-mode "keep existing key" is signaled
  // by sending an empty value. Local providers also legitimately send empty.
  apiKey: z.string(),
  model: z.string().min(1),
  workspace: z.string().min(1),
  telemetry: z.boolean().default(false),
  optionalFeatures: z.object({
    openaiGateway: z.boolean().default(false),
    tailscale: z
      .object({
        enabled: z.boolean(),
        authKey: z.string().optional(),
        hostname: z.string().optional(),
      })
      .default({ enabled: false }),
    solana: SolanaStackConfigSchema.default({
      cli: false,
      x402Skill: false,
      usxSkill: false,
    }),
  }),
});

export type WizardSubmission = z.infer<typeof WizardSubmissionSchema>;
