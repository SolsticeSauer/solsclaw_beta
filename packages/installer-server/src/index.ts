import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { generateToken, registerAuth } from './lib/auth.js';
import stateRoutes from './routes/state.js';
import providerRoutes from './routes/providers.js';
import installRoutes from './routes/install.js';

export interface StartedServer {
  url: string;
  token: string;
  port: number;
  close(): Promise<void>;
}

export interface StartOptions {
  /** Preferred port; falls back to OS-assigned if taken. */
  port?: number;
  /** Override the static UI directory (defaults to `<package>/public`). */
  uiDir?: string;
  /** Installer release version, embedded into config we write. */
  installerVersion: string;
}

export async function startServer(opts: StartOptions): Promise<StartedServer> {
  const token = generateToken();
  const app = Fastify({ logger: false });

  registerAuth(app, { token });

  const here = path.dirname(fileURLToPath(import.meta.url));
  const uiDir = opts.uiDir ?? path.resolve(here, '..', 'public');

  await app.register(fastifyStatic, {
    root: uiDir,
    prefix: '/',
    decorateReply: false,
  });

  await app.register(stateRoutes);
  await app.register(providerRoutes);
  await app.register(installRoutes, { installerVersion: opts.installerVersion });

  // SPA fallback — anything non-/api goes to index.html so refresh works.
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) {
      reply.code(404).send({ error: 'not-found' });
      return;
    }
    void reply.sendFile('index.html');
  });

  const port = opts.port ?? 0;
  const address = await app.listen({ host: '127.0.0.1', port });
  const actualPort = (app.server.address() as { port: number }).port;
  const url = `${address}/?t=${encodeURIComponent(token)}`;

  return {
    url,
    token,
    port: actualPort,
    close: async () => {
      await app.close();
    },
  };
}
