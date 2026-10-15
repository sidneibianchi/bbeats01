import { PrismaClient } from '@prisma/client';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createCloudSample,
  listCloudSamples,
  SampleDbError,
  VERCEL_MAX_SAMPLE_BYTES,
} from '../../src/lib/sampleDb.js';

type VercelRequest = IncomingMessage & {
  body?: unknown;
};

const prisma = new PrismaClient();

function sendJson(res: ServerResponse, statusCode: number, value: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(value));
}

async function getRequestBody(req: VercelRequest): Promise<unknown> {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body;
  }

  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.length;
    if (byteLength > 4 * 1024 * 1024) {
      throw new SampleDbError('Request body exceeds the Vercel upload limit', 413);
    }
    chunks.push(buffer);
  }
  if (byteLength === 0) return null;
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export default async function handler(req: VercelRequest, res: ServerResponse) {
  if (req.method === 'GET') {
    try {
      const samples = await listCloudSamples(prisma);
      sendJson(res, 200, { success: true, samples });
    } catch (error) {
      console.error('Failed to list samples from Neon:', error);
      sendJson(res, 500, { success: false, error: 'Failed to list samples' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const sample = await createCloudSample(prisma, body, VERCEL_MAX_SAMPLE_BYTES);
      sendJson(res, 201, { success: true, sample });
    } catch (error) {
      if (error instanceof SampleDbError) {
        sendJson(res, error.statusCode, { success: false, error: error.message });
        return;
      }
      if (error instanceof SyntaxError) {
        sendJson(res, 400, { success: false, error: 'Request body must be valid JSON' });
        return;
      }
      console.error('Failed to create cloud sample:', error);
      sendJson(res, 500, { success: false, error: 'Failed to save sample' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  sendJson(res, 405, { success: false, error: 'Method not allowed' });
}
