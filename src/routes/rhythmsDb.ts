import { PrismaClient } from '@prisma/client';
import type { Express, Request, Response } from 'express';
import {
  deleteSharedRhythm,
  listSharedRhythms,
  RhythmValidationError,
  saveSharedRhythms,
} from '../lib/rhythmDb';

const prisma = new PrismaClient();

export function registerRhythmDbRoutes(app: Express) {
  app.get('/api/rhythms', async (_req: Request, res: Response) => {
    try {
      const rhythms = await listSharedRhythms(prisma);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ success: true, rhythms });
    } catch (error) {
      console.error('Failed to list rhythms from Neon:', error);
      res.status(500).json({ success: false, error: 'Failed to list rhythms' });
    }
  });

  app.post('/api/rhythms', async (req: Request, res: Response) => {
    try {
      const count = await saveSharedRhythms(prisma, req.body?.rhythms);
      res.json({ success: true, count });
    } catch (error) {
      if (error instanceof RhythmValidationError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Failed to save rhythms to Neon:', error);
      res.status(500).json({ success: false, error: 'Failed to save rhythms' });
    }
  });

  app.delete(
    '/api/rhythms/:id',
    async (req: Request, res: Response) => {
      try {
        const deleted = await deleteSharedRhythm(prisma, req.params.id);
        res.json({ success: true, deleted });
      } catch (error) {
        console.error('Failed to delete rhythm from Neon:', error);
        res.status(500).json({ success: false, error: 'Failed to delete rhythm' });
      }
    }
  );
}
