/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { SongProject } from '../types/rhythm';

interface DeleteRhythmModalProps {
  rhythm: SongProject;
  canDelete: boolean;
  onClose: () => void;
  onConfirmDelete: (rhythmId: string) => void;
}

export const DeleteRhythmModal: React.FC<DeleteRhythmModalProps> = ({
  rhythm,
  canDelete,
  onClose,
  onConfirmDelete,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Excluir Ritmo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {canDelete ? (
            <>
              <p className="text-slate-300">
                Tem certeza de que deseja excluir o ritmo{' '}
                <strong className="text-white font-bold">"{rhythm.name}"</strong>?
              </p>
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300">
                Esta ação removerá todas as pistas e sequências gravadas deste ritmo permanentemente da sua biblioteca local.
              </div>
            </>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/60 text-amber-300">
              Não é possível excluir o único ritmo restante na sua biblioteca. Crie outro ritmo antes de excluir este ou use a opção de limpar pistas.
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => {
                  onConfirmDelete(rhythm.id);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Ritmo</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
