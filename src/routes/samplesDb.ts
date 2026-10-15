import { PrismaClient } from '@prisma/client';
import type { Express, Request, Response } from 'express';

const prisma = new PrismaClient();
let _prismaShutdownHandlersInstalled = false;

function installPrismaShutdownHandlers() {
  if (_prismaShutdownHandlersInstalled) return;
  _prismaShutdownHandlersInstalled = true;

  process.on('SIGINT', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected (SIGINT)');
    } finally {
      process.exit(0);
    }
  });

  process.on('SIGTERM', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected (SIGTERM)');
    } finally {
      process.exit(0);
    }
  });

  process.on('beforeExit', async () => {
    try {
      await prisma.$disconnect();
      console.log('Prisma disconnected (beforeExit)');
    } catch {}
  });
}

export function registerSampleDbRoutes(app: Express) {
  // ensure shutdown handlers are installed only once
  installPrismaShutdownHandlers();

  app.get('/api/samples/db', async (_req: Request, res: Response) => {
    try {
      const samples = await prisma.sample.findMany({
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, samples });
    } catch (error) {
      console.error('Failed to list samples from db:', error);
      res.status(500).json({ success: false, error: 'Failed to list samples' });
    }
  });

  app.post('/api/samples/db', async (req: Request, res: Response) => {
    try {
      const { title, filename, fileUrl, mimeType, duration } = req.body;

      if (!filename || !fileUrl) {
        return res.status(400).json({
          success: false,
          error: 'filename and fileUrl are required',
        });
      }

      const sample = await prisma.sample.create({
        data: {
          title: title || filename,
          filename,
          fileUrl,
          mimeType: mimeType || 'audio/mpeg',
          duration: typeof duration === 'number' ? duration : null,
        },
      });

      res.status(201).json({ success: true, sample });
    } catch (error) {
      console.error('Failed to create sample record:', error);
      res.status(500).json({ success: false, error: 'Failed to save sample metadata' });
    }
  });

  app.get('/api/samples/:id/db', async (req: Request, res: Response) => {
    try {
      const sample = await prisma.sample.findUnique({
        where: { id: req.params.id },
      });

      if (!sample) {
        return res.status(404).json({ success: false, error: 'Sample not found' });
      }

      res.json({ success: true, sample });
    } catch (error) {
      console.error('Failed to fetch sample:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch sample' });
    }
  });
}
