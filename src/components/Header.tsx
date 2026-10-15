import React, { useRef } from 'react';
import {
  Radio,
  Smartphone,
  FolderDown,
  FolderUp,
  FileCode,
  HardDrive,
} from 'lucide-react';

interface HeaderProps {
  activeView: 'sequencer' | 'pedal' | 'samples';
  onSelectView: (view: 'sequencer' | 'pedal' | 'samples') => void;
  onOpenCreateModal: () => void;
  onOpenFootswitchModal?: () => void;
  onOpenMobileGuide?: () => void;
  onOpenShareMobile?: () => void;
  isPedalEnabled?: boolean;
  onTogglePedalEnabled?: () => void;
  onOpenDrumKitModal?: () => void;
  onEnterMobileLiveView?: () => void;
  onExportRhythmsJson?: () => void;
  onImportRhythmsJson?: () => void;
  onOpenLocalFileManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  onOpenCreateModal,
  onOpenDrumKitModal,
  onEnterMobileLiveView,
  onOpenFootswitchModal,
  onOpenMobileGuide,
  onOpenShareMobile,
  isPedalEnabled = true,
  onTogglePedalEnabled,
  onExportRhythmsJson,
  onImportRhythmsJson,
  onOpenLocalFileManager,
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-[#090d16]/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-40 select-none">
      {/* Zone 1: Logo & rhythm backup tools */}
      <div className="flex items-center gap-3">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('sequencer');
          }}
          className="text-base sm:text-lg font-black tracking-tight text-white whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors flex items-center gap-2"
        >
          <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center shadow-sm">
            SB
          </span>
          <span>SB Beats Studio</span>
        </a>

        {/* Rhythm JSON backups and local sample tools */}
        <button
          type="button"
          onClick={onOpenLocalFileManager}
          title="Gerenciar backups JSON, kits e samples locais."
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 shadow-xs cursor-pointer transition-colors"
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span>Backups & Samples</span>
        </button>
      </div>

      {/* Zone 2: Navigation links */}
      <nav className="flex items-center gap-2 md:gap-4 text-xs sm:text-sm font-medium text-slate-300">
        <button
          type="button"
          onClick={() => onSelectView('sequencer')}
          className={`hidden md:block cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            activeView === 'sequencer'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Sequenciador Matrix (PC)
        </button>
        <button
          type="button"
          onClick={() => onSelectView('pedal')}
          className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors px-2.5 py-1 rounded-lg ${
            activeView === 'pedal'
              ? 'bg-amber-400 text-slate-950 font-bold shadow-xs'
              : 'text-slate-300 hover:text-white bg-slate-900 border border-slate-700/80 md:bg-transparent md:border-transparent'
          }`}
        >
          🦶 Pedal BeatBuddy Live
        </button>
        <button
          type="button"
          onClick={() => onSelectView('samples')}
          className={`hidden sm:block cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            activeView === 'samples'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🎵 Pasta de Samples
        </button>
      </nav>

      {/* Zone 3: Actions & Local File Management */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Open Local File Manager (.json & samples) */}
        {onOpenLocalFileManager && (
          <button
            type="button"
            title="Gerenciar backups JSON, kits e samples locais"
            onClick={onOpenLocalFileManager}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-slate-950 bg-amber-400/10 hover:bg-amber-400 border border-amber-400/30 rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Arquivos .JSON</span>
            <span className="sm:hidden">.JSON</span>
          </button>
        )}

        {/* Export JSON Button */}
        {onExportRhythmsJson && (
          <button
            type="button"
            title="Baixar backup JSON com todos os ritmos"
            onClick={onExportRhythmsJson}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <FolderDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Baixar .json</span>
          </button>
        )}

        {/* Import JSON Button */}
        {onImportRhythmsJson && (
          <button
            type="button"
            title="Importar backup JSON de ritmos para a biblioteca"
            onClick={onImportRhythmsJson}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <FolderUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">Carregar .json</span>
          </button>
        )}

        {/* Alternar para a visualização simplificada de pedal para celular */}
        {onEnterMobileLiveView && (
          <button
            type="button"
            title="Alternar para a visualização simplificada de pedal para celular"
            onClick={onEnterMobileLiveView}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:text-slate-950 bg-cyan-950/40 hover:bg-cyan-400 border border-cyan-500/40 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400 group-hover:text-slate-950" />
            <span className="hidden sm:inline">Modo Celular (Live)</span>
            <span className="sm:hidden">Live</span>
          </button>
        )}

        {/* QR Celular */}
        {onOpenShareMobile && (
          <button
            type="button"
            title="Abrir no celular com QR Code e tocar o ritmo"
            onClick={onOpenShareMobile}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:text-slate-950 bg-amber-400/10 hover:bg-amber-400 border border-amber-400/40 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5 text-amber-400 group-hover:text-slate-950" />
            <span>QR Celular</span>
          </button>
        )}

        {/* Pedal físico Ligado / Desligado */}
        {onTogglePedalEnabled && (
          <button
            type="button"
            onClick={onTogglePedalEnabled}
            title={
              isPedalEnabled
                ? 'Pedal Físico ATIVO. Clique para desativar e liberar digitação livre das teclas.'
                : 'Pedal Físico DESATIVADO. Teclado liberado para digitação. Clique para reativar o pedal.'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm border ${
              isPedalEnabled
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-rose-500/20 border-rose-500/60 text-rose-300 hover:bg-rose-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isPedalEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isPedalEnabled ? 'Pedal: Ligado' : 'Pedal: OFF'}
            </span>
            <span className="sm:hidden">{isPedalEnabled ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {/* Pedal Cuvave Bluetooth */}
        {onOpenFootswitchModal && (
          <button
            type="button"
            title="Configurar pedal Bluetooth / Cuvave Cube Turner Pro e MIDI"
            onClick={onOpenFootswitchModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Pedal Cuvave</span>
          </button>
        )}
      </div>
    </header>
  );
};
