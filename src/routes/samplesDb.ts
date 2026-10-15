import { PrismaClient } from '@prisma/client';
import type { Express, Request, Response } from 'express';
import {
  createCloudSample,
  deleteCloudSample,
  listCloudSamples,
  SampleDbError,
} from '../lib/sampleDb';

const prisma = new PrismaClient();
let prismaShutdownHandlersInstalled = false;

function installPrismaShutdownHandlers() {
  if (prismaShutdownHandlersInstalled) return;
  prismaShutdownHandlersInstalled = true;

  process.on('SIGINT', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected (SIGINT)');
      process.exit(0);
    } catch (error) {
      console.error('Failed to disconnect Prisma (SIGINT):', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected (SIGTERM)');
      process.exit(0);
    } catch (error) {
      console.error('Failed to disconnect Prisma (SIGTERM):', error);
      process.exit(1);
    }
  });

  process.on('beforeExit', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected (beforeExit)');
    } catch (error) {
      console.error('Failed to disconnect Prisma (beforeExit):', error);
    }
  });
}

export function registerSampleDbRoutes(app: Express) {
  installPrismaShutdownHandlers();

  app.get('/api/samples/db', async (_req: Request, res: Response) => {
    try {
      const samples = await listCloudSamples(prisma);
      res.json({ success: true, samples });
    } catch (error) {
      console.error('Failed to list samples from db:', error);
      res.status(500).json({ success: false, error: 'Failed to list samples' });
    }
  });
  app.post('/api/samples/db', async (req: Request, res: Response) => {
    try {
      const sample = await createCloudSample(prisma, req.body);
      res.status(201).json({ success: true, sample });
    } catch (error) {
      if (error instanceof SampleDbError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Failed to create cloud sample:', error);
      res.status(500).json({ success: false, error: 'Failed to save sample' });
    }
  });

  app.delete('/api/samples/db/:localSampleId', async (req: Request, res: Response) => {
    const localSampleId = req.params.localSampleId;
    const filename =
      typeof req.body?.filename === 'string' ? req.body.filename.trim() : '';

    try {
      const deleted = await deleteCloudSample(prisma, localSampleId, filename || undefined);
      res.json({ success: true, deleted });
    } catch (error) {
      if (error instanceof SampleDbError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Failed to delete cloud sample:', error);
      res.status(500).json({ success: false, error: 'Failed to delete cloud sample' });
    }
  });

  app.get('/api/samples/:id/db', async (req: Request, res: Response) => {
    try {
      const sample = await prisma.sample.findUnique({
        where: { id: req.params.id },
      });

      if (!sample) {
        res.status(404).json({ success: false, error: 'Sample not found' });
        return;
      }

      res.json({ success: true, sample });
    } catch (error) {
      console.error('Failed to fetch sample:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sample' });
    }
  });
}
