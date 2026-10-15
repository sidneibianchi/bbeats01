/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, ArrowRight, X, Check, AlertCircle } from 'lucide-react';
import { SongPartId, SongProject } from '../types/rhythm';

export const PARTS_LIST: Array<{ id: SongPartId; label: string; badge: string; group: 'principal' | 'virada' | 'estrutural' }> = [
  { id: 'intro', label: 'Intro (Introdução)', badge: 'Intro', group: 'estrutural' },
  { id: 'verse', label: 'Parte A', badge: 'Parte A', group: 'principal' },
  { id: 'part_b', label: 'Parte B', badge: 'Parte B', group: 'principal' },
  { id: 'part_c', label: 'Parte C', badge: 'Parte C', group: 'principal' },
  { id: 'fill_a', label: 'Fill A (Virada Parte A)', badge: 'Fill A', group: 'virada' },
  { id: 'fill_b', label: 'Fill B (Virada Parte B)', badge: 'Fill B', group: 'virada' },
  { id: 'fill_c', label: 'Fill C (Virada Parte C)', badge: 'Fill C', group: 'virada' },
  { id: 'transition_a_b', label: 'Transição A -> B', badge: 'Trans A-B', group: 'virada' },
  { id: 'transition_b_a', label: 'Transição B -> A', badge: 'Trans B-A', group: 'virada' },
  { id: 'transition_b_c', label: 'Transição B -> C', badge: 'Trans B-C', group: 'virada' },
  { id: 'transition_c_b', label: 'Transição C -> B', badge: 'Trans C-B', group: 'virada' },
  { id: 'transition_c_a', label: 'Transição C -> A', badge: 'Trans C-A', group: 'virada' },
  { id: 'outro', label: 'End (Finalização)', badge: 'End', group: 'estrutural' },
];

interface CopyPartModalProps {
  project: SongProject;
  currentActivePartId: SongPartId;
  onClose: () => void;
  onCopyPart: (source: SongPartId, targets: SongPartId[], switchToTarget: boolean) => void;
}

export const CopyPartModal: React.FC<CopyPartModalProps> = ({
  project,
  currentActivePartId,
  onClose,
  onCopyPart,
}) => {
  const [sourcePartId, setSourcePartId] = useState<SongPartId>(currentActivePartId);
  const [selectedTargets, setSelectedTargets] = useState<SongPartId[]>(() => {
    const initialTarget: SongPartId = currentActivePartId === 'verse' ? 'fill_a' : 'verse';
    return [initialTarget];
  });
  const [switchToTarget, setSwitchToTarget] = useState(true);

  const getPartNotesCount = (partId: SongPartId): number => {
    const partData = project.parts[partId];
    if (!partData?.trackSteps) return 0;
    let count = 0;
    Object.values(partData.trackSteps).forEach((steps) => {
      steps.forEach((s) => {
        if (s.active) count++;
      });
    });
    return count;
  };

  const sourceNotes = getPartNotesCount(sourcePartId);

  const toggleTarget = (targetId: SongPartId) => {
    if (targetId === sourcePartId) return;
    setSelectedTargets((prev) =>
      prev.includes(targetId)
        ? prev.filter((id) => id !== targetId)
        : [...prev, targetId]
    );
  };

  const handleSelectAllFills = () => {
    const fills: SongPartId[] = ['fill_a', 'fill_b', 'transition_a_b', 'transition_b_a'];
    setSelectedTargets(fills.filter((id) => id !== sourcePartId));
  };

  const handleSelectEndingAndIntro = () => {
    const targets: SongPartId[] = ['intro', 'outro'];
    setSelectedTargets(targets.filter((id) => id !== sourcePartId));
  };

  const handleExecuteCopy = () => {
    if (selectedTargets.length === 0) return;
    onCopyPart(sourcePartId, selectedTargets, switchToTarget);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Copy className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Copiar Padrão entre Partes
              </h3>
              <p className="text-xs text-slate-400">
                Transfira a levada rítmica de uma seção para outra ou para viradas/finalização
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Step 1: Origem */}
          <div>
            <label className="block text-slate-300 font-bold mb-2 uppercase tracking-wider text-[11px]">
              1. De onde você quer copiar? (Origem)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PARTS_LIST.map((part) => {
                const isSelected = sourcePartId === part.id;
                const count = getPartNotesCount(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    onClick={() => {
                      setSourcePartId(part.id);
                      setSelectedTargets((prev) => prev.filter((id) => id !== part.id));
                    }}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/20 border-amber-400 text-amber-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs truncate">{part.badge}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      {count} {count === 1 ? 'nota' : 'notas'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visual Divider / Arrow */}
          <div className="flex items-center justify-center gap-2 text-slate-500 font-semibold text-[11px] py-1 border-y border-slate-800/80">
            <span>{PARTS_LIST.find((p) => p.id === sourcePartId)?.label} ({sourceNotes} notas)</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-400 font-bold">
              {selectedTargets.length} {selectedTargets.length === 1 ? 'destino selecionado' : 'destinos selecionados'}
            </span>
          </div>

          {/* Step 2: Destino */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                2. Para onde quer copiar? (Destino)
              </label>
              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={handleSelectAllFills}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                >
                  Todas as Viradas
                </button>
                <button
                  type="button"
                  onClick={handleSelectEndingAndIntro}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer"
                >
                  Intro & Ending
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PARTS_LIST.map((part) => {
                const isSource = sourcePartId === part.id;
                const isTargetSelected = selectedTargets.includes(part.id);
                const targetNotes = getPartNotesCount(part.id);
                return (
                  <button
                    key={part.id}
                    type="button"
                    disabled={isSource}
                    onClick={() => toggleTarget(part.id)}
                    className={`p-2 rounded-xl border text-left transition-all relative ${
                      isSource
                        ? 'opacity-30 bg-slate-950/20 border-slate-900 cursor-not-allowed'
                        : isTargetSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-sm cursor-pointer'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs truncate">{part.badge}</span>
                      {isTargetSelected && (
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                      {isSource ? '(Origem)' : `${targetNotes} notas`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Overwrite Warning if any target has notes */}
          {selectedTargets.some((t) => getPartNotesCount(t) > 0) && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                As partes selecionadas que já possuem notas serão substituídas integralmente pelo padrão copiado da <strong>{PARTS_LIST.find((p) => p.id === sourcePartId)?.label}</strong>.
              </span>
            </div>
          )}

          {/* Option: Switch view to destination */}
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={switchToTarget}
              onChange={(e) => setSwitchToTarget(e.target.checked)}
              className="accent-cyan-400 w-4 h-4 rounded cursor-pointer"
            />
            <span className="font-medium text-[11px]">
              Mudar visualização para a parte de destino após copiar
            </span>
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selectedTargets.length === 0}
            onClick={handleExecuteCopy}
            className={`flex items-center gap-2 px-5 py-2 font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer ${
              selectedTargets.length > 0
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>
              Copiar para {selectedTargets.length} {selectedTargets.length === 1 ? 'Parte' : 'Partes'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
