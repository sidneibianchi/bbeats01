/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Drum Kit Persistence & Management Service.
 * Allows creating, editing, and saving custom drum kits in local browser memory.
 */

import { DrumKitDefinition } from '../types/kit';
import { TrackDefinition } from '../types/rhythm';

const USER_KITS_STORAGE_KEY = 'beatbuddy_user_drum_kits_v1';

export const FACTORY_DRUM_KITS: DrumKitDefinition[] = [
  {
    id: 'kit_factory_samba_real',
    name: '🥁 Kit Samba & Pagode Pro (Samples Reais)',
    description: 'Surdo Grave, Pandeiro Grave, Pandeiro Tapa, Tamborim e Ganzá gravados em estúdio.',
    category: 'brazilian',
    isUserCreated: false,
    createdAt: 1700000000000,
    tracks: [
      {
        id: 'k_surdo',
        name: 'Surdo (Grave Marcação)',
        category: 'brazilian',
        soundType: 'custom',
        customSampleId: 'sample_1791929472468_l6qxe',
        customSampleName: 'GRAVE SD.wav',
        color: '#ef4444',
        volume: 0.95,
        pan: 0,
        tune: 0,
        decay: 1.1,
        tone: 0.7,
        muted: false,
        solo: false,
      },
      {
        id: 'k_pandeiro_grave',
        name: 'Pandeiro Grave',
        category: 'brazilian',
        soundType: 'custom',
        customSampleId: 'sample_1791928977387_ssxqu',
        customSampleName: 'pandeiro grave.wav',
        color: '#f97316',
        volume: 0.88,
        pan: -0.2,
        tune: 0,
        decay: 0.95,
        tone: 0.8,
        muted: false,
        solo: false,
      },
      {
        id: 'k_pandeiro_tapa',
        name: 'Pandeiro Tapa / Estalo',
        category: 'brazilian',
        soundType: 'custom',
        customSampleId: 'sample_1791928977720_5b722',
        customSampleName: 'pandeiro tapa.wav',
        color: '#f59e0b',
        volume: 0.85,
        pan: -0.15,
        tune: 1,
        decay: 0.9,
        tone: 0.85,
        muted: false,
        solo: false,
      },
      {
        id: 'k_tamborim',
        name: 'Tamborim Estalado',
        category: 'brazilian',
        soundType: 'custom',
        customSampleId: 'sample_1791929185450_q4cv7',
        customSampleName: 'tamborim grave.wav',
        color: '#eab308',
        volume: 0.85,
        pan: 0.25,
        tune: 2,
        decay: 0.75,
        tone: 0.9,
        muted: false,
        solo: false,
      },
      {
        id: 'k_ganza',
        name: 'Ganzá / Chocalho Suave',
        category: 'percussion',
        soundType: 'custom',
        customSampleId: 'sample_1791929097159_2w8rm',
        customSampleName: 'ganza.wav',
        color: '#8b5cf6',
        volume: 0.78,
        pan: -0.35,
        tune: 0,
        decay: 1.0,
        tone: 0.75,
        muted: false,
        solo: false,
      },
      {
        id: 'k_agogo',
        name: 'Agogô de Metal',
        category: 'brazilian',
        soundType: 'agogo_hi',
        color: '#10b981',
        volume: 0.8,
        pan: 0.35,
        tune: 0,
        decay: 1.0,
        tone: 0.85,
        muted: false,
        solo: false,
      },
    ],
  },
  {
    id: 'kit_factory_roda_pagode',
    name: '🎶 Kit Roda de Pagode & Partido Alto',
    description: 'Surdo 2, Pandeiro Grave, Ovinho Agudo, Tamborim e Prato de Ataque.',
    category: 'brazilian',
    isUserCreated: false,
    createdAt: 1700000000001,
    tracks: [
      {
        id: 'k_surdo2',
        name: 'Surdo Repique',
        category: 'brazilian',
        soundType: 'custom',
        customSampleId: 'sample_1791929483367_ii2ay',
        customSampleName: 'GRAVE 2 SD.wav',
        color: '#dc2626',
        volume: 0.95,
        pan: 0,
        tune: 1,
        decay: 1.0,
        tone: 0.75,
        muted: false,
        solo: false,
      },
      {
        id: 'k_pandeiro',
        name: 'Pandeiro Grave',
        category: 'brazilian',
        soundType: 'custom',
        customSampleId: 'sample_1791928977387_ssxqu',
        customSampleName: 'pandeiro grave.wav',
        color: '#ea580c',
        volume: 0.88,
        pan: -0.2,
        tune: 0,
        decay: 0.9,
        tone: 0.8,
        muted: false,
        solo: false,
      },
      {
        id: 'k_ovinho',
        name: 'Ovinho Agudo',
        category: 'percussion',
        soundType: 'custom',
        customSampleId: 'sample_1791929249766_4ddn2',
        customSampleName: 'ovinho agudo.wav',
        color: '#06b6d4',
        volume: 0.8,
        pan: 0.4,
        tune: 0,
        decay: 0.9,
        tone: 0.85,
        muted: false,
        solo: false,
      },
      {
        id: 'k_tamborim',
        name: 'Tamborim',
        category: 'brazilian',
        soundType: 'custom',
        customSampleId: 'sample_1791929185450_q4cv7',
        customSampleName: 'tamborim grave.wav',
        color: '#f59e0b',
        volume: 0.85,
        pan: 0.2,
        tune: 0,
        decay: 0.8,
        tone: 0.9,
        muted: false,
        solo: false,
      },
      {
        id: 'k_prato',
        name: 'Prato Splash / Crash',
        category: 'cymbals',
        soundType: 'crash',
        color: '#6366f1',
        volume: 0.85,
        pan: -0.3,
        tune: 2,
        decay: 1.3,
        tone: 0.9,
        muted: false,
        solo: false,
      },
    ],
  },
  {
    id: 'kit_factory_acoustic_punch',
    name: '💥 Kit Bateria Acústica Punch',
    description: 'Bumbo Punch profundo, Caixa estalada, Hi-Hats acústicos e Prato.',
    category: 'acoustic',
    isUserCreated: false,
    createdAt: 1700000000002,
    tracks: [
      {
        id: 'k_kick',
        name: 'Bumbo Acústico (Punch)',
        category: 'kick',
        soundType: 'custom',
        customSampleId: 'sample_1791929293573_w07zv',
        customSampleName: 'kickdrum9.wav',
        color: '#ef4444',
        volume: 0.98,
        pan: 0,
        tune: 0,
        decay: 1.1,
        tone: 0.85,
        muted: false,
        solo: false,
      },
      {
        id: 'k_snare',
        name: 'Caixa Acústica',
        category: 'snare',
        soundType: 'snare',
        color: '#3b82f6',
        volume: 0.9,
        pan: 0,
        tune: 2,
        decay: 0.9,
        tone: 0.85,
        muted: false,
        solo: false,
      },
      {
        id: 'k_hihat_closed',
        name: 'Chimbal Fechado',
        category: 'hihat',
        soundType: 'hihat_closed',
        color: '#10b981',
        volume: 0.8,
        pan: -0.25,
        tune: 1,
        decay: 0.7,
        tone: 0.85,
        muted: false,
        solo: false,
      },
      {
        id: 'k_hihat_open',
        name: 'Chimbal Aberto',
        category: 'hihat',
        soundType: 'hihat_open',
        color: '#14b8a6',
        volume: 0.8,
        pan: -0.25,
        tune: 1,
        decay: 1.2,
        tone: 0.9,
        muted: false,
        solo: false,
      },
      {
        id: 'k_crash',
        name: 'Prato Crash',
        category: 'cymbals',
        soundType: 'crash',
        color: '#eab308',
        volume: 0.85,
        pan: 0.35,
        tune: 0,
        decay: 1.5,
        tone: 0.9,
        muted: false,
        solo: false,
      },
    ],
  },
  {
    id: 'kit_factory_latino',
    name: '🌴 Kit Afro-Latino & Percussão Quente',
    description: 'Clave Son, Congas Aguda/Grave, Campana Cowbell e Ganzá.',
    category: 'latin',
    isUserCreated: false,
    createdAt: 1700000000003,
    tracks: [
      {
        id: 'k_clave',
        name: 'Clave Son',
        category: 'latin',
        soundType: 'clave',
        color: '#f59e0b',
        volume: 0.9,
        pan: 0,
        tune: 1,
        decay: 0.8,
        tone: 0.9,
        muted: false,
        solo: false,
      },
      {
        id: 'k_conga_hi',
        name: 'Conga Quinto (Aguda)',
        category: 'latin',
        soundType: 'conga_hi',
        color: '#ec4899',
        volume: 0.85,
        pan: -0.3,
        tune: 2,
        decay: 0.95,
        tone: 0.85,
        muted: false,
        solo: false,
      },
      {
        id: 'k_conga_lo',
        name: 'Tumba (Conga Grave)',
        category: 'latin',
        soundType: 'conga_lo',
        color: '#d946ef',
        volume: 0.9,
        pan: 0.3,
        tune: 0,
        decay: 1.1,
        tone: 0.8,
        muted: false,
        solo: false,
      },
      {
        id: 'k_cowbell',
        name: 'Campana / Cowbell',
        category: 'latin',
        soundType: 'cowbell',
        color: '#3b82f6',
        volume: 0.82,
        pan: 0.2,
        tune: 0,
        decay: 1.0,
        tone: 0.9,
        muted: false,
        solo: false,
      },
      {
        id: 'k_ganza_latino',
        name: 'Ganzá / Shaker',
        category: 'percussion',
        soundType: 'custom',
        customSampleId: 'sample_1791929097159_2w8rm',
        customSampleName: 'ganza.wav',
        color: '#06b6d4',
        volume: 0.78,
        pan: -0.3,
        tune: 0,
        decay: 0.9,
        tone: 0.8,
        muted: false,
        solo: false,
      },
    ],
  },
];

/**
 * Loads user custom kits from LocalStorage
 */
export function getUserDrumKits(): DrumKitDefinition[] {
  try {
    const raw = localStorage.getItem(USER_KITS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load user drum kits from localStorage', err);
    return [];
  }
}

/**
 * Saves a custom drum kit to LocalStorage
 */
export function saveUserDrumKit(kit: DrumKitDefinition): void {
  try {
    const existing = getUserDrumKits();
    const index = existing.findIndex((k) => k.id === kit.id);
    const updatedKit: DrumKitDefinition = {
      ...kit,
      isUserCreated: true,
      createdAt: kit.createdAt || Date.now(),
    };

    let nextKits: DrumKitDefinition[];
    if (index >= 0) {
      nextKits = [...existing];
      nextKits[index] = updatedKit;
    } else {
      nextKits = [updatedKit, ...existing];
    }
    localStorage.setItem(USER_KITS_STORAGE_KEY, JSON.stringify(nextKits));
  } catch (err) {
    console.error('Failed to save user drum kit to localStorage', err);
  }
}

/**
 * Deletes a user custom drum kit from LocalStorage
 */
export function deleteUserDrumKit(kitId: string): void {
  try {
    const existing = getUserDrumKits();
    const nextKits = existing.filter((k) => k.id !== kitId);
    localStorage.setItem(USER_KITS_STORAGE_KEY, JSON.stringify(nextKits));
  } catch (err) {
    console.error('Failed to delete user drum kit from localStorage', err);
  }
}

const KITS_ORDER_STORAGE_KEY = 'beatbuddy_kits_order_v1';

/**
 * Reorders drum kits list and persists preference
 */
export function reorderDrumKits(orderedIds: string[]): void {
  try {
    localStorage.setItem(KITS_ORDER_STORAGE_KEY, JSON.stringify(orderedIds));
  } catch (err) {
    console.error('Failed to save kits order to localStorage', err);
  }
}

/**
 * Returns all drum kits available (user kits + factory kits) sorted by custom preference
 */
export function getAllDrumKits(): DrumKitDefinition[] {
  const userKits = getUserDrumKits();
  const all = [...userKits, ...FACTORY_DRUM_KITS];

  try {
    const savedOrder = localStorage.getItem(KITS_ORDER_STORAGE_KEY);
    if (savedOrder) {
      const orderIds: string[] = JSON.parse(savedOrder);
      all.sort((a, b) => {
        const idxA = orderIds.indexOf(a.id);
        const idxB = orderIds.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }
  } catch {}

  return all;
}

/**
 * Exports kit definition as downloadable JSON string
 */
export function exportKitAsJson(kit: DrumKitDefinition): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(kit, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${kit.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_kit.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
