import { Prisma, PrismaClient } from '@prisma/client';

export const MAX_RHYTHMS_PER_REQUEST = 500;
export const MAX_RHYTHM_BYTES = 1024 * 1024;

export type RhythmRecord = Record<string, unknown> & {
  id: string;
  name: string;
};

export class RhythmValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode: 400 | 413
  ) {
    super(message);
    this.name = 'RhythmValidationError';
  }
}

function isRhythmRecord(value: unknown): value is RhythmRecord {
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

export function validateRhythmBatch(value: unknown): RhythmRecord[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_RHYTHMS_PER_REQUEST ||
    !value.every(isRhythmRecord)
  ) {
    throw new RhythmValidationError(
      `Expected 1-${MAX_RHYTHMS_PER_REQUEST} valid rhythms`,
      400
    );
  }

  const rhythms = value as RhythmRecord[];
  const ids = rhythms.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) {
    throw new RhythmValidationError('Rhythm IDs must be unique', 400);
  }

  for (const rhythm of rhythms) {
    const serialized = JSON.stringify(rhythm);
    if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_RHYTHM_BYTES) {
      throw new RhythmValidationError('A rhythm exceeds the 1 MiB limit', 413);
    }
  }

  return rhythms;
}

export async function listSharedRhythms(prisma: PrismaClient) {
  const rhythms = await prisma.rhythm.findMany({
    orderBy: { createdAt: 'asc' },
    select: { data: true },
  });
  return rhythms.map(({ data }) => data);
}

export async function saveSharedRhythms(prisma: PrismaClient, value: unknown) {
  const rhythms = validateRhythmBatch(value);
  const writes: Prisma.PrismaPromise<unknown>[] = rhythms.map((rhythm) => {
    const data = JSON.parse(JSON.stringify(rhythm)) as Prisma.InputJsonValue;
    return prisma.rhythm.upsert({
      where: { id: rhythm.id },
      create: { id: rhythm.id, data },
      update: { data },
    });
  });

  await prisma.$transaction(writes);
  return rhythms.length;
}

export async function deleteSharedRhythm(prisma: PrismaClient, id: string) {
  const result = await prisma.rhythm.deleteMany({ where: { id } });
  return result.count > 0;
}
