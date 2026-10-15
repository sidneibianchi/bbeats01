import { PrismaClient } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { deleteCloudSample, SampleDbError } from '../../../src/lib/sampleDb.js';

type VercelRequest = IncomingMessage & {
  url?: string;
  body?: unknown;
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
    const encodedId = pathname.slice('/api/samples/db/'.length);
    const localSampleId = decodeURIComponent(encodedId);
    if (!localSampleId || localSampleId.includes('/')) {
      sendJson(res, 400, { success: false, error: 'Invalid sample ID' });
      return;
    }

    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body)
        ? (req.body as Record<string, unknown>)
        : {};
    const filename = typeof body.filename === 'string' ? body.filename.trim() : '';
    const deleted = await deleteCloudSample(prisma, localSampleId, filename || undefined);
    sendJson(res, 200, { success: true, deleted });
  } catch (error) {
    if (error instanceof SampleDbError) {
      sendJson(res, error.statusCode, { success: false, error: error.message });
      return;
    }
    console.error('Failed to delete cloud sample:', error);
    sendJson(res, 500, { success: false, error: 'Failed to delete cloud sample' });
  }
}
