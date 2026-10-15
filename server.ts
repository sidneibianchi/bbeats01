import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { registerSampleDbRoutes } from './src/routes/samplesDb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Increase payload limit for audio files (base64 samples)
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Register DB routes after body parsers
registerSampleDbRoutes(app);

// Data storage paths
const DATA_DIR = path.resolve(__dirname, 'data');
const SAMPLES_DIR = path.resolve(DATA_DIR, 'samples');
const RHYTHMS_FILE = path.resolve(DATA_DIR, 'rhythms.json');
const SAMPLES_INDEX_FILE = path.resolve(DATA_DIR, 'samples_index.json');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(SAMPLES_DIR)) {
  fs.mkdirSync(SAMPLES_DIR, { recursive: true });
}

interface StoredSampleMeta {
  id: string;
  name: string;
  mimeType: string;
  fileName: string;
  size: number;
  createdAt: number;
  folder?: string;
  subFolder?: string;
}

const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PUBLIC_RHYTHMS_FILE = path.resolve(PUBLIC_DIR, 'rhythms.json');
const PUBLIC_SAMPLES_INDEX_FILE = path.resolve(PUBLIC_DIR, 'samples/index.json');
const PUBLIC_ACTIVE_RHYTHM_FILE = path.resolve(PUBLIC_DIR, 'active_rhythm.json');

function loadRhythms(): unknown[] {
  try {
    if (fs.existsSync(RHYTHMS_FILE)) {
      const data = fs.readFileSync(RHYTHMS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading rhythms.json:', err);
  }
  try {
    if (fs.existsSync(PUBLIC_RHYTHMS_FILE)) {
      const data = fs.readFileSync(PUBLIC_RHYTHMS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading public/rhythms.json:', err);
  }
  return [];
}

function saveRhythms(rhythms: unknown[]) {
  try {
    const jsonStr = JSON.stringify(rhythms, null, 2);
    fs.writeFileSync(RHYTHMS_FILE, jsonStr, 'utf-8');
    if (!fs.existsSync(PUBLIC_DIR)) {
      fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }
    fs.writeFileSync(PUBLIC_RHYTHMS_FILE, jsonStr, 'utf-8');
  } catch (err) {
    console.error('Error saving rhythms.json:', err);
  }
}

function loadSamplesMeta(): StoredSampleMeta[] {
  try {
    if (fs.existsSync(SAMPLES_INDEX_FILE)) {
      const data = fs.readFileSync(SAMPLES_INDEX_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading samples_index.json:', err);
  }
  try {
    if (fs.existsSync(PUBLIC_SAMPLES_INDEX_FILE)) {
      const data = fs.readFileSync(PUBLIC_SAMPLES_INDEX_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading public samples index:', err);
  }
  return [];
}

function saveSamplesMeta(metaList: StoredSampleMeta[]) {
  try {
    const jsonStr = JSON.stringify(metaList, null, 2);
    fs.writeFileSync(SAMPLES_INDEX_FILE, jsonStr, 'utf-8');
    const pubSamplesDir = path.resolve(PUBLIC_DIR, 'samples');
    if (!fs.existsSync(pubSamplesDir)) {
      fs.mkdirSync(pubSamplesDir, { recursive: true });
    }
    fs.writeFileSync(PUBLIC_SAMPLES_INDEX_FILE, jsonStr, 'utf-8');
  } catch (err) {
    console.error('Error saving samples_index.json:', err);
  }
}

// ================= API ENDPOINTS ================= //

// 1. Get all synced rhythms
app.get('/api/rhythms', (_req: Request, res: Response) => {
  const list = loadRhythms();
  res.json({ success: true, rhythms: list });
});

// 2. Save all synced rhythms (called whenever a rhythm is created, modified or deleted)
app.post('/api/rhythms', (req: Request, res: Response) => {
  const { rhythms } = req.body;
  if (!Array.isArray(rhythms)) {
    res.status(400).json({ success: false, error: 'Expected rhythms array' });
    return;
  }
  saveRhythms(rhythms);
  res.json({ success: true, count: rhythms.length });
});

// 2.1 Delete a specific rhythm by ID
app.delete('/api/rhythms/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const list = loadRhythms() as Array<{ id: string }>;
  const filtered = list.filter((r) => r.id !== id);
  saveRhythms(filtered);

  // Update active rhythm if it was pointing to the deleted rhythm
  try {
    if (fs.existsSync(ACTIVE_RHYTHM_FILE)) {
      const activeData = JSON.parse(fs.readFileSync(ACTIVE_RHYTHM_FILE, 'utf-8'));
      if (activeData.rhythmId === id) {
        const nextId = filtered[0]?.id || null;
        const str = JSON.stringify({ rhythmId: nextId });
        fs.writeFileSync(ACTIVE_RHYTHM_FILE, str, 'utf-8');
        fs.writeFileSync(PUBLIC_ACTIVE_RHYTHM_FILE, str, 'utf-8');
      }
    }
  } catch (err) {
    console.error('Failed to update active rhythm after deletion:', err);
  }

  res.json({ success: true, count: filtered.length });
});

// 2.2 Get & Set active rhythm
const ACTIVE_RHYTHM_FILE = path.resolve(DATA_DIR, 'active_rhythm.json');
app.get('/api/active_rhythm', (_req: Request, res: Response) => {
  try {
    if (fs.existsSync(ACTIVE_RHYTHM_FILE)) {
      const data = JSON.parse(fs.readFileSync(ACTIVE_RHYTHM_FILE, 'utf-8'));
      if (data.rhythmId) {
        res.json({ success: true, rhythmId: data.rhythmId });
        return;
      }
    }
    if (fs.existsSync(PUBLIC_ACTIVE_RHYTHM_FILE)) {
      const data = JSON.parse(fs.readFileSync(PUBLIC_ACTIVE_RHYTHM_FILE, 'utf-8'));
      if (data.rhythmId) {
        res.json({ success: true, rhythmId: data.rhythmId });
        return;
      }
    }
  } catch (e) {
    console.error(e);
  }
  res.json({ success: true, rhythmId: null });
});

app.post('/api/active_rhythm', (req: Request, res: Response) => {
  try {
    const { rhythmId } = req.body;
    if (rhythmId) {
      const str = JSON.stringify({ rhythmId });
      fs.writeFileSync(ACTIVE_RHYTHM_FILE, str, 'utf-8');
      fs.writeFileSync(PUBLIC_ACTIVE_RHYTHM_FILE, str, 'utf-8');
    }
    res.json({ success: true, rhythmId });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to save active rhythm' });
  }
});

// 3. Get all synced samples list
app.get('/api/samples', (_req: Request, res: Response) => {
  const samples = loadSamplesMeta();
  res.json({ success: true, samples });
});

// Serve static samples directory directly
app.use('/samples', express.static(path.resolve(__dirname, 'public/samples')));
app.use('/samples', express.static(SAMPLES_DIR));

// 4. Download a sample's raw audio binary
app.get('/api/samples/:id/audio', (req: Request, res: Response) => {
  const { id } = req.params;
  const samples = loadSamplesMeta();
  const sample = samples.find((s) => s.id === id);

  // Check multiple possible paths
  const possiblePaths = [
    sample ? path.resolve(SAMPLES_DIR, sample.fileName) : null,
    sample ? path.resolve(__dirname, 'public/samples', sample.fileName) : null,
    path.resolve(SAMPLES_DIR, `${id}.wav`),
    path.resolve(__dirname, 'public/samples', `${id}.wav`),
    path.resolve(SAMPLES_DIR, `${id}.webm`),
    path.resolve(__dirname, 'public/samples', `${id}.webm`),
  ].filter(Boolean) as string[];

  let foundPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      foundPath = p;
      break;
    }
  }

  if (!foundPath && fs.existsSync(path.resolve(__dirname, 'public/samples'))) {
    const files = fs.readdirSync(path.resolve(__dirname, 'public/samples'));
    const match = files.find((f) => f.includes(id));
    if (match) {
      foundPath = path.resolve(__dirname, 'public/samples', match);
    }
  }

  if (!foundPath) {
    res.status(404).send('Audio file not found on disk');
    return;
  }

  res.setHeader('Content-Type', sample?.mimeType || 'audio/wav');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  fs.createReadStream(foundPath).pipe(res);
});

// 5. Upload a sample (Base64 data URL or pure Base64)
app.post('/api/samples', (req: Request, res: Response) => {
  try {
    const { id, name, mimeType, base64Data, folder, subFolder } = req.body;
    if (!id || !name || !base64Data) {
      res.status(400).json({ success: false, error: 'Missing id, name, or base64Data' });
      return;
    }

    // Clean data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    const safeExt = (mimeType && mimeType.includes('webm')) ? 'webm' : (mimeType && mimeType.includes('mp3')) ? 'mp3' : 'wav';
    const fileName = `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.${safeExt}`;
    const filePath = path.resolve(SAMPLES_DIR, fileName);

    fs.writeFileSync(filePath, buffer);

    // Also persist directly into public/samples directory for instant mobile access
    const pubSamplesDir = path.resolve(PUBLIC_DIR, 'samples');
    if (!fs.existsSync(pubSamplesDir)) {
      fs.mkdirSync(pubSamplesDir, { recursive: true });
    }
    const publicFilePath = path.resolve(pubSamplesDir, fileName);
    fs.writeFileSync(publicFilePath, buffer);

    const samples = loadSamplesMeta();
    const existingIdx = samples.findIndex((s) => s.id === id);
    const meta: StoredSampleMeta = {
      id,
      name,
      mimeType: mimeType || 'audio/wav',
      fileName,
      size: buffer.length,
      createdAt: Date.now(),
      folder: folder || (existingIdx >= 0 ? samples[existingIdx].folder : undefined),
      subFolder: subFolder || (existingIdx >= 0 ? samples[existingIdx].subFolder : undefined),
    };

    if (existingIdx >= 0) {
      samples[existingIdx] = meta;
    } else {
      samples.push(meta);
    }
    saveSamplesMeta(samples);

    // Unmark from deleted_samples if re-uploaded
    try {
      const deletedList = getDeletedSamples();
      const updated = deletedList.filter((d) => d !== id && d !== name && d !== fileName);
      if (updated.length !== deletedList.length) {
        fs.writeFileSync(DELETED_SAMPLES_FILE, JSON.stringify(updated, null, 2), 'utf-8');
      }
    } catch {}

    res.json({ success: true, sample: meta });
  } catch (err) {
    console.error('Error saving sample:', err);
    res.status(500).json({ success: false, error: 'Internal server error saving sample' });
  }
});

// 5.1 Update sample folder / sub-folder
app.put('/api/samples/:id/folder', (req: Request, res: Response) => {
  const { id } = req.params;
  const { folder, subFolder } = req.body;
  const samples = loadSamplesMeta();
  const sample = samples.find((s) => s.id === id);
  if (sample) {
    sample.folder = folder || undefined;
    sample.subFolder = subFolder || undefined;
    saveSamplesMeta(samples);
    res.json({ success: true, sample });
  } else {
    res.status(404).json({ success: false, error: 'Sample not found' });
  }
});

// Helper to recursively remove matching files from directory
function removeSampleFilesRecursive(dir: string, targets: string[]) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      removeSampleFilesRecursive(fullPath, targets);
    } else {
      const name = entry.name.toLowerCase();
      const shouldDelete = targets.some((t) => {
        if (!t) return false;
        const targetClean = t.toLowerCase();
        return (
          name === targetClean ||
          name.startsWith(`${targetClean}.`) ||
          name.includes(targetClean) ||
          targetClean.includes(name)
        );
      });
      if (shouldDelete) {
        try {
          fs.unlinkSync(fullPath);
          console.log(`[DELETE] Successfully removed sample file: ${fullPath}`);
        } catch (err) {
          console.error(`Failed to delete file ${fullPath}:`, err);
        }
      }
    }
  }
}

const DELETED_SAMPLES_FILE = path.resolve(DATA_DIR, 'deleted_samples.json');

function getDeletedSamples(): string[] {
  try {
    if (fs.existsSync(DELETED_SAMPLES_FILE)) {
      const data = JSON.parse(fs.readFileSync(DELETED_SAMPLES_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch {}
  return [];
}

function recordDeletedSample(ids: string[]) {
  try {
    const list = getDeletedSamples();
    for (const item of ids) {
      if (item && !list.includes(item)) {
        list.push(item);
      }
    }
    fs.writeFileSync(DELETED_SAMPLES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to update deleted_samples.json:', err);
  }
}

// 6. Delete a sample
app.delete('/api/samples/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const samples = loadSamplesMeta();
  const sample = samples.find((s) => s.id === id || s.name === id || s.fileName === id);
  const targetId = sample ? sample.id : id;
  const targetName = sample ? sample.name : id;
  const targetFileName = sample ? sample.fileName : '';

  const targets = [
    targetId,
    targetName,
    targetFileName,
    `${targetId}.wav`,
    `${targetId}.webm`,
    `${id}.wav`,
    id,
  ].filter(Boolean) as string[];

  // Physically remove from SAMPLES_DIR and PUBLIC_DIR/samples
  removeSampleFilesRecursive(SAMPLES_DIR, targets);
  removeSampleFilesRecursive(path.resolve(PUBLIC_DIR, 'samples'), targets);

  // Filter and save JSON metadata
  const filtered = samples.filter(
    (s) => s.id !== targetId && s.id !== id && s.name !== id && s.name !== targetName
  );
  saveSamplesMeta(filtered);

  // Permanently record in deleted_samples so it is never re-seeded
  recordDeletedSample([targetId, targetName, targetFileName]);

  res.json({ success: true, id: targetId });
});

// 6.1 Get list of permanently deleted samples
app.get('/api/deleted_samples', (_req: Request, res: Response) => {
  res.json({ success: true, deleted: getDeletedSamples() });
});

// 7. Rename a sample
app.put('/api/samples/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const samples = loadSamplesMeta();
  const sample = samples.find((s) => s.id === id);
  if (sample && name) {
    sample.name = name;
    saveSamplesMeta(samples);
    res.json({ success: true, sample });
  } else {
    res.status(404).json({ success: false, error: 'Sample not found' });
  }
});

// ================= VITE DEV OR STATIC SERVER ================= //

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');

  if (isProd && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`> BeatBuddy Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
