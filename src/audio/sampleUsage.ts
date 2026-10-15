/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Helper to check whether an audio sample is currently in use in any rhythm in the library.
 * Samples used in any rhythm are protected from deletion.
 */

import { SongProject } from '../types/rhythm';

export interface SampleUsageInfo {
  used: boolean;
  rhythmNames: string[];
}

/**
 * Checks if a sample ID or sample name is referenced by any track in any rhythm project.
 */
export function isSampleUsedInRhythms(
  sampleId: string,
  sampleName: string,
  rhythms: SongProject[] = []
): SampleUsageInfo {
  const rhythmNames: string[] = [];
  const cleanSampleName = (sampleName || '').trim().toLowerCase();
  const cleanId = (sampleId || '').trim().toLowerCase();

  for (const r of rhythms) {
    if (!r || !r.tracks || !Array.isArray(r.tracks)) continue;

    const trackUsesSample = r.tracks.some((t) => {
      if (!t) return false;
      // 1. Direct custom sample ID match
      if (t.customSampleId && t.customSampleId.toLowerCase() === cleanId) {
        return true;
      }
      
      // 2. Direct custom sample name match
      if (t.customSampleName && t.customSampleName.toLowerCase() === cleanSampleName) {
        return true;
      }

      // 3. Match soundType or track name when custom
      if (t.soundType === 'custom' || t.category === 'custom') {
        const tName = (t.name || '').toLowerCase();
        if (tName === cleanSampleName || tName === cleanId) return true;
        const stemA = cleanSampleName.replace(/\.[^/.]+$/, '');
        const stemB = tName.replace(/\.[^/.]+$/, '');
        if (stemA && stemB && stemA === stemB) return true;
      }

      return false;
    });

    if (trackUsesSample) {
      const rName = r.name || 'Ritmo sem título';
      if (!rhythmNames.includes(rName)) {
        rhythmNames.push(rName);
      }
    }
  }

  return {
    used: rhythmNames.length > 0,
    rhythmNames,
  };
}
