import type { FastifyInstance } from 'fastify';
import { readConfig } from '../lib/openclawConfig.js';
import { currentPlatform, openclawConfigPath } from '../lib/platform.js';

export default async function stateRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/state', async () => {
    const config = await readConfig();
    return {
      platform: currentPlatform(),
      nodeVersion: process.versions.node,
      configPath: openclawConfigPath(),
      mode: config ? 'settings' : 'install',
      existingConfig: config,
    };
  });
}
