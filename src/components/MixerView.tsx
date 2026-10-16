/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { SongProject } from '../types/rhythm';

interface MixerViewProps {
  project: SongProject;
  onUpdateTrackVolume: (trackId: string, volume: number) => void;
  onUpdateTrackPan: (trackId: string, pan: number) => void;
}

const getPanLabel = (pan: number) => {
  if (Math.abs(pan) < 0.05) return 'C';
  return `${pan < 0 ? 'L' : 'R'}${Math.round(Math.abs(pan) * 100)}`;
};

export const MixerView: React.FC<MixerViewProps> = ({
  project,
  onUpdateTrackVolume,
  onUpdateTrackPan,
}) => (
  <section className="flex-1 p-3 sm:p-6">
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-[#0b101d] p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white sm:text-lg">Mixer</h1>
            <p className="truncate text-xs text-slate-400">{project.name}</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Ajuste o volume e a posição estéreo (pan) de cada peça. As alterações ficam salvas neste
          ritmo.
        </p>
      </div>

      {project.tracks.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0b101d] p-6 text-center text-sm text-slate-400">
          Este ritmo ainda não tem trilhas para ajustar.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {project.tracks.map((track) => {
            const volume = track.volume ?? 0.9;
            const volumePercent = Math.round(volume * 100);
            const pan = track.pan ?? 0;
            const trackName = (track.customSampleName || track.name)
              .replace(/\.[^/.]+$/, '')
              .trim();

            return (
              <div
                key={track.id}
                className="flex min-w-0 flex-col items-center rounded-xl border border-slate-800 bg-[#0b101d] p-2.5 shadow-md sm:p-3"
                style={{ borderTopColor: track.color, borderTopWidth: 3 }}
              >
                <span
                  className="w-full truncate text-center text-xs font-bold text-white sm:text-sm"
                  title={trackName}
                >
                  {trackName}
                </span>

                <div className="mt-2 flex h-36 w-full items-center justify-center gap-2 rounded-lg bg-slate-950/70 sm:h-40">
                  <span className="font-mono text-[9px] text-slate-500">0</span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.01}
                    value={volume}
                    aria-label={`Volume de ${trackName}`}
                    aria-valuetext={`${volumePercent}%`}
                    onChange={(event) =>
                      onUpdateTrackVolume(track.id, Number(event.target.value))
                    }
                    className="h-28 w-8 cursor-pointer accent-amber-400 sm:h-32"
                    style={{ writingMode: 'vertical-lr', direction: 'rtl', touchAction: 'none' }}
                  />
                  <span className="font-mono text-[9px] text-slate-500">150</span>
                </div>

                <output className="mt-2 rounded-md border border-slate-700 bg-black/40 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                  {volumePercent}%
                </output>

                <div className="mt-3 w-full space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Pan</span>
                    <output className="font-mono font-bold text-cyan-300">
                      {getPanLabel(pan)}
                    </output>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={pan}
                    aria-label={`Pan de ${trackName}`}
                    aria-valuetext={getPanLabel(pan)}
                    onChange={(event) => onUpdateTrackPan(track.id, Number(event.target.value))}
                    className="h-6 w-full cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between font-mono text-[9px] text-slate-500">
                    <span>L</span>
                    <span>C</span>
                    <span>R</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </section>
);
