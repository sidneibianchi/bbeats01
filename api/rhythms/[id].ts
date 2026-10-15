import { PrismaClient } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { deleteSharedRhythm } from '../../src/lib/rhythmDb.js';

type VercelRequest = IncomingMessage & {
  url?: string;
};

const prisma = new PrismaClient();

function sendJson(res: ServerResponse, statusCode: number, value: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    sendJson(res, 405, { success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    const encodedId = pathname.slice('/api/rhythms/'.length);
    const id = decodeURIComponent(encodedId);
    if (!id || id.includes('/')) {
      sendJson(res, 400, { success: false, error: 'Invalid rhythm ID' });
      return;
    }

    const deleted = await deleteSharedRhythm(prisma, id);
    sendJson(res, 200, { success: true, deleted });
  } catch (error) {
    console.error('Failed to delete rhythm from Neon:', error);
    sendJson(res, 500, { success: false, error: 'Failed to delete rhythm' });
  }
}
