/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Persistent audio sample storage with IndexedDB local caching + Cloud Server synchronization.
 * Retains custom audio files and mic recordings across all devices (PC, mobile, tablet).
 */

import { BUILT_IN_SAMPLES } from '../presets/defaultSamples';

const DB_NAME = 'beatbuddy_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_samples';

export interface StoredSampleRecord {
  id: string;
  name: string;
  blob: Blob;
  mimeType: string;
  createdAt: number;
  remoteUpdatedAt?: string;
  folder?: string;
  subFolder?: string;
}

/**
 * Checks if a response from fetch is HTML (e.g. Vercel SPA 404 rewrite returning index.html)
 */
export function isHtmlResponse(resp: Response): boolean {
  const cType = (resp.headers.get('content-type') || '').toLowerCase();
  return cType.includes('text/html');
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function saveSampleToStorage(
  id: string,
  name: string,
  blob: Blob
): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record: StoredSampleRecord = {
        id,
        name,
        blob,
        mimeType: blob.type || 'audio/wav',
        createdAt: Date.now(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Also sync to local app folder (public/samples/) immediately
    try {
      await syncSampleToServer(id, name, blob);
    } catch (err) {
      console.warn('Sync of sample to server fallback (offline mode):', err);
    }
  } catch (err) {
    console.error('Failed to save sample to IndexedDB:', err);
  }
}

export async function getAllStoredSamples(): Promise<StoredSampleRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to load samples from IndexedDB:', err);
    return [];
  }
}

export function getDeletedSamplesList(): string[] {
  try {
    const raw = localStorage.getItem('beatbuddy_deleted_samples');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function addDeletedSample(idOrName: string) {
  if (!idOrName) return;
  try {
    const list = getDeletedSamplesList();
    if (!list.includes(idOrName)) {
      list.push(idOrName);
      localStorage.setItem('beatbuddy_deleted_samples', JSON.stringify(list));
    }
  } catch {}
}

export async function deleteSampleFromStorage(id: string, name?: string): Promise<void> {
  addDeletedSample(id);
  if (name) addDeletedSample(name);

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    // Also remove from local saved sample order
    try {
      const orderStr = localStorage.getItem('beatbuddy_sample_order');
      if (orderStr) {
        const order: string[] = JSON.parse(orderStr);
        const filtered = order.filter((sId) => sId !== id);
        localStorage.setItem('beatbuddy_sample_order', JSON.stringify(filtered));
      }
    } catch {}

    // Also delete from server (which deletes from disk and removes from samples_index.json & public/samples/index.json)
    try {
      await fetch(`/api/samples/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (name && name !== id) {
        await fetch(`/api/samples/${encodeURIComponent(name)}`, { method: 'DELETE' });
      }
    } catch (e) {
      console.warn('Failed to delete sample on server:', e);
    }
  } catch (err) {
    console.error('Failed to delete sample from IndexedDB:', err);
  }
}

export async function updateSampleFolderInStorage(
  id: string,
  folder?: string,
  subFolder?: string
): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as StoredSampleRecord | undefined;
        if (record) {
          record.folder = folder;
          record.subFolder = subFolder;
          const putReq = store.put(record);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });

    // Also notify server
    fetch(`/api/samples/${encodeURIComponent(id)}/folder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, subFolder }),
    }).catch((e) => {
      console.warn('Failed to update sample folder on server:', e);
    });
  } catch (err) {
    console.error('Failed to update sample folder in IndexedDB:', err);
  }
}

export async function renameSampleInStorage(id: string, newName: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as StoredSampleRecord | undefined;
        if (record) {
          record.name = newName;
          const putReq = store.put(record);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });

    // Also rename on server
    fetch(`/api/samples/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    }).catch((e) => {
      console.warn('Failed to rename sample on server:', e);
    });
  } catch (err) {
    console.error('Failed to rename sample in IndexedDB:', err);
  }
}

// ================= CLOUD SYNC HELPERS ================= //

export async function syncSampleToServer(
  id: string,
  name: string,
  blob: Blob,
  folder?: string,
  subFolder?: string
): Promise<boolean> {
  try {
    const base64Data = await blobToBase64(blob);
    const resp = await fetch('/api/samples', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name,
        mimeType: blob.type || 'audio/wav',
        base64Data,
        folder,
        subFolder,
      }),
    });
    return resp.ok;
  } catch (err) {
    console.warn('Error syncing sample to server:', err);
    return false;
  }
}

export interface RemoteSampleMeta {
  id: string;
  name: string;
  mimeType: string;
  fileName: string;
  size: number;
  createdAt: number;
  fileUrl?: string;
  updatedAt?: string;
  folder?: string;
  subFolder?: string;
}

/**
 * Downloads missing samples from server into local IndexedDB
 */
export async function syncSamplesFromServer(): Promise<number> {
  try {
    let serverSamples: RemoteSampleMeta[] = [];

    // 1. Try server API if available (only if returning JSON and not HTML SPA rewrite)
    try {
      const resp = await fetch('/api/samples');
      if (resp.ok && !isHtmlResponse(resp)) {
        const json = await resp.json();
        if (Array.isArray(json.samples) && json.samples.length > 0) {
          serverSamples = json.samples;
        }
      }
    } catch {}

    // UploadThing-backed samples are listed separately from legacy local files.
    try {
      const resp = await fetch('/api/samples/db');
      if (resp.ok && !isHtmlResponse(resp)) {
        const json = await resp.json() as {
          samples?: Array<{
            id: string;
            localSampleId?: string | null;
            title?: string | null;
            filename: string;
            fileUrl: string;
            mimeType?: string | null;
            createdAt: string;
            updatedAt: string;
          }>;
        };
        const cloudSamples = (json.samples || []).map((sample) => ({
          id: sample.localSampleId || sample.id,
          name: sample.title || sample.filename,
          fileName: sample.filename,
          mimeType: sample.mimeType || 'audio/wav',
          size: 0,
          createdAt: Date.parse(sample.createdAt) || Date.now(),
          fileUrl: sample.fileUrl,
          updatedAt: sample.updatedAt,
        }));
        const byId = new Map(serverSamples.map((sample) => [sample.id, sample]));
        for (const sample of cloudSamples) byId.set(sample.id, sample);
        serverSamples = [...byId.values()];
      }
    } catch (error) {
      console.warn('Could not load UploadThing sample catalog:', error);
    }

    // 2. Fallback to static public/samples/index.json (Vercel / static host)
    if (serverSamples.length === 0) {
      try {
        const staticResp = await fetch('/samples/index.json');
        if (staticResp.ok && !isHtmlResponse(staticResp)) {
          const list = await staticResp.json();
          const parsed = Array.isArray(list) ? list : (list.samples || []);
          if (parsed.length > 0) {
            serverSamples = parsed;
          }
        }
      } catch {}
    }

    // 3. Filter out any samples that were explicitly deleted by the user
    const deletedList = getDeletedSamplesList();
    const deletedSet = new Set(deletedList.map((d) => d.toLowerCase()));

    // Filter server samples against deleted set
    serverSamples = serverSamples.filter(
      (s) =>
        !deletedSet.has(s.id.toLowerCase()) &&
        !deletedSet.has(s.name.toLowerCase()) &&
        !deletedSet.has((s.fileName || '').toLowerCase())
    );

    // Only inject built-in catalog if there are NO server samples AND no deleted samples (fresh install)
    if (serverSamples.length === 0 && deletedSet.size === 0) {
      for (const b of BUILT_IN_SAMPLES) {
        serverSamples.push({
          id: b.id,
          name: b.name,
          fileName: b.fileName,
          mimeType: b.mimeType,
          size: b.size,
          createdAt: 1791929936800,
        });
      }
    }

    if (serverSamples.length === 0) return 0;

    const localSamples = await getAllStoredSamples();

    // Purge any local samples that have been marked as deleted
    for (const local of localSamples) {
      if (
        deletedSet.has(local.id.toLowerCase()) ||
        deletedSet.has(local.name.toLowerCase())
      ) {
        deleteSampleFromStorage(local.id).catch(() => {});
      }
    }

    const localById = new Map(localSamples.map((sample) => [sample.id, sample]));
    let downloadedCount = 0;

    for (const remote of serverSamples) {
      const local = localById.get(remote.id);
      const needsDownload = !local ||
        (remote.updatedAt !== undefined && local.remoteUpdatedAt !== remote.updatedAt);
      if (needsDownload) {
        try {
          let audioBlob: Blob | null = null;
          // Prefer the durable UploadThing URL, then try legacy static/server paths.
          const candidateUrls = [
            remote.fileUrl || null,
            remote.fileName ? `/samples/${encodeURIComponent(remote.fileName)}` : null,
            `/samples/${encodeURIComponent(remote.id)}.wav`,
            remote.name ? `/samples/${encodeURIComponent(remote.name)}` : null,
            `/api/samples/${encodeURIComponent(remote.id)}/audio`,
          ].filter(Boolean) as string[];

          for (const url of candidateUrls) {
            try {
              const r = await fetch(url);
              // Crucial for Vercel: make sure it is not the SPA HTML fallback!
              if (r.ok && !isHtmlResponse(r)) {
                audioBlob = await r.blob();
                break;
              }
            } catch {}
          }

          if (audioBlob) {
            const db = await openDatabase();
            await new Promise<void>((res, rej) => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const record: StoredSampleRecord = {
                id: remote.id,
                name: remote.name,
                blob: audioBlob!,
                mimeType: remote.mimeType || 'audio/wav',
                createdAt: remote.createdAt || Date.now(),
                remoteUpdatedAt: remote.updatedAt,
              };
              const req = store.put(record);
              req.onsuccess = () => res();
              req.onerror = () => rej(req.error);
            });
            downloadedCount++;
          }
        } catch (e) {
          console.warn(`Failed to fetch audio for sample ${remote.name}:`, e);
        }
      }
    }

    // Sync local custom samples to server API only if not in deletedSet and server API is live
    try {
      const isVercel = window.location.hostname.includes('vercel.app');
      if (!isVercel) {
        const remoteIds = new Set(serverSamples.map((s) => s.id));
        for (const local of localSamples) {
          if (
            !remoteIds.has(local.id) &&
            !deletedSet.has(local.id.toLowerCase()) &&
            !deletedSet.has(local.name.toLowerCase())
          ) {
            syncSampleToServer(local.id, local.name, local.blob).catch(() => {});
          }
        }
      }
    } catch {}

    return downloadedCount;
  } catch (err) {
    console.warn('Error syncing samples from server:', err);
    return 0;
  }
}

export async function fetchRhythmsFromServer(): Promise<unknown[] | null> {
  try {
    const resp = await fetch('/api/rhythms');
    if (resp.ok && !isHtmlResponse(resp)) {
      const data = await resp.json();
      if (Array.isArray(data.rhythms)) {
        return data.rhythms;
      }
      console.warn('Rhythm API returned an invalid response shape.');
    } else if (!isHtmlResponse(resp) && resp.status !== 404) {
      console.warn(`Rhythm API request failed (${resp.status}); trying static backup.`);
    }
  } catch (error) {
    console.warn('Rhythm API is unavailable; trying static backup:', error);
  }

  // Fallback to static public/rhythms.json (works on Vercel)
  try {
    const staticResp = await fetch('/rhythms.json');
    if (staticResp.ok && !isHtmlResponse(staticResp)) {
      const list = await staticResp.json();
      if (Array.isArray(list)) {
        return list;
      }
    }
  } catch (err) {
    console.warn('Failed to load rhythms from static backup:', err);
  }
  return null;
}

export async function deleteRhythmFromServer(rhythmId: string): Promise<boolean> {
  try {
    const resp = await fetch(`/api/rhythms/${encodeURIComponent(rhythmId)}`, {
      method: 'DELETE',
    });
    if (!resp.ok || isHtmlResponse(resp)) {
      console.warn(`Failed to delete rhythm from shared library (${resp.status}).`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to delete rhythm from server:', err);
    return false;
  }
}

export async function saveRhythmsToServer(rhythms: unknown[]): Promise<boolean> {
  try {
    const resp = await fetch('/api/rhythms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rhythms }),
    });
    if (!resp.ok || isHtmlResponse(resp)) {
      console.warn(`Failed to save shared rhythms (${resp.status}).`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Failed to save rhythms to server:', err);
    return false;
  }
}

export async function fetchActiveRhythmFromServer(): Promise<string | null> {
  try {
    const res = await fetch('/api/active_rhythm');
    if (res.ok && !isHtmlResponse(res)) {
      const data = await res.json();
      if (data.rhythmId) return data.rhythmId;
    }
  } catch {}

  try {
    const staticRes = await fetch('/active_rhythm.json');
    if (staticRes.ok && !isHtmlResponse(staticRes)) {
      const data = await staticRes.json();
      if (data.rhythmId) return data.rhythmId;
    }
  } catch (e) {
    console.warn('Failed to fetch active rhythm:', e);
  }
  return null;
}

export async function saveActiveRhythmToServer(rhythmId: string): Promise<void> {
  try {
    await fetch('/api/active_rhythm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rhythmId }),
    });
  } catch (e) {
    console.warn('Failed to save active rhythm to server:', e);
  }
}

/**
 * Exports entire user library (Rhythms + Audio Samples in Base64) as a portable JSON file.
 * Enables 1-click transfer between PC and Mobile even without login.
 */
export async function exportFullLibraryBackup(): Promise<void> {
  const localRhythmsStr = localStorage.getItem('beatbuddy_rhythms');
  const rhythms = localRhythmsStr ? JSON.parse(localRhythmsStr) : [];
  const storedSamples = await getAllStoredSamples();

  const samplesWithAudio = await Promise.all(
    storedSamples.map(async (s) => ({
      id: s.id,
      name: s.name,
      mimeType: s.mimeType,
      audioBase64: await blobToBase64(s.blob),
    }))
  );

  const backupData = {
    app: 'BeatBuddy Studio',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    rhythms,
    samples: samplesWithAudio,
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `beatbuddy_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports a previously exported full library backup
 */
export async function importFullLibraryBackup(file: File): Promise<{
  rhythmsCount: number;
  samplesCount: number;
}> {
  const text = await file.text();
  const data = JSON.parse(text);

  let rhythmsCount = 0;
  let samplesCount = 0;

  if (Array.isArray(data.rhythms) && data.rhythms.length > 0) {
    const existingStr = localStorage.getItem('beatbuddy_rhythms');
    const existing: Array<{ id: string }> = existingStr ? JSON.parse(existingStr) : [];
    const map = new Map<string, unknown>();
    existing.forEach((r) => map.set(r.id, r));
    data.rhythms.forEach((r: { id: string }) => map.set(r.id, r));
    const merged = Array.from(map.values());
    localStorage.setItem('beatbuddy_rhythms', JSON.stringify(merged));
    rhythmsCount = data.rhythms.length;
  }

  if (Array.isArray(data.samples) && data.samples.length > 0) {
    for (const s of data.samples) {
      if (s.id && s.name && s.audioBase64) {
        const blob = localBase64ToBlob(s.audioBase64, s.mimeType || 'audio/wav');
        await saveSampleToStorage(s.id, s.name, blob);
        samplesCount++;
      }
    }
  }

  return { rhythmsCount, samplesCount };
}

function localBase64ToBlob(base64: string, mimeType: string = 'audio/wav'): Blob {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteChars = atob(cleanBase64);
  const byteArrays: Uint8Array[] = [];
  const sliceSize = 512;
  for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
    const slice = byteChars.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays as BlobPart[], { type: mimeType });
}
