/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TimeSignature = '4/4' | '3/4' | '6/8' | '7/8' | '5/4' | '12/8';

export type SongPartId =
  | 'intro' // Intro
  | 'verse' // Parte A
  | 'part_b' // Parte B
  | 'part_c' // Parte C
  | 'prechorus' // Pré-refrão
  | 'chorus' // Refrão
  | 'bridge' // Ponte
  | 'fill1' // Fill 1
  | 'fill2' // Fill 2
  | 'fill3' // Fill 3
  | 'fill_a' // Fill A
  | 'fill_b' // Fill B
  | 'fill_c' // Fill C
  | 'transition' // Transição genérica
  | 'transition_a_b' // Transição A -> B
  | 'transition_b_a' // Transição B -> A
  | 'transition_b_c' // Transição B -> C
  | 'transition_c_b' // Transição C -> B
  | 'transition_c_a' // Transição C -> A
  | 'transition_a_c' // Transição A -> C
  | 'outro' // End
  | (string & {});

export function getPartBarCount(partId: SongPartId | string): number {
  return ['verse', 'part_a', 'part_b', 'part_c'].includes(partId) ? 2 : 1;
}

export function getSubdivisionsPerBeat(resolution: RhythmicResolution = '1/32'): number {
  switch (resolution) {
    case '1/4':
      return 1;
    case '1/8':
      return 2;
    case '1/8T':
      return 3;
    case '1/16':
      return 4;
    case '1/16T':
      return 6;
    case '1/32':
      return 8;
    case '1/64':
      return 16;
    default:
      return 8;
  }
}

export function getStepsPerBar(
  timeSignature: TimeSignature = '4/4',
  resolution: RhythmicResolution = '1/32'
): number {
  const subdivisionsPerBeat = getSubdivisionsPerBeat(resolution);
  if (timeSignature === '3/4') return 3 * subdivisionsPerBeat;
  if (timeSignature === '6/8') return Math.max(6, Math.round(6 * (subdivisionsPerBeat / 2)));
  if (timeSignature === '7/8') return Math.max(7, Math.round(7 * (subdivisionsPerBeat / 2)));
  if (timeSignature === '12/8') return Math.max(12, Math.round(12 * (subdivisionsPerBeat / 4)));
  if (timeSignature === '5/4') return 5 * subdivisionsPerBeat;
  return 4 * subdivisionsPerBeat;
}

export type InstrumentCategory =
  | 'kick'
  | 'snare'
  | 'hihat'
  | 'latin'
  | 'brazilian'
  | 'percussion'
  | 'cymbals'
  | 'custom';

export interface StepData {
  active: boolean;
  velocity: number; // 1-127 (accent: 120+, normal: 90, soft: 50)
  probability: number; // 0.0 - 1.0 (default 1.0)
  ratchet: number; // 1 (single), 2 (flam/double), 3 (triplet roll), 4 (quad roll)
  pitchOffset?: number; // -12 to +12 semitones
}

export interface TrackDefinition {
  id: string;
  name: string;
  category: InstrumentCategory;
  soundType: string;
  color: string;
  volume: number; // 0.0 to 1.0
  pan: number; // -1.0 to 1.0
  tune: number; // -12 to 12
  decay: number; // 0.1 to 3.0
  tone: number; // 0.0 to 1.0 (filter brightness)
  muted: boolean;
  solo: boolean;
  reverse?: boolean;
  customSampleName?: string;
  customSampleId?: string; // key in audio sample registry
}

export interface Track extends TrackDefinition {
  steps: StepData[];
  stepCount: number; // Allows polyrhythms / polymeter
}

export interface SongPartData {
  id: SongPartId;
  name: string;
  description: string;
  trackSteps: Record<string, StepData[]>; // trackId -> steps
  trackStepCounts?: Record<string, number>; // trackId -> custom length
}

export type RhythmicResolution = '1/4' | '1/8' | '1/8T' | '1/16' | '1/16T' | '1/32' | '1/64';

export interface SongProject {
  id: string;
  name: string;
  genre: string;
  bpm: number;
  timeSignature: TimeSignature;
  resolution?: RhythmicResolution;
  barsCount?: number;
  swing: number; // 0% to 50%
  humanize: number; // 0 to 100% micro-timing offset
  accentSound: string; // instrument sound for accent pedal
  tracks: TrackDefinition[];
  parts: Record<string, SongPartData>;
  defaultStepCount: number;
}

export type PlaybackStatus = 'stopped' | 'playing' | 'paused';
export type PedalStatus = 'idle' | 'main' | 'fill' | 'transition' | 'outro';
