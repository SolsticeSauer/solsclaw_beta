import type { FastifyInstance } from 'fastify';
import { WizardSubmissionSchema } from '../schema/openclaw.schema.js';
import { PipelineBus, type PipelineEvent } from '../lib/eventBus.js';
import { runPipeline } from '../lib/steps/index.js';
import { currentPlatform } from '../lib/platform.js';

export default async function installRoutes(app: FastifyInstance, opts: { installerVersion: string }): Promise<void> {
  app.post('/api/install', async (req, reply) => {
    const parsed = WizardSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: 'invalid-body', details: parsed.error.flatten() };
    }

    const submission = parsed.data;
    const bus = new PipelineBus();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const send = (event: PipelineEvent): void => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    bus.on('event', send);

    // Detach reply object lifecycle from the request promise — Fastify won't
    // try to send a body once we've taken over the raw socket.
    void runPipeline({
      submission,
      bus,
      platform: currentPlatform(),
      installerVersion: opts.installerVersion,
    })
      .then((result) => {
        bus.done(result.ok, { failedStep: result.failed });
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        bus.log('pipeline', 'error', message);
        bus.done(false, { fatal: message });
      })
      .finally(() => {
        reply.raw.end();
      });

    // Tell Fastify we've handled the response ourselves.
    return reply;
  });
}
