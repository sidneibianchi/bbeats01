import { Prisma, PrismaClient } from '@prisma/client';
import type { Express, Request, Response } from 'express';

const prisma = new PrismaClient();
const MAX_RHYTHMS_PER_REQUEST = 500;
const MAX_RHYTHM_BYTES = 1024 * 1024;

function isRhythmRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rhythm = value as Record<string, unknown>;
  return (
    typeof rhythm.id === 'string' &&
    rhythm.id.trim().length > 0 &&
    rhythm.id.length <= 255 &&
    typeof rhythm.name === 'string' &&
    rhythm.name.trim().length > 0 &&
    rhythm.name.length <= 255
  );
}

export function registerRhythmDbRoutes(app: Express) {
  app.get('/api/rhythms', async (_req: Request, res: Response) => {
    try {
      const rhythms = await prisma.rhythm.findMany({
        orderBy: { createdAt: 'asc' },
        select: { data: true },
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, rhythms: rhythms.map(({ data }) => data) });
    } catch (error) {
      console.error('Failed to list rhythms from Neon:', error);
      res.status(500).json({ success: false, error: 'Failed to list rhythms' });
    }
  });

  app.post('/api/rhythms', async (req: Request, res: Response) => {
    const rhythms: unknown = req.body?.rhythms;
    if (
      !Array.isArray(rhythms) ||
      rhythms.length === 0 ||
      rhythms.length > MAX_RHYTHMS_PER_REQUEST ||
      !rhythms.every(isRhythmRecord)
    ) {
      res.status(400).json({
        success: false,
        error: `Expected 1-${MAX_RHYTHMS_PER_REQUEST} valid rhythms`,
      });
      return;
    }

    const ids = rhythms.map((rhythm) => (rhythm as Record<string, string>).id);
    if (new Set(ids).size !== ids.length) {
      res.status(400).json({ success: false, error: 'Rhythm IDs must be unique' });
      return;
    }

    const writes: Prisma.PrismaPromise<unknown>[] = [];
    for (const rhythm of rhythms) {
      const serialized = JSON.stringify(rhythm);
      if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_RHYTHM_BYTES) {
        res.status(413).json({ success: false, error: 'A rhythm exceeds the 1 MiB limit' });
        return;
      }

      const data = JSON.parse(serialized) as Prisma.InputJsonValue;
      writes.push(
        prisma.rhythm.upsert({
          where: { id: (rhythm as Record<string, string>).id },
          create: { id: (rhythm as Record<string, string>).id, data },
          update: { data },
        })
      );
    }

    try {
      await prisma.$transaction(writes);
      res.json({ success: true, count: rhythms.length });
    } catch (error) {
      console.error('Failed to save rhythms to Neon:', error);
      res.status(500).json({ success: false, error: 'Failed to save rhythms' });
    }
  });

  app.delete(
    '/api/rhythms/:id',
    async (req: Request, res: Response) => {
      try {
        const result = await prisma.rhythm.deleteMany({
          where: { id: req.params.id },
        });
        res.json({ success: true, deleted: result.count > 0 });
      } catch (error) {
        console.error('Failed to delete rhythm from Neon:', error);
        res.status(500).json({ success: false, error: 'Failed to delete rhythm' });
      }
    }
  );
}
