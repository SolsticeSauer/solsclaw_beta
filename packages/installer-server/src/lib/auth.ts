import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export interface AuthContext {
  token: string;
}

export function generateToken(): string {
  return `oc_${crypto.randomBytes(24).toString('base64url')}`;
}

export function registerAuth(app: FastifyInstance, ctx: AuthContext): void {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    // Public surface: serving the SPA index + static assets is allowed.
    // The token check kicks in only on the /api/* surface.
    if (!req.url.startsWith('/api/')) return;

    // Allow a single bootstrap endpoint that the page-level loader uses to
    // confirm the token query-string is correct before booting the app.
    const provided = req.headers['x-oc-token'] ?? extractTokenFromQuery(req.url);
    if (provided !== ctx.token) {
      reply.code(401).send({ error: 'unauthorized' });
    }
  });
}

function extractTokenFromQuery(url: string): string | undefined {
  const idx = url.indexOf('?');
  if (idx === -1) return undefined;
  const params = new URLSearchParams(url.slice(idx + 1));
  return params.get('t') ?? undefined;
}
