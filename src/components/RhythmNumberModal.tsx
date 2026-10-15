/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Rhythm Number Keypad Modal (Número Ritmo).
 * Enables instant numeric jumping to any rhythm in the setlist (1 to N).
 */

import React, { useState, useEffect } from 'react';
import { X, Check, Delete } from 'lucide-react';
import { SongProject } from '../types/rhythm';

interface RhythmNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  rhythms: SongProject[];
  currentRhythmId: string;
  onSelectRhythm: (rhythm: SongProject) => void;
}

export const RhythmNumberModal: React.FC<RhythmNumberModalProps> = ({
  isOpen,
  onClose,
  rhythms,
  currentRhythmId,
  onSelectRhythm,
}) => {
  const [typedNumber, setTypedNumber] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-fill with current index on open
  useEffect(() => {
    if (isOpen) {
      const currentIndex = rhythms.findIndex((r) => r.id === currentRhythmId);
      setTypedNumber(currentIndex >= 0 ? String(currentIndex + 1) : '1');
      setErrorMsg(null);
    }
  }, [isOpen, currentRhythmId, rhythms]);

  if (!isOpen) return null;

  const handleDigitPress = (digit: string) => {
    setErrorMsg(null);
    if (typedNumber.length >= 3) return; // limit to 999
    if (typedNumber === '0') {
      setTypedNumber(digit);
    } else {
      setTypedNumber((prev) => prev + digit);
    }
  };

  const handleClear = () => {
    setTypedNumber('');
    setErrorMsg(null);
  };

  const handleBackspace = () => {
    setTypedNumber((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleConfirm = () => {
    const num = parseInt(typedNumber, 10);
    if (isNaN(num) || num < 1 || num > rhythms.length) {
      setErrorMsg(`Digite um número entre 1 e ${rhythms.length}`);
      return;
    }

    const targetRhythm = rhythms[num - 1];
    if (targetRhythm) {
      onSelectRhythm(targetRhythm);
      onClose();
    }
  };

  const targetIndex = parseInt(typedNumber, 10) - 1;
  const previewRhythm = targetIndex >= 0 && targetIndex < rhythms.length ? rhythms[targetIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xs bg-[#121927] border-2 border-amber-500/60 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-extrabold text-base text-amber-400 uppercase tracking-wider">
            Número Ritmo
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LCD Screen Display */}
        <div className="bg-[#090d16] border border-amber-500/40 rounded-2xl p-3 flex flex-col items-center justify-center shadow-inner min-h-[75px]">
          <div className="text-3xl font-black font-mono text-amber-400 tracking-wider">
            {typedNumber || <span className="text-slate-600 animate-pulse">_ _</span>}
          </div>
          {previewRhythm ? (
            <span className="text-xs font-semibold text-emerald-400 truncate max-w-[240px] mt-1 text-center">
              {previewRhythm.name.replace(/\s*\(\d+.*?\)/g, '').trim()}
            </span>
          ) : (
            <span className="text-[11px] text-slate-500 mt-1">
              {errorMsg ? (
                <span className="text-rose-400 font-bold">{errorMsg}</span>
              ) : (
                `Total: ${rhythms.length} ritmos disponíveis (1 - ${rhythms.length})`
              )}
            </span>
          )}
        </div>

        {/* Keypad Grid (Exact match with user prototype) */}
        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigitPress(digit)}
              className="h-13 bg-[#192338] hover:bg-[#22304d] active:scale-95 border border-slate-700/80 rounded-xl text-xl font-black text-amber-200 transition-all shadow-sm flex items-center justify-center cursor-pointer select-none"
            >
              {digit}
            </button>
          ))}

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleDigitPress('0')}
            className="h-13 bg-[#192338] hover:bg-[#22304d] active:scale-95 border border-slate-700/80 rounded-xl text-xl font-black text-amber-200 transition-all shadow-sm flex items-center justify-center cursor-pointer select-none"
          >
            0
          </button>

          {/* OK button spanning 2 columns */}
          <button
            type="button"
            onClick={handleConfirm}
            className="h-13 col-span-2 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-lg rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer select-none"
          >
            <Check className="w-5 h-5 stroke-[3]" />
            <span>OK</span>
          </button>
        </div>

        {/* Action Row: Limpar & Apagar */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleClear}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl transition-colors border border-slate-700 flex items-center justify-center cursor-pointer"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl transition-colors border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
          >
            <Delete className="w-4 h-4" />
            <span>Apagar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
