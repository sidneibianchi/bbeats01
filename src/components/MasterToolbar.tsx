/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  FolderOpen,
  Save,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Download,
  Disc3,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SongProject, TimeSignature, RhythmicResolution } from '../types/rhythm';

interface MasterToolbarProps {
  project: SongProject;
  rhythms: SongProject[];
  isPlaying: boolean;
  masterVolume: number;
  metronomeOn: boolean;
  playIntroOnStart: boolean;
  canDeleteRhythm: boolean;
  isSavedRecently?: boolean;
  onOpenDrumKitModal?: () => void;
  onSaveProjectToApp: () => void;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swing: number) => void;
  onHumanizeChange: (humanize: number) => void;
  onTimeSignatureChange: (sig: TimeSignature) => void;
  onResolutionChange?: (res: RhythmicResolution) => void;
  onBarsCountChange?: (bars: number) => void;
  onMasterVolumeChange: (vol: number) => void;
  onToggleMetronome: () => void;
  onTogglePlayIntroOnStart: () => void;
  onSelectPreset: (preset: SongProject) => void;
  onOpenCreateModal: () => void;
  onOpenDeleteModal: () => void;
  onExportProject: () => void;
  onImportProject: (imported: SongProject) => void;
}

export const MasterToolbar: React.FC<MasterToolbarProps> = ({
  project,
  rhythms,
  isPlaying,
  masterVolume,
  metronomeOn,
  playIntroOnStart,
  canDeleteRhythm: _canDeleteRhythm,
  isSavedRecently = false,
  onOpenDrumKitModal,
  onSaveProjectToApp,
  onTogglePlay,
  onBpmChange,
  onSwingChange,
  onHumanizeChange,
  onTimeSignatureChange,
  onResolutionChange: _onResolutionChange,
  onBarsCountChange: _onBarsCountChange,
  onMasterVolumeChange,
  onToggleMetronome,
  onTogglePlayIntroOnStart,
  onSelectPreset,
  onOpenCreateModal,
  onOpenDeleteModal,
  onExportProject,
  onImportProject,
}) => {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = performance.now();
    const newTimes = [...tapTimes, now].filter((t) => now - t < 3000);
    setTapTimes(newTimes);

    if (newTimes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < newTimes.length; i++) {
        intervals.push(newTimes[i] - newTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 260) {
        onBpmChange(calculatedBpm);
      }
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.tracks && json.parts) {
          onImportProject(json);
        } else {
          alert('Arquivo de projeto inválido.');
        }
      } catch {
        alert('Erro ao carregar arquivo JSON.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const customRhythms = rhythms.filter((r) => !r.id.startsWith('preset_'));
  const factoryPresets = rhythms.filter((r) => r.id.startsWith('preset_'));

  return (
    <div className="bg-[#0f172a] border-b border-slate-800 px-6 py-3">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Left: Play/Stop & Tempo Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Play/Stop Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-400 text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.4)]'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Parar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Tocar</span>
              </>
            )}
          </button>

          {/* BPM Input & Tap Tempo */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1">
            <span className="text-xs font-semibold text-slate-400 uppercase">BPM</span>
            <input
              type="number"
              min={40}
              max={260}
              value={project.bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="w-14 bg-slate-950 text-amber-400 font-mono font-bold text-sm px-1.5 py-0.5 rounded border border-slate-800 text-center focus:outline-none focus:border-amber-400 tabular-nums"
            />
            <button
              type="button"
              onClick={handleTapTempo}
              className="px-2 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700/80 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              TAP
            </button>
          </div>

          {/* Time Signature */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-semibold">Compasso:</span>
            <select
              value={project.timeSignature}
              onChange={(e) => onTimeSignatureChange(e.target.value as TimeSignature)}
              className="bg-slate-950 text-slate-200 font-mono font-semibold rounded px-1.5 py-0.5 border border-slate-800 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="4/4">4/4 (Padrão 4 tempos)</option>
              <option value="3/4">3/4 (Valsa / Guarânia)</option>
              <option value="6/8">6/8 (Afro / Baião / Ijexá)</option>
              <option value="7/8">7/8 (Polirritmia)</option>
              <option value="5/4">5/4 (Ímpar)</option>
              <option value="12/8">12/8 (Blues / Shuffle)</option>
            </select>
          </div>

          {/* Padrão Fixo: 1 Compasso em Fusa */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-semibold">Estrutura:</span>
            <span className="text-amber-300 font-mono font-bold">1 Compasso (Fusa 1/32)</span>
          </div>

          {/* Metronome Toggle */}
          <button
            type="button"
            onClick={onToggleMetronome}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              metronomeOn
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Metrônomo</span>
          </button>

          {/* Intro to Part A on Start Toggle */}
          <button
            type="button"
            title="Quando ativo, ao dar Play a Introdução toca 1 compasso e avança diretamente para a Parte A (Verso)"
            onClick={onTogglePlayIntroOnStart}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              playIntroOnStart
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-900/90 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Intro &rarr; Parte A</span>
          </button>
        </div>

        {/* Center: Swing & Humanize Micro-groove */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Swing */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Swing:</span>
            <input
              type="range"
              min={0}
              max={50}
              value={project.swing}
              onChange={(e) => onSwingChange(Number(e.target.value))}
              className="w-18 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-slate-300 w-8 text-right tabular-nums">
              {project.swing}%
            </span>
          </div>

          {/* Humanize micro-timing */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Humanizar:</span>
            <input
              type="range"
              min={0}
              max={50}
              value={project.humanize}
              onChange={(e) => onHumanizeChange(Number(e.target.value))}
              className="w-18 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-slate-300 w-8 text-right tabular-nums">
              {project.humanize}%
            </span>
          </div>

          {/* Master Volume */}
          <div className="flex items-center gap-2 text-xs border-l border-slate-800 pl-3">
            {masterVolume === 0 ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            )}
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
              className="w-20 accent-amber-400 cursor-pointer"
            />
            <span className="font-mono text-slate-300 w-8 text-right tabular-nums">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Right: Presets & Rhythm Management & Save directly to App / Cloud */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Rhythm Selector + New + Delete */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1 text-xs">
            <span className="text-slate-400 font-semibold px-1">Ritmo:</span>
            <select
              value={project.id}
              onChange={(e) => {
                const found = rhythms.find((p) => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-slate-950 text-amber-300 font-semibold rounded px-2 py-0.5 border border-slate-800 focus:outline-none focus:border-amber-400 cursor-pointer max-w-[150px] truncate"
            >
              {customRhythms.length > 0 && (
                <optgroup label="⭐ Meus Ritmos Salvos">
                  {customRhythms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name.replace(/\s*\(\d+.*?\)/g, '').trim() || p.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="🥁 Presets de Fábrica">
                {factoryPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name.replace(/\s*\(\d+.*?\)/g, '').trim() || p.name}
                  </option>
                ))}
              </optgroup>
            </select>

            {/* Quick Prev / Next Rhythm Buttons */}
            <button
              type="button"
              title="Ritmo Anterior"
              onClick={() => {
                const currentIndex = rhythms.findIndex((r) => r.id === project.id);
                const prev = rhythms[(currentIndex - 1 + rhythms.length) % rhythms.length];
                onSelectPreset(prev);
              }}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Próximo Ritmo"
              onClick={() => {
                const currentIndex = rhythms.findIndex((r) => r.id === project.id);
                const next = rhythms[(currentIndex + 1) % rhythms.length];
                onSelectPreset(next);
              }}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 cursor-pointer transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {/* + Criar Novo Ritmo */}
            <button
              type="button"
              title="Criar novo ritmo do zero ou com kit inicial"
              onClick={onOpenCreateModal}
              className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-amber-400 hover:text-slate-950 bg-amber-400/10 hover:bg-amber-400 border border-amber-400/40 rounded transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo</span>
            </button>

            {/* Gerenciador de Kits de Bateria */}
            {onOpenDrumKitModal && (
              <button
                type="button"
                title="Gerenciar e criar kits de som e bateria na memória"
                onClick={onOpenDrumKitModal}
                className="flex items-center gap-1 px-2 py-0.5 text-xs font-bold text-cyan-300 hover:text-slate-950 bg-cyan-950/40 hover:bg-cyan-400 border border-cyan-500/40 rounded transition-all cursor-pointer"
              >
                <Disc3 className="w-3.5 h-3.5" />
                <span>Kits</span>
              </button>
            )}

            {/* Excluir Ritmo Atual */}
            <button
              type="button"
              title="Excluir o ritmo selecionado da biblioteca"
              onClick={onOpenDeleteModal}
              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PRIMARY ACTION: SALVAR NO APP (NUVEM / CELULAR) */}
          <button
            type="button"
            title="Salvar ritmo e todos os sons no aplicativo e na nuvem para abrir no celular"
            onClick={onSaveProjectToApp}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer ${
              isSavedRecently
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
            }`}
          >
            {isSavedRecently ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Salvo no App ✓</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar no App</span>
              </>
            )}
          </button>

          {/* Secondary backup actions: download JSON or open JSON */}
          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              type="button"
              title="Baixar arquivo de backup (.json) no seu computador"
              onClick={onExportProject}
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Backup</span>
            </button>
            <label
              title="Abrir arquivo de backup (.json)"
              className="flex items-center gap-1 px-2 py-1.5 text-[11px] text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3 h-3" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
