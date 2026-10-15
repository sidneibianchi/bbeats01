/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Sequencer Grid with per-track volume controls, mixer console, custom color selector,
 * clean sample descriptions (no 'sample' prefix), and click-and-drag vertical velocity editing.
 */

import React, { useState, useRef } from 'react';
import {
  Sliders,
  Trash2,
  Plus,
  Play,
  Sparkles,
  Volume2,
  Palette,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { SongPartId, StepData, TrackDefinition, RhythmicResolution } from '../types/rhythm';

export const TRACK_PALETTE = [
  '#ef4444', // Vermelho
  '#f97316', // Laranja
  '#f59e0b', // Âmbar
  '#eab308', // Amarelo
  '#10b981', // Esmeralda
  '#14b8a6', // Teal
  '#06b6d4', // Ciano
  '#0ea5e9', // Azul Céu
  '#3b82f6', // Azul
  '#6366f1', // Índigo
  '#8b5cf6', // Violeta
  '#d946ef', // Fúcsia
  '#ec4899', // Rosa
  '#f43f5e', // Rosa Intenso
];

interface SequencerGridProps {
  tracks: TrackDefinition[];
  partSteps: Record<string, StepData[]>;
  partStepCounts?: Record<string, number>;
  activePartId: SongPartId;
  playingTick: number;
  activeTrackSteps: Record<string, number>;
  isPlaying: boolean;
  resolution?: RhythmicResolution;
  barsCount?: number;
  timeSignature?: string;
  onResolutionChange?: (res: RhythmicResolution) => void;
  onBarsCountChange?: (bars: number) => void;
  onToggleStep: (trackId: string, stepIndex: number) => void;
  onUpdateStep: (trackId: string, stepIndex: number, stepData: Partial<StepData>) => void;
  onUpdateTrackLength: (trackId: string, newLength: number) => void;
  onUpdateTrackVolume: (trackId: string, vol: number) => void;
  onUpdateTrackPan: (trackId: string, pan: number) => void;
  onUpdateTrackColor?: (trackId: string, color: string) => void;
  onToggleTrackMute: (trackId: string) => void;
  onToggleTrackSolo: (trackId: string) => void;
  onTriggerTrack: (trackDef: TrackDefinition) => void;
  onOpenTrackSettings: (trackDef: TrackDefinition) => void;
  onDeleteTrack: (trackId: string) => void;
  onRemoveTrackSample?: (trackId: string) => void;
  onAddTrackClick: () => void;
}

export const SequencerGrid: React.FC<SequencerGridProps> = ({
  tracks,
  partSteps,
  partStepCounts: _partStepCounts,
  activePartId: _activePartId,
  playingTick: _playingTick,
  activeTrackSteps,
  isPlaying,
  resolution: _resolution = '1/32',
  barsCount = 1,
  timeSignature = '4/4',
  onResolutionChange: _onResolutionChange,
  onBarsCountChange: _onBarsCountChange,
  onToggleStep,
  onUpdateStep,
  onUpdateTrackLength: _onUpdateTrackLength,
  onUpdateTrackVolume,
  onUpdateTrackPan,
  onUpdateTrackColor,
  onToggleTrackMute,
  onToggleTrackSolo,
  onTriggerTrack,
  onOpenTrackSettings,
  onDeleteTrack,
  onRemoveTrackSample,
  onAddTrackClick,
}) => {
  // Currently inspected step for micro-editing modal
  const [inspectedStep, setInspectedStep] = useState<{
    trackId: string;
    stepIndex: number;
  } | null>(null);

  // Mixer console view toggle
  const [isMixerOpen, setIsMixerOpen] = useState(false);

  // Color picker popover track ID
  const [colorPickerTrackId, setColorPickerTrackId] = useState<string | null>(null);

  // Velocity click-and-drag state
  const [draggingStep, setDraggingStep] = useState<{
    trackId: string;
    stepIndex: number;
    startY: number;
    startVelocity: number;
    currentVelocity: number;
    hasMoved: boolean;
  } | null>(null);

  const dragRef = useRef(draggingStep);
  dragRef.current = draggingStep;

  // Fusa por padrão (8 subdivisões por tempo / 1/32)
  const subPerBeat = 8;
  const beatsPerBar =
    timeSignature === '3/4'
      ? 3
      : timeSignature === '5/4'
      ? 5
      : timeSignature === '7/8'
      ? 7
      : timeSignature === '6/8'
      ? 6
      : timeSignature === '12/8'
      ? 12
      : 4;

  const stepsPerBar =
    timeSignature === '3/4'
      ? 3 * subPerBeat
      : timeSignature === '6/8'
      ? Math.max(6, Math.round(6 * (subPerBeat / 2)))
      : timeSignature === '7/8'
      ? Math.max(7, Math.round(7 * (subPerBeat / 2)))
      : timeSignature === '12/8'
      ? Math.max(12, Math.round(12 * (subPerBeat / 4)))
      : beatsPerBar * subPerBeat;

  const totalBars = barsCount || 1;
  const totalDisplaySteps = Math.min(64, stepsPerBar * totalBars);

  // Handle pointer down for vertical velocity dragging
  const handleStepPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    trackId: string,
    stepIdx: number
  ) => {
    if (e.button !== 0) return; // Left click / touch only
    const currentStep = partSteps[trackId]?.[stepIdx];
    const initialVel = currentStep?.velocity ?? 90;
    const isActive = currentStep?.active ?? false;

    // If step was inactive, activate it right away
    if (!isActive) {
      onToggleStep(trackId, stepIdx);
    }

    setDraggingStep({
      trackId,
      stepIndex: stepIdx,
      startY: e.clientY,
      startVelocity: initialVel,
      currentVelocity: initialVel,
      hasMoved: false,
    });

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleStepPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!draggingStep) return;
    const deltaY = draggingStep.startY - e.clientY;

    if (Math.abs(deltaY) > 2) {
      const velDelta = Math.round(deltaY * 1.3);
      const newVelocity = Math.max(1, Math.min(127, draggingStep.startVelocity + velDelta));

      setDraggingStep((prev) => (prev ? { ...prev, currentVelocity: newVelocity, hasMoved: true } : null));

      onUpdateStep(draggingStep.trackId, draggingStep.stepIndex, {
        velocity: newVelocity,
        active: true,
      });
    }
  };

  const handleStepPointerUp = (
    e: React.PointerEvent<HTMLButtonElement>,
    trackId: string,
    stepIdx: number
  ) => {
    if (!draggingStep) return;

    // If it was a simple tap without dragging, toggle step off if it was active
    if (!draggingStep.hasMoved) {
      const currentStep = partSteps[trackId]?.[stepIdx];
      if (currentStep?.active) {
        onToggleStep(trackId, stepIdx);
      }
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    setDraggingStep(null);
  };

  return (
    <div className="flex-1 overflow-x-auto p-4 sm:p-6 bg-[#090d16] select-none">
      <div className="min-w-[960px] space-y-3">
        {/* Top Control Bar: Mixer Console Toggle & Velocity Drag Hint */}
        <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMixerOpen(!isMixerOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-xs ${
                isMixerOpen
                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-slate-900 text-slate-200 hover:text-white border-slate-700 hover:bg-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-current" />
              <span>{isMixerOpen ? 'Ocultar Mixer de Pistas' : '🎚️ Abrir Mixer de Pistas'}</span>
            </button>

            <span className="text-[11px] text-slate-400 hidden md:inline">
              ⚡ <strong>Dica de Velocity:</strong> Clique e arraste para <strong>cima/baixo</strong> em qualquer nota para ajustar a dinâmica (1-127).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">
              {tracks.length} Pistas ativas
            </span>
          </div>
        </div>

        {/* STUDIO MIXER CONSOLE (EXPANDABLE PANEL) */}
        {isMixerOpen && (
          <div className="bg-[#0b1222] border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-white">
                  Mesa de Som (Mixer Virtual de Pistas)
                </span>
                <span className="text-[11px] text-slate-400">
                  Ajuste fino de volume individual (0% a 150%) e estéreo (Pan L/R)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMixerOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ✕ Fechar Mixer
              </button>
            </div>

            {/* Mixer Channel Strips Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 overflow-x-auto py-2">
              {tracks.map((track) => {
                const sampleName = (track.customSampleName || track.name)
                  .replace(/\.[^/.]+$/, '')
                  .trim();
                const volPct = Math.round((track.volume ?? 0.9) * 100);

                return (
                  <div
                    key={track.id}
                    className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2 relative shadow-md"
                    style={{ borderTopColor: track.color, borderTopWidth: 3 }}
                  >
                    {/* Track audition button */}
                    <button
                      type="button"
                      title="Ouvir som deste instrumento"
                      onClick={() => onTriggerTrack(track)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-slate-700 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                      style={{ backgroundColor: `${track.color}25`, borderColor: track.color }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" style={{ color: track.color }} />
                    </button>

                    {/* Clean Instrument Name (no 'sample' prefix) */}
                    <span
                      className="text-xs font-bold text-white text-center truncate w-full"
                      title={sampleName}
                    >
                      {sampleName}
                    </span>

                    {/* Vertical Volume Slider (Fader) */}
                    <div className="h-32 flex items-center justify-center py-2 relative w-full">
                      <input
                        type="range"
                        min={0}
                        max={1.5}
                        step={0.01}
                        value={track.volume ?? 0.9}
                        onChange={(e) => onUpdateTrackVolume(track.id, Number(e.target.value))}
                        className="h-28 -rotate-90 appearance-none bg-slate-800 rounded-lg cursor-pointer accent-amber-400 w-28"
                      />
                    </div>

                    {/* Volume readout */}
                    <span className="text-xs font-mono font-bold text-amber-400 bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                      {volPct}%
                    </span>

                    {/* Pan control */}
                    <div className="w-full text-center space-y-1">
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Pan:{' '}
                        {track.pan
                          ? track.pan > 0
                            ? `R${Math.round(track.pan * 100)}`
                            : `L${Math.round(Math.abs(track.pan) * 100)}`
                          : 'C'}
                      </span>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.1}
                        value={track.pan ?? 0}
                        onChange={(e) => onUpdateTrackPan?.(track.id, Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 accent-cyan-400 rounded cursor-pointer"
                      />
                    </div>

                    {/* Mute and Solo */}
                    <div className="flex items-center gap-1.5 w-full justify-center pt-1">
                      <button
                        type="button"
                        onClick={() => onToggleTrackMute(track.id)}
                        className={`w-7 h-6 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          track.muted
                            ? 'bg-rose-500 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleTrackSolo(track.id)}
                        className={`w-7 h-6 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          track.solo
                            ? 'bg-amber-400 text-slate-950 font-black'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        S
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step Numbers & Bars Header */}
        <div className="space-y-1 pb-1 border-b border-slate-800/80">
          {/* Compassos (Bars) Banner Row */}
          <div className="flex items-center gap-2">
            <div className="w-[300px] shrink-0 text-xs font-semibold text-slate-400 pl-2">
              Divisão de Compassos
            </div>
            <div
              className="flex-1 gap-1"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${totalDisplaySteps}, minmax(22px, 1fr))`,
              }}
            >
              {Array.from({ length: totalBars }, (_, bIdx) => {
                const barStart = bIdx * stepsPerBar;
                const barSpan = Math.min(stepsPerBar, totalDisplaySteps - barStart);
                if (barSpan <= 0) return null;
                return (
                  <div
                    key={bIdx}
                    style={{ gridColumn: `span ${barSpan}` }}
                    className={`py-1 text-center font-bold text-[11px] rounded-md border flex items-center justify-center gap-1.5 transition-colors ${
                      bIdx % 2 === 0
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                        : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    <span>Compasso #{bIdx + 1}</span>
                    <span className="text-[10px] opacity-75 font-mono">
                      (Notas {barStart + 1} a {barStart + barSpan})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Step Numbers & Beats */}
          <div className="flex items-center gap-2">
            <div className="w-[300px] shrink-0 text-[11px] text-slate-500 pl-2 font-mono">
              Tempo / Subdivisão
            </div>
            <div
              className="flex-1 gap-1 font-mono text-[10px] text-slate-400 text-center"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${totalDisplaySteps}, minmax(22px, 1fr))`,
              }}
            >
              {Array.from({ length: totalDisplaySteps }, (_, i) => {
                const isDownbeat = i % subPerBeat === 0;
                const barNum = Math.floor(i / stepsPerBar) + 1;
                const beatNum = Math.floor((i % stepsPerBar) / subPerBeat) + 1;
                const subInBeat = (i % subPerBeat) + 1;

                return (
                  <div
                    key={i}
                    title={`Compasso ${barNum}, Tempo ${beatNum}.${subInBeat} (Nota #${i + 1})`}
                    className={`py-0.5 rounded truncate px-0.5 ${
                      isDownbeat
                        ? 'bg-slate-800/90 text-amber-300 font-bold border border-slate-700/80 shadow-xs'
                        : 'bg-slate-950/40 text-slate-500'
                    }`}
                  >
                    <span>
                      {`${beatNum}.${subInBeat}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tracks List */}
        {tracks.map((track) => {
          const steps = partSteps[track.id] || [];
          const activeStepIdx = activeTrackSteps[track.id];
          const sampleDisplayName = (track.customSampleName || track.name)
            .replace(/\.[^/.]+$/, '')
            .trim();
          const volPct = Math.round((track.volume ?? 0.9) * 100);

          return (
            <div
              key={track.id}
              className="group flex items-center gap-2 p-2 rounded-xl bg-[#0f172a]/90 hover:bg-[#131d35] border border-slate-800 transition-colors"
            >
              {/* Track Controls (Left Panel - W: 300px) */}
              <div className="w-[300px] shrink-0 flex items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 relative">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Audition Button */}
                  <button
                    type="button"
                    title="Ouvir som deste instrumento"
                    onClick={() => onTriggerTrack(track)}
                    className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 border border-slate-700 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: `${track.color}25`, borderColor: track.color }}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" style={{ color: track.color }} />
                  </button>

                  {/* Color Selector Circle */}
                  <div className="relative">
                    <button
                      type="button"
                      title="Escolher cor desta pista"
                      onClick={() =>
                        setColorPickerTrackId(colorPickerTrackId === track.id ? null : track.id)
                      }
                      className="w-4 h-4 rounded-full border border-white/40 hover:scale-110 transition-transform cursor-pointer shadow-xs shrink-0"
                      style={{ backgroundColor: track.color }}
                    />

                    {/* Color Palette Popover */}
                    {colorPickerTrackId === track.id && (
                      <div className="absolute top-6 left-0 z-50 p-2 bg-[#0d1627] border border-slate-700 rounded-xl shadow-2xl grid grid-cols-7 gap-1.5 w-44 animate-fade-in">
                        {TRACK_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              onUpdateTrackColor?.(track.id, c);
                              setColorPickerTrackId(null);
                            }}
                            className={`w-5 h-5 rounded-md transition-transform hover:scale-115 cursor-pointer ${
                              track.color === c ? 'ring-2 ring-white scale-110' : ''
                            }`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clean Instrument Name (NO 'Sample' or 'CUSTOM' text!) */}
                  <div className="min-w-0">
                    <span
                      className="text-xs font-bold text-white truncate block max-w-[95px]"
                      title={sampleDisplayName}
                    >
                      {sampleDisplayName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {volPct}%
                    </span>
                  </div>
                </div>

                {/* Inline Volume Slider + Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Inline Volume Slider */}
                  <div className="flex items-center gap-1 w-20" title={`Volume: ${volPct}%`}>
                    <Volume2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <input
                      type="range"
                      min={0}
                      max={1.5}
                      step={0.02}
                      value={track.volume ?? 0.9}
                      onChange={(e) => onUpdateTrackVolume(track.id, Number(e.target.value))}
                      className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  {/* Mute button */}
                  <button
                    type="button"
                    title={track.muted ? 'Desmutar' : 'Mutar'}
                    onClick={() => onToggleTrackMute(track.id)}
                    className={`w-6 h-6 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      track.muted
                        ? 'bg-rose-500 text-slate-950 font-extrabold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    M
                  </button>

                  {/* Solo button */}
                  <button
                    type="button"
                    title={track.solo ? 'Desativar Solo' : 'Solo'}
                    onClick={() => onToggleTrackSolo(track.id)}
                    className={`w-6 h-6 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                      track.solo
                        ? 'bg-amber-400 text-slate-950 font-extrabold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    S
                  </button>

                  {/* Sound & Sample Editor Settings */}
                  <button
                    type="button"
                    title="Ajustar som ou trocar sample"
                    onClick={() => onOpenTrackSettings(track)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" />
                  </button>

                  {/* Delete track */}
                  {tracks.length > 1 && (
                    <button
                      type="button"
                      title="Excluir pista"
                      onClick={() => onDeleteTrack(track.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Step Pads Matrix with Vertical Drag Velocity */}
              <div
                className="flex-1 gap-1"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${totalDisplaySteps}, minmax(22px, 1fr))`,
                }}
              >
                {Array.from({ length: totalDisplaySteps }, (_, stepIdx) => {
                  const step = steps[stepIdx];
                  const isActive = step?.active ?? false;
                  const isPlayhead = isPlaying && activeStepIdx === stepIdx;
                  const isBeatDown = stepIdx % subPerBeat === 0;

                  // Dynamic velocity visuals
                  const velocity = step?.velocity ?? 90;
                  const isAccent = isActive && velocity >= 115;
                  const isGhost = isActive && velocity <= 65;
                  const ratchet = step?.ratchet ?? 1;

                  const isDraggingThisStep =
                    draggingStep?.trackId === track.id && draggingStep?.stepIndex === stepIdx;

                  return (
                    <button
                      key={stepIdx}
                      type="button"
                      onPointerDown={(e) => handleStepPointerDown(e, track.id, stepIdx)}
                      onPointerMove={handleStepPointerMove}
                      onPointerUp={(e) => handleStepPointerUp(e, track.id, stepIdx)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setInspectedStep({ trackId: track.id, stepIndex: stepIdx });
                      }}
                      className={`relative h-10 rounded-lg border transition-all duration-75 flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden touch-none ${
                        isActive
                          ? isAccent
                            ? 'shadow-[0_0_12px_rgba(245,158,11,0.5)] border-white text-slate-950 font-bold'
                            : isGhost
                            ? 'bg-slate-900 border-slate-700 text-slate-300'
                            : 'border-slate-300/80 text-slate-950 font-semibold'
                          : isBeatDown
                          ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                          : 'bg-slate-950/60 border-slate-900 hover:border-slate-800'
                      } ${
                        isPlayhead ? 'ring-2 ring-white scale-[1.05] z-10' : ''
                      } ${isDraggingThisStep ? 'ring-2 ring-amber-400 z-20' : ''}`}
                      style={{
                        backgroundColor: isActive
                          ? isGhost
                            ? `${track.color}25`
                            : `${track.color}40`
                          : undefined,
                      }}
                    >
                      {/* Vertical Velocity Fill Bar (Height proportional to Velocity 1-127) */}
                      {isActive && (
                        <div
                          className="absolute bottom-0 left-0 right-0 pointer-events-none transition-all duration-75"
                          style={{
                            height: `${Math.round((velocity / 127) * 100)}%`,
                            backgroundColor: track.color,
                            opacity: isGhost ? 0.45 : isAccent ? 1.0 : 0.85,
                          }}
                        />
                      )}

                      {/* Step Indicator & Drag Tooltip */}
                      {isActive && (
                        <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
                          {isDraggingThisStep ? (
                            <span className="text-[10px] font-black text-white bg-slate-950/90 px-1 rounded shadow-md border border-amber-400/80 font-mono">
                              {velocity}
                            </span>
                          ) : isAccent ? (
                            <span className="text-[9px] font-black leading-none text-slate-950 drop-shadow-xs">
                              ▲
                            </span>
                          ) : isGhost ? (
                            <span className="text-[9px] font-mono leading-none text-slate-300">
                              g
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono leading-none text-slate-900 opacity-60">
                              {velocity}
                            </span>
                          )}

                          {ratchet > 1 && (
                            <span className="text-[8px] font-bold px-1 rounded bg-black/50 text-white leading-none mt-0.5">
                              {ratchet}x
                            </span>
                          )}
                        </div>
                      )}

                      {/* Beat Dot if inactive */}
                      {!isActive && (
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isBeatDown ? 'bg-slate-700' : 'bg-slate-800'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Add Track & Percussion Button */}
        <div className="pt-3">
          <button
            type="button"
            onClick={onAddTrackClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-700 hover:border-amber-400 bg-slate-950/40 hover:bg-slate-900/60 text-slate-300 hover:text-amber-400 transition-all text-xs font-semibold cursor-pointer w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Novo Instrumento ou Enviar Sample Próprio</span>
          </button>
        </div>
      </div>

      {/* Micro Step Editor Modal */}
      {inspectedStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Micro-Edição da Nota #{inspectedStep.stepIndex + 1}</span>
              </h4>
              <button
                type="button"
                onClick={() => setInspectedStep(null)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 cursor-pointer"
              >
                ✕ Fechar
              </button>
            </div>

            {(() => {
              const currentStep =
                partSteps[inspectedStep.trackId]?.[inspectedStep.stepIndex] || {
                  active: true,
                  velocity: 90,
                  probability: 1.0,
                  ratchet: 1,
                };

              return (
                <div className="space-y-4 text-xs">
                  {/* Active Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Ativar Passo:</span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateStep(inspectedStep.trackId, inspectedStep.stepIndex, {
                          active: !currentStep.active,
                        })
                      }
                      className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                        currentStep.active
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {currentStep.active ? 'ATIVADO' : 'DESATIVADO'}
                    </button>
                  </div>

                  {/* Velocity Slider */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Velocidade / Dinâmica (1-127):</span>
                      <span className="font-mono text-amber-400 font-bold">
                        {currentStep.velocity}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={127}
                      value={currentStep.velocity}
                      onChange={(e) =>
                        onUpdateStep(inspectedStep.trackId, inspectedStep.stepIndex, {
                          velocity: Number(e.target.value),
                          active: true,
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>Ghost (50)</span>
                      <span>Normal (90)</span>
                      <span>Acento (125)</span>
                    </div>
                  </div>

                  {/* Ratchet / Flam / Roll */}
                  <div>
                    <span className="text-slate-300 block mb-1.5">
                      Subdivisão / Rulo (Ratchet / Flam):
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() =>
                            onUpdateStep(inspectedStep.trackId, inspectedStep.stepIndex, {
                              ratchet: r,
                              active: true,
                            })
                          }
                          className={`py-1.5 rounded text-center font-bold cursor-pointer transition-colors ${
                            currentStep.ratchet === r
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          {r === 1 ? 'Normal' : `${r}x Rulo`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Probability */}
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Probabilidade de Disparo:</span>
                      <span className="font-mono text-amber-400">
                        {Math.round((currentStep.probability ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={currentStep.probability ?? 1}
                      onChange={(e) =>
                        onUpdateStep(inspectedStep.trackId, inspectedStep.stepIndex, {
                          probability: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
