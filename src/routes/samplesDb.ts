import { PrismaClient } from '@prisma/client';
import type { Express, Request, Response } from 'express';
import { UTApi, UTFile } from 'uploadthing/server';

const prisma = new PrismaClient();
const MAX_SAMPLE_BYTES = 32 * 1024 * 1024;
const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
let prismaShutdownHandlersInstalled = false;

type SampleUploadBody = {
  title?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  duration?: unknown;
  base64Data?: unknown;
  localSampleId?: unknown;
};

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
    const body = (req.body ?? {}) as SampleUploadBody;
    const filename =
      typeof body.filename === 'string'
        ? body.filename.trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
        : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : filename;
    const localSampleId =
      typeof body.localSampleId === 'string' ? body.localSampleId.trim() : '';
    const duration = body.duration;
    const base64Data = body.base64Data;

    if (
      !filename ||
      filename.length > 255 ||
      !localSampleId ||
      localSampleId.length > 255 ||
      !title ||
      title.length > 255 ||
      !mimeType.startsWith('audio/') ||
      mimeType.length > 128 ||
      (duration !== undefined &&
        (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0)) ||
      typeof base64Data !== 'string' ||
      base64Data.length === 0 ||
      base64Data.length > Math.ceil(MAX_SAMPLE_BYTES / 3) * 4
    ) {
      res.status(400).json({ success: false, error: 'Invalid audio sample data' });
      return;
    }

    if (!BASE64_PATTERN.test(base64Data)) {
      res.status(400).json({ success: false, error: 'Invalid audio encoding' });
      return;
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_SAMPLE_BYTES) {
      res.status(413).json({ success: false, error: 'Audio sample exceeds the 32 MiB limit' });
      return;
    }

    const token = process.env.UPLOADTHING_TOKEN;
    if (!token) {
      res.status(503).json({ success: false, error: 'Sample uploads are not configured' });
      return;
    }

    const uploadthing = new UTApi({ token });

    try {
      const uploaded = await uploadthing.uploadFiles(
        new UTFile([buffer], filename, { type: mimeType })
      );

      if (uploaded.error || !uploaded.data) {
        console.error('UploadThing rejected sample upload:', uploaded.error);
        res.status(502).json({ success: false, error: 'Failed to upload sample file' });
        return;
      }

      try {
        const sample = await prisma.sample.create({
          data: {
            title,
            filename,
            fileUrl: uploaded.data.ufsUrl,
            fileKey: uploaded.data.key,
            localSampleId,
            mimeType,
            duration: typeof duration === 'number' ? Math.round(duration) : null,
          },
        });

        res.status(201).json({ success: true, sample });
      } catch (error) {
        console.error('Failed to save uploaded sample metadata:', error);
        try {
          const cleanup = await uploadthing.deleteFiles(uploaded.data.key);
          if (!cleanup.success) {
            console.error('Failed to remove unreferenced UploadThing sample:', uploaded.data.key);
          }
        } catch (cleanupError) {
          console.error('Failed to clean up unreferenced UploadThing sample:', cleanupError);
        }
        res.status(500).json({ success: false, error: 'Failed to save sample metadata' });
      }
    } catch (error) {
      console.error('Failed to upload sample:', error);
      res.status(502).json({ success: false, error: 'Failed to upload sample file' });
    }
  });

  app.delete('/api/samples/db/:localSampleId', async (req: Request, res: Response) => {
    const localSampleId = req.params.localSampleId;
    const filename =
      typeof req.body?.filename === 'string' ? req.body.filename.trim() : '';

    try {
      let sample = await prisma.sample.findUnique({
        where: { localSampleId },
      });

      if (!sample && filename) {
        const legacyMatches = await prisma.sample.findMany({
          where: { localSampleId: null, filename },
          take: 2,
        });

        if (legacyMatches.length > 1) {
          res.status(409).json({
            success: false,
            error: 'Multiple legacy cloud samples share this filename; refusing ambiguous deletion',
          });
          return;
        }
        sample = legacyMatches[0] ?? null;
      }

      if (!sample) {
        res.json({ success: true, deleted: false });
        return;
      }

      const token = process.env.UPLOADTHING_TOKEN;
      if (!token) {
        res.status(503).json({ success: false, error: 'Sample uploads are not configured' });
        return;
      }

      const uploadthing = new UTApi({ token });
      const remoteDelete = await uploadthing.deleteFiles(sample.fileKey);
      if (!remoteDelete.success) {
        console.error('UploadThing did not delete sample file:', sample.fileKey);
        res.status(502).json({ success: false, error: 'Failed to delete sample file from cloud storage' });
        return;
      }

      await prisma.sample.delete({ where: { id: sample.id } });
      res.json({ success: true, deleted: true });
    } catch (error) {
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
