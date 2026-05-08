import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PROVIDERS, findProvider } from '../lib/providers.js';
import { ProviderIdSchema } from '../schema/openclaw.schema.js';

const TestKeyBody = z.object({
  provider: ProviderIdSchema,
  apiKey: z.string().min(1),
});

export default async function providerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/providers', async () => ({ providers: PROVIDERS }));

  app.post('/api/providers/test-key', async (req, reply) => {
    const parsed = TestKeyBody.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid-body', details: parsed.error.flatten() };
    }
    const provider = findProvider(parsed.data.provider);
    if (!provider.modelsEndpoint) {
      // Native providers don't expose an OpenAI-compatible /v1/models endpoint;
      // we accept the key as-is and let OpenClaw verify on first call.
      return { ok: true, verified: false, reason: 'no-test-endpoint' };
    }
    try {
      const res = await fetch(provider.modelsEndpoint, {
        headers: { Authorization: `Bearer ${parsed.data.apiKey}` },
      });
      return { ok: res.ok, status: res.status, verified: res.ok };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}
