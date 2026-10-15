/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, Disc3 } from 'lucide-react';
import { StarterKitType } from '../presets/groovePresets';
import { TimeSignature, RhythmicResolution, TrackDefinition } from '../types/rhythm';
import { getUserDrumKits } from '../services/kitStorage';
import { DrumKitDefinition } from '../types/kit';

interface CreateRhythmModalProps {
  onClose: () => void;
  onCreate: (params: {
    name: string;
    genre: string;
    bpm: number;
    timeSignature: TimeSignature;
    starterKit: StarterKitType;
    resolution?: RhythmicResolution;
    barsCount?: number;
    customKitTracks?: TrackDefinition[];
  }) => void;
  isPedalEnabled?: boolean;
  onTogglePedalEnabled?: () => void;
}

export const CreateRhythmModal: React.FC<CreateRhythmModalProps> = ({
  onClose,
  onCreate,
  isPedalEnabled = true,
  onTogglePedalEnabled,
}) => {
  const [name, setName] = useState('Meu Novo Ritmo');
  const [genre, setGenre] = useState('Personalizado');
  const [bpm, setBpm] = useState(115);
  const [timeSignature, setTimeSignature] = useState<TimeSignature>('4/4');
  const [starterKit, setStarterKit] = useState<string>('brazilian');
  const [userKits] = useState<DrumKitDefinition[]>(() => getUserDrumKits());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const matchedCustomKit = userKits.find((k) => k.id === starterKit);

    onCreate({
      name: name.trim(),
      genre,
      bpm,
      timeSignature,
      starterKit: matchedCustomKit ? 'empty' : (starterKit as StarterKitType),
      customKitTracks: matchedCustomKit ? matchedCustomKit.tracks : undefined,
      resolution: '1/32',
      barsCount: 1,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Criar Novo Ritmo
              </h3>
              <p className="text-xs text-slate-400">
                Configure as propriedades iniciais e o kit do novo ritmo
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

        {/* Informative helper for text input */}
        <div className="mx-6 mt-4 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-2 text-[11px] text-emerald-300">
          <div className="flex items-center gap-2">
            <span className="text-sm">⌨️</span>
            <span>
              <strong>Digitação Liberada:</strong> As teclas <strong>A</strong>, <strong>D</strong>, espaço e números funcionam normalmente para digitar o nome.
            </span>
          </div>
          {onTogglePedalEnabled && (
            <button
              type="button"
              onClick={onTogglePedalEnabled}
              className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded border transition-colors cursor-pointer ${
                isPedalEnabled
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-rose-900/60 border-rose-500/60 text-rose-200'
              }`}
            >
              {isPedalEnabled ? 'Desativar Pedal' : 'Pedal Desativado ✓'}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4 text-xs">
          {/* Nome do Ritmo */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Nome do Ritmo:
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Forró de Serra, Funk Carioca..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Gênero e BPM em 2 colunas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Gênero / Estilo:
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="Personalizado">Personalizado</option>
                <option value="Samba / MPB">Samba / MPB</option>
                <option value="Forró / Baião">Forró / Baião</option>
                <option value="Afro-Cubano / Latino">Afro-Cubano / Latino</option>
                <option value="Rock / Pop">Rock / Pop</option>
                <option value="Funk / Soul">Funk / Soul</option>
                <option value="Reggae / Dub">Reggae / Dub</option>
                <option value="Jazz / Blues">Jazz / Blues</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Tempo (BPM):
              </label>
              <input
                type="number"
                min={40}
                max={260}
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-400 text-center"
              />
            </div>
          </div>

          {/* Compasso */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Fórmula de Compasso:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['4/4', '3/4', '6/8', '7/8', '5/4', '12/8'] as TimeSignature[]).map((sig) => (
                <button
                  key={sig}
                  type="button"
                  onClick={() => setTimeSignature(sig)}
                  className={`py-2 rounded-lg font-mono font-bold border transition-colors cursor-pointer text-xs sm:text-sm ${
                    timeSignature === sig
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sig}
                </button>
              ))}
            </div>
          </div>

          {/* Estrutura Fixa */}
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Estrutura Rítmica:</span>
            <span className="text-amber-300 font-mono font-bold">1 Compasso (Fusa 1/32)</span>
          </div>

          {/* Kit Inicial */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Kit Inicial de Percussão / Bateria
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {/* User Saved Kits */}
              {userKits.length > 0 && (
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mt-1 mb-1">
                  ⭐ Seus Kits Salvos na Memória
                </div>
              )}
              {userKits.map((kit) => (
                <label
                  key={kit.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    starterKit === kit.id
                      ? 'bg-amber-500/15 border-amber-400'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="starterKit"
                    value={kit.id}
                    checked={starterKit === kit.id}
                    onChange={() => setStarterKit(kit.id)}
                    className="mt-0.5 accent-amber-400"
                  />
                  <div>
                    <span className="font-bold text-amber-300 block">{kit.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {kit.description || `${kit.tracks.length} instrumentos`}
                    </span>
                  </div>
                </label>
              ))}

              {/* Factory Kits */}
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-2 mb-1">
                🥁 Kits Padrão de Estúdio
              </div>
              {[
                {
                  id: 'brazilian',
                  label: 'Kit Percussão Brasileira (WAV HD)',
                  desc: 'Surdo Grave, Pandeiro Grave/Tapa, Tamborim e Ganzá',
                },
                {
                  id: 'latin',
                  label: 'Kit Afro-Cubano & Latino',
                  desc: 'Clave Son 3:2, Congas (Aguda e Grave), Cowbell e Shaker',
                },
                {
                  id: 'rock',
                  label: 'Kit Bateria Rock / Pop',
                  desc: 'Bumbo, Caixa, Chimbal Fechado/Aberto e Prato Crash',
                },
                {
                  id: 'percussion',
                  label: 'Kit Percussão Mundial',
                  desc: 'Tambor Grave, Tambor Slap, Bloco de Madeira, Shaker e Palmas',
                },
                {
                  id: 'empty',
                  label: 'Kit Vazio (Sem Pistas)',
                  desc: 'Comece do zero adicionando seus próprios instrumentos e samples',
                },
              ].map((kit) => (
                <label
                  key={kit.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    starterKit === kit.id
                      ? 'bg-amber-500/10 border-amber-400/60'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="starterKit"
                    value={kit.id}
                    checked={starterKit === kit.id}
                    onChange={() => setStarterKit(kit.id)}
                    className="mt-0.5 accent-amber-400"
                  />
                  <div>
                    <span className="font-bold text-white block">{kit.label}</span>
                    <span className="text-[11px] text-slate-400">{kit.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Criar Ritmo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
