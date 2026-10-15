import { PrismaClient } from '@prisma/client';
import { UTApi, UTFile } from 'uploadthing/server';

export const MAX_SAMPLE_BYTES = 32 * 1024 * 1024;
export const VERCEL_MAX_SAMPLE_BYTES = 3 * 1024 * 1024;

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export class SampleDbError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 409 | 413 | 502 | 503
  ) {
    super(message);
    this.name = 'SampleDbError';
  }
}

type SampleUploadBody = {
  title?: unknown;
  filename?: unknown;
  mimeType?: unknown;
  duration?: unknown;
  base64Data?: unknown;
  localSampleId?: unknown;
};

export async function listCloudSamples(prisma: PrismaClient) {
  return prisma.sample.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function createCloudSample(
  prisma: PrismaClient,
  value: unknown,
  maxSampleBytes = MAX_SAMPLE_BYTES
) {
  const body = (value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}) as SampleUploadBody;
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
    base64Data.length > Math.ceil(maxSampleBytes / 3) * 4
  ) {
    throw new SampleDbError('Invalid audio sample data', 400);
  }

  if (!BASE64_PATTERN.test(base64Data)) {
    throw new SampleDbError('Invalid audio encoding', 400);
  }

  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length === 0 || buffer.length > maxSampleBytes) {
    throw new SampleDbError(
      `Audio sample exceeds the ${Math.floor(maxSampleBytes / 1024 / 1024)} MiB limit`,
      413
    );
  }

  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new SampleDbError('Sample uploads are not configured', 503);
  }

  const uploadthing = new UTApi({ token });
  let uploadedKey: string | undefined;

  try {
    const uploaded = await uploadthing.uploadFiles(
      new UTFile([buffer], filename, { type: mimeType })
    );

    if (uploaded.error || !uploaded.data) {
      console.error('UploadThing rejected sample upload:', uploaded.error);
      throw new SampleDbError('Failed to upload sample file', 502);
    }
    uploadedKey = uploaded.data.key;

    try {
      return await prisma.sample.create({
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
    } catch (error) {
      console.error('Failed to save uploaded sample metadata:', error);
      throw new SampleDbError('Failed to save sample metadata', 502);
    }
  } catch (error) {
    if (uploadedKey) {
      try {
        const cleanup = await uploadthing.deleteFiles(uploadedKey);
        if (!cleanup.success) {
          console.error('Failed to remove unreferenced UploadThing sample:', uploadedKey);
        }
      } catch (cleanupError) {
        console.error('Failed to clean up unreferenced UploadThing sample:', cleanupError);
      }
    }
    if (error instanceof SampleDbError) throw error;
    console.error('Failed to upload sample:', error);
    throw new SampleDbError('Failed to upload sample file', 502);
  }
}

export async function deleteCloudSample(
  prisma: PrismaClient,
  localSampleId: string,
  filename?: string
) {
  let sample = await prisma.sample.findUnique({ where: { localSampleId } });

  if (!sample && filename) {
    const legacyMatches = await prisma.sample.findMany({
      where: { localSampleId: null, filename },
      take: 2,
    });
    if (legacyMatches.length > 1) {
      throw new SampleDbError(
        'Multiple legacy cloud samples share this filename; refusing ambiguous deletion',
        409
      );
    }
    sample = legacyMatches[0] ?? null;
  }

  if (!sample) return false;

  const token = process.env.UPLOADTHING_TOKEN;
  if (!token) {
    throw new SampleDbError('Sample uploads are not configured', 503);
  }

  const uploadthing = new UTApi({ token });
  const remoteDelete = await uploadthing.deleteFiles(sample.fileKey);
  if (!remoteDelete.success) {
    console.error('UploadThing did not delete sample file:', sample.fileKey);
    throw new SampleDbError('Failed to delete sample file from cloud storage', 502);
  }

  await prisma.sample.delete({ where: { id: sample.id } });
  return true;
}
