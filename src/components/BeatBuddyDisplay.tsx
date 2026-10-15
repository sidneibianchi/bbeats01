/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SongPartId } from '../types/rhythm';

interface BeatBuddyDisplayProps {
  songName: string;
  partName: string;
  partId: SongPartId;
  basePartId?: SongPartId;
  selectedStartPart?: SongPartId;
  activeFillId?: SongPartId | null;
  activeTransitionId?: SongPartId | null;
  bpm: number;
  timeSignature: string;
  currentBeat: number; // 1, 2, 3, 4
  currentBar: number;
  subdivision: number; // 0, 1, 2, 3
  isPlaying: boolean;
  isFill: boolean;
  isTransition: boolean;
  isOutro: boolean;
  isIntro?: boolean;
}

export const BeatBuddyDisplay: React.FC<BeatBuddyDisplayProps> = ({
  songName,
  partName: _partName,
  partId,
  basePartId = 'verse',
  selectedStartPart = 'verse',
  activeFillId,
  activeTransitionId,
  bpm,
  timeSignature,
  currentBeat,
  currentBar,
  subdivision,
  isPlaying,
  isFill,
  isTransition,
  isOutro,
  isIntro,
}) => {
  // Screen mode background color matching hardware pedal
  let screenBg = 'bg-slate-900 border-slate-700';
  let statusBadgeText = 'PARADO • PARTE A PRONTA';
  let statusBadgeColor = 'text-cyan-400';
  let beatBarFillColor = 'bg-cyan-500';
  let currentActiveLabel = 'PARTE A';

  if (!isPlaying) {
    if (selectedStartPart === 'part_b' || partId === 'part_b') {
      screenBg = 'bg-blue-950/40 border-blue-600/60 shadow-[0_0_20px_rgba(59,130,246,0.15)]';
      statusBadgeText = 'PARADO • PARTE B SELECIONADA';
      statusBadgeColor = 'text-blue-400 font-bold';
      beatBarFillColor = 'bg-blue-500';
      currentActiveLabel = 'PARTE B (SELECIONADA)';
    } else {
      screenBg = 'bg-cyan-950/40 border-cyan-600/60 shadow-[0_0_20px_rgba(6,182,212,0.15)]';
      statusBadgeText = 'PARADO • PARTE A SELECIONADA';
      statusBadgeColor = 'text-cyan-400 font-bold';
      beatBarFillColor = 'bg-cyan-500';
      currentActiveLabel = 'PARTE A (SELECIONADA)';
    }
  } else {
    if (isOutro || partId === 'outro') {
      screenBg = 'bg-red-950/70 border-red-600/80 shadow-[0_0_25px_rgba(239,68,68,0.25)]';
      statusBadgeText = 'FINALIZANDO (END)';
      statusBadgeColor = 'text-red-400 font-extrabold animate-pulse';
      beatBarFillColor = 'bg-red-500';
      currentActiveLabel = 'END (FINALIZANDO)';
    } else if (isTransition || partId === 'transition_a_b' || partId === 'transition_b_a') {
      screenBg = 'bg-purple-950/70 border-purple-500/80 shadow-[0_0_25px_rgba(168,85,247,0.25)]';
      const isBtoA = activeTransitionId === 'transition_b_a' || basePartId === 'part_b';
      statusBadgeText = isBtoA ? 'TRANSIÇÃO: B ➔ A' : 'TRANSIÇÃO: A ➔ B';
      statusBadgeColor = 'text-purple-300 font-extrabold animate-pulse';
      beatBarFillColor = 'bg-purple-400';
      currentActiveLabel = isBtoA ? 'TRANSIÇÃO B ➔ A' : 'TRANSIÇÃO A ➔ B';
    } else if (isFill || partId === 'fill_a' || partId === 'fill_b') {
      screenBg = 'bg-amber-950/70 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.25)]';
      const isFillB = activeFillId === 'fill_b' || basePartId === 'part_b';
      statusBadgeText = isFillB ? 'VIRADA: FILL B' : 'VIRADA: FILL A';
      statusBadgeColor = 'text-amber-300 font-extrabold animate-pulse';
      beatBarFillColor = 'bg-amber-400';
      currentActiveLabel = isFillB ? 'FILL B (PARTE B)' : 'FILL A (PARTE A)';
    } else if (isIntro || partId === 'intro') {
      screenBg = 'bg-emerald-950/60 border-emerald-500/80 shadow-[0_0_25px_rgba(16,185,129,0.25)]';
      statusBadgeText = 'INTRODUÇÃO ➔ PARTE A';
      statusBadgeColor = 'text-emerald-400 font-extrabold animate-pulse';
      beatBarFillColor = 'bg-emerald-400';
      currentActiveLabel = 'INTRODUÇÃO';
    } else if (partId === 'part_b' || basePartId === 'part_b') {
      screenBg = 'bg-blue-950/50 border-blue-500/70 shadow-[0_0_25px_rgba(59,130,246,0.2)]';
      statusBadgeText = 'TOCANDO: PARTE B';
      statusBadgeColor = 'text-blue-400 font-bold';
      beatBarFillColor = 'bg-blue-400';
      currentActiveLabel = 'PARTE B';
    } else {
      screenBg = 'bg-cyan-950/50 border-cyan-500/70 shadow-[0_0_25px_rgba(6,182,212,0.2)]';
      statusBadgeText = 'TOCANDO: PARTE A';
      statusBadgeColor = 'text-cyan-400 font-bold';
      beatBarFillColor = 'bg-cyan-400';
      currentActiveLabel = 'PARTE A';
    }
  }

  // Calculate beats based on time signature
  const beatsPerBar =
    timeSignature === '3/4'
      ? 3
      : timeSignature === '6/8'
      ? 6
      : timeSignature === '7/8'
      ? 7
      : timeSignature === '5/4'
      ? 5
      : timeSignature === '12/8'
      ? 12
      : 4;

  const totalSubdivisions = beatsPerBar * 4;
  const currentTickInMeasure = isPlaying ? ((currentBeat - 1) % beatsPerBar) * 4 + subdivision : 0;
  const measureProgressPercent = isPlaying
    ? Math.min(100, ((currentTickInMeasure + 1) / totalSubdivisions) * 100)
    : 0;

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto rounded-xl border p-4 sm:p-5 transition-all duration-300 font-mono ${screenBg}`}
    >
      {/* Top row: Song title & Dynamic status */}
      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold tracking-wide border-b border-slate-700/50 pb-2 mb-2.5">
        <span className="text-slate-300 truncate max-w-[240px] sm:max-w-none">{songName}</span>
        <span className={`font-bold tracking-wider ${statusBadgeColor}`}>
          {statusBadgeText}
        </span>
      </div>

      {/* Prominent Active Part Banner */}
      <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 rounded-lg border border-slate-700/50 mb-3">
        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
          {isPlaying ? 'PARTE EM REPRODUÇÃO:' : 'PARTE SELECIONADA NO PEDAL:'}
        </span>
        <span className={`text-sm sm:text-base font-black tracking-wider ${statusBadgeColor}`}>
          {currentActiveLabel}
        </span>
      </div>

      {/* Center: Hardware visual beat bar */}
      <div className="my-3">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1 px-1">
          {Array.from({ length: beatsPerBar }, (_, i) => (
            <span key={i}>Tempo {i + 1}</span>
          ))}
        </div>

        {/* Dynamic Beat Segments */}
        <div
          className="grid gap-1.5 h-6 bg-slate-950/80 p-1 rounded-md border border-slate-800"
          style={{ gridTemplateColumns: `repeat(${beatsPerBar}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: beatsPerBar }, (_, i) => i + 1).map((beatNum) => {
            const isCurrentBeat = isPlaying && currentBeat === beatNum;
            return (
              <div
                key={beatNum}
                className={`relative rounded transition-all duration-75 flex items-center justify-center text-[10px] font-bold ${
                  isCurrentBeat
                    ? `${beatBarFillColor} text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]`
                    : 'bg-slate-900/80 text-slate-500'
                }`}
              >
                {beatNum}
              </div>
            );
          })}
        </div>

        {/* Continuous measure playhead bar */}
        <div className="w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden mt-1.5 border border-slate-800/80">
          <div
            className={`h-full transition-all duration-75 ${beatBarFillColor}`}
            style={{ width: `${measureProgressPercent}%` }}
          />
        </div>
      </div>

      {/* Bottom row: Telemetry info with clean tabular numerals */}
      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-700/50 pt-2.5 mt-3 tabular-nums">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500 mr-1.5">BPM:</span>
            <span className="text-white font-bold text-sm">{bpm}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">FÓRMULA:</span>
            <span className="text-white font-semibold">{timeSignature}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div>
            <span className="text-slate-500 mr-1.5">COMPASSO:</span>
            <span className="text-white font-bold">{isPlaying ? currentBar : '--'}</span>
          </div>
          <div>
            <span className="text-slate-500 mr-1.5">TEMPO:</span>
            <span className="text-amber-400 font-bold text-sm">
              {isPlaying ? `${currentBeat}.${subdivision + 1}` : '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
