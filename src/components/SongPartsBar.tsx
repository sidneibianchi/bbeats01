/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { SongPartId, SongProject } from '../types/rhythm';

interface SongPartsBarProps {
  project: SongProject;
  activePartId: SongPartId;
  playingPartId: SongPartId;
  selectedStartPart?: SongPartId;
  basePartId?: SongPartId;
  isPlaying: boolean;
  onSelectPart: (partId: SongPartId) => void;
  onOpenCopyModal: () => void;
  onClearPart: (partId: SongPartId) => void;
}

const PARTS_CONFIG: Array<{ id: SongPartId; label: string; badge: string; color: string }> = [
  { id: 'intro', label: 'Intro', badge: 'Intro', color: 'border-emerald-500 text-emerald-400' },
  { id: 'verse', label: 'Parte A', badge: 'Parte A', color: 'border-cyan-500 text-cyan-400' },
  { id: 'part_b', label: 'Parte B', badge: 'Parte B', color: 'border-blue-500 text-blue-400' },
  { id: 'part_c', label: 'Parte C', badge: 'Parte C', color: 'border-indigo-500 text-indigo-400' },
  { id: 'fill_a', label: 'Fill A', badge: 'Fill A', color: 'border-amber-500 text-amber-400' },
  { id: 'fill_b', label: 'Fill B', badge: 'Fill B', color: 'border-orange-500 text-orange-400' },
  { id: 'fill_c', label: 'Fill C', badge: 'Fill C', color: 'border-yellow-500 text-yellow-400' },
  { id: 'transition_a_b', label: 'Transição A -> B', badge: 'Trans A-B', color: 'border-purple-500 text-purple-400' },
  { id: 'transition_b_a', label: 'Transição B -> A', badge: 'Trans B-A', color: 'border-fuchsia-500 text-fuchsia-400' },
  { id: 'transition_b_c', label: 'Transição B -> C', badge: 'Trans B-C', color: 'border-violet-500 text-violet-400' },
  { id: 'transition_c_b', label: 'Transição C -> B', badge: 'Trans C-B', color: 'border-pink-500 text-pink-400' },
  { id: 'transition_c_a', label: 'Transição C -> A', badge: 'Trans C-A', color: 'border-teal-500 text-teal-400' },
  { id: 'outro', label: 'End', badge: 'End', color: 'border-rose-500 text-rose-400' },
];

export const SongPartsBar: React.FC<SongPartsBarProps> = ({
  project,
  activePartId,
  playingPartId,
  selectedStartPart = 'verse',
  basePartId = 'verse',
  isPlaying,
  onSelectPart,
  onOpenCopyModal,
  onClearPart,
}) => {
  return (
    <div className="bg-[#0b101d] border-b border-slate-800 px-4 sm:px-6 py-2.5 sm:py-3">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 shrink-0">
            Partes da Música:
          </span>
          {PARTS_CONFIG.map((p) => {
            const isLive = isPlaying && (
              playingPartId === p.id ||
              (p.id === 'part_b' && playingPartId === 'part_b') ||
              (p.id === 'verse' && playingPartId === 'verse')
            );
            const isSelectedToStart = !isPlaying && (selectedStartPart === p.id || activePartId === p.id);
            const isEditing = activePartId === p.id;

            // Count total active hits in this part with alias support
            const partData =
              project.parts[p.id] ||
              (p.id === 'part_b' ? (project.parts as Record<string, unknown>)['chorus'] || (project.parts as Record<string, unknown>)['prechorus'] : undefined) ||
              (p.id === 'fill_a' ? (project.parts as Record<string, unknown>)['fill1'] : undefined) ||
              (p.id === 'fill_b' ? (project.parts as Record<string, unknown>)['fill2'] : undefined) ||
              (p.id === 'transition_a_b' ? (project.parts as Record<string, unknown>)['transition'] : undefined);
            let activeHitsCount = 0;
            if (partData && typeof partData === 'object' && 'trackSteps' in partData && partData.trackSteps) {
              Object.values(partData.trackSteps as Record<string, Array<{ active: boolean }>>).forEach((steps) => {
                steps.forEach((s) => {
                  if (s.active) activeHitsCount++;
                });
              });
            }

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPart(p.id)}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isLive
                    ? 'bg-amber-400 text-slate-950 font-extrabold ring-2 ring-amber-300 shadow-md shadow-amber-400/20'
                    : isSelectedToStart
                    ? 'bg-slate-800 text-white border-2 border-cyan-400 shadow-sm'
                    : isEditing
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-600'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Live indicator dot */}
                {isLive ? (
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                ) : isSelectedToStart ? (
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                ) : null}
                <span>{p.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded tabular-nums ${
                  isLive ? 'bg-slate-950/40 text-slate-950' : 'bg-slate-950/70 text-slate-400'
                }`}>
                  {activeHitsCount}
                </span>
                {isLive && (
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-950 bg-amber-300 px-1 rounded">
                    TOCANDO
                  </span>
                )}
                {!isPlaying && isSelectedToStart && (
                  <span className="text-[9px] uppercase tracking-wider font-bold text-cyan-300 bg-cyan-950 px-1 rounded">
                    PRONTA
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Part action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            title="Copiar padrão entre partes da música (Intro, Verso, Refrão, Viradas, Ending)"
            onClick={onOpenCopyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-700/60 hover:border-cyan-400 rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
            <span>Copiar / Transferir Parte</span>
          </button>
          <button
            type="button"
            title="Limpar todos os passos desta parte"
            onClick={() => onClearPart(activePartId)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-900/40 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
