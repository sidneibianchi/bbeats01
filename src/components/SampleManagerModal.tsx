/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  Mic,
  Play,
  X,
  FileAudio,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react';
import { TrackDefinition } from '../types/rhythm';
import { audioEngine } from '../audio/AudioEngine';

interface SampleManagerModalProps {
  track: TrackDefinition;
  onClose: () => void;
  onUpdateTrackParams: (trackId: string, updates: Partial<TrackDefinition>) => void;
}

export const SampleManagerModal: React.FC<SampleManagerModalProps> = ({
  track,
  onClose,
  onUpdateTrackParams,
}) => {
  const [samplesList, setSamplesList] = useState<Array<{ id: string; name: string }>>(() =>
    audioEngine.getCustomSamplesList()
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordCountdown, setRecordCountdown] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const refreshSamples = () => {
    setSamplesList(audioEngine.getCustomSamplesList());
  };

  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');

  const handleDeleteSample = async (sampleId: string, sampleName: string) => {
    await audioEngine.deleteCustomSample(sampleId);
    if (track.customSampleId === sampleId) {
      onUpdateTrackParams(track.id, {
        customSampleId: undefined,
        customSampleName: undefined,
        soundType: track.soundType === 'custom' ? 'kick' : track.soundType,
      });
    }
    refreshSamples();
    setStatusMsg(`Sample "${sampleName}" excluído com sucesso.`);
  };

  const handleStartRename = (sampleId: string, currentName: string) => {
    setEditingSampleId(sampleId);
    setEditNameText(currentName);
  };

  const handleSaveRename = (sampleId: string) => {
    const trimmed = editNameText.trim();
    if (trimmed) {
      audioEngine.renameCustomSample(sampleId, trimmed);
      if (track.customSampleId === sampleId) {
        onUpdateTrackParams(track.id, { customSampleName: trimmed });
      }
      refreshSamples();
      setStatusMsg(`Sample renomeado para "${trimmed}".`);
    }
    setEditingSampleId(null);
  };

  const handleCancelRename = () => {
    setEditingSampleId(null);
  };

  // Local state for instant feedback
  const [tune, setTune] = useState(track.tune);
  const [decay, setDecay] = useState(track.decay);
  const [tone, setTone] = useState(track.tone);
  const [pan, setPan] = useState(track.pan);
  const [volume, setVolume] = useState(track.volume);
  const [reverse, setReverse] = useState(track.reverse ?? false);

  const handleTestSound = () => {
    audioEngine.triggerInstrument(
      track.soundType,
      {
        tune,
        decay,
        tone,
        pan,
        volume,
        reverse,
        velocity: 110,
      },
      track.customSampleId
    );
  };

  const handleFileUpload = async (file: File) => {
    try {
      setStatusMsg(`Carregando "${file.name}"...`);
      const sampleId = await audioEngine.loadSampleFromBlob(file, file.name);
      onUpdateTrackParams(track.id, {
        customSampleId: sampleId,
        customSampleName: file.name,
        soundType: 'custom',
      });
      setStatusMsg(`Sample "${file.name}" carregado com sucesso!`);
      refreshSamples();
      audioEngine.triggerInstrument('custom', { volume: 0.9 }, sampleId);
    } catch {
      setStatusMsg('Erro ao decodificar arquivo de áudio.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        try {
          const recName = `Gravação_${new Date().toLocaleTimeString('pt-BR')}`;
          const sampleId = await audioEngine.loadSampleFromBlob(audioBlob, recName);
          onUpdateTrackParams(track.id, {
            customSampleId: sampleId,
            customSampleName: recName,
            soundType: 'custom',
          });
          refreshSamples();
          setStatusMsg(`Gravação registrada com sucesso!`);
          audioEngine.triggerInstrument('custom', { volume: 0.9 }, sampleId);
        } catch {
          setStatusMsg('Erro ao processar gravação de voz.');
        }
        stream.getTracks().forEach((track) => track.stop());
      };

      setIsRecording(true);
      mediaRecorder.start();

      let timeLeft = 3;
      setRecordCountdown(timeLeft);
      const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
          clearInterval(timer);
          mediaRecorder.stop();
          setIsRecording(false);
          setRecordCountdown(null);
        } else {
          setRecordCountdown(timeLeft);
        }
      }, 1000);
    } catch {
      setStatusMsg('Permissão de microfone negada ou indisponível.');
    }
  };

  const handleSaveAndClose = () => {
    onUpdateTrackParams(track.id, {
      tune,
      decay,
      tone,
      pan,
      volume,
      reverse,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: track.color }}
            />
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Configurar Som: {track.name}
              </h3>
              <p className="text-xs text-slate-400">
                Ajuste parâmetros ou carregue seus próprios samples de áudio
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

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Alert if any */}
          {statusMsg && (
            <div className="p-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
              <span>{statusMsg}</span>
              <button
                type="button"
                onClick={() => setStatusMsg(null)}
                className="text-amber-400 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Section 1: Custom Sample Box (Drag & Drop or Record) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Usar Sample Próprio
            </span>

            {/* Current sample status */}
            {track.customSampleName ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-amber-500/40">
                <div className="flex items-center gap-2.5">
                  <FileAudio className="w-5 h-5 text-amber-400" />
                  <div>
                    <span className="text-xs font-bold text-white block truncate max-w-[220px]">
                      {track.customSampleName}
                    </span>
                    <span className="text-[10px] text-amber-400/80 font-mono">
                      Sample Customizado Ativo
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Desvincular sample desta pista"
                    onClick={() => {
                      onUpdateTrackParams(track.id, {
                        customSampleId: undefined,
                        customSampleName: undefined,
                        soundType: track.soundType === 'custom' ? 'kick' : track.soundType,
                      });
                      setStatusMsg('Sample desvinculado desta pista.');
                    }}
                    className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 border border-slate-700 rounded-md cursor-pointer font-medium transition-colors"
                  >
                    Desvincular
                  </button>
                  <button
                    type="button"
                    title="Excluir sample permanentemente da memória e da biblioteca"
                    onClick={() => {
                      if (track.customSampleId) {
                        handleDeleteSample(track.customSampleId, track.customSampleName || 'Sample');
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-600 border border-rose-500/40 rounded-md cursor-pointer transition-colors font-semibold shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Sample</span>
                  </button>
                </div>
              </div>
            ) : null}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                isDragOver
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-slate-700 bg-slate-950/40 hover:border-slate-600'
              }`}
            >
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                Arraste um arquivo de áudio (.wav, .mp3, .ogg, .flac)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">ou selecione do seu computador</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  Escolher Arquivo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
                <span className="text-slate-600 text-xs">ou</span>
                {/* Record Mic Button */}
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isRecording}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-slate-950 border-rose-400 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>
                    {isRecording
                      ? `Gravando... ${recordCountdown}s`
                      : 'Gravar Sample no Microfone'}
                  </span>
                </button>
              </div>
            </div>

            {/* List all samples in library if available */}
            {samplesList.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-800/80 pt-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Meus Samples na Biblioteca ({samplesList.length})
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {samplesList.map((s) => {
                    const isCurrent = track.customSampleId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-colors ${
                          isCurrent
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            type="button"
                            title="Ouvir sample"
                            onClick={() => audioEngine.triggerInstrument('custom', { volume: 0.9 }, s.id)}
                            className="w-6 h-6 rounded bg-slate-800 hover:bg-amber-400 text-amber-400 hover:text-slate-950 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                          {editingSampleId === s.id ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editNameText}
                                onChange={(e) => setEditNameText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(s.id);
                                  if (e.key === 'Escape') handleCancelRename();
                                }}
                                autoFocus
                                className="px-1.5 py-0.5 text-xs bg-slate-900 border border-amber-400/80 rounded text-white w-28 focus:outline-hidden"
                              />
                              <button
                                type="button"
                                title="Salvar nome"
                                onClick={() => handleSaveRename(s.id)}
                                className="p-1 text-emerald-400 hover:bg-emerald-950 rounded cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                title="Cancelar"
                                onClick={handleCancelRename}
                                className="p-1 text-slate-400 hover:bg-slate-800 rounded cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="truncate font-medium max-w-[140px]">{s.name}</span>
                              <button
                                type="button"
                                title="Renomear este sample"
                                onClick={() => handleStartRename(s.id, s.name)}
                                className="p-1 text-slate-500 hover:text-amber-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isCurrent ? (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdateTrackParams(track.id, {
                                  customSampleId: s.id,
                                  customSampleName: s.name,
                                  soundType: 'custom',
                                });
                                setStatusMsg(`Sample "${s.name}" atribuído a esta pista.`);
                              }}
                              className="px-2 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded text-[11px] cursor-pointer shadow-xs transition-colors"
                            >
                              Usar nesta Pista
                            </button>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-500/20">
                              Ativo
                            </span>
                          )}
                          <button
                            type="button"
                            title="Excluir este sample da biblioteca"
                            onClick={() => handleDeleteSample(s.id, s.name)}
                            className="flex items-center gap-1 px-2 py-1 bg-rose-950/50 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-900 hover:border-rose-500 rounded text-[11px] cursor-pointer font-semibold transition-colors shadow-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Sound Sculpting & DSP Parameters */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Modelagem do Som (DSP & Filtros)
            </span>

            {/* Pitch / Tune Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Afinação / Pitch (Semitons):</span>
                <span className="font-mono text-amber-400 font-bold tabular-nums">
                  {tune > 0 ? `+${tune}` : tune} st
                </span>
              </div>
              <input
                type="range"
                min={-12}
                max={12}
                step={1}
                value={tune}
                onChange={(e) => setTune(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Decay Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Decaimento / Sustentação (Duração):</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  {Math.round(decay * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.5}
                step={0.05}
                value={decay}
                onChange={(e) => setDecay(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Filter / Tone Cutoff */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Brilho / Filtro Lowpass (Tom):</span>
                <span className="font-mono text-emerald-400 font-bold tabular-nums">
                  {Math.round(tone * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={tone}
                onChange={(e) => setTone(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Stereo Pan */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Panorâmica Estéreo (L / R):</span>
                <span className="font-mono text-purple-400 font-bold tabular-nums">
                  {pan === 0
                    ? 'Centro'
                    : pan < 0
                    ? `Esq ${Math.round(Math.abs(pan) * 100)}%`
                    : `Dir ${Math.round(pan * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min={-1.0}
                max={1.0}
                step={0.05}
                value={pan}
                onChange={(e) => setPan(Number(e.target.value))}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Track Volume */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Volume da Pista:</span>
                <span className="font-mono text-white font-bold tabular-nums">
                  {Math.round(volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Reverse Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-300 font-medium">Inverter Áudio (Reverse):</span>
              <button
                type="button"
                onClick={() => setReverse(!reverse)}
                className={`px-3 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                  reverse ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {reverse ? 'ATIVADO' : 'NORMAL'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={handleTestSound}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span>Testar Som (Audition)</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
