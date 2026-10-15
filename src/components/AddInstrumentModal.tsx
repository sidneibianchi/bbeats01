/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Play, Upload, Trash2 } from 'lucide-react';
import { InstrumentCategory, TrackDefinition } from '../types/rhythm';
import { audioEngine } from '../audio/AudioEngine';

interface AddInstrumentModalProps {
  onClose: () => void;
  onAddTrack: (trackDef: Omit<TrackDefinition, 'id'>) => void;
  onDeleteSample?: (sampleId: string) => void;
}

interface InstrumentCatalogItem {
  name: string;
  category: InstrumentCategory;
  soundType: string;
  color: string;
  description: string;
  defaultVolume: number;
  defaultPan: number;
}

const CATALOG: InstrumentCatalogItem[] = [
  // Brazilian
  {
    name: 'Surdo (Marcação)',
    category: 'brazilian',
    soundType: 'surdo',
    color: '#ef4444',
    description: 'Tambor grave fundamental do samba e batucada',
    defaultVolume: 0.95,
    defaultPan: 0,
  },
  {
    name: 'Pandeiro',
    category: 'brazilian',
    soundType: 'pandeiro',
    color: '#f97316',
    description: 'Pele com platinelas brasileiras (choro/samba)',
    defaultVolume: 0.85,
    defaultPan: -0.2,
  },
  {
    name: 'Tamborim',
    category: 'brazilian',
    soundType: 'rimshot',
    color: '#f59e0b',
    description: 'Estalo agudo de vareta característico do samba',
    defaultVolume: 0.85,
    defaultPan: 0.3,
  },
  {
    name: 'Agogô Agudo',
    category: 'brazilian',
    soundType: 'agogo_hi',
    color: '#10b981',
    description: 'Campana aguda metálica de duas bocas',
    defaultVolume: 0.8,
    defaultPan: 0.4,
  },
  {
    name: 'Agogô Grave',
    category: 'brazilian',
    soundType: 'agogo_lo',
    color: '#06b6d4',
    description: 'Campana grave metálica de duas bocas',
    defaultVolume: 0.8,
    defaultPan: 0.35,
  },
  {
    name: 'Ganzá / Shaker',
    category: 'brazilian',
    soundType: 'shaker',
    color: '#8b5cf6',
    description: 'Chocalho de metal contínuo para levada de samba',
    defaultVolume: 0.75,
    defaultPan: -0.4,
  },
  // Afro-Cuban & Latin
  {
    name: 'Clave Son (3:2)',
    category: 'latin',
    soundType: 'clave',
    color: '#eab308',
    description: 'Bloco de madeira que ancora ritmos afro-cubanos',
    defaultVolume: 0.95,
    defaultPan: 0,
  },
  {
    name: 'Cáscara (Timbales)',
    category: 'latin',
    soundType: 'timbale',
    color: '#3b82f6',
    description: 'Batida na lateral do casco de aço do timbal',
    defaultVolume: 0.85,
    defaultPan: -0.3,
  },
  {
    name: 'Conga Aguda (Quinto)',
    category: 'latin',
    soundType: 'conga_hi',
    color: '#10b981',
    description: 'Slap e toques agudos nas congas latinas',
    defaultVolume: 0.9,
    defaultPan: 0.25,
  },
  {
    name: 'Conga Grave (Tumbadora)',
    category: 'latin',
    soundType: 'conga_lo',
    color: '#f97316',
    description: 'Grave profundo e aberto das congas (tumbao)',
    defaultVolume: 0.9,
    defaultPan: 0.35,
  },
  {
    name: 'Bongô Martillo',
    category: 'latin',
    soundType: 'bongo_hi',
    color: '#a855f7',
    description: 'Toque seco e agudo tradicional do bongô',
    defaultVolume: 0.8,
    defaultPan: -0.35,
  },
  {
    name: 'Cencerro (Cowbell)',
    category: 'latin',
    soundType: 'cowbell',
    color: '#ec4899',
    description: 'Sino metálico de mambo e cha-cha-cha',
    defaultVolume: 0.8,
    defaultPan: -0.15,
  },
  // Drum Kit & Rock
  {
    name: 'Bumbo Acústico (Kick)',
    category: 'kick',
    soundType: 'kick',
    color: '#ef4444',
    description: 'Grave encorpado e firme para bumbo de bateria',
    defaultVolume: 0.95,
    defaultPan: 0,
  },
  {
    name: 'Caixa de Bateria (Snare)',
    category: 'snare',
    soundType: 'snare',
    color: '#3b82f6',
    description: 'Caixa com esteira brilhante e ataque rápido',
    defaultVolume: 0.9,
    defaultPan: 0,
  },
  {
    name: 'Chimbal Fechado (Hi-Hat)',
    category: 'hihat',
    soundType: 'hihat_closed',
    color: '#eab308',
    description: 'Prato de choque fechado com estalo metálico',
    defaultVolume: 0.85,
    defaultPan: -0.25,
  },
  {
    name: 'Chimbal Aberto (Open Hat)',
    category: 'hihat',
    soundType: 'hihat_open',
    color: '#f97316',
    description: 'Prato de choque aberto com sustentação',
    defaultVolume: 0.8,
    defaultPan: -0.25,
  },
  {
    name: 'Prato Crash / Ataque',
    category: 'cymbals',
    soundType: 'crash',
    color: '#eab308',
    description: 'Prato de ataque explosivo para viradas e acentos',
    defaultVolume: 0.9,
    defaultPan: 0.3,
  },
  {
    name: 'Pandeirola (Tambourine)',
    category: 'percussion',
    soundType: 'tambourine',
    color: '#14b8a6',
    description: 'Platinelas metálicas para condução em 4/4',
    defaultVolume: 0.75,
    defaultPan: 0.35,
  },
  // World Percussion
  {
    name: 'Triângulo',
    category: 'percussion',
    soundType: 'triangle',
    color: '#06b6d4',
    description: 'Som cristalino ressonante para forró e baião',
    defaultVolume: 0.65,
    defaultPan: 0.4,
  },
  {
    name: 'Bloco de Madeira (Woodblock)',
    category: 'percussion',
    soundType: 'woodblock',
    color: '#84cc16',
    description: 'Ressonância oca de bloco de madeira',
    defaultVolume: 0.85,
    defaultPan: -0.3,
  },
  {
    name: 'Palmas (Hand Clap)',
    category: 'percussion',
    soundType: 'clap',
    color: '#f43f5e',
    description: 'Palmas percussivas com múltiplos estalos',
    defaultVolume: 0.85,
    defaultPan: 0,
  },
];

export const AddInstrumentModal: React.FC<AddInstrumentModalProps> = ({
  onClose,
  onAddTrack,
  onDeleteSample,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customTrackName, setCustomTrackName] = useState<string>('Meu Sample Novo');
  const [samplesList, setSamplesList] = useState<Array<{ id: string; name: string }>>(() =>
    audioEngine.getCustomSamplesList()
  );

  const refreshSamples = () => {
    setSamplesList(audioEngine.getCustomSamplesList());
  };

  const handleDeleteCustomSample = (sampleId: string, sampleName: string) => {
    if (window.confirm(`Deseja realmente excluir o sample "${sampleName}"?`)) {
      audioEngine.deleteCustomSample(sampleId);
      onDeleteSample?.(sampleId);
      refreshSamples();
    }
  };

  const filteredCatalog = CATALOG.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const handleAudition = (soundType: string) => {
    audioEngine.triggerInstrument(soundType, { velocity: 100, volume: 0.9 });
  };

  const handleCreateCustomSampleTrack = () => {
    onAddTrack({
      name: customTrackName || 'Novo Instrumento Custom',
      category: 'custom',
      soundType: 'custom',
      color: '#f59e0b',
      volume: 0.85,
      pan: 0,
      tune: 0,
      decay: 1.0,
      tone: 0.8,
      muted: false,
      solo: false,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Adicionar Novo Instrumento de Percussão
            </h3>
            <p className="text-xs text-slate-400">
              Escolha do catálogo profissional ou crie uma pista com seu sample
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Custom Track Prompt */}
        <div className="p-4 mx-6 mt-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs font-bold text-white block">
                Criar Pista com Sample Próprio
              </span>
              <span className="text-[11px] text-slate-400">
                Adicione uma pista limpa para carregar seu áudio ou gravar com microfone
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customTrackName}
              onChange={(e) => setCustomTrackName(e.target.value)}
              placeholder="Nome da pista..."
              className="bg-slate-900 border border-slate-700 text-xs px-2.5 py-1.5 rounded-lg text-white focus:outline-none focus:border-amber-400 w-36"
            />
            <button
              type="button"
              onClick={handleCreateCustomSampleTrack}
              className="px-3 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg cursor-pointer whitespace-nowrap shadow-sm"
            >
              + Criar Pista
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-6 pt-4 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'my_samples', label: `Meus Samples (${samplesList.length})` },
            { id: 'brazilian', label: 'Brasileira (Samba/Baião)' },
            { id: 'latin', label: 'Afro-Cubana & Latina' },
            { id: 'kick', label: 'Bumbos' },
            { id: 'snare', label: 'Caixas' },
            { id: 'hihat', label: 'Chimbais' },
            { id: 'percussion', label: 'Mundial' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Catalog Grid or My Samples */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
          {selectedCategory === 'my_samples' ? (
            samplesList.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
                Nenhum sample carregado ainda. Use a caixa de upload acima para enviar um sample ou use a aba "Meus Samples & Gravação".
              </div>
            ) : (
              samplesList.map((sample) => (
                <div
                  key={sample.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      title="Ouvir sample"
                      onClick={() => audioEngine.triggerInstrument('custom', { volume: 0.9 }, sample.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-700 bg-slate-800 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    </button>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">
                        {sample.name}
                      </span>
                      <span className="text-[10px] text-amber-400/80 font-mono">
                        Sample Customizado
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => {
                        onAddTrack({
                          name: sample.name,
                          category: 'custom',
                          soundType: 'custom',
                          color: '#f59e0b',
                          volume: 0.85,
                          pan: 0,
                          tune: 0,
                          decay: 1.0,
                          tone: 0.8,
                          muted: false,
                          solo: false,
                          customSampleId: sample.id,
                          customSampleName: sample.name,
                        });
                        onClose();
                      }}
                      className="px-2.5 py-1 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      + Pista
                    </button>
                    <button
                      type="button"
                      title="Excluir este sample da biblioteca"
                      onClick={() => handleDeleteCustomSample(sample.id, sample.name)}
                      className="p-1.5 text-slate-400 hover:text-white bg-rose-950/40 hover:bg-rose-600 border border-rose-900 hover:border-rose-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400 hover:text-white" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            filteredCatalog.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    title="Ouvir som deste instrumento"
                    onClick={() => handleAudition(item.soundType)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-700 bg-slate-800 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold text-white truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">
                      {item.description}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onAddTrack({
                      name: item.name,
                      category: item.category,
                      soundType: item.soundType,
                      color: item.color,
                      volume: item.defaultVolume,
                      pan: item.defaultPan,
                      tune: 0,
                      decay: 1.0,
                      tone: 0.8,
                      muted: false,
                      solo: false,
                    });
                    onClose();
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-slate-800 hover:bg-amber-400 text-slate-200 hover:text-slate-950 rounded-lg border border-slate-700 hover:border-amber-300 transition-colors cursor-pointer shrink-0 ml-2"
                >
                  + Adicionar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
