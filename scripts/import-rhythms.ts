import { Prisma, PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const prisma = new PrismaClient();

async function readRhythmsFile(filePathArgument?: string) {
  if (!filePathArgument) {
    throw new Error(
      'Specify the JSON file to import, for example: npm run db:import-rhythms -- ./my-rhythms.json'
    );
  }

  const filePath = path.resolve(filePathArgument);
  const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(`${filePath} must contain a JSON array`);
  return parsed;
}

async function importRhythms() {
  const records = await readRhythmsFile(process.argv[2]);
  if (records.length === 0) throw new Error('The rhythms JSON file is empty');

  const unique = new Map<string, Prisma.InputJsonValue>();
  for (const record of records) {
    if (
      !record ||
      typeof record !== 'object' ||
      Array.isArray(record) ||
      !('id' in record) ||
      typeof record.id !== 'string' ||
      !record.id.trim() ||
      !('name' in record) ||
      typeof record.name !== 'string' ||
      !record.name.trim()
    ) {
      throw new Error('Every rhythm must have a non-empty string id and name');
    }

    const data = JSON.parse(JSON.stringify(record)) as Prisma.InputJsonValue;
    unique.set(record.id, data);
  }

  await prisma.$transaction(
    Array.from(unique, ([id, data]) =>
      prisma.rhythm.upsert({
        where: { id },
        create: { id, data },
        update: { data },
      })
    )
  );

  console.log(`Imported or updated ${unique.size} rhythms in Neon.`);
}

importRhythms()
  .catch((error: unknown) => {
    console.error('Failed to import rhythms:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
