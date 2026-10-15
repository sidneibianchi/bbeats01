/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Samples Library Manager with Hierarchical Folders & Sub-folders (Percussão -> Ganzá, Tamborim, Cuíca, etc.)
 * Complete physical directory and JSON file synchronization on sample deletion.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  Mic,
  Play,
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  Database,
  FolderDown,
  FolderUp,
  ArrowUp,
  ArrowDown,
  Folder,
  FolderPlus,
  FolderTree,
  ChevronRight,
  MoveRight,
  Tag,
  CheckCircle2,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { audioEngine } from '../audio/AudioEngine';
import {
  exportFullLibraryBackup,
  importFullLibraryBackup,
  syncSamplesFromServer,
  deleteSampleFromStorage,
  updateSampleFolderInStorage,
} from '../audio/sampleStorage';
import { SongProject } from '../types/rhythm';
import { isSampleUsedInRhythms } from '../audio/sampleUsage';
import { saveSampleToDatabase } from '../lib/uploadSample';

interface SamplesLibraryViewProps {
  onAddTrackWithSample: (sampleId: string, sampleName: string) => void;
  onDeleteSample?: (sampleId: string) => void;
  onRenameSample?: (sampleId: string, newName: string) => void;
  customSamplesList?: Array<{ id: string; name: string }>;
  rhythms?: SongProject[];
}

interface SampleFolderMeta {
  folder?: string;
  subFolder?: string;
}

const DEFAULT_SAMPLE_FOLDERS: Record<string, SampleFolderMeta> = {
  'pandeiro grave.wav': { folder: 'Percussão', subFolder: 'Pandeiro' },
  'pandeiro tapa.wav': { folder: 'Percussão', subFolder: 'Pandeiro' },
  'ganza.wav': { folder: 'Percussão', subFolder: 'Ganzá' },
  'ovinho agudo.wav': { folder: 'Percussão', subFolder: 'Ganzá' },
  'tamborim grave.wav': { folder: 'Percussão', subFolder: 'Tamborim' },
  'GRAVE SD.wav': { folder: 'Percussão', subFolder: 'Surdo' },
  'GRAVE 2 SD.wav': { folder: 'Percussão', subFolder: 'Surdo' },
  'kickdrum9.wav': { folder: 'Bateria', subFolder: 'Bumbo' },
};

export const SamplesLibraryView: React.FC<SamplesLibraryViewProps> = ({
  onAddTrackWithSample,
  onDeleteSample,
  onRenameSample,
  customSamplesList,
  rhythms = [],
}) => {
  const [samplesList, setSamplesList] = useState<Array<{ id: string; name: string }>>(() =>
    customSamplesList || audioEngine.getCustomSamplesList()
  );

  useEffect(() => {
    if (customSamplesList) {
      setSamplesList(customSamplesList);
    } else {
      setSamplesList(audioEngine.getCustomSamplesList());
    }
  }, [customSamplesList]);

  // Folder assignments storage
  const [sampleFolders, setSampleFolders] = useState<Record<string, SampleFolderMeta>>(() => {
    try {
      const saved = localStorage.getItem('beatbuddy_sample_folders');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_SAMPLE_FOLDERS;
  });

  // User-created custom folder names list
  const [userFolders, setUserFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('beatbuddy_user_folders_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Percussão', 'Bateria', 'Efeitos'];
  });

  // User-created custom subfolders list
  const [userSubFolders, setUserSubFolders] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem('beatbuddy_user_subfolders_list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      Percussão: ['Ganzá', 'Tamborim', 'Cuíca', 'Pandeiro', 'Surdo'],
      Bateria: ['Bumbo', 'Caixa', 'Pratos', 'Tons'],
      Efeitos: ['Metais', 'Apitos'],
    };
  });

  // Save folders to local storage
  const saveSampleFolders = (updated: Record<string, SampleFolderMeta>) => {
    setSampleFolders(updated);
    try {
      localStorage.setItem('beatbuddy_sample_folders', JSON.stringify(updated));
    } catch {}
  };

  // Active filter by folder and subfolder
  const [activeFolderFilter, setActiveFolderFilter] = useState<string>('all');
  const [activeSubFolderFilter, setActiveSubFolderFilter] = useState<string>('all');

  // UI state for creating folder / subfolder
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingSubFolder, setIsCreatingSubFolder] = useState<string | null>(null);
  const [newSubFolderName, setNewSubFolderName] = useState('');

  // Sample move modal / popover
  const [movingSample, setMovingSample] = useState<{ id: string; name: string } | null>(null);
  const [targetFolder, setTargetFolder] = useState('Percussão');
  const [targetSubFolder, setTargetSubFolder] = useState('');

  // Recording, drag, editing and messages
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [editingSampleId, setEditingSampleId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const refreshList = () => {
    setSamplesList(audioEngine.getCustomSamplesList());
  };

  // Helper to get folder for a sample
  const getSampleFolder = (sample: { id: string; name: string }): SampleFolderMeta => {
    if (sampleFolders[sample.id]) return sampleFolders[sample.id];
    if (sampleFolders[sample.name]) return sampleFolders[sample.name];
    const n = sample.name.toLowerCase();
    if (n.includes('pandeiro')) return { folder: 'Percussão', subFolder: 'Pandeiro' };
    if (n.includes('ganza') || n.includes('ovinho')) return { folder: 'Percussão', subFolder: 'Ganzá' };
    if (n.includes('tamborim')) return { folder: 'Percussão', subFolder: 'Tamborim' };
    if (n.includes('cuica') || n.includes('cuíca')) return { folder: 'Percussão', subFolder: 'Cuíca' };
    if (n.includes('grave') || n.includes('surdo')) return { folder: 'Percussão', subFolder: 'Surdo' };
    if (n.includes('kick') || n.includes('bumbo')) return { folder: 'Bateria', subFolder: 'Bumbo' };
    if (n.includes('snare') || n.includes('caixa')) return { folder: 'Bateria', subFolder: 'Caixa' };
    return { folder: 'Percussão', subFolder: 'Geral' };
  };

  // Filtered samples list according to active folder and subfolder
  const filteredSamples = useMemo(() => {
    return samplesList.filter((s) => {
      const meta = getSampleFolder(s);
      if (activeFolderFilter !== 'all' && meta.folder !== activeFolderFilter) {
        return false;
      }
      if (activeSubFolderFilter !== 'all' && meta.subFolder !== activeSubFolderFilter) {
        return false;
      }
      return true;
    });
  }, [samplesList, sampleFolders, activeFolderFilter, activeSubFolderFilter]);

  // Create new folder
  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (!userFolders.includes(trimmed)) {
      const nextFolders = [...userFolders, trimmed];
      setUserFolders(nextFolders);
      try {
        localStorage.setItem('beatbuddy_user_folders_list', JSON.stringify(nextFolders));
      } catch {}
      setStatusMessage(`Pasta "${trimmed}" criada com sucesso!`);
    }
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // Create new subfolder
  const handleCreateSubFolder = (parentFolder: string) => {
    const trimmed = newSubFolderName.trim();
    if (!trimmed) return;
    const currentSubs = userSubFolders[parentFolder] || [];
    if (!currentSubs.includes(trimmed)) {
      const nextMap = {
        ...userSubFolders,
        [parentFolder]: [...currentSubs, trimmed],
      };
      setUserSubFolders(nextMap);
      try {
        localStorage.setItem('beatbuddy_user_subfolders_list', JSON.stringify(nextMap));
      } catch {}
      setStatusMessage(`Subpasta "${trimmed}" criada dentro de "${parentFolder}"!`);
    }
    setNewSubFolderName('');
    setIsCreatingSubFolder(null);
  };

  // Move sample to selected folder and subfolder
  const handleAssignSampleFolder = (sampleId: string, folder: string, subFolder?: string) => {
    const updated = {
      ...sampleFolders,
      [sampleId]: { folder, subFolder },
    };
    saveSampleFolders(updated);
    updateSampleFolderInStorage(sampleId, folder, subFolder);
    setMovingSample(null);
    setStatusMessage(`Sample movido para a pasta "${folder}${subFolder ? ` / ${subFolder}` : ''}".`);
  };

  // Move up/down order in list
  const handleMoveSample = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= samplesList.length) return;
    const nextList = [...samplesList];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);
    setSamplesList(nextList);
    audioEngine.reorderCustomSamples(nextList.map((s) => s.id));
    setStatusMessage(`Ordem do sample "${moved.name}" atualizada.`);
  };

  // File Upload with active folder association
  const handleFileUpload = async (files: FileList | File[]) => {
    try {
      const folderToAssign = activeFolderFilter !== 'all' ? activeFolderFilter : 'Percussão';
      const subFolderToAssign = activeSubFolderFilter !== 'all' ? activeSubFolderFilter : undefined;
      let cloudFailures = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatusMessage(`Processando sample "${file.name}"...`);
        const id = await audioEngine.loadSampleFromBlob(file, file.name);
        try {
          await saveSampleToDatabase(file, id);
        } catch (error) {
          cloudFailures++;
          console.error(`Failed to sync sample "${file.name}" to cloud:`, error);
        }

        // Assign folder
        const updated = {
          ...sampleFolders,
          [id]: { folder: folderToAssign, subFolder: subFolderToAssign },
        };
        saveSampleFolders(updated);
        updateSampleFolderInStorage(id, folderToAssign, subFolderToAssign);

        audioEngine.triggerInstrument('custom', { volume: 0.9 }, id);
      }
      refreshList();
      const cloudWarning =
        cloudFailures > 0
          ? ` Falha ao sincronizar ${cloudFailures} sample(s) com a nuvem; os arquivos locais foram mantidos.`
          : '';
      setStatusMessage(`Samples carregados e organizados na pasta "${folderToAssign}"!${cloudWarning}`);
    } catch {
      setStatusMessage('Erro ao decodificar arquivo de áudio.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Record from microphone
  const handleRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const name = `Gravação_Voz_${new Date().toLocaleTimeString('pt-BR')}`;
        try {
          const id = await audioEngine.loadSampleFromBlob(blob, name);
          let cloudWarning = '';
          try {
            await saveSampleToDatabase(
              new File([blob], `${name}.webm`, { type: blob.type }),
              id
            );
          } catch (error) {
            console.error('Failed to sync recording to cloud:', error);
            cloudWarning = ' (salvo localmente; falha ao sincronizar com a nuvem)';
          }

          const folderToAssign = activeFolderFilter !== 'all' ? activeFolderFilter : 'Efeitos';
          const updated = {
            ...sampleFolders,
            [id]: { folder: folderToAssign, subFolder: 'Voz' },
          };
          saveSampleFolders(updated);
          updateSampleFolderInStorage(id, folderToAssign, 'Voz');

          refreshList();
          setStatusMessage(`Sample "${name}" gravado na pasta "${folderToAssign}"!${cloudWarning}`);
          audioEngine.triggerInstrument('custom', { volume: 0.9 }, id);
        } catch (error) {
          console.error('Failed to process sample recording:', error);
          setStatusMessage('Falha ao processar gravação de voz.');
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      setIsRecording(true);
      mediaRecorder.start();
      let left = 3;
      setCountdown(left);
      const interval = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(interval);
          mediaRecorder.stop();
          setIsRecording(false);
          setCountdown(null);
        } else {
          setCountdown(left);
        }
      }, 1000);
    } catch {
      setStatusMessage('Microfone não acessível ou permissão recusada.');
    }
  };

  // Delete sample: removes from physical directory AND from JSON file
  const executeDeleteSample = async (sampleId: string, sampleName: string) => {
    // Condition: ONLY allow deleting if the sample is NOT being used in any rhythm!
    const usage = isSampleUsedInRhythms(sampleId, sampleName, rhythms);
    if (usage.used) {
      setStatusMessage(
        `⚠️ Bloqueado: o sample "${sampleName}" não pode ser excluído porque está sendo usado no(s) ritmo(s): "${usage.rhythmNames.join(', ')}". Remova-o de todos os ritmos antes de excluir.`
      );
      setConfirmDeleteId(null);
      return;
    }

    try {
      // 1. Delete from AudioEngine cache and internal buffers
      await audioEngine.deleteCustomSample(sampleId, sampleName);

      // 2. Delete from persistent IndexedDB and triggers DELETE on /api/samples/:id (which deletes from disk and index.json)
      await deleteSampleFromStorage(sampleId, sampleName);

      // 3. Remove folder association
      const updatedFolders = { ...sampleFolders };
      delete updatedFolders[sampleId];
      delete updatedFolders[sampleName];
      saveSampleFolders(updatedFolders);

      // 4. Immediately remove from local state list
      setSamplesList((prev) => prev.filter((s) => s.id !== sampleId && s.name !== sampleName));

      // 5. Notify parent
      onDeleteSample?.(sampleId);
      refreshList();
      setConfirmDeleteId(null);
      setStatusMessage(`🗑️ Sample "${sampleName}" removido com sucesso do arquivo JSON e da pasta física de samples!`);
    } catch {
      setStatusMessage(`Erro ao excluir sample "${sampleName}".`);
    }
  };

  const playSample = (sampleId: string) => {
    audioEngine.triggerInstrument('custom', { volume: 0.9 }, sampleId);
  };

  const handleExportBackup = async () => {
    try {
      setStatusMessage('Gerando backup completo (.json com áudios)...');
      await exportFullLibraryBackup();
      setStatusMessage('Backup completo (.json) exportado com sucesso!');
    } catch {
      setStatusMessage('Erro ao exportar backup.');
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      setStatusMessage('Importando pacote de ritmos e sons...');
      const res = await importFullLibraryBackup(file);
      await audioEngine.preloadAllServerSamples();
      await audioEngine.initPersistentSamples();
      refreshList();
      setStatusMessage(`Sucesso! Importados ${res.rhythmsCount} ritmos e ${res.samplesCount} sons de áudio.`);
    } catch {
      setStatusMessage('Erro ao importar pacote. Verifique se o arquivo é um backup válido.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>Gerenciador de Samples & Pastas</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
              Pastas & Subpastas
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Organize seus instrumentos por pastas (ex: Percussão ➔ Ganzá, Tamborim, Cuíca, etc.) com exclusão sincronizada no JSON e no diretório físico.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400 hover:text-slate-950 text-amber-300 text-xs font-bold rounded-xl border border-amber-400/40 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Nova Pasta</span>
          </button>
        </div>
      </div>

      {/* Local Folder Info Banner */}
      <div className="flex items-center gap-3 p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
        <Database className="w-4 h-4 text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold text-white">Armazenamento Físico & Arquivo JSON: </span>
          <span>
            Os arquivos de áudio são mantidos na pasta física (<code className="text-emerald-300 bg-emerald-950 px-1 py-0.5 rounded font-mono">public/samples/</code>) e no catálogo <code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded font-mono">samples/index.json</code>. Ao excluir um sample, ele é removido do arquivo JSON e do disco automaticamente.
          </span>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-fade-in">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-amber-400 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* CREATE FOLDER MODAL */}
      {isCreatingFolder && (
        <div className="p-4 bg-slate-900 border border-amber-400/50 rounded-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              <span>Criar Nova Pasta de Samples</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingFolder(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nome da pasta (ex: Percussão, Bateria, Efeitos...)"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="flex-1 bg-slate-950 border border-slate-700 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <button
              type="button"
              onClick={handleCreateFolder}
              className="px-4 py-2 bg-amber-400 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-300 cursor-pointer"
            >
              Criar Pasta
            </button>
          </div>
        </div>
      )}

      {/* CREATE SUBFOLDER MODAL */}
      {isCreatingSubFolder && (
        <div className="p-4 bg-slate-900 border border-cyan-400/50 rounded-xl space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              <span>Criar Subpasta dentro de "{isCreatingSubFolder}"</span>
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingSubFolder(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nome da subpasta (ex: Ganzá, Tamborim, Cuíca, Caixa...)"
              value={newSubFolderName}
              onChange={(e) => setNewSubFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSubFolder(isCreatingSubFolder)}
              className="flex-1 bg-slate-950 border border-slate-700 text-xs px-3 py-2 rounded-lg text-white focus:outline-none focus:border-cyan-400"
              autoFocus
            />
            <button
              type="button"
              onClick={() => handleCreateSubFolder(isCreatingSubFolder)}
              className="px-4 py-2 bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg hover:bg-cyan-300 cursor-pointer"
            >
              Criar Subpasta
            </button>
          </div>
        </div>
      )}

      {/* FOLDERS & SUBFOLDERS BROWSER TABS */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-amber-400" />
            <span>Navegação por Pastas:</span>
          </span>
          <span className="text-[11px] text-slate-400">
            {filteredSamples.length} de {samplesList.length} samples exibidos
          </span>
        </div>

        {/* Level 1: Main Folders Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveFolderFilter('all');
              setActiveSubFolderFilter('all');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeFolderFilter === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-xs'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <span>📁 Todas as Pastas</span>
            <span className="text-[10px] opacity-75 font-mono">({samplesList.length})</span>
          </button>

          {userFolders.map((folder) => {
            const count = samplesList.filter((s) => getSampleFolder(s).folder === folder).length;
            const isSelected = activeFolderFilter === folder;

            return (
              <button
                key={folder}
                type="button"
                onClick={() => {
                  setActiveFolderFilter(folder);
                  setActiveSubFolderFilter('all');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>📁 {folder}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Level 2: Sub-folders (if a specific folder is selected) */}
        {activeFolderFilter !== 'all' && (
          <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2 bg-slate-950/40 p-2.5 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>Subpastas de {activeFolderFilter}:</span>
            </span>

            <button
              type="button"
              onClick={() => setActiveSubFolderFilter('all')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeSubFolderFilter === 'all'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>

            {(userSubFolders[activeFolderFilter] || []).map((sub) => {
              const subCount = samplesList.filter((s) => {
                const meta = getSampleFolder(s);
                return meta.folder === activeFolderFilter && meta.subFolder === sub;
              }).length;
              const isSubSelected = activeSubFolderFilter === sub;

              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => setActiveSubFolderFilter(sub)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isSubSelected
                      ? 'bg-cyan-400 text-slate-950 shadow-xs'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{sub}</span>
                  <span className="text-[9px] opacity-75 font-mono">({subCount})</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsCreatingSubFolder(activeFolderFilter)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 cursor-pointer"
            >
              + Subpasta
            </button>
          </div>
        )}
      </div>

      {/* MOVE SAMPLE MODAL */}
      {movingSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-[#0f172a] border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400" />
                <span>Mover Sample para Pasta</span>
              </h4>
              <button
                type="button"
                onClick={() => setMovingSample(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Sample selecionado: <strong className="text-white">{movingSample.name}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Pasta Principal:
                </label>
                <select
                  value={targetFolder}
                  onChange={(e) => {
                    setTargetFolder(e.target.value);
                    const availableSubs = userSubFolders[e.target.value] || [];
                    setTargetSubFolder(availableSubs[0] || '');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {userFolders.map((f) => (
                    <option key={f} value={f}>
                      📁 {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Subpasta (Ex: Ganzá, Tamborim, Cuíca, etc.):
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={targetSubFolder}
                    onChange={(e) => setTargetSubFolder(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">(Sem subpasta)</option>
                    {(userSubFolders[targetFolder] || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMovingSample(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAssignSampleFolder(movingSample.id, targetFolder, targetSubFolder)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 cursor-pointer"
              >
                Salvar na Pasta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload & Record Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all ${
            isDragOver
              ? 'border-amber-400 bg-amber-400/5'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
            <Upload className="w-6 h-6 text-amber-400" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">
            Arraste arquivos para{' '}
            <span className="text-amber-400">
              {activeFolderFilter !== 'all' ? activeFolderFilter : 'esta pasta'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Suporta .wav, .mp3, .ogg, .flac gravados ou exportados
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
          >
            Selecionar Arquivos do Computador
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,.wav,.mp3,.ogg,.flac"
            onChange={(e) => {
              if (e.target.files) handleFileUpload(e.target.files);
            }}
            className="hidden"
          />
        </div>

        {/* Record with Mic */}
        <div className="border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-900/30">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
            <Mic className={`w-6 h-6 ${isRecording ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}`} />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Gravação de Voz ou Instrumento</h3>
          <p className="text-xs text-slate-400 mb-4">
            Grave 3 segundos pelo microfone e crie um sample instantâneo
          </p>
          <button
            type="button"
            onClick={handleRecord}
            disabled={isRecording}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
            }`}
          >
            {isRecording ? `Gravando... ${countdown}s` : 'Iniciar Gravação (3s)'}
          </button>
        </div>
      </div>

      {/* SAMPLES TABLE LIST */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Biblioteca de Samples Locais</span>
              <span className="text-xs text-amber-400 font-mono font-normal">
                ({filteredSamples.length} samples nesta pasta)
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Use as setas ↑ e ↓ para reordenar a sequência de samples como preferir.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              title="Exportar biblioteca de ritmos e sons de áudio como arquivo .json portátil"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold rounded-lg border border-amber-400/30 transition-colors cursor-pointer"
            >
              <FolderDown className="w-3.5 h-3.5" />
              <span>Exportar Backup (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              title="Importar backup com ritmos e sons de áudio gerados em outro computador ou celular"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Importar</span>
            </button>
            <input
              ref={backupInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImportBackup(e.target.files[0]);
              }}
              className="hidden"
            />
          </div>
        </div>

        {filteredSamples.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Nenhum sample nesta pasta. Selecione outra pasta acima ou envie um novo arquivo!
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredSamples.map((sample, index) => {
              const meta = getSampleFolder(sample);
              const cleanName = sample.name.replace(/\.[^/.]+$/, '');

              return (
                <div
                  key={sample.id}
                  className="px-6 py-3 flex items-center justify-between gap-4 hover:bg-slate-900/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Reorder Up / Down */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        title="Mover sample para cima"
                        disabled={index === 0}
                        onClick={() => handleMoveSample(index, 'up')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-850 disabled:cursor-not-allowed text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title="Mover sample para baixo"
                        disabled={index === filteredSamples.length - 1}
                        onClick={() => handleMoveSample(index, 'down')}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-850 disabled:cursor-not-allowed text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Play Sample */}
                    <button
                      type="button"
                      title="Tocar sample"
                      onClick={() => playSample(sample.id)}
                      className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-amber-400 text-amber-400 hover:text-slate-950 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>

                    <div className="min-w-0">
                      {editingSampleId === sample.id ? (
                        <div className="flex items-center gap-1.5 py-0.5">
                          <input
                            type="text"
                            value={editNameText}
                            onChange={(e) => setEditNameText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editNameText.trim()) {
                                audioEngine.renameCustomSample(sample.id, editNameText.trim());
                                onRenameSample?.(sample.id, editNameText.trim());
                                refreshList();
                                setEditingSampleId(null);
                                setStatusMessage(`Sample renomeado para "${editNameText.trim()}".`);
                              } else if (e.key === 'Escape') {
                                setEditingSampleId(null);
                              }
                            }}
                            className="bg-slate-900 border border-amber-400 text-xs px-2 py-1 rounded text-white font-medium focus:outline-none w-44"
                            autoFocus
                          />
                          <button
                            type="button"
                            title="Salvar novo nome"
                            onClick={() => {
                              if (editNameText.trim()) {
                                audioEngine.renameCustomSample(sample.id, editNameText.trim());
                                onRenameSample?.(sample.id, editNameText.trim());
                                refreshList();
                                setEditingSampleId(null);
                                setStatusMessage(`Sample renomeado para "${editNameText.trim()}".`);
                              }
                            }}
                            className="p-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Cancelar"
                            onClick={() => setEditingSampleId(null)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white block truncate max-w-[200px]">
                            {sample.name}
                          </span>
                          <button
                            type="button"
                            title="Renomear sample"
                            onClick={() => {
                              setEditingSampleId(sample.id);
                              setEditNameText(sample.name);
                            }}
                            className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Folder & Subfolder Tag + In-Use Badge */}
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Folder className="w-2.5 h-2.5" />
                          <span>{meta.folder || 'Percussão'}</span>
                          {meta.subFolder && (
                            <>
                              <span className="opacity-50">/</span>
                              <span>{meta.subFolder}</span>
                            </>
                          )}
                        </span>

                        {isSampleUsedInRhythms(sample.id, sample.name, rhythms).used && (
                          <span
                            title={`Este sample está em uso no(s) ritmo(s): ${isSampleUsedInRhythms(sample.id, sample.name, rhythms).rhythmNames.join(', ')}`}
                            className="text-[10px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-1.5 py-0.5 rounded flex items-center gap-1"
                          >
                            <Lock className="w-2.5 h-2.5 text-rose-400" />
                            <span>Em uso: {isSampleUsedInRhythms(sample.id, sample.name, rhythms).rhythmNames.join(', ')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Move to Folder, Add to Rhythm, Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Move to folder */}
                    <button
                      type="button"
                      title="Mudar pasta deste sample"
                      onClick={() => {
                        setMovingSample(sample);
                        setTargetFolder(meta.folder || 'Percussão');
                        setTargetSubFolder(meta.subFolder || '');
                      }}
                      className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="hidden sm:inline">Mover Pasta</span>
                    </button>

                    {/* Add as track in current rhythm */}
                    <button
                      type="button"
                      onClick={() => onAddTrackWithSample(sample.id, sample.name)}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-2.5 py-1 rounded-lg border border-amber-400/30 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar à Pista</span>
                    </button>

                    {/* Delete sample from physical folder AND JSON (Blocked if used in any rhythm) */}
                    {(() => {
                      const usage = isSampleUsedInRhythms(sample.id, sample.name, rhythms);
                      if (usage.used) {
                        return (
                          <button
                            type="button"
                            disabled
                            title={`Não é possível excluir: o sample "${sample.name}" está em uso no(s) ritmo(s): "${usage.rhythmNames.join(', ')}". Remova-o de todos os ritmos para poder excluí-lo.`}
                            className="p-1.5 text-slate-600 bg-slate-900/40 border border-slate-800/80 rounded-lg cursor-not-allowed opacity-40"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-500" />
                          </button>
                        );
                      }

                      if (confirmDeleteId === sample.id) {
                        return (
                          <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 p-1 rounded-lg">
                            <span className="text-[10px] text-rose-300 font-bold px-1">
                              Remover do JSON & Disco?
                            </span>
                            <button
                              type="button"
                              title="Confirmar exclusão definitiva da pasta física e do arquivo JSON"
                              onClick={() => executeDeleteSample(sample.id, sample.name)}
                              className="px-2 py-0.5 bg-rose-500 text-slate-950 font-black text-[10px] rounded hover:bg-rose-400 cursor-pointer"
                            >
                              Sim
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1 text-slate-400 hover:text-white text-[10px] cursor-pointer"
                            >
                              Não
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          type="button"
                          title="Excluir sample da pasta física e do arquivo JSON"
                          onClick={() => setConfirmDeleteId(sample.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
