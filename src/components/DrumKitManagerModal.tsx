/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Drum Kit Manager & Creator Modal.
 * Allows musicians to design, test, save, and apply custom drum kits.
 */

import React, { useState } from 'react';
import {
  X,
  Plus,
  Play,
  Save,
  Trash2,
  Download,
  Upload,
  Copy,
  Check,
  Disc3,
  Sparkles,
  Sliders,
  Volume2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { DrumKitDefinition } from '../types/kit';
import { TrackDefinition, InstrumentCategory } from '../types/rhythm';
import {
  getUserDrumKits,
  saveUserDrumKit,
  deleteUserDrumKit,
  getAllDrumKits,
  exportKitAsJson,
  reorderDrumKits,
  FACTORY_DRUM_KITS,
} from '../services/kitStorage';
import { audioEngine } from '../audio/AudioEngine';
import { BUILT_IN_SAMPLES } from '../presets/defaultSamples';

interface DrumKitManagerModalProps {
  currentProjectTracks: TrackDefinition[];
  onClose: () => void;
  onApplyKitToProject: (kit: DrumKitDefinition, preserveStepData: boolean) => void;
}

export const DrumKitManagerModal: React.FC<DrumKitManagerModalProps> = ({
  currentProjectTracks,
  onClose,
  onApplyKitToProject,
}) => {
  const [kits, setKits] = useState<DrumKitDefinition[]>(() => getAllDrumKits());
  const [selectedKitId, setSelectedKitId] = useState<string>(() => kits[0]?.id || 'kit_factory_samba_real');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Edit draft state
  const [draftKit, setDraftKit] = useState<DrumKitDefinition>(() => {
    const initial = kits[0] || FACTORY_DRUM_KITS[0];
    return JSON.parse(JSON.stringify(initial));
  });

  const [activeTab, setActiveTab] = useState<'presets' | 'editor'>('presets');
  const [preserveSteps, setPreserveSteps] = useState<boolean>(true);

  const refreshKits = () => {
    const updated = getAllDrumKits();
    setKits(updated);
  };

  const selectedKit = kits.find((k) => k.id === selectedKitId) || kits[0];

  const handleAuditionTrack = (track: TrackDefinition) => {
    audioEngine.unlockAudioContext();
    audioEngine.triggerInstrument(
      track.soundType,
      {
        volume: track.volume ?? 0.9,
        tune: track.tune ?? 0,
        decay: track.decay ?? 1.0,
        tone: track.tone ?? 0.8,
        pan: track.pan ?? 0,
        velocity: 115,
      },
      track.customSampleId,
      track.customSampleName
    );
  };

  const handleCreateNewKit = (fromCurrentTracks: boolean = false) => {
    const newKitId = `kit_custom_${Date.now()}`;
    const newTracks: TrackDefinition[] = fromCurrentTracks
      ? currentProjectTracks.map((t, idx) => ({
          ...t,
          id: `t_${idx}_${Date.now()}`,
        }))
      : [
          {
            id: `k_surdo_${Date.now()}`,
            name: 'Surdo Grave',
            category: 'brazilian',
            soundType: 'custom',
            customSampleId: 'sample_1791929472468_l6qxe',
            customSampleName: 'GRAVE SD.wav',
            color: '#ef4444',
            volume: 0.95,
            pan: 0,
            tune: 0,
            decay: 1.1,
            tone: 0.7,
            muted: false,
            solo: false,
          },
          {
            id: `k_pandeiro_${Date.now()}`,
            name: 'Pandeiro Grave',
            category: 'brazilian',
            soundType: 'custom',
            customSampleId: 'sample_1791928977387_ssxqu',
            customSampleName: 'pandeiro grave.wav',
            color: '#f97316',
            volume: 0.9,
            pan: -0.2,
            tune: 0,
            decay: 0.95,
            tone: 0.8,
            muted: false,
            solo: false,
          },
          {
            id: `k_ganza_${Date.now()}`,
            name: 'Ganzá Suave',
            category: 'percussion',
            soundType: 'custom',
            customSampleId: 'sample_1791929097159_2w8rm',
            customSampleName: 'ganza.wav',
            color: '#8b5cf6',
            volume: 0.8,
            pan: -0.3,
            tune: 0,
            decay: 1.0,
            tone: 0.8,
            muted: false,
            solo: false,
          },
        ];

    const newKit: DrumKitDefinition = {
      id: newKitId,
      name: fromCurrentTracks ? 'Meu Kit (Clonado do Ritmo)' : 'Meu Novo Kit de Percussão',
      description: 'Kit personalizado criado no BeatBuddy Studio',
      category: 'custom',
      isUserCreated: true,
      createdAt: Date.now(),
      tracks: newTracks,
    };

    setDraftKit(newKit);
    setIsEditing(true);
    setActiveTab('editor');
    setStatusMsg('Criando novo kit. Ajuste os instrumentos e clique em "Salvar Kit na Memória".');
  };

  const handleEditExistingKit = (kit: DrumKitDefinition) => {
    setDraftKit(JSON.parse(JSON.stringify(kit)));
    setIsEditing(true);
    setActiveTab('editor');
  };

  const handleSaveDraftKit = () => {
    if (!draftKit.name.trim()) {
      setStatusMsg('Por favor dê um nome para o seu Kit.');
      return;
    }
    saveUserDrumKit(draftKit);
    refreshKits();
    setSelectedKitId(draftKit.id);
    setIsEditing(false);
    setActiveTab('presets');
    setStatusMsg(`Kit "${draftKit.name}" salvo com sucesso na memória!`);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const handleDeleteKit = (kitId: string, kitName: string) => {
    if (confirm(`Tem certeza que deseja excluir o kit "${kitName}"?`)) {
      deleteUserDrumKit(kitId);
      refreshKits();
      setSelectedKitId(FACTORY_DRUM_KITS[0].id);
      setStatusMsg(`Kit "${kitName}" excluído.`);
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const handleAddTrackToDraft = () => {
    const newTrack: TrackDefinition = {
      id: `track_${Date.now()}`,
      name: 'Novo Instrumento',
      category: 'percussion',
      soundType: 'pandeiro',
      color: '#06b6d4',
      volume: 0.85,
      pan: 0,
      tune: 0,
      decay: 1.0,
      tone: 0.8,
      muted: false,
      solo: false,
    };
    setDraftKit((prev) => ({
      ...prev,
      tracks: [...prev.tracks, newTrack],
    }));
  };

  const handleUpdateDraftTrack = (index: number, updates: Partial<TrackDefinition>) => {
    setDraftKit((prev) => {
      const nextTracks = [...prev.tracks];
      nextTracks[index] = { ...nextTracks[index], ...updates };
      return { ...prev, tracks: nextTracks };
    });
  };

  const handleMoveDraftTrack = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= draftKit.tracks.length) return;
    setDraftKit((prev) => {
      const nextTracks = [...prev.tracks];
      const [moved] = nextTracks.splice(index, 1);
      nextTracks.splice(target, 0, moved);
      return { ...prev, tracks: nextTracks };
    });
  };

  const handleMoveKit = (kitId: string, direction: 'up' | 'down') => {
    const index = kits.findIndex((k) => k.id === kitId);
    if (index === -1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= kits.length) return;
    const nextKits = [...kits];
    const [moved] = nextKits.splice(index, 1);
    nextKits.splice(target, 0, moved);
    setKits(nextKits);
    reorderDrumKits(nextKits.map((k) => k.id));
    setStatusMsg(`Ordem do kit "${moved.name}" atualizada.`);
  };

  const handleRemoveDraftTrack = (index: number) => {
    setDraftKit((prev) => {
      const nextTracks = prev.tracks.filter((_, i) => i !== index);
      return { ...prev, tracks: nextTracks };
    });
  };

  const handleApplyToActiveProject = (kit: DrumKitDefinition) => {
    onApplyKitToProject(kit, preserveSteps);
    setStatusMsg(`Kit "${kit.name}" aplicado com sucesso ao ritmo atual!`);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleImportKitJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as DrumKitDefinition;
        if (parsed && parsed.tracks && Array.isArray(parsed.tracks)) {
          parsed.id = `kit_import_${Date.now()}`;
          parsed.isUserCreated = true;
          parsed.createdAt = Date.now();
          saveUserDrumKit(parsed);
          refreshKits();
          setSelectedKitId(parsed.id);
          setStatusMsg(`Kit "${parsed.name}" importado com sucesso!`);
        } else {
          setStatusMsg('Arquivo JSON inválido para kit de bateria.');
        }
      } catch {
        setStatusMsg('Erro ao ler arquivo de kit.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const userKits = kits.filter((k) => k.isUserCreated);
  const factoryKits = kits.filter((k) => !k.isUserCreated);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-[#0c1222] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Disc3 className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Gerenciador & Criador de Kits de Bateria
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  Memória Salva
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Crie seus próprios kits de som, ajuste timbres e aplique ao ritmo ativo.
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

        {/* Tab Navigation */}
        <div className="px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              Kits Disponíveis ({kits.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isEditing) handleCreateNewKit(false);
                setActiveTab('editor');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'editor'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-white bg-slate-800/60'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Editando Kit' : 'Criar Novo Kit'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCreateNewKit(true)}
              title="Cria um novo kit copiando as faixas e sons do ritmo atualmente aberto na tela"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/40 rounded-lg transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salvar Faixas do Ritmo como Novo Kit</span>
            </button>

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Kit (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportKitJson}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Status notification banner */}
        {statusMsg && (
          <div className="px-5 py-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-xs font-semibold flex items-center justify-between">
            <span>{statusMsg}</span>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="text-amber-300 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Left Column: Kits List */}
              <div className="md:col-span-1 space-y-4">
                {/* User Created Kits */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      ⭐ Meus Kits na Memória ({userKits.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCreateNewKit(false)}
                      className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Novo
                    </button>
                  </div>
                  {userKits.length === 0 ? (
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-800 text-slate-500 text-xs text-center">
                      Nenhum kit personalizado criado ainda. Clique em "+ Novo" ou "Salvar Faixas do Ritmo" para criar!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userKits.map((kit, uIndex) => (
                        <div
                          key={kit.id}
                          onClick={() => setSelectedKitId(kit.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 ${
                            selectedKitId === kit.id
                              ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-sm block truncate">{kit.name}</span>
                              <span className="text-[10px] text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded font-mono">
                                {kit.tracks.length} sons
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {kit.description || 'Kit personalizado'}
                            </p>
                          </div>

                          {/* Up / Down reorder for kits */}
                          <div
                            className="flex flex-col gap-0.5 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              title="Mover kit para cima"
                              disabled={uIndex === 0}
                              onClick={() => handleMoveKit(kit.id, 'up')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-slate-300 hover:text-amber-400 transition-colors"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              title="Mover kit para baixo"
                              disabled={uIndex === userKits.length - 1}
                              onClick={() => handleMoveKit(kit.id, 'down')}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:cursor-not-allowed text-slate-300 hover:text-amber-400 transition-colors"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Factory Studio Kits */}
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                    🥁 Kits de Estúdio / Fábrica ({factoryKits.length})
                  </span>
                  <div className="space-y-2">
                    {factoryKits.map((kit) => (
                      <div
                        key={kit.id}
                        onClick={() => setSelectedKitId(kit.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          selectedKitId === kit.id
                            ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-md'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-sm block truncate">{kit.name}</span>
                          <span className="text-[10px] text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded font-mono">
                            {kit.tracks.length} sons
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {kit.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Selected Kit Detail & Actions */}
              {selectedKit && (
                <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 mb-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{selectedKit.name}</h3>
                          {selectedKit.isUserCreated ? (
                            <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                              Kit Personalizado
                            </span>
                          ) : (
                            <span className="text-[10px] bg-cyan-900 text-cyan-300 font-bold px-2 py-0.5 rounded-full">
                              Kit de Fábrica
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{selectedKit.description}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {selectedKit.isUserCreated && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditExistingKit(selectedKit)}
                              className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Editar Kit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteKit(selectedKit.id, selectedKit.name)}
                              className="p-1 text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Excluir kit da memória"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => exportKitAsJson(selectedKit)}
                          title="Exportar arquivo .json deste kit"
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Instruments list preview with sound testing */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 px-1 mb-1">
                        <span>Instrumentos & Samples do Kit ({selectedKit.tracks.length}):</span>
                        <span>Clique no Play para testar o som</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedKit.tracks.map((track, i) => (
                          <div
                            key={track.id || i}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: track.color || '#f59e0b' }}
                              />
                              <div className="min-w-0">
                                <span className="font-bold text-xs text-slate-200 block truncate">
                                  {track.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono block truncate">
                                  {track.customSampleName || track.soundType} • vol: {Math.round((track.volume ?? 0.9) * 100)}%
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAuditionTrack(track)}
                              title={`Testar som de ${track.name}`}
                              className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-xs cursor-pointer shrink-0 transition-transform active:scale-95 ml-2"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Apply Kit to Current Rhythm Action Area */}
                  <div className="pt-4 border-t border-slate-800/80 bg-slate-950/40 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={preserveSteps}
                        onChange={(e) => setPreserveSteps(e.target.checked)}
                        className="rounded accent-amber-400"
                      />
                      <span>
                        <strong>Preservar notas do ritmo:</strong> mantém as batidas programadas e só altera os sons das pistas!
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleApplyToActiveProject(selectedKit)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-400/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
                    >
                      <Sparkles className="w-4 h-4 fill-current" />
                      <span>Carregar no Ritmo Atual</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab: Kit Editor */
            <div className="space-y-5">
              {/* Kit Details */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                    Informações do Kit
                  </h3>
                  <button
                    type="button"
                    onClick={handleSaveDraftKit}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Kit na Memória</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome do Kit de Bateria / Percussão:
                    </label>
                    <input
                      type="text"
                      value={draftKit.name}
                      onChange={(e) => setDraftKit({ ...draftKit, name: e.target.value })}
                      placeholder="Ex: Meu Kit de Samba Pesado"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Descrição / Detalhes:
                    </label>
                    <input
                      type="text"
                      value={draftKit.description}
                      onChange={(e) => setDraftKit({ ...draftKit, description: e.target.value })}
                      placeholder="Ex: Surdo afinado grave com pandeiro estalado"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Instrument Pieces List */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Peças / Instrumentos do Kit ({draftKit.tracks.length})
                    </h3>
                    <p className="text-xs text-slate-400">
                      Configure cada som com precisão, teste em tempo real e salve no kit.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTrackToDraft}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg transition-colors cursor-pointer border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Peça</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {draftKit.tracks.map((track, idx) => (
                    <div
                      key={track.id || idx}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      {/* Reorder Up / Down + Name & Color */}
                      <div className="flex items-center gap-2.5 min-w-[220px]">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            title="Mover peça para cima"
                            disabled={idx === 0}
                            onClick={() => handleMoveDraftTrack(idx, 'up')}
                            className="p-1 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-20 disabled:cursor-not-allowed text-slate-300 hover:text-amber-400 border border-slate-800"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Mover peça para baixo"
                            disabled={idx === draftKit.tracks.length - 1}
                            onClick={() => handleMoveDraftTrack(idx, 'down')}
                            className="p-1 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-20 disabled:cursor-not-allowed text-slate-300 hover:text-amber-400 border border-slate-800"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                        <input
                          type="color"
                          value={track.color || '#f59e0b'}
                          onChange={(e) => handleUpdateDraftTrack(idx, { color: e.target.value })}
                          className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={track.name}
                          onChange={(e) => handleUpdateDraftTrack(idx, { name: e.target.value })}
                          className="bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-400 w-full"
                        />
                      </div>

                      {/* Sound Source Selector */}
                      <div className="flex items-center gap-2 min-w-[240px]">
                        <select
                          value={track.customSampleId || track.soundType}
                          onChange={(e) => {
                            const val = e.target.value;
                            const matchedBuiltIn = BUILT_IN_SAMPLES.find((s) => s.id === val);
                            if (matchedBuiltIn) {
                              handleUpdateDraftTrack(idx, {
                                soundType: 'custom',
                                customSampleId: matchedBuiltIn.id,
                                customSampleName: matchedBuiltIn.name,
                              });
                            } else {
                              handleUpdateDraftTrack(idx, {
                                soundType: val,
                                customSampleId: undefined,
                                customSampleName: undefined,
                              });
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <optgroup label="✨ Samples Reais em Alta Fidelidade (WAV)">
                            {BUILT_IN_SAMPLES.map((s) => (
                              <option key={s.id} value={s.id}>
                                🎵 {s.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="🎛️ Percussão Brasileira & Latina (Sintética)">
                            <option value="surdo">Surdo Sintético</option>
                            <option value="pandeiro">Pandeiro Sintético</option>
                            <option value="rimshot">Tamborim / Rimshot</option>
                            <option value="agogo_hi">Agogô Agudo</option>
                            <option value="agogo_lo">Agogô Grave</option>
                            <option value="shaker">Ganzá / Shaker</option>
                            <option value="clave">Clave</option>
                            <option value="conga_hi">Conga Aguda</option>
                            <option value="conga_lo">Conga Grave</option>
                            <option value="cowbell">Cowbell / Campana</option>
                          </optgroup>
                          <optgroup label="🥁 Bateria Pop & Rock">
                            <option value="kick">Bumbo Kick</option>
                            <option value="snare">Caixa Snare</option>
                            <option value="hihat_closed">Chimbal Fechado</option>
                            <option value="hihat_open">Chimbal Aberto</option>
                            <option value="crash">Prato Crash</option>
                            <option value="clap">Palmas (Clap)</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Sliders: Tune & Volume */}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5" title="Afinação / Tom (-12 a +12 semitons)">
                          <span className="text-[10px] font-mono">Tom:</span>
                          <input
                            type="range"
                            min="-12"
                            max="12"
                            value={track.tune ?? 0}
                            onChange={(e) => handleUpdateDraftTrack(idx, { tune: Number(e.target.value) })}
                            className="w-14 accent-amber-400"
                          />
                          <span className="text-[10px] font-mono w-4">{track.tune ?? 0}</span>
                        </div>

                        <div className="flex items-center gap-1.5" title="Volume da Pista">
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={Math.round((track.volume ?? 0.9) * 100)}
                            onChange={(e) => handleUpdateDraftTrack(idx, { volume: Number(e.target.value) / 100 })}
                            className="w-14 accent-amber-400"
                          />
                        </div>
                      </div>

                      {/* Audition & Delete */}
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => handleAuditionTrack(track)}
                          title="Ouvir som deste instrumento"
                          className="p-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold shadow-xs cursor-pointer transition-transform active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftTrack(idx)}
                          title="Remover peça do kit"
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#0c1222] flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            Todos os kits criados ficam gravados na memória local do seu navegador permanentemente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
