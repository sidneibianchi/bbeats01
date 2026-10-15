/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mobile & Tablet Live View (No-scroll, viewport-fitted stage interface).
 * Features numeric keypad jump (N. Ritmo), categories, arrow navigation, and responsive footswitches.
 */

import React, { useRef, useState, useMemo, useLayoutEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Radio,
  Play,
  Disc3,
  ArrowRightLeft,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Hash,
  Tag,
  HardDrive,
} from 'lucide-react';
import { SongPartId, SongProject } from '../types/rhythm';
import { RhythmNumberModal } from './RhythmNumberModal';

interface MobileLiveViewProps {
  project: SongProject;
  rhythms: SongProject[];
  onSelectProject: (preset: SongProject) => void;
  // Master Volume & BPM
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  onBpmChange: (bpm: number) => void;
  // Clock & Beat
  isPlaying: boolean;
  currentBeat: number;
  currentBar: number;
  // Pedal states
  isIntro: boolean;
  isOutro: boolean;
  isFill: boolean;
  isTransition: boolean;
  activeFillId: string | null;
  activeTransitionId: string | null;
  selectedStartPart: SongPartId;
  basePartId: SongPartId;
  // Pedal interactions
  onPedal1Down: (isRepeat?: boolean) => void;
  onPedal1Up: () => void;
  onPedal2Down: () => void;
  onPedal2Up: () => void;
  isPedal1Pressed: boolean;
  isPedal2Pressed: boolean;
  // Footswitch toggle & config
  isPedalEnabled: boolean;
  onTogglePedalEnabled: () => void;
  onOpenFootswitchModal: () => void;
  onOpenStudioView?: () => void;
  onOpenLocalFileManager?: () => void;
  // Audio unlock
  isAudioUnlocked: boolean;
  onUnlockAudio: () => void;
}

export function getRhythmCategory(r: SongProject): string {
  const g = (r.genre || '').toLowerCase();
  const n = (r.name || '').toLowerCase();
  if (
    g.includes('samba') ||
    g.includes('pagode') ||
    n.includes('samba') ||
    n.includes('pagode') ||
    n.includes('partido') ||
    n.includes('batucada')
  ) {
    return 'Samba & Pagode';
  }
  if (
    g.includes('forro') ||
    g.includes('forró') ||
    g.includes('baião') ||
    g.includes('baiao') ||
    g.includes('xote') ||
    n.includes('forro') ||
    n.includes('xote') ||
    n.includes('baião')
  ) {
    return 'Forró & Baião';
  }
  if (
    g.includes('axe') ||
    g.includes('axé') ||
    g.includes('afoxe') ||
    g.includes('reggae') ||
    n.includes('axe') ||
    n.includes('reggae')
  ) {
    return 'Axé & Reggae';
  }
  if (
    g.includes('rock') ||
    g.includes('pop') ||
    g.includes('blues') ||
    n.includes('rock') ||
    n.includes('blues')
  ) {
    return 'Rock & Pop';
  }
  if (
    g.includes('country') ||
    g.includes('folk') ||
    g.includes('shuffle') ||
    n.includes('country')
  ) {
    return 'Country & Folk';
  }
  if (
    g.includes('latin') ||
    g.includes('salsa') ||
    g.includes('cuba') ||
    g.includes('clave') ||
    n.includes('latin') ||
    n.includes('salsa')
  ) {
    return 'Latin & Clave';
  }
  return r.genre || 'Personalizados';
}

export const MobileLiveView: React.FC<MobileLiveViewProps> = ({
  project,
  rhythms,
  onSelectProject,
  masterVolume,
  onMasterVolumeChange,
  onBpmChange,
  isPlaying,
  currentBeat,
  isIntro,
  isOutro,
  isFill,
  isTransition,
  activeFillId,
  activeTransitionId,
  selectedStartPart,
  basePartId,
  onPedal1Down,
  onPedal1Up,
  onPedal2Down,
  onPedal2Up,
  isPedal1Pressed,
  isPedal2Pressed,
  isPedalEnabled,
  onTogglePedalEnabled,
  onOpenFootswitchModal,
  onOpenStudioView,
  onOpenLocalFileManager,
  isAudioUnlocked,
  onUnlockAudio,
}) => {
  // Modal state for numeric rhythm keypad
  const [isNumberModalOpen, setIsNumberModalOpen] = useState(false);
  const liveScrollRef = useRef<HTMLDivElement>(null);
  const pedalInputRef = useRef<HTMLInputElement>(null);
  const pedal1PointerIdRef = useRef<number | null>(null);
  const pedal2PointerIdRef = useRef<number | null>(null);
  const previousScrollTopRef = useRef(0);
  const scrollHomeRef = useRef(0);
  const lastScrollPedalTimeRef = useRef(0);
  const isTouchScrollingRef = useRef(false);

  const ensurePedalInputFocus = (event?: PointerEvent) => {
    const target = event?.target;
    if (
      target instanceof HTMLElement &&
      target.closest('input, select, textarea, [contenteditable="true"]')
    ) {
      return;
    }
    pedalInputRef.current?.focus({ preventScroll: true });
  };

  React.useEffect(() => {
    ensurePedalInputFocus();
    const handleWindowFocus = () => ensurePedalInputFocus();
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pointerdown', ensurePedalInputFocus);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pointerdown', ensurePedalInputFocus);
    };
  }, []);

  useLayoutEffect(() => {
    const scrollContainer = liveScrollRef.current;
    if (!scrollContainer) return;

    scrollContainer.dataset.pedalScrollReady = 'false';
    const initialScrollTop = 0;
    scrollHomeRef.current = initialScrollTop;
    scrollContainer.scrollTop = initialScrollTop;
    previousScrollTopRef.current = initialScrollTop;

    const frame = window.requestAnimationFrame(() => {
      scrollContainer.dataset.pedalScrollReady = 'true';
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleMobileLiveScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const currentScrollTop = container.scrollTop;
    if (container.dataset.pedalScrollReady !== 'true') {
      previousScrollTopRef.current = currentScrollTop;
      return;
    }

    const delta = currentScrollTop - previousScrollTopRef.current;
    previousScrollTopRef.current = currentScrollTop;
    if (
      !isPedalEnabled ||
      isTouchScrollingRef.current ||
      Math.abs(delta) <= 70 ||
      Date.now() - lastScrollPedalTimeRef.current <= 800
    ) {
      return;
    }

    lastScrollPedalTimeRef.current = Date.now();
    if (delta > 0) {
      onPedal1Down(false);
      window.setTimeout(onPedal1Up, 150);
    } else {
      onPedal2Down();
      window.setTimeout(onPedal2Up, 150);
    }

    const resetTop = scrollHomeRef.current;
    container.scrollTop = resetTop;
    previousScrollTopRef.current = resetTop;
  };

  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Derive unique categories from available rhythms
  const categories = useMemo(() => {
    const set = new Set<string>();
    rhythms.forEach((r) => set.add(getRhythmCategory(r)));
    return ['Todas', ...Array.from(set)];
  }, [rhythms]);

  // Filter rhythms according to active category
  const filteredRhythms = useMemo(() => {
    if (selectedCategory === 'Todas') return rhythms;
    return rhythms.filter((r) => getRhythmCategory(r) === selectedCategory);
  }, [rhythms, selectedCategory]);

  // Current rhythm 1-based index in the global rhythms list
  const currentGlobalIndex = rhythms.findIndex((r) => r.id === project.id) + 1;
  const currentCategoryName = getRhythmCategory(project);

  // Navigation handlers
  const handlePrevRhythm = () => {
    const list = filteredRhythms.length > 0 ? filteredRhythms : rhythms;
    const currentIndex = list.findIndex((r) => r.id === project.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    onSelectProject(list[prevIndex]);
  };

  const handleNextRhythm = () => {
    const list = filteredRhythms.length > 0 ? filteredRhythms : rhythms;
    const currentIndex = list.findIndex((r) => r.id === project.id);
    const nextIndex = (currentIndex + 1) % list.length;
    onSelectProject(list[nextIndex]);
  };

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [isTapActive, setIsTapActive] = useState(false);

  const handleTapTempo = () => {
    setIsTapActive(true);
    setTimeout(() => setIsTapActive(false), 120);

    const now = Date.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    tapTimesRef.current = recent;

    if (recent.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < recent.length; i++) {
        intervals.push(recent[i] - recent[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      if (avgMs > 0) {
        const calculatedBpm = Math.round(60000 / avgMs);
        const clamped = Math.max(40, Math.min(260, calculatedBpm));
        onBpmChange(clamped);
      }
    }
  };

  // Beats per measure according to timeSignature (migrates any legacy 2/4 to 4/4)
  const effectiveTimeSig =
    !project.timeSignature || (project.timeSignature as string) === '2/4'
      ? '4/4'
      : project.timeSignature;
  const numBeats = parseInt(effectiveTimeSig.split('/')[0] || '4', 10);
  const beatsArray = Array.from({ length: Math.max(1, numBeats) }, (_, i) => i + 1);

  // Derive active part state
  const isPartA = basePartId === 'verse';
  const isPartB = basePartId === 'part_b';
  const isPartC = basePartId === 'part_c';

  const getTransitionDisplayName = (id: string | null) => {
    switch (id) {
      case 'transition_b_c':
        return 'TRANSIÇÃO B ➔ C';
      case 'transition_c_b':
        return 'TRANSIÇÃO C ➔ B';
      case 'transition_c_a':
        return 'TRANSIÇÃO C ➔ A';
      case 'transition_a_c':
        return 'TRANSIÇÃO A ➔ C';
      case 'transition_b_a':
        return 'TRANSIÇÃO B ➔ A';
      case 'transition_a_b':
      default:
        return 'TRANSIÇÃO A ➔ B';
    }
  };

  return (
    <div
      ref={liveScrollRef}
      onScroll={handleMobileLiveScroll}
      onTouchStart={() => {
        isTouchScrollingRef.current = true;
      }}
      onTouchEnd={() => {
        window.setTimeout(() => {
          isTouchScrollingRef.current = false;
        }, 200);
      }}
      className="mobile-live-scroll relative h-[100dvh] max-h-[100dvh] w-screen overflow-x-hidden overflow-y-auto flex flex-col bg-[#070b14]"
    >
      <input
        ref={pedalInputRef}
        type="text"
        inputMode="none"
        data-pedal-input="true"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value=""
        onChange={() => {}}
        aria-hidden="true"
        className="absolute top-0 left-0 w-px h-px opacity-0 z-0 pointer-events-none pedal-input-receiver"
      />
      <div className="sticky top-0 z-10 h-[100dvh] min-h-[100dvh] shrink-0 overflow-hidden flex flex-col justify-between bg-[#070b14] p-2 font-sans text-slate-100 sm:p-3 select-none">

      {/* 1. TOP HEADER: BRAND, PEDAL STATUS & QUICK ACTIONS (COMPACT, NO OVERFLOW) */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1 mb-1.5 bg-[#0d1424] rounded-xl border border-slate-800/80 shadow-md shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-amber-400 flex items-center justify-center font-black text-slate-950 text-[10px] sm:text-xs shadow-sm shrink-0">
            SB
          </div>
          <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white truncate">
            SB Beats Studio
          </span>
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isPlaying ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pedal Ligado / Desativado Toggle */}
          <button
            type="button"
            onClick={onTogglePedalEnabled}
            title={isPedalEnabled ? 'Pedal Ativado' : 'Pedal Desativado'}
            className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 border transition-all cursor-pointer ${
              isPedalEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPedalEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{isPedalEnabled ? 'Pedal ON' : 'Pedal OFF'}</span>
          </button>

          {/* Footswitch Settings Modal */}
          <button
            type="button"
            onClick={onOpenFootswitchModal}
            title="Configurar Pedal Cuvave Bluetooth"
            className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          {/* Local File Manager Modal (rhythms.json & samples) */}
          {onOpenLocalFileManager && (
            <button
              type="button"
              onClick={onOpenLocalFileManager}
              title="Arquivos Locais (.json de ritmos e pasta de samples)"
              className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          )}

          {/* Switch to Full Studio View on PC */}
          {onOpenStudioView && (
            <button
              type="button"
              onClick={onOpenStudioView}
              title="Abrir Sequenciador Completo (Modo Estúdio PC)"
              className="p-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* AUDIO UNLOCK PROMPT (IF BLOCKED BY BROWSER) */}
      {!isAudioUnlocked && (
        <button
          type="button"
          onClick={onUnlockAudio}
          className="mb-1 py-1 px-2.5 rounded-lg bg-amber-400/20 border border-amber-400/60 text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1.5 shrink-0 animate-pulse cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Toque aqui para ativar o áudio no celular/tablet</span>
        </button>
      )}

      {/* 2. RHYTHM NAVIGATION BAR (EXACT MATCH WITH IMAGE PROTOTYPE: N. RITMO, CATEGORY, ARROWS & COMBO) */}
      <div className="bg-[#0b1222] border-2 border-slate-800 rounded-xl p-1.5 sm:p-2 mb-1.5 flex flex-col gap-1.5 shadow-md shrink-0">
        {/* Top line: N. Ritmo Button + Title + Category + TimeSignature */}
        <div className="flex items-center gap-2">
          {/* N. Ritmo Numeric Keypad Button */}
          <button
            type="button"
            onClick={() => setIsNumberModalOpen(true)}
            title="Digitar número do ritmo no teclado numérico"
            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 border-2 border-amber-400 text-amber-300 rounded-xl flex flex-col items-center justify-center cursor-pointer shadow-sm min-w-[54px] shrink-0"
          >
            <span className="text-base sm:text-lg font-black font-mono leading-none">
              {currentGlobalIndex > 0 ? String(currentGlobalIndex).padStart(2, '0') : '01'}
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-tight text-amber-400/90 leading-tight">
              N. Ritmo
            </span>
          </button>

          {/* Current Rhythm Name & Badges */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-black text-white truncate tracking-wide">
                {project.name.replace(/\s*\(\d+.*?\)/g, '').trim()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-blue-950/80 border border-blue-500/50 text-blue-300 rounded font-mono">
                {currentCategoryName}
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-mono">
                {effectiveTimeSig}
              </span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">
                {project.bpm} BPM
              </span>
            </div>
          </div>

          {/* Quick Step Arrows: Anterior & Próximo */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePrevRhythm}
              title="Ritmo Anterior"
              className="p-1.5 sm:p-2 bg-[#141d33] hover:bg-slate-700 active:scale-90 border border-slate-700 text-slate-200 rounded-lg cursor-pointer flex items-center justify-center transition-transform"
            >
              <ChevronLeft className="w-4 h-4 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={handleNextRhythm}
              title="Próximo Ritmo"
              className="p-1.5 sm:p-2 bg-[#141d33] hover:bg-slate-700 active:scale-90 border border-slate-700 text-slate-200 rounded-lg cursor-pointer flex items-center justify-center transition-transform"
            >
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Bottom line: Category Filter Dropdown & Rhythm Combo Select */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Category Filter Select */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                const newCat = e.target.value;
                setSelectedCategory(newCat);
                if (newCat !== 'Todas') {
                  const match = rhythms.find((r) => getRhythmCategory(r) === newCat);
                  if (match) onSelectProject(match);
                }
              }}
              className="w-full bg-[#11192e] text-blue-200 font-bold text-[11px] sm:text-xs px-2 py-1.5 rounded-lg border border-blue-500/40 focus:outline-none appearance-none cursor-pointer pr-5 truncate shadow-inner"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-slate-900 text-white font-medium">
                  📁 {cat}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-blue-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>

          {/* Rhythm Combo Select */}
          <div className="relative">
            <select
              value={project.id}
              onChange={(e) => {
                const sel = rhythms.find((r) => r.id === e.target.value);
                if (sel) onSelectProject(sel);
              }}
              className="w-full bg-[#11192e] text-white font-black text-[11px] sm:text-xs px-2 py-1.5 rounded-lg border border-amber-400/50 focus:outline-none appearance-none cursor-pointer pr-5 truncate shadow-inner"
            >
              {filteredRhythms.map((r, i) => {
                const cleanName = r.name.replace(/\s*\(\d+.*?\)/g, '').trim() || r.name;
                const idxInAll = rhythms.findIndex((x) => x.id === r.id) + 1;
                return (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white font-medium">
                    {idxInAll}. {cleanName}
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-amber-400">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* 3. VOLUME & BPM CONTROLS (COMPACT, NO OVERFLOW) */}
      <div className="bg-[#0b1222] border-2 border-slate-800 rounded-xl p-1.5 sm:p-2 mb-1.5 flex items-center justify-between gap-2 shadow-md shrink-0">
        {/* Left: Volume Slider + Percentage */}
        <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
          <button
            type="button"
            onClick={() => onMasterVolumeChange(masterVolume > 0 ? 0 : 0.85)}
            className="text-slate-400 hover:text-white cursor-pointer shrink-0"
          >
            {masterVolume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-300" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
          <span className="text-xs font-black text-blue-300 min-w-[32px] text-right">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>

        {/* Right: BPM -5, -1, [BPM], +1, +5, TAP */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase hidden sm:inline">
            BPM:
          </span>
          <button
            type="button"
            onClick={() => onBpmChange(Math.max(40, project.bpm - 5))}
            className="px-1.5 py-0.5 bg-[#141d33] hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold rounded cursor-pointer"
          >
            -5
          </button>
          <button
            type="button"
            onClick={() => onBpmChange(Math.max(40, project.bpm - 1))}
            className="px-1.5 py-0.5 bg-[#141d33] hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold rounded cursor-pointer"
          >
            -1
          </button>

          <span className="px-1 text-sm sm:text-base font-black text-amber-400 font-mono tracking-wider min-w-[30px] text-center">
            {project.bpm}
          </span>

          <button
            type="button"
            onClick={() => onBpmChange(Math.min(260, project.bpm + 1))}
            className="px-1.5 py-0.5 bg-[#141d33] hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold rounded cursor-pointer"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => onBpmChange(Math.min(260, project.bpm + 5))}
            className="px-1.5 py-0.5 bg-[#141d33] hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] font-bold rounded cursor-pointer"
          >
            +5
          </button>

          <button
            type="button"
            onClick={handleTapTempo}
            className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border transition-all cursor-pointer ${
              isTapActive
                ? 'bg-amber-400 text-slate-950 border-amber-300 scale-95 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                : 'bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border-blue-500/50'
            }`}
          >
            TAP
          </button>
        </div>
      </div>

      {/* 4. BEAT / TEMPO BAR (TEMPO 1, 2, 3, 4 - COMPACT, NEVER SCROLLS) */}
      <div className="bg-[#0b1222] border-2 border-slate-800 rounded-xl p-1.5 mb-1.5 shadow-md shrink-0">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${numBeats}, 1fr)` }}>
          {beatsArray.map((beat) => {
            const isCurrent = isPlaying && currentBeat === beat;
            const isFirstBeat = beat === 1;

            return (
              <div key={beat} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tempo {beat}
                </span>
                <div
                  className={`w-full py-1 rounded-lg border text-center font-black text-xs sm:text-sm font-mono transition-all duration-75 shadow-xs ${
                    isCurrent
                      ? isFirstBeat
                        ? 'bg-amber-400 border-amber-300 text-slate-950 scale-105 shadow-[0_0_15px_rgba(245,158,11,0.8)] ring-1 ring-amber-300'
                        : 'bg-emerald-400 border-emerald-300 text-slate-950 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.8)] ring-1 ring-emerald-300'
                      : 'bg-[#131b2e] border-slate-700/80 text-slate-400'
                  }`}
                >
                  {beat}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. LIVE STATUS BADGE */}
      <div
        className={`px-2.5 py-1 rounded-xl border flex items-center justify-between text-[11px] font-black uppercase tracking-wider shadow-sm mb-1.5 shrink-0 transition-all ${
          isPlaying
            ? isPartC
              ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200'
              : isPartB
              ? 'bg-blue-950/80 border-blue-400 text-blue-200'
              : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
            : 'bg-slate-900 border-slate-700 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              isPlaying ? 'bg-amber-400 animate-ping' : 'bg-cyan-400'
            }`}
          />
          <span>{isPlaying ? 'TOCANDO NO PEDAL:' : 'SELECIONADA PARA INICIAR:'}</span>
        </div>
        <span className="text-amber-300 font-extrabold text-xs">
          {isPlaying
            ? isIntro
              ? 'INTRODUÇÃO'
              : isOutro
              ? 'FINALIZAÇÃO (END)'
              : isTransition
              ? getTransitionDisplayName(activeTransitionId)
              : isFill
              ? activeFillId === 'fill_c'
                ? 'VIRADA (FILL C)'
                : activeFillId === 'fill_b'
                ? 'VIRADA (FILL B)'
                : 'VIRADA (FILL A)'
              : isPartC
              ? 'PARTE C'
              : isPartB
              ? 'PARTE B'
              : 'PARTE A'
            : selectedStartPart === 'part_c'
            ? 'PARTE C'
            : selectedStartPart === 'part_b'
            ? 'PARTE B'
            : 'PARTE A'}
        </span>
      </div>

      {/* 6. Medium-height pedal cards that adapt to the mobile viewport */}
      <div className="flex-none grid grid-cols-2 grid-rows-[auto_clamp(160px,30dvh,280px)] items-stretch gap-2 sm:gap-3">
        {/* PEDAL 1 (ESQUERDO) */}
        <div className="flex min-w-0 flex-col">
          <div className="text-[10px] sm:text-xs font-black text-slate-300 uppercase mb-0.5 text-center tracking-wider shrink-0">
            PEDAL 1 (ESQUERDO)
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              if (pedal1PointerIdRef.current !== null) return;
              e.preventDefault();
              pedal1PointerIdRef.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              onPedal1Down(false);
            }}
            onPointerUp={(e) => {
              if (pedal1PointerIdRef.current !== e.pointerId) return;
              e.preventDefault();
              pedal1PointerIdRef.current = null;
              onPedal1Up();
            }}
            onPointerCancel={(e) => {
              if (pedal1PointerIdRef.current !== e.pointerId) return;
              e.preventDefault();
              pedal1PointerIdRef.current = null;
              onPedal1Up();
            }}
            className={`h-full min-h-0 w-full touch-none overflow-hidden rounded-2xl border-4 transition-all duration-100 flex flex-col items-center justify-center p-2 sm:p-3 cursor-pointer select-none ${
              isPedal1Pressed
                ? 'bg-emerald-950/80 border-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.6)]'
                : isPlaying
                ? isOutro
                  ? 'bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  : isFill
                  ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : isIntro
                  ? 'bg-emerald-950/40 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  : 'bg-[#0a1823] border-emerald-500/80 hover:border-emerald-400 shadow-[0_4px_25px_rgba(16,185,129,0.25)]'
                : 'bg-[#0a1823] border-emerald-500 hover:border-emerald-400 shadow-[0_4px_25px_rgba(16,185,129,0.2)]'
            }`}
          >
            {/* Central Action Circle */}
            <div
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-inner mb-1 border-2 transition-transform shrink-0 ${
                isPedal1Pressed ? 'scale-90' : 'scale-100'
              } ${
                isPlaying
                  ? isOutro
                    ? 'bg-red-900/60 border-red-400'
                    : isFill
                    ? 'bg-amber-900/60 border-amber-400'
                    : isIntro
                    ? 'bg-emerald-900/60 border-emerald-400'
                    : 'bg-emerald-950 border-emerald-400'
                  : 'bg-[#0d2a20] border-emerald-400'
              }`}
            >
              {!isPlaying ? (
                <Play className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400 fill-emerald-400 ml-0.5" />
              ) : isOutro ? (
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-red-400 animate-pulse" />
              ) : isFill ? (
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-amber-400 animate-pulse" />
              ) : isIntro ? (
                <div className="w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <Disc3 className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400 animate-spin" />
              )}
            </div>

            {/* Action Title */}
            <span className="line-clamp-2 min-h-[2.5em] text-[11px] sm:text-sm font-black text-white tracking-wide uppercase text-center leading-tight">
              {!isPlaying
                ? 'TAP: TOCAR INTRO'
                : isOutro
                ? 'FINALIZANDO (END)'
                : isIntro
                ? 'PULAR INTRO ➔ A'
                : isPartC
                ? 'TAP: VIRADA (C)'
                : isPartB
                ? 'TAP: VIRADA (B)'
                : 'TAP: VIRADA (A)'}
            </span>

            {/* Subtitle / Hints */}
            <span className="text-[10px] sm:text-xs text-amber-300 font-bold mt-0.5 text-center line-clamp-1">
              {isPlaying
                ? '⚡ 2 Toques: Ending'
                : 'Toca Intro e avança para A'}
            </span>

            {/* Key Label */}
            <span className="text-[9px] text-slate-400 mt-0.5 font-mono hidden sm:inline">
              [Switch 1 • PgDn / Seta Esq]
            </span>
          </button>
        </div>

        {/* PEDAL 2 (DIREITO) */}
        <div className="flex min-w-0 flex-col">
          <div className="text-[10px] sm:text-xs font-black text-slate-300 uppercase mb-0.5 text-center tracking-wider shrink-0">
            PEDAL 2 (DIREITO)
          </div>
          <button
            type="button"
            onPointerDown={(e) => {
              if (pedal2PointerIdRef.current !== null) return;
              e.preventDefault();
              pedal2PointerIdRef.current = e.pointerId;
              e.currentTarget.setPointerCapture(e.pointerId);
              onPedal2Down();
            }}
            onPointerUp={(e) => {
              if (pedal2PointerIdRef.current !== e.pointerId) return;
              e.preventDefault();
              pedal2PointerIdRef.current = null;
              onPedal2Up();
            }}
            onPointerCancel={(e) => {
              if (pedal2PointerIdRef.current !== e.pointerId) return;
              e.preventDefault();
              pedal2PointerIdRef.current = null;
              onPedal2Up();
            }}
            className={`h-full min-h-0 w-full touch-none overflow-hidden rounded-2xl border-4 transition-all duration-100 flex flex-col items-center justify-center p-2 sm:p-3 cursor-pointer select-none ${
              isPedal2Pressed
                ? 'bg-blue-950/80 border-blue-300 shadow-[0_0_30px_rgba(59,130,246,0.6)]'
                : isPlaying
                ? isTransition
                  ? 'bg-purple-950/50 border-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                  : 'bg-[#0f172e] border-blue-500/80 hover:border-blue-400 shadow-[0_4px_25px_rgba(59,130,246,0.25)]'
                : 'bg-[#0f172e] border-blue-500 hover:border-blue-400 shadow-[0_4px_25px_rgba(59,130,246,0.2)]'
            }`}
          >
            {/* Central Action Circle */}
            <div
              className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-inner mb-1 border-2 transition-transform shrink-0 ${
                isPedal2Pressed ? 'scale-90' : 'scale-100'
              } bg-[#182342] border-blue-400`}
            >
              <ArrowRightLeft className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />
            </div>

            {/* Action Title */}
            <span className="line-clamp-2 min-h-[2.5em] text-[11px] sm:text-sm font-black text-white tracking-wide uppercase text-center leading-tight">
              {!isPlaying
                ? `TAP: MUDAR P/ ${
                    selectedStartPart === 'verse'
                      ? 'PARTE B'
                      : selectedStartPart === 'part_b'
                      ? 'PARTE C'
                      : 'PARTE A'
                  }`
                : isTransition
                ? getTransitionDisplayName(activeTransitionId)
                : isPartB
                ? '1 TOQUE: B ➔ C'
                : isPartC
                ? '1 TOQUE: C ➔ A'
                : 'TAP: TRANS A ➔ B'}
            </span>

            {/* Subtitle / Hints */}
            <span className="text-[10px] sm:text-xs text-blue-300 font-bold mt-0.5 text-center line-clamp-1">
              {!isPlaying
                ? `Selecionada: ${
                    selectedStartPart === 'part_c'
                      ? 'Parte C'
                      : selectedStartPart === 'part_b'
                      ? 'Parte B'
                      : 'Parte A'
                  }`
                : isPartB
                ? '1 toque: C • ⚡ 2 toques: A'
                : isPartC
                ? '1 toque: A • ⚡ 2 toques: B'
                : 'Transita de A para B'}
            </span>

            {/* Key Label */}
            <span className="text-[9px] text-slate-400 mt-0.5 font-mono hidden sm:inline">
              [Switch 2 • PgUp / Seta Dir]
            </span>
          </button>
        </div>
      </div>
      </div>

      {/* 7. NUMERIC KEYPAD MODAL (NÚMERO RITMO) */}
      <RhythmNumberModal
        isOpen={isNumberModalOpen}
        onClose={() => setIsNumberModalOpen(false)}
        rhythms={rhythms}
        currentRhythmId={project.id}
        onSelectRhythm={onSelectProject}
      />
      <div aria-hidden="true" className="h-24 shrink-0 pointer-events-none" />
    </div>
  );
};
