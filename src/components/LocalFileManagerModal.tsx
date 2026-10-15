/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Shared rhythm library, JSON backups, and local audio storage manager.
 * Permite exportar/importar rhythms.json, kits.json, backup completo e gerenciar a pasta de samples.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  FileCode,
  FolderDown,
  FolderUp,
  FolderArchive,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Music,
  Upload,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { SongProject } from '../types/rhythm';
import {
  clearLocalRhythmAndSampleCache,
  exportFullLibraryBackup,
  importFullLibraryBackup,
  saveRhythmsToServer,
} from '../audio/sampleStorage';
import { getAllDrumKits } from '../services/kitStorage';
import { audioEngine } from '../audio/AudioEngine';

interface LocalFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rhythms: SongProject[];
  onRhythmsUpdated: (newRhythms: SongProject[]) => Promise<boolean>;
  onOpenSamplesLibrary: () => void;
  onShowToast: (message: string) => void;
}

export const LocalFileManagerModal: React.FC<LocalFileManagerModalProps> = ({
  isOpen,
  onClose,
  rhythms,
  onRhythmsUpdated,
  onOpenSamplesLibrary,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'rhythms' | 'samples' | 'backup'>('rhythms');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // 1. Export rhythms as rhythms.json
  const handleExportRhythmsJson = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rhythms, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'rhythms.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback({
        type: 'success',
        message: `Arquivo rhythms.json exportado com sucesso contendo ${rhythms.length} ritmos!`,
      });
      onShowToast(`💾 Arquivo rhythms.json exportado (${rhythms.length} ritmos)!`);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Erro ao exportar arquivo rhythms.json.' });
    }
  };

  // 2. Export drum kits as drum_kits.json
  const handleExportKitsJson = () => {
    try {
      const kits = getAllDrumKits();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(kits, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'drum_kits.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback({
        type: 'success',
        message: `Arquivo drum_kits.json exportado com sucesso contendo ${kits.length} kits!`,
      });
      onShowToast(`🥁 Arquivo drum_kits.json exportado (${kits.length} kits)!`);
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao exportar drum_kits.json.' });
    }
  };

  // Save the shared rhythm library remotely and keep a browser cache.
  const handleSaveToAppFile = async () => {
    setIsProcessing(true);
    try {
      const ok = await saveRhythmsToServer(rhythms);
      localStorage.setItem('beatbuddy_rhythms', JSON.stringify(rhythms));
      if (ok) {
        setFeedback({
          type: 'success',
          message: 'Biblioteca compartilhada gravada no Neon.',
        });
        onShowToast('Biblioteca compartilhada gravada no Neon.');
      } else {
        setFeedback({
          type: 'error',
          message: 'Cópia local mantida, mas não foi possível gravar no Neon. Tente novamente.',
        });
        onShowToast('Não foi possível publicar os ritmos compartilhados.');
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao salvar no arquivo local.' });
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Import rhythms from any JSON file
  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFeedback(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      // Support: array of SongProject OR single SongProject OR backup object
      let importedRhythms: SongProject[] = [];

      if (Array.isArray(parsed)) {
        importedRhythms = parsed as SongProject[];
      } else if (parsed && Array.isArray(parsed.rhythms)) {
        importedRhythms = parsed.rhythms as SongProject[];
      } else if (parsed && parsed.id && parsed.name && parsed.tracks) {
        importedRhythms = [parsed as SongProject];
      }

      if (importedRhythms.length === 0) {
        setFeedback({
          type: 'error',
          message: 'O arquivo JSON não contém uma lista válida de ritmos.',
        });
        return;
      }

      // Merge by ID
      const map = new Map<string, SongProject>();
      rhythms.forEach((r) => map.set(r.id, r));
      importedRhythms.forEach((r) => map.set(r.id, r));

      const mergedList = Array.from(map.values());
      localStorage.setItem('beatbuddy_rhythms', JSON.stringify(mergedList));
      const savedRemotely = await onRhythmsUpdated(mergedList);
      setFeedback({
        type: savedRemotely ? 'success' : 'error',
        message: savedRemotely
          ? `Importados ${importedRhythms.length} ritmos para o Neon. Total: ${mergedList.length}.`
          : `Importados ${importedRhythms.length} ritmos apenas localmente. Não foi possível publicá-los no Neon.`,
      });
      onShowToast(
        savedRemotely
          ? `Importados ${importedRhythms.length} ritmos para a biblioteca compartilhada.`
          : 'Importação local concluída, mas não foi possível publicar no Neon.'
      );
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Falha ao processar arquivo JSON. Verifique a formatação do arquivo.',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 5. Export Full Backup (Rhythms + Kits + Audio Samples in Base64)
  const handleExportFullBackup = async () => {
    setIsProcessing(true);
    try {
      await exportFullLibraryBackup();
      setFeedback({
        type: 'success',
        message: 'Backup completo (.json com áudios em Base64) gerado e baixado!',
      });
      onShowToast('📦 Backup completo baixado com sucesso!');
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao gerar backup completo.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearLocalLibrary = async () => {
    const confirmed = window.confirm(
      'Um backup dos dados locais será baixado antes da limpeza. Isso remove ritmos e samples deste navegador, mas não altera nada no Neon. Continuar?'
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setFeedback(null);
    try {
      await exportFullLibraryBackup();
      await clearLocalRhythmAndSampleCache();
      setFeedback({
        type: 'success',
        message: 'Backup baixado e cache local limpo. O Neon não foi alterado; a página será recarregada.',
      });
      onShowToast('Backup criado e dados locais removidos; dados do Neon preservados.');
      window.setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to back up and clear local rhythm/sample data:', error);
      setFeedback({
        type: 'error',
        message: 'Não foi possível concluir a limpeza. Verifique se o navegador permite baixar o backup e tente novamente.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 6. Import Full Backup
  const handleImportFullBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const res = await importFullLibraryBackup(file);
      await audioEngine.preloadAllServerSamples();
      await audioEngine.initPersistentSamples();

      const saved = localStorage.getItem('beatbuddy_rhythms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const savedRemotely = await onRhythmsUpdated(parsed);
          if (!savedRemotely) {
            setFeedback({
              type: 'error',
              message: 'Backup restaurado localmente, mas os ritmos não foram publicados no Neon.',
            });
            return;
          }
        }
      }

      setFeedback({
        type: 'success',
        message: `Backup restaurado e ritmos publicados! ${res.rhythmsCount} ritmos e ${res.samplesCount} sons de áudio importados.`,
      });
      onShowToast(`📦 Backup restaurado com sucesso!`);
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao importar backup completo.' });
    } finally {
      setIsProcessing(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b101d] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#0e1628]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Arquivos Locais & Pastas do App
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Neon + backups
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ritmos compartilhados no Neon; JSON para backup e samples no armazenamento local.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('rhythms')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'rhythms'
                ? 'border-amber-400 text-amber-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Arquivo rhythms.json</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'samples'
                ? 'border-amber-400 text-amber-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Pasta de Samples (/samples/)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 ${
              activeTab === 'backup'
                ? 'border-amber-400 text-amber-300 bg-slate-900/80'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>Backup Portátil .json</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Status Badge */}
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-200">
                Biblioteca compartilhada com cache local
              </p>
              <p className="text-slate-300 leading-relaxed">
                Os ritmos compartilhados são armazenados no Neon e podem ser editados por usuários autenticados. O navegador mantém um cache local; use o JSON para importar/exportar backups. Samples continuam no armazenamento de áudio e no IndexedDB.
              </p>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-slate-400 hover:text-white font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: RHYTHMS.JSON */}
          {activeTab === 'rhythms' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-amber-400" />
                      Biblioteca de Ritmos
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Atualmente há <strong>{rhythms.length} ritmos</strong> carregados no app.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveToAppFile}
                    disabled={isProcessing}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400/20 text-amber-300 hover:bg-amber-400 hover:text-slate-950 border border-amber-400/40 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>Salvar Biblioteca</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleExportRhythmsJson}
                    className="flex flex-col items-start p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-700/80 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-400 group-hover:text-amber-300">
                      <FolderDown className="w-4 h-4" />
                      <span>Baixar rhythms.json</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Exporta todos os {rhythms.length} ritmos, partes A/B/C, viradas e intros em um arquivo .json.
                    </span>
                  </button>

                  <label className="flex flex-col items-start p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-700/80 transition-colors text-left group cursor-pointer">
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 group-hover:text-emerald-300">
                      <FolderUp className="w-4 h-4" />
                      <span>Carregar rhythms.json</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Selecione um arquivo .json salvo no seu computador ou celular para adicionar ao app.
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportJsonFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Drum Kits JSON */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    🥁 Drum Kits (Kits de Bateria e Percussão)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Exportar as definições de kits, timbres, volumes e afinações em JSON.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportKitsJson}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FolderDown className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Baixar kits.json</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SAMPLES FOLDER */}
          {activeTab === 'samples' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-cyan-400" />
                    Pasta Física de Samples: <code className="text-xs text-amber-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">public/samples/</code>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSamplesLibrary();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Abrir Biblioteca Completa</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Os samples compartilhados vêm do Neon/UploadThing e o navegador mantém apenas um cache em IndexedDB. Novos samples devem ser adicionados pela biblioteca do app.
                </p>

                <div className="p-3 bg-black/30 rounded-lg border border-slate-800 space-y-2 text-xs">
                  <p className="font-semibold text-slate-300">Samples de referência dos kits:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px] text-slate-400">
                    <span className="truncate">🎵 GRAVE SD.wav</span>
                    <span className="truncate">🎵 GRAVE 2 SD.wav</span>
                    <span className="truncate">🎵 pandeiro grave.wav</span>
                    <span className="truncate">🎵 pandeiro tapa.wav</span>
                    <span className="truncate">🎵 ganza.wav</span>
                    <span className="truncate">🎵 tamborim grave.wav</span>
                    <span className="truncate">🎵 ovinho agudo.wav</span>
                    <span className="truncate">🎵 kickdrum9.wav</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSamplesLibrary();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    <span>Adicionar ou Gravar Novos Samples de Percussão</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BACKUP PORTATIL */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-amber-400" />
                    Backup Completo Tudo-em-Um (.json com Áudios)
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Este arquivo contém <strong>todos os seus ritmos + todas as gravações e samples de áudio codificados em Base64</strong> dentro de um único arquivo .json. Você pode enviar por WhatsApp, Google Drive, e-mail ou pendrive e abrir em qualquer celular, tablet ou computador instantaneamente, mesmo 100% offline!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleExportFullBackup}
                    disabled={isProcessing}
                    className="flex flex-col items-start p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-amber-500/40 text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-400 group-hover:text-amber-300">
                      <FolderDown className="w-4 h-4" />
                      <span>Baixar Backup Completo (.json)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Gera um único arquivo .json com todos os ritmos e áudios de percussão prontos para usar.
                    </span>
                  </button>

                  <label className="flex flex-col items-start p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-emerald-500/40 text-left group cursor-pointer">
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 group-hover:text-emerald-300">
                      <FolderUp className="w-4 h-4" />
                      <span>Restaurar Backup Completo</span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1">
                      Selecione seu arquivo de backup .json para restaurar todos os ritmos e sons de áudio.
                    </span>
                    <input
                      ref={backupInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportFullBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    Limpar ritmos e samples deste navegador
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Baixa um backup antes de apagar o cache de ritmos, samples do IndexedDB e preferências locais de samples. Os dados do Neon não são alterados e serão carregados novamente após a limpeza.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearLocalLibrary}
                  disabled={isProcessing}
                  className="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-950 text-rose-200 hover:bg-rose-700 border border-rose-500/40 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Processando...' : 'Baixar backup e limpar cache local'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0e1628] flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Biblioteca: <strong className="text-slate-200">Neon</strong> • Cache de áudio: <strong className="text-slate-200">IndexedDB</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
