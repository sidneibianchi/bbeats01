/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BeatBuddyDisplay } from './components/BeatBuddyDisplay';
import { PedalController } from './components/PedalController';
import { SongPartsBar } from './components/SongPartsBar';
import { MasterToolbar } from './components/MasterToolbar';
import { SequencerGrid } from './components/SequencerGrid';
import { SampleManagerModal } from './components/SampleManagerModal';
import { AddInstrumentModal } from './components/AddInstrumentModal';
import { CreateRhythmModal } from './components/CreateRhythmModal';
import { DeleteRhythmModal } from './components/DeleteRhythmModal';
import { CopyPartModal } from './components/CopyPartModal';
import { FootswitchConfigModal } from './components/FootswitchConfigModal';
import { SamplesLibraryView } from './components/SamplesLibraryView';
import { DrumKitManagerModal } from './components/DrumKitManagerModal';
import { DrumKitDefinition } from './types/kit';
import { MobileLiveView } from './components/MobileLiveView';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MobileAndPedalGuideModal } from './components/MobileAndPedalGuideModal';
import { ShareMobileModal } from './components/ShareMobileModal';
import { LocalFileManagerModal } from './components/LocalFileManagerModal';
import { Volume2 } from 'lucide-react';
import { audioEngine } from './audio/AudioEngine';
import {
  sambaPreset,
  availablePresets,
  createEmptySteps,
  createNewCustomRhythm,
  StarterKitType,
} from './presets/groovePresets';
import {
  SongPartId,
  SongProject,
  StepData,
  TimeSignature,
  TrackDefinition,
  RhythmicResolution,
} from './types/rhythm';
import {
  syncSamplesFromServer,
  fetchRhythmsFromServer,
  saveRhythmsToServer,
  fetchActiveRhythmFromServer,
  saveActiveRhythmToServer,
  deleteRhythmFromServer,
} from './audio/sampleStorage';
import { isSampleUsedInRhythms } from './audio/sampleUsage';
import { footswitchManager } from './audio/midiAndPedalManager';

export default function App() {

  // Helper to sanitize project names and migrate outdated 2/4 formulas
  const sanitizeProject = (p: SongProject): SongProject => {
    const cleanName = (p.name || '')
      .replace(/\s*\(\d+.*?\)/g, '')
      .trim() || p.name || 'Ritmo Sem Nome';
    const timeSig = (!p.timeSignature || (p.timeSignature as string) === '2/4') ? '4/4' : p.timeSignature;
    return {
      ...p,
      name: cleanName,
      timeSignature: timeSig as any,
      barsCount: p.barsCount === 2 ? 1 : (p.barsCount || 1),
      resolution: p.resolution === '1/16' ? '1/32' : (p.resolution || '1/32'),
    };
  };

  const isDeletingRhythmRef = useRef(false);
  const skipNextRhythmAutosaveRef = useRef(false);

  const createBlankRhythm = (): SongProject => ({
    id: `rhythm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: 'Novo Ritmo',
    genre: 'Personalizado',
    bpm: 100,
    timeSignature: '4/4',
    resolution: '1/32',
    barsCount: 1,
    swing: 0,
    humanize: 0,
    accentSound: 'crash',
    defaultStepCount: 32,
    tracks: [],
    parts: {
      verse: { id: 'verse', name: 'Parte A', description: 'Parte A', trackSteps: {} },
      part_b: { id: 'part_b', name: 'Parte B', description: 'Parte B', trackSteps: {} },
      part_c: { id: 'part_c', name: 'Parte C', description: 'Parte C', trackSteps: {} },
      fill1: { id: 'fill1', name: 'Virada A', description: 'Virada A', trackSteps: {} },
      fill2: { id: 'fill2', name: 'Virada B', description: 'Virada B', trackSteps: {} },
      fill3: { id: 'fill3', name: 'Virada C', description: 'Virada C', trackSteps: {} },
      transition_a_b: { id: 'transition_a_b', name: 'Trans A->B', description: 'Transição A para B', trackSteps: {} },
      transition_b_a: { id: 'transition_b_a', name: 'Trans B->A', description: 'Transição B para A', trackSteps: {} },
      intro: { id: 'intro', name: 'Intro', description: 'Introdução', trackSteps: {} },
      outro: { id: 'outro', name: 'Final', description: 'Finalização', trackSteps: {} },
    },
  });

  // Persistent Rhythms Library
  const [rhythms, setRhythms] = useState<SongProject[]>(() => {
    try {
      const saved = localStorage.getItem('beatbuddy_rhythms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: SongProject) => sanitizeProject(p));
        }
      }
    } catch (e) {
      console.error('Failed to load rhythms from localStorage', e);
    }
    return availablePresets.map((p) => sanitizeProject(p));
  });

  const [project, setProject] = useState<SongProject>(() => {
    const p = rhythms[0] || sambaPreset;
    return sanitizeProject(p);
  });

  const checkIsMobileOrTablet = () => {
    if (typeof window === 'undefined') return false;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isWidth = window.innerWidth <= 1024;
    const isUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Tablet/i.test(
      navigator.userAgent
    );
    return isWidth || (isTouch && window.innerWidth <= 1280) || isUA;
  };

  const [isMobileScreen, setIsMobileScreen] = useState(checkIsMobileOrTablet);
  const [forceDesktopMode, setForceDesktopMode] = useState(false);
  const [isManualMobileLiveView, setIsManualMobileLiveView] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(checkIsMobileOrTablet());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeView, setActiveView] = useState<'sequencer' | 'pedal' | 'samples'>('sequencer');
  const [isServerLoaded, setIsServerLoaded] = useState(false);
  const [activePartId, setActivePartId] = useState<SongPartId>('verse');
  const [playingPartId, setPlayingPartId] = useState<SongPartId>('verse');
  const [isPlaying, setIsPlaying] = useState(false);

  // Playhead & Clock state
  const [currentTick, setCurrentTick] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentBar, setCurrentBar] = useState(1);
  const [subdivision, setSubdivision] = useState(0);
  const [activeTrackSteps, setActiveTrackSteps] = useState<Record<string, number>>({});

  // BeatBuddy dynamic state (Pedal 1 & Pedal 2)
  const [basePartId, setBasePartId] = useState<SongPartId>('verse');
  const [selectedStartPart, setSelectedStartPart] = useState<SongPartId>('verse');
  const [isFill, setIsFill] = useState(false);
  const [activeFillId, setActiveFillId] = useState<SongPartId | null>(null);
  const [isTransition, setIsTransition] = useState(false);
  const [activeTransitionId, setActiveTransitionId] = useState<SongPartId | null>(null);
  const [isOutro, setIsOutro] = useState(false);
  const [isIntro, setIsIntro] = useState(false);
  const [playIntroOnStart, setPlayIntroOnStart] = useState(true);

  // Cloud sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const isServerLoadedRef = useRef(false);
  const rhythmSaveTimerRef = useRef<number | null>(null);

  // Pedal toast notification & physical states
  const [pedalToast, setPedalToast] = useState<{ msg: string; timestamp: number } | null>(null);
  const [isExternalPedal1Pressed, setIsExternalPedal1Pressed] = useState(false);
  const [isExternalPedal2Pressed, setIsExternalPedal2Pressed] = useState(false);

  // Physical footswitch enabled / disabled toggle
  const [isPedalEnabled, setIsPedalEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('beatbuddy_pedal_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const isPedalEnabledRef = useRef(isPedalEnabled);
  useEffect(() => {
    isPedalEnabledRef.current = isPedalEnabled;
    footswitchManager.setEnabled(isPedalEnabled);
  }, [isPedalEnabled]);

  const togglePedalEnabled = () => {
    setIsPedalEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('beatbuddy_pedal_enabled', String(next));
      } catch {
        // ignore
      }
      footswitchManager.setEnabled(next);
      triggerPedalToast(
        next
          ? '🦶 Pedal Físico Ativado'
          : '🛑 Pedal Físico Desativado (Digitação 100% Liberada)'
      );
      return next;
    });
  };

  // Master controls
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [metronomeOn, setMetronomeOn] = useState(false);

  // Modals
  const [editingTrack, setEditingTrack] = useState<TrackDefinition | null>(null);
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);
  const [isCreateRhythmOpen, setIsCreateRhythmOpen] = useState(false);
  const [isDeleteRhythmOpen, setIsDeleteRhythmOpen] = useState(false);
  const [isCopyPartOpen, setIsCopyPartOpen] = useState(false);
  const [isFootswitchConfigOpen, setIsFootswitchConfigOpen] = useState(false);
  const [isDrumKitModalOpen, setIsDrumKitModalOpen] = useState(false);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);
  const [isShareMobileOpen, setIsShareMobileOpen] = useState(false);
  const [isLocalFileManagerOpen, setIsLocalFileManagerOpen] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [customSamplesList, setCustomSamplesList] = useState<Array<{ id: string; name: string }>>(() =>
    audioEngine.getCustomSamplesList()
  );

  const isAnyModalOpen = Boolean(
    editingTrack ||
    isAddTrackOpen ||
    isCreateRhythmOpen ||
    isDeleteRhythmOpen ||
    isCopyPartOpen ||
    isFootswitchConfigOpen ||
    isDrumKitModalOpen ||
    isMobileGuideOpen ||
    isShareMobileOpen ||
    isLocalFileManagerOpen
  );
  const isModalOpenRef = useRef(isAnyModalOpen);
  useEffect(() => {
    isModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  // Stable refs for global pedal actions
  const stateRef = useRef({
    isPlaying,
    isIntro,
    isFill,
    isTransition,
    isOutro,
    currentPartId: playingPartId,
    basePartId,
    selectedStartPart,
  });

  useEffect(() => {
    stateRef.current = {
      isPlaying,
      isIntro,
      isFill,
      isTransition,
      isOutro,
      currentPartId: playingPartId,
      basePartId,
      selectedStartPart,
    };
  }, [isPlaying, isIntro, isFill, isTransition, isOutro, playingPartId, basePartId, selectedStartPart]);

  // Show a momentary pedal toast
  const triggerPedalToast = (msg: string) => {
    setPedalToast({ msg, timestamp: Date.now() });
    setTimeout(() => {
      setPedalToast((prev) => (prev && Date.now() - prev.timestamp >= 2200 ? null : prev));
    }, 2300);
  };

  // --- Initial Local JSON & Sample Synchronization (/public/samples/ & rhythms.json) ---
  const performLocalSync = async () => {
    setIsSyncing(true);
    try {
      // 1. Fetch rhythms from local JSON server (/api/rhythms or public/rhythms.json)
      const remoteRhythms = await fetchRhythmsFromServer();
      const activeRhythmId = await fetchActiveRhythmFromServer();

      if (remoteRhythms && Array.isArray(remoteRhythms) && remoteRhythms.length > 0) {
        const typedRhythms = remoteRhythms as SongProject[];
        setRhythms(typedRhythms);
        localStorage.setItem('beatbuddy_rhythms', JSON.stringify(typedRhythms));

        // Prioritize: 1) server active rhythm, 2) local active rhythm, 3) custom rhythm (e.g. Samba), 4) first
        const localActiveId = localStorage.getItem('beatbuddy_active_rhythm_id');
        const targetId = activeRhythmId || localActiveId;
        const targetRhythm =
          typedRhythms.find((r) => r.id === targetId) ||
          typedRhythms.find((r) => !r.id.startsWith('preset_')) ||
          typedRhythms[0];

        if (targetRhythm) {
          setProject(targetRhythm);
          audioEngine.updateProject(targetRhythm);
        }
      } else if (remoteRhythms && Array.isArray(remoteRhythms)) {
        setRhythms([]);
        localStorage.setItem('beatbuddy_rhythms', JSON.stringify([]));
        const blankProject = createBlankRhythm();
        skipNextRhythmAutosaveRef.current = true;
        setProject(blankProject);
        audioEngine.updateProject(blankProject);
      } else {
        triggerPedalToast('Não foi possível carregar os ritmos remotos; a cópia local foi preservada.');
      }

      // 3. Pre-load all samples directly into audio buffers for immediate mobile playback
      await audioEngine.preloadAllServerSamples();

      // 4. Sync audio samples from server to local IndexedDB (and vice-versa)
      await syncSamplesFromServer();

      // 5. Refresh samples in AudioEngine
      await audioEngine.initPersistentSamples();
      setCustomSamplesList(audioEngine.getCustomSamplesList());

      isServerLoadedRef.current = true;
      setIsServerLoaded(true);
      setLastSyncTime(Date.now());
    } catch (err) {
      console.warn('Sync attempt finished with warnings:', err);
      isServerLoadedRef.current = true;
    } finally {
      setIsSyncing(false);
      isServerLoadedRef.current = true;
      setIsServerLoaded(true);
    }
  };

  useEffect(() => {
    performLocalSync();

    // Mobile audio unlocking listener on first touch or pedal click
    const unlockAudio = () => {
      audioEngine.unlockAudioContext();
      audioEngine.preloadAllServerSamples().then(() => {
        setCustomSamplesList(audioEngine.getCustomSamplesList());
      });
      setIsAudioUnlocked(true);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Sync project changes with audio engine & persistent storage + Cloud
  useEffect(() => {
    if (isDeletingRhythmRef.current) return;
    audioEngine.updateProject(project);
    if (skipNextRhythmAutosaveRef.current) {
      skipNextRhythmAutosaveRef.current = false;
      return;
    }

    // Save project changes to rhythms library and localStorage
    setRhythms((prevList) => {
      const idx = prevList.findIndex((r) => r.id === project.id);
      if (idx >= 0 && prevList[idx] === project) return prevList;
      const nextList = idx >= 0
        ? prevList.map((r, i) => (i === idx ? project : r))
        : [...prevList, project];
      try {
        localStorage.setItem('beatbuddy_rhythms', JSON.stringify(nextList));
        localStorage.setItem('beatbuddy_active_rhythm_id', project.id);
        // Only save to server once initial load has completed to avoid overwriting with defaults
        if (isServerLoadedRef.current) {
          if (rhythmSaveTimerRef.current !== null) {
            window.clearTimeout(rhythmSaveTimerRef.current);
          }
          rhythmSaveTimerRef.current = window.setTimeout(() => {
            void saveRhythmsToServer(nextList).then((saved) => {
              if (!saved) triggerPedalToast('Falha ao sincronizar as alterações do ritmo com o Neon.');
            });
          }, 600);
          void saveActiveRhythmToServer(project.id);
        }
      } catch (e) {
        console.error('Failed to save rhythms to localStorage', e);
      }
      return nextList;
    });
  }, [project]);

  useEffect(() => () => {
    if (rhythmSaveTimerRef.current !== null) {
      window.clearTimeout(rhythmSaveTimerRef.current);
    }
  }, []);

  // Primary action: Save rhythm directly to App & Cloud
  const handleSaveProjectToApp = async () => {
    try {
      const nextList = rhythms.some((r) => r.id === project.id)
        ? rhythms.map((r) => (r.id === project.id ? project : r))
        : [project, ...rhythms];

      setRhythms(nextList);
      localStorage.setItem('beatbuddy_rhythms', JSON.stringify(nextList));
      localStorage.setItem('beatbuddy_active_rhythm_id', project.id);

      // Persist to server
      const saved = await saveRhythmsToServer(nextList);
      if (!saved) {
        triggerPedalToast('Falha ao salvar no Neon. A cópia local foi mantida.');
        return;
      }
      await saveActiveRhythmToServer(project.id);
      await syncSamplesFromServer();

      setIsSavedRecently(true);
      triggerPedalToast(`Ritmo "${project.name}" salvo na biblioteca compartilhada.`);
      setTimeout(() => setIsSavedRecently(false), 2500);
    } catch (err) {
      console.error('Failed to save rhythm to app:', err);
    }
  };

  const handleExportRhythmsJson = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rhythms, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'rhythms.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerPedalToast(`💾 Arquivo rhythms.json baixado (${rhythms.length} ritmos)!`);
    } catch {
      triggerPedalToast('Erro ao exportar rhythms.json');
    }
  };

  const handleRhythmsUpdated = async (newRhythms: SongProject[]): Promise<boolean> => {
    setRhythms(newRhythms);
    localStorage.setItem('beatbuddy_rhythms', JSON.stringify(newRhythms));
    const saved = await saveRhythmsToServer(newRhythms);
    if (!saved) triggerPedalToast('Falha ao atualizar o Neon; a cópia local foi mantida.');
    return saved;
    const exists = newRhythms.find((r) => r.id === project.id);
    if (!exists && newRhythms.length > 0) {
      setProject(newRhythms[0]);
      audioEngine.updateProject(newRhythms[0]);
    }
  };

  // Setup audio engine callback listener
  useEffect(() => {
    audioEngine.setCallbacks({
      onStep: ({
        partId,
        globalTick,
        beat,
        bar,
        subdivision: sub,
        trackSteps,
        isFill: fillActive,
        isTransition: transActive,
      }) => {
        setPlayingPartId(partId);
        setCurrentTick(globalTick);
        setCurrentBeat(beat);
        setCurrentBar(bar);
        setSubdivision(sub);
        setActiveTrackSteps(trackSteps);
        setIsFill(fillActive);
        setIsTransition(transActive);
      },
      onPedalStateChange: ({
        currentPart,
        basePart,
        selectedStartPart: startPart,
        activeFill,
        isTransitioning,
        activeTransition,
        isOutro: outroActive,
        isIntro: introActive,
      }) => {
        setPlayingPartId(currentPart);
        setActivePartId(currentPart);
        if (basePart) setBasePartId(basePart);
        if (startPart) setSelectedStartPart(startPart);
        setIsFill(Boolean(activeFill));
        setActiveFillId(activeFill || null);
        setIsTransition(isTransitioning);
        setActiveTransitionId(activeTransition || null);
        setIsOutro(outroActive);
        setIsIntro(Boolean(introActive));
      },
      onPlaybackStateChange: (playing) => {
        setIsPlaying(playing);
        if (!playing) {
          setActiveTrackSteps({});
          setIsIntro(false);
          setIsFill(false);
          setActiveFillId(null);
          setIsTransition(false);
          setActiveTransitionId(null);
          setIsOutro(false);
        }
      },
      onPartAutoAdvance: (nextPartId) => {
        setActivePartId(nextPartId);
        setPlayingPartId(nextPartId);
        if (nextPartId === 'verse' || nextPartId === 'part_b') {
          setBasePartId(nextPartId);
        }
        setIsIntro(false);
      },
      onSamplesUpdated: (samples) => {
        setCustomSamplesList(samples);
      },
      onRhythmChanged: (newProj, activeBpm) => {
        setProject(newProj);
        setActivePartId('verse');
        setPlayingPartId('verse');
        setBasePartId('verse');
        setSelectedStartPart('verse');
        setIsFill(false);
        setActiveFillId(null);
        setIsTransition(false);
        setActiveTransitionId(null);
        setIsIntro(false);
        setIsOutro(false);
        localStorage.setItem('beatbuddy_active_rhythm_id', newProj.id);
        saveActiveRhythmToServer(newProj.id).catch(() => {});
        triggerPedalToast(
          `🎵 Ritmo trocado no compasso: ${newProj.name.replace(/\s*\(\d+.*?\)/g, '').trim()} (Parte A • ${activeBpm} BPM)`
        );
      },
    });
  }, []);

  // Stable ref for pedal press/release actions shared with on-screen buttons
  const pedalActionCallbacksRef = useRef({
    onPedal1Down: (_isRepeat = false) => {},
    onPedal1Up: () => {},
    onPedal2Down: () => {},
    onPedal2Up: () => {},
  });

  // --- GLOBAL FOOSWITCH & CUVAVE / M-VAVE KEYBOARD LISTENER ---
  // Operates continuously across ALL views (Sequencer, Pedal, Samples)
  useEffect(() => {
    let pedal1SingleTapTimer: number | null = null;
    let pedal2SingleTapTimer: number | null = null;
    let pedal1PhysicalDown = false;
    let pedal1DownTimestamp = 0;
    let pedal1HoldTriggered = false;
    let pedal1StartedPlayback = false;
    let pedal1StartPlaybackTimestamp = 0;
    let lastPedal1ReleaseTimestamp = 0;
    let pressTimer: number | null = null;
    let lastPedal2PressTime = 0;

    // PEDAL 1 (Principal):
    // IN STOP: TAP -> Inicia Intro e avança para Parte A (com trava de partida)
    // IN PLAY: 1 TAP -> Virada (Fill A se em Parte A, Fill B se em Parte B)
    // IN PLAY: 2 TAPS RÁPIDOS (DOUBLE TAP) -> Finalização (Ending / Outro)
    // IN PLAY: SEGURAR (HOLD >= threshold) -> Finalização (Ending / Outro)
    const handlePedal1Down = (isRepeat = false) => {
      // Unmute audio immediately if locked on mobile
      if (!isAudioUnlocked) {
        audioEngine.unlockAudioContext();
        setIsAudioUnlocked(true);
      }

      // DOUBLE-TAP CHECK ON DOWN:
      // If a single tap was registered recently and we receive a second tap while playing:
      if (pedal1SingleTapTimer !== null && stateRef.current.isPlaying && !stateRef.current.isOutro) {
        clearTimeout(pedal1SingleTapTimer);
        pedal1SingleTapTimer = null;
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        pedal1HoldTriggered = true; // Consumes the release so up handler does nothing
        audioEngine.handlePedal1HoldStart();
        triggerPedalToast('🦶 Pedal 1 (2 Toques Rápidos): Finalizando Música (Ending)!');
        return;
      }

      // If already physically pressed down (e.g. OS key repeat while holding foot on pedal):
      if (pedal1PhysicalDown || isRepeat) {
        const holdThreshold = footswitchManager.getHoldThreshold();
        const heldDuration = Date.now() - pedal1DownTimestamp;
        if (
          !pedal1HoldTriggered &&
          heldDuration >= holdThreshold &&
          stateRef.current.isPlaying &&
          !stateRef.current.isOutro
        ) {
          pedal1HoldTriggered = true;
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
          if (pedal1SingleTapTimer) {
            clearTimeout(pedal1SingleTapTimer);
            pedal1SingleTapTimer = null;
          }
          audioEngine.handlePedal1HoldStart();
          triggerPedalToast('🦶 Pedal 1 Segurado: Finalizando Música (Ending)');
        }
        return;
      }

      // FIRST CONTACT of foot on Pedal 1
      pedal1PhysicalDown = true;
      pedal1DownTimestamp = Date.now();
      pedal1HoldTriggered = false;
      pedal1StartedPlayback = false;
      setIsExternalPedal1Pressed(true);

      // IN STOP: Start playback immediately
      if (!stateRef.current.isPlaying) {
        if (pedal1SingleTapTimer) {
          clearTimeout(pedal1SingleTapTimer);
          pedal1SingleTapTimer = null;
        }
        pedal1StartedPlayback = true;
        pedal1StartPlaybackTimestamp = Date.now();
        audioEngine.handlePedal1Tap();
        triggerPedalToast('🦶 Pedal 1: Iniciou Reprodução!');
        return;
      }

      // IN PLAY: Setup hold timer for Ending (Outro)
      if (stateRef.current.isOutro) return;

      const holdThreshold = footswitchManager.getHoldThreshold();
      if (pressTimer) clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        if (
          pedal1PhysicalDown &&
          !pedal1HoldTriggered &&
          stateRef.current.isPlaying &&
          !stateRef.current.isOutro
        ) {
          pedal1HoldTriggered = true;
          if (pedal1SingleTapTimer) {
            clearTimeout(pedal1SingleTapTimer);
            pedal1SingleTapTimer = null;
          }
          audioEngine.handlePedal1HoldStart();
          triggerPedalToast('🦶 Pedal 1 Segurado: Finalizando Música (Ending)');
        }
      }, holdThreshold);
    };

    const handlePedal1Up = () => {
      setIsExternalPedal1Pressed(false);
      pedal1PhysicalDown = false;
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }

      // 1. If this press already triggered Ending by holding or double-tap down, consume release completely!
      if (pedal1HoldTriggered) {
        pedal1HoldTriggered = false;
        lastPedal1ReleaseTimestamp = Date.now();
        return;
      }

      // 2. If this press started playback from stop, consume release completely!
      // (The foot lifting after starting must NEVER skip intro or trigger fill!)
      if (pedal1StartedPlayback) {
        pedal1StartedPlayback = false;
        lastPedal1ReleaseTimestamp = Date.now();
        return;
      }

      // 3. Start guard: Foot lifting after starting within 700ms never skips intro or triggers fill
      if (Date.now() - pedal1StartPlaybackTimestamp < 700) {
        lastPedal1ReleaseTimestamp = Date.now();
        return;
      }

      // 4. Anti-chatter debounce: ignore dirty release if within debounce time
      const debounceMs = footswitchManager.getDebounceTime();
      if (Date.now() - lastPedal1ReleaseTimestamp < debounceMs) {
        return;
      }
      lastPedal1ReleaseTimestamp = Date.now();

      // 5. Authentic intentional TAP while playing!
      if (stateRef.current.isPlaying && !stateRef.current.isOutro) {
        if (stateRef.current.isIntro) {
          if (pedal1SingleTapTimer) {
            clearTimeout(pedal1SingleTapTimer);
            pedal1SingleTapTimer = null;
          }
          // If tapped deliberately during intro, advance to Part A
          audioEngine.handlePedal1Tap();
          triggerPedalToast('🦶 Pedal 1: Pular Intro ➔ Parte A');
          return;
        }

        // DOUBLE-TAP CHECK ON UP:
        // If a single-tap was waiting, this second release completes the double tap!
        if (pedal1SingleTapTimer !== null) {
          clearTimeout(pedal1SingleTapTimer);
          pedal1SingleTapTimer = null;
          audioEngine.handlePedal1HoldStart();
          triggerPedalToast('🦶 Pedal 1 (2 Toques Rápidos): Finalizando Música (Ending)!');
          return;
        }

        // Schedule single-tap action (Virada / Fill) with a 320ms window for double-tap detection
        pedal1SingleTapTimer = window.setTimeout(() => {
          pedal1SingleTapTimer = null;
          if (stateRef.current.isPlaying && !stateRef.current.isOutro && !stateRef.current.isIntro) {
            audioEngine.handlePedal1Tap();
            const targetFill =
              stateRef.current.basePartId === 'part_c'
                ? 'Fill C'
                : stateRef.current.basePartId === 'part_b'
                ? 'Fill B'
                : 'Fill A';
            triggerPedalToast(`🦶 Pedal 1: Virada (${targetFill}) Disparada!`);
          }
        }, 320);
      }
    };

    // PEDAL 2:
    // IN STOP: TAP -> Alterna PARTE A ➔ PARTE B ➔ PARTE C
    // IN PLAY:
    // - Em Parte A: 1 toque -> Transição A ➔ B (vai para Parte B)
    // - Em Parte B: 1 toque -> Transição B ➔ C (vai para Parte C) | 2 toques rápidos -> Transição B ➔ A (volta para Parte A)
    // - Em Parte C: 1 toque -> Transição C ➔ A (vai para Parte A) | 2 toques rápidos -> Transição C ➔ B (volta para Parte B)
    const handlePedal2Down = () => {
      const now = Date.now();
      const debounceMs = footswitchManager.getDebounceTime();
      // Allow rapid second tap for double tap transitions (reject only < 80ms bounce)
      if (now - lastPedal2PressTime < Math.max(80, Math.min(150, debounceMs))) return;
      lastPedal2PressTime = now;

      setIsExternalPedal2Pressed(true);
      if (!isAudioUnlocked) {
        audioEngine.unlockAudioContext();
        setIsAudioUnlocked(true);
      }

      if (!stateRef.current.isPlaying) {
        if (pedal2SingleTapTimer) {
          clearTimeout(pedal2SingleTapTimer);
          pedal2SingleTapTimer = null;
        }
        audioEngine.handlePedal2Tap(false);
        const selPart = audioEngine.getSelectedStartPart();
        const partLabel = selPart === 'part_c' ? 'Parte C' : selPart === 'part_b' ? 'Parte B' : 'Parte A';
        triggerPedalToast(`🦶 Pedal 2 (PageUp): Selecionada ${partLabel} para iniciar`);
        return;
      }

      // IN PLAY:
      const currentBase = stateRef.current.basePartId;
      if (currentBase === 'verse') {
        // Em Parte A: 1 toque segue para Parte B
        audioEngine.handlePedal2Tap(false);
        triggerPedalToast('🦶 Pedal 2: Transição A ➔ B (Vai para Parte B)!');
      } else if (currentBase === 'part_b') {
        // Em Parte B:
        if (pedal2SingleTapTimer !== null) {
          // 2 toques rápidos: volta para Parte A!
          clearTimeout(pedal2SingleTapTimer);
          pedal2SingleTapTimer = null;
          audioEngine.handlePedal2Tap(true);
          triggerPedalToast('🦶 Pedal 2 (2 Toques Rápidos): Transição B ➔ A (Volta para Parte A)!');
        } else {
          // 1 toque: agenda transição para Parte C
          pedal2SingleTapTimer = window.setTimeout(() => {
            pedal2SingleTapTimer = null;
            if (stateRef.current.isPlaying) {
              audioEngine.handlePedal2Tap(false);
              triggerPedalToast('🦶 Pedal 2 (1 Toque): Transição B ➔ C (Segue para Parte C)!');
            }
          }, 320);
        }
      } else if (currentBase === 'part_c') {
        // Em Parte C:
        if (pedal2SingleTapTimer !== null) {
          // 2 toques rápidos: volta para Parte B!
          clearTimeout(pedal2SingleTapTimer);
          pedal2SingleTapTimer = null;
          audioEngine.handlePedal2Tap(true);
          triggerPedalToast('🦶 Pedal 2 (2 Toques Rápidos): Transição C ➔ B (Volta para Parte B)!');
        } else {
          // 1 toque: agenda transição para Parte A
          pedal2SingleTapTimer = window.setTimeout(() => {
            pedal2SingleTapTimer = null;
            if (stateRef.current.isPlaying) {
              audioEngine.handlePedal2Tap(false);
              triggerPedalToast('🦶 Pedal 2 (1 Toque): Transição C ➔ A (Segue para Parte A)!');
            }
          }, 320);
        }
      } else {
        audioEngine.handlePedal2Tap(false);
      }
    };

    const handlePedal2Up = () => {
      setIsExternalPedal2Pressed(false);
    };

    // Store callbacks for on-screen buttons
    pedalActionCallbacksRef.current = {
      onPedal1Down: (isRepeat = false) => handlePedal1Down(isRepeat),
      onPedal1Up: () => handlePedal1Up(),
      onPedal2Down: () => handlePedal2Down(),
      onPedal2Up: () => handlePedal2Up(),
    };

    // Connect footswitchManager callbacks
    footswitchManager.setCallbacks({
      onPedal1: () => {
        if (!isPedalEnabledRef.current || isModalOpenRef.current) return;
        handlePedal1Down(false);
        setTimeout(handlePedal1Up, 100);
      },
      onPedal2: () => {
        if (!isPedalEnabledRef.current || isModalOpenRef.current) return;
        handlePedal2Down();
        setTimeout(handlePedal2Up, 100);
      },
      onActivity: (signal) => {
        if (!isPedalEnabledRef.current) return;
        triggerPedalToast(`🦶 Sinal Cube Turner: ${signal.value}`);
      },
    });

    const isRealTextInput = (el: EventTarget | null): boolean => {
      if (!el) return false;
      const target = el as HTMLElement;
      if (target.isContentEditable) return true;
      const tagName = (target.tagName || '').toUpperCase();
      if (tagName === 'TEXTAREA' || tagName === 'SELECT') return true;
      if (tagName === 'INPUT') {
        const input = target as HTMLInputElement;
        if (
          input.getAttribute('inputmode') === 'none' ||
          input.getAttribute('data-pedal-input') === 'true' ||
          input.classList.contains('pedal-input-receiver') ||
          input.type === 'hidden'
        ) {
          return false;
        }
        return true;
      }
      if (target.closest && target.closest('input, textarea, select, [contenteditable="true"]')) {
        return true;
      }
      return false;
    };

    const isPageTurnerKey = (e: KeyboardEvent): boolean => {
      const code = e.keyCode || e.which || 0;
      const k = (e.key || '').toLowerCase().replace(/[-_\s]/g, '');
      const c = (e.code || '').toLowerCase().replace(/[-_\s]/g, '');
      return (
        code === 33 || // PageUp
        code === 34 || // PageDown
        code === 37 || // ArrowLeft
        code === 38 || // ArrowUp
        code === 39 || // ArrowRight
        code === 40 || // ArrowDown
        code === 32 || // Space
        code === 92 || // Android PageUp
        code === 93 || // Android PageDown
        k === 'pagedown' ||
        k === 'pageup' ||
        k === 'next' ||
        k === 'prior' ||
        k === 'pgdn' ||
        k === 'pgup' ||
        k.startsWith('arrow') ||
        c === 'pagedown' ||
        c === 'pageup'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. If user is inside footswitch config learning a key, let the modal handle it
      if (footswitchManager.getLearningTarget() !== null) {
        footswitchManager.handleKeyEventForLearning(e);
        return;
      }

      // 2. NEVER intercept typing if user is in any real text input, textarea or contenteditable!
      if (isRealTextInput(e.target)) {
        return;
      }

      // 3. If pedal is toggled OFF by the user, ignore all pedal keyboard events!
      if (!isPedalEnabledRef.current) {
        return;
      }

      // 4. If any text-entry modal is open (e.g. Criar Novo Ritmo, Editar Pista), do not trigger pedal actions
      if (isModalOpenRef.current) {
        return;
      }

      const isPedal1 = footswitchManager.isPedal1Event(e);
      const isPedal2 = footswitchManager.isPedal2Event(e);
      const isPgTurner = isPageTurnerKey(e);

      // Stop browser from scrolling up/down on pedal keys unconditionally
      if (isPedal1 || isPedal2 || isPgTurner) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Unmute audio immediately if locked on mobile
      if (!isAudioUnlocked) {
        audioEngine.unlockAudioContext();
        setIsAudioUnlocked(true);
      }

      const keyLabel = e.key === ' ' ? 'Espaço' : (e.key || e.code || `KeyCode #${e.keyCode}`);

      if (isPedal1) {
        e.preventDefault();
        e.stopPropagation();
        footswitchManager.notifyActivity({
          type: 'key',
          value: `PEDAL 1 (${keyLabel}) -> Disparado!`,
        });
        handlePedal1Down(Boolean(e.repeat));
      } else if (isPedal2) {
        e.preventDefault();
        e.stopPropagation();
        footswitchManager.notifyActivity({
          type: 'key',
          value: `PEDAL 2 (${keyLabel}) -> Disparado!`,
        });
        if (!e.repeat) {
          handlePedal2Down();
        }
      } else if (
        !e.repeat &&
        (e.key.length === 1 ||
          e.key.startsWith('Arrow') ||
          e.key.startsWith('Page') ||
          e.key === ' ' ||
          e.key === 'Enter')
      ) {
        // Real-time notification for unmapped pedal signal
        footswitchManager.notifyActivity({
          type: 'key',
          value: `Sinal "${keyLabel}" (Pressione "Configurar Pedal" para calibrar)`,
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (footswitchManager.getLearningTarget() !== null) return;
      if (isRealTextInput(e.target)) return;
      if (!isPedalEnabledRef.current) return;
      if (isModalOpenRef.current) return;

      const isPedal1 = footswitchManager.isPedal1Event(e);
      const isPedal2 = footswitchManager.isPedal2Event(e);
      const isPgTurner = isPageTurnerKey(e);

      if (isPedal1 || isPedal2 || isPgTurner) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (isPedal1) {
        e.preventDefault();
        e.stopPropagation();
        handlePedal1Up();
      } else if (isPedal2) {
        e.preventDefault();
        e.stopPropagation();
        handlePedal2Up();
      }
    };

    // Single authoritative window capture listener (no duplicate on document!)
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleKeyUp, { capture: true, passive: false });

    return () => {
      if (pressTimer) clearTimeout(pressTimer);
      if (pedal1SingleTapTimer) clearTimeout(pedal1SingleTapTimer);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, []);

  // --- Transport & Project Handlers ---
  const handleTogglePlay = () => {
    audioEngine.togglePlay();
  };

  const handleStop = () => {
    audioEngine.stop();
  };

  const handleBpmChange = (bpm: number) => {
    setProject((prev) => ({ ...prev, bpm }));
    audioEngine.setBpm(bpm);
  };

  const handleSwingChange = (swing: number) => {
    setProject((prev) => ({ ...prev, swing }));
    audioEngine.setSwing(swing);
  };

  const handleHumanizeChange = (humanize: number) => {
    setProject((prev) => ({ ...prev, humanize }));
    audioEngine.setHumanize(humanize);
  };

  const handleTimeSignatureChange = (timeSignature: TimeSignature) => {
    setProject((prev) => ({ ...prev, timeSignature }));
  };

  const handleResolutionChange = (resolution: RhythmicResolution) => {
    setProject((prev) => {
      const subPerBeat =
        resolution === '1/8' ? 2 : resolution === '1/8T' ? 3 : resolution === '1/16' ? 4 : resolution === '1/16T' ? 6 : 8;
      const targetSteps = Math.min(32, Math.max(16, subPerBeat * 4 * (prev.barsCount || 1)));
      const updatedParts = { ...prev.parts };
      Object.keys(updatedParts).forEach((pKey) => {
        const pId = pKey as SongPartId;
        const trackSteps = { ...(updatedParts[pId]?.trackSteps || {}) };
        prev.tracks.forEach((t) => {
          const existing = trackSteps[t.id] || [];
          if (existing.length < targetSteps) {
            trackSteps[t.id] = [
              ...existing,
              ...createEmptySteps(targetSteps - existing.length),
            ];
          }
        });
        updatedParts[pId] = {
          ...updatedParts[pId],
          trackSteps,
        };
      });
      return {
        ...prev,
        resolution,
        parts: updatedParts,
      };
    });
  };

  const handleBarsCountChange = (barsCount: number) => {
    setProject((prev) => {
      const subPerBeat =
        prev.resolution === '1/8' ? 2 : prev.resolution === '1/8T' ? 3 : prev.resolution === '1/16' ? 4 : prev.resolution === '1/16T' ? 6 : 8;
      const targetSteps = Math.min(32, Math.max(16, subPerBeat * 4 * barsCount));
      const updatedParts = { ...prev.parts };
      Object.keys(updatedParts).forEach((pKey) => {
        const pId = pKey as SongPartId;
        const trackSteps = { ...(updatedParts[pId]?.trackSteps || {}) };
        prev.tracks.forEach((t) => {
          const existing = trackSteps[t.id] || [];
          if (existing.length < targetSteps) {
            trackSteps[t.id] = [
              ...existing,
              ...createEmptySteps(targetSteps - existing.length),
            ];
          }
        });
        updatedParts[pId] = {
          ...updatedParts[pId],
          trackSteps,
        };
      });
      return {
        ...prev,
        barsCount,
        parts: updatedParts,
      };
    });
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setMasterVolume(vol);
  };

  const handleToggleMetronome = () => {
    const next = !metronomeOn;
    setMetronomeOn(next);
    audioEngine.setMetronome(next);
  };

  const handleTogglePlayIntroOnStart = () => {
    const next = !playIntroOnStart;
    setPlayIntroOnStart(next);
    audioEngine.setPlayIntroOnStart(next);
  };

  const handleSelectPreset = (preset: SongProject) => {
    // If stopped: switch immediately and update state
    if (!isPlaying) {
      audioEngine.switchRhythm(preset, true);
      setProject(preset);
      setActivePartId('verse');
      setPlayingPartId('verse');
      setBasePartId('verse');
      setSelectedStartPart('verse');
      localStorage.setItem('beatbuddy_active_rhythm_id', preset.id);
      saveActiveRhythmToServer(preset.id).catch(() => {});
      return;
    }

    // If currently playing: transition in-time at the end of the current bar without stopping!
    audioEngine.switchRhythm(preset, true);
    triggerPedalToast(
      `⏳ Mudando para "${preset.name.replace(/\s*\(\d+.*?\)/g, '').trim()}" no final do compasso (Parte A • Mantendo ${project.bpm} BPM)...`
    );
  };

  const handleSelectPart = (partId: SongPartId) => {
    setActivePartId(partId);
    setPlayingPartId(partId);
    if (partId === 'verse' || partId === 'part_b' || partId === 'part_c') {
      setSelectedStartPart(partId);
      setBasePartId(partId);
    }
    audioEngine.selectPart(partId);
  };

  // --- Rhythm Creation & Deletion ---
  const handleCreateNewRhythm = (params: {
    name: string;
    genre: string;
    bpm: number;
    timeSignature: TimeSignature;
    starterKit: StarterKitType;
    resolution?: RhythmicResolution;
    barsCount?: number;
    customKitTracks?: TrackDefinition[];
  }) => {
    audioEngine.stop();
    const newProject = createNewCustomRhythm(params);
    if (params.customKitTracks && params.customKitTracks.length > 0) {
      newProject.tracks = params.customKitTracks;
      // Initialize steps for all parts
      Object.keys(newProject.parts).forEach((partKey) => {
        const pId = partKey as SongPartId;
        const p = newProject.parts[pId];
        if (p) {
          const newSteps: Record<string, StepData[]> = {};
          params.customKitTracks!.forEach((t) => {
            newSteps[t.id] = createEmptySteps(newProject.defaultStepCount || 32);
          });
          p.trackSteps = newSteps;
        }
      });
    }
    const updatedList = [...rhythms, newProject];
    setRhythms(updatedList);
    try {
      localStorage.setItem('beatbuddy_rhythms', JSON.stringify(updatedList));
      void saveRhythmsToServer(updatedList).then((saved) => {
        if (!saved) triggerPedalToast('Ritmo criado localmente, mas não foi salvo no Neon.');
      });
    } catch (e) {
      console.error(e);
    }
    setProject(newProject);
    setActivePartId('verse');
    setPlayingPartId('verse');
    triggerPedalToast(`Ritmo "${newProject.name}" criado com sucesso!`);
  };

  const handleApplyDrumKitToProject = (kit: DrumKitDefinition, preserveStepData: boolean) => {
    audioEngine.stop();
    setProject((prev) => {
      let nextTracks: TrackDefinition[] = [];

      if (preserveStepData) {
        // Map new kit's properties onto existing tracks or append new ones
        nextTracks = kit.tracks.map((kitTrack, index) => {
          const existingTrack = prev.tracks[index];
          return {
            ...kitTrack,
            id: existingTrack ? existingTrack.id : kitTrack.id,
            muted: existingTrack ? existingTrack.muted : false,
            solo: existingTrack ? existingTrack.solo : false,
          };
        });

        const updatedProject: SongProject = {
          ...prev,
          tracks: nextTracks,
        };

        const updatedList = rhythms.map((r) => (r.id === prev.id ? updatedProject : r));
        setRhythms(updatedList);
        try {
          localStorage.setItem('beatbuddy_rhythms', JSON.stringify(updatedList));
          saveRhythmsToServer(updatedList).catch(() => {});
        } catch (err) {
          console.error(err);
        }

        return updatedProject;
      } else {
        // Replace tracks completely
        nextTracks = [...kit.tracks];
        const nextParts = { ...prev.parts };
        Object.keys(nextParts).forEach((partKey) => {
          const partId = partKey as SongPartId;
          const p = nextParts[partId];
          if (p) {
            const newSteps: Record<string, StepData[]> = {};
            nextTracks.forEach((t) => {
              newSteps[t.id] = createEmptySteps(prev.defaultStepCount || 32);
            });
            nextParts[partId] = {
              ...p,
              trackSteps: newSteps,
            };
          }
        });

        const updatedProject: SongProject = {
          ...prev,
          tracks: nextTracks,
          parts: nextParts,
        };

        const updatedList = rhythms.map((r) => (r.id === prev.id ? updatedProject : r));
        setRhythms(updatedList);
        try {
          localStorage.setItem('beatbuddy_rhythms', JSON.stringify(updatedList));
          saveRhythmsToServer(updatedList).catch(() => {});
        } catch (err) {
          console.error(err);
        }

        return updatedProject;
      }
    });

    triggerPedalToast(`🥁 Kit "${kit.name}" aplicado ao ritmo atual!`);
  };

  const handleDeleteRhythm = async (rhythmId: string) => {
    const deletedRemotely = await deleteRhythmFromServer(rhythmId);
    if (!deletedRemotely) {
      triggerPedalToast('Não foi possível excluir o ritmo no Neon. Tente novamente.');
      return;
    }

    isDeletingRhythmRef.current = true;
    audioEngine.stop();

    const targetRhythm = rhythms.find((r) => r.id === rhythmId);
    const rhythmName = targetRhythm?.name || 'Ritmo';

    const nextList = rhythms.filter((r) => r.id !== rhythmId);

    // If the list is now empty (the deleted rhythm was the only one), generate a fresh empty project
    let nextActive: SongProject;
    let finalList: SongProject[];

    if (nextList.length === 0) {
      const blank = createBlankRhythm();
      nextActive = blank;
      finalList = [blank];
    } else {
      nextActive = (project.id === rhythmId)
        ? nextList[0]
        : (nextList.find((r) => r.id === project.id) || nextList[0]);
      finalList = nextList;
    }

    setRhythms(finalList);
    setProject(nextActive);
    setActivePartId('verse');
    setPlayingPartId('verse');
    setBasePartId('verse');
    audioEngine.updateProject(nextActive);

    try {
      localStorage.setItem('beatbuddy_rhythms', JSON.stringify(finalList));
      localStorage.setItem('beatbuddy_active_rhythm_id', nextActive.id);
      if (nextList.length === 0) {
        const saved = await saveRhythmsToServer(finalList);
        if (!saved) throw new Error('The replacement rhythm could not be saved to Neon.');
      }
      await saveActiveRhythmToServer(nextActive.id);
      triggerPedalToast(`Ritmo "${rhythmName}" excluído da biblioteca compartilhada.`);
    } catch (e) {
      console.error('Failed to delete rhythm:', e);
    } finally {
      setTimeout(() => {
        isDeletingRhythmRef.current = false;
      }, 500);
    }
  };

  // --- Step & Sequencer Manipulation ---
  const handleToggleStep = (trackId: string, stepIndex: number) => {
    setProject((prev) => {
      const part = prev.parts[activePartId] || prev.parts['verse'];
      const currentTrackSteps = [...(part.trackSteps[trackId] || createEmptySteps(32))];

      while (currentTrackSteps.length <= stepIndex) {
        currentTrackSteps.push({
          active: false,
          velocity: 90,
          probability: 1.0,
          ratchet: 1,
        });
      }

      const step = currentTrackSteps[stepIndex] || {
        active: false,
        velocity: 90,
        probability: 1.0,
        ratchet: 1,
      };

      // 4-stage cycle: Off -> Normal (90) -> Accent (125) -> Ghost (50) -> Off
      let nextStep: StepData;
      if (!step.active) {
        nextStep = { ...step, active: true, velocity: 90 };
      } else if (step.velocity < 115 && step.velocity > 65) {
        nextStep = { ...step, active: true, velocity: 125 };
      } else if (step.velocity >= 115) {
        nextStep = { ...step, active: true, velocity: 50 };
      } else {
        nextStep = { ...step, active: false, velocity: 90 };
      }

      currentTrackSteps[stepIndex] = nextStep;
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [activePartId]: {
            ...part,
            trackSteps: {
              ...part.trackSteps,
              [trackId]: currentTrackSteps,
            },
          },
        },
      };
    });
  };

  const handleUpdateStep = (
    trackId: string,
    stepIndex: number,
    stepData: Partial<StepData>
  ) => {
    setProject((prev) => {
      const part = prev.parts[activePartId] || prev.parts['verse'];
      const currentTrackSteps = [...(part.trackSteps[trackId] || createEmptySteps(32))];
      while (currentTrackSteps.length <= stepIndex) {
        currentTrackSteps.push({
          active: false,
          velocity: 90,
          probability: 1.0,
          ratchet: 1,
        });
      }
      const step = currentTrackSteps[stepIndex];
      currentTrackSteps[stepIndex] = { ...step, ...stepData };
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [activePartId]: {
            ...part,
            trackSteps: {
              ...part.trackSteps,
              [trackId]: currentTrackSteps,
            },
          },
        },
      };
    });
  };

  const handleUpdateTrackLength = (trackId: string, newLength: number) => {
    setProject((prev) => {
      const part = prev.parts[activePartId] || prev.parts['verse'];
      const counts = { ...(part.trackStepCounts || {}) };
      counts[trackId] = newLength;
      const currentSteps = part.trackSteps[trackId] || [];
      const updatedTrackSteps = { ...part.trackSteps };
      if (currentSteps.length < newLength) {
        updatedTrackSteps[trackId] = [
          ...currentSteps,
          ...createEmptySteps(newLength - currentSteps.length),
        ];
      }
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [activePartId]: {
            ...part,
            trackSteps: updatedTrackSteps,
            trackStepCounts: counts,
          },
        },
      };
    });
  };

  const handleUpdateTrackParams = (
    trackId: string,
    updates: Partial<TrackDefinition>
  ) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) => (t.id === trackId ? { ...t, ...updates } : t)),
    }));
  };

  const handleToggleTrackMute = (trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      ),
    }));
  };

  const handleToggleTrackSolo = (trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.id === trackId ? { ...t, solo: !t.solo } : t
      ),
    }));
  };

  const handleTriggerTrack = (track: TrackDefinition) => {
    audioEngine.triggerInstrument(
      track.soundType,
      {
        velocity: 110,
        tune: track.tune,
        decay: track.decay,
        tone: track.tone,
        pan: track.pan,
        volume: track.volume,
        reverse: track.reverse,
      },
      track.customSampleId
    );
  };

  const handleDeleteTrack = (trackId: string) => {
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.filter((t) => t.id !== trackId),
    }));
  };

  const handleRemoveTrackSample = (trackId: string) => {
    handleUpdateTrackParams(trackId, {
      customSampleId: undefined,
      customSampleName: undefined,
      soundType: 'kick',
    });
  };

  const handleDeleteSample = async (sampleId: string) => {
    const sampleRecord = customSamplesList.find((s) => s.id === sampleId);
    const sampleName = sampleRecord?.name || sampleId;
    const usage = isSampleUsedInRhythms(sampleId, sampleName, rhythms);
    if (usage.used) {
      triggerPedalToast(
        `⚠️ Bloqueado: "${sampleName}" está em uso no(s) ritmo(s): "${usage.rhythmNames.join(', ')}". Remova-o antes de excluir.`
      );
      return;
    }

    try {
      await audioEngine.deleteCustomSample(sampleId, sampleName);
      setProject((prev) => ({
        ...prev,
        tracks: prev.tracks.map((t) =>
          t.customSampleId === sampleId
            ? {
                ...t,
                customSampleId: undefined,
                customSampleName: undefined,
                soundType: 'kick',
              }
            : t
        ),
      }));
      triggerPedalToast(`🗑️ Sample "${sampleName}" excluído do armazenamento local e da nuvem.`);
    } catch (error) {
      console.error('Failed to delete sample:', error);
      triggerPedalToast(
        error instanceof Error
          ? `Não foi possível excluir "${sampleName}": ${error.message}`
          : `Não foi possível excluir "${sampleName}".`
      );
    }
  };

  const handleRenameSample = (sampleId: string, newName: string) => {
    audioEngine.renameCustomSample(sampleId, newName);
    setProject((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t) =>
        t.customSampleId === sampleId ? { ...t, customSampleName: newName } : t
      ),
    }));
  };

  const handleAddTrack = (trackDef: Omit<TrackDefinition, 'id'>) => {
    const id = `track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newTrack: TrackDefinition = { ...trackDef, id };
    setProject((prev) => {
      const updatedParts = { ...prev.parts };
      Object.keys(updatedParts).forEach((pKey) => {
        const pId = pKey as SongPartId;
        const currentSteps = updatedParts[pId]?.trackSteps || {};
        updatedParts[pId] = {
          ...updatedParts[pId],
          trackSteps: {
            ...currentSteps,
            [id]: createEmptySteps(64),
          },
        };
      });
      return {
        ...prev,
        tracks: [...prev.tracks, newTrack],
        parts: updatedParts,
      };
    });
  };

  const handleAddTrackWithSample = (sampleId: string, sampleName: string) => {
    handleAddTrack({
      name: sampleName,
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
      customSampleId: sampleId,
      customSampleName: sampleName,
    });
    setActiveView('sequencer');
  };

  const handleCopyPart = (
    source: SongPartId,
    targets: SongPartId[],
    switchToTarget?: boolean
  ) => {
    setProject((prev) => {
      const srcPart = prev.parts[source];
      if (!srcPart) return prev;
      const updatedParts = { ...prev.parts };
      targets.forEach((target) => {
        const clonedSteps: Record<string, StepData[]> = {};
        Object.entries(srcPart.trackSteps).forEach(([tId, steps]) => {
          clonedSteps[tId] = steps.map((s) => ({ ...s }));
        });
        updatedParts[target] = {
          ...updatedParts[target],
          trackSteps: clonedSteps,
          trackStepCounts: { ...(srcPart.trackStepCounts || {}) },
        };
      });
      return {
        ...prev,
        parts: updatedParts,
      };
    });
    if (switchToTarget && targets.length > 0) {
      setActivePartId(targets[0]);
    }
  };

  const handleClearPart = (partId: SongPartId) => {
    setProject((prev) => {
      const currentPart = prev.parts[partId];
      if (!currentPart) return prev;
      const cleared: Record<string, StepData[]> = {};
      prev.tracks.forEach((t) => {
        cleared[t.id] = createEmptySteps(32);
      });
      return {
        ...prev,
        parts: {
          ...prev.parts,
          [partId]: {
            ...currentPart,
            trackSteps: cleared,
          },
        },
      };
    });
  };

  // Export Project JSON
  const handleExportProjectJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_project.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportProjectJson = (imported: SongProject) => {
    setProject(imported);
    setActivePartId('verse');
    audioEngine.stop();
  };

  // Pedal Virtual Actions (Pedal 1 & Pedal 2)
  const handlePedal1Tap = () => {
    audioEngine.handlePedal1Tap();
  };

  const handlePedal1HoldStart = () => {
    audioEngine.handlePedal1HoldStart();
  };

  const handlePedal2Tap = () => {
    audioEngine.handlePedal2Tap();
  };

  const currentPartData = project.parts[activePartId] || project.parts['verse'];
  const playingPartData = project.parts[playingPartId] || project.parts['verse'];

  const handlePedal1DownAction = (isRepeat = false) => {
    if (pedalActionCallbacksRef.current.onPedal1Down) {
      pedalActionCallbacksRef.current.onPedal1Down(isRepeat);
    } else {
      audioEngine.handlePedal1Tap();
    }
  };
  const handlePedal1UpAction = () => {
    if (pedalActionCallbacksRef.current.onPedal1Up) {
      pedalActionCallbacksRef.current.onPedal1Up();
    }
  };
  const handlePedal2DownAction = () => {
    if (pedalActionCallbacksRef.current.onPedal2Down) {
      pedalActionCallbacksRef.current.onPedal2Down();
    } else {
      audioEngine.handlePedal2Tap();
    }
  };
  const handlePedal2UpAction = () => {
    if (pedalActionCallbacksRef.current.onPedal2Up) {
      pedalActionCallbacksRef.current.onPedal2Up();
    }
  };

  const showMobileLiveOnly = (isMobileScreen && !forceDesktopMode) || isManualMobileLiveView;

  return (
    <div
      className={`flex flex-col bg-[#070b14] text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950 ${
        showMobileLiveOnly ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'
      }`}
    >
      {/* SE ESTIVER NO CELULAR OU TABLET: EXIBE EXATAMENTE O PROTÓTIPO SOLICITADO */}
      {showMobileLiveOnly ? (
        <MobileLiveView
          project={project}
          rhythms={rhythms}
          onSelectProject={handleSelectPreset}
          masterVolume={masterVolume}
          onMasterVolumeChange={handleMasterVolumeChange}
          onBpmChange={handleBpmChange}
          isPlaying={isPlaying}
          currentBeat={currentBeat}
          currentBar={currentBar}
          isIntro={isIntro}
          isOutro={isOutro}
          isFill={isFill}
          isTransition={isTransition}
          activeFillId={activeFillId}
          activeTransitionId={activeTransitionId}
          selectedStartPart={selectedStartPart}
          basePartId={basePartId}
          onPedal1Down={handlePedal1DownAction}
          onPedal1Up={handlePedal1UpAction}
          onPedal2Down={handlePedal2DownAction}
          onPedal2Up={handlePedal2UpAction}
          isPedal1Pressed={isExternalPedal1Pressed}
          isPedal2Pressed={isExternalPedal2Pressed}
          isPedalEnabled={isPedalEnabled}
          onTogglePedalEnabled={togglePedalEnabled}
          onOpenFootswitchModal={() => setIsFootswitchConfigOpen(true)}
          onOpenLocalFileManager={() => setIsLocalFileManagerOpen(true)}
          onOpenStudioView={() => {
            setIsManualMobileLiveView(false);
            setForceDesktopMode(true);
          }}
          isAudioUnlocked={isAudioUnlocked}
          onUnlockAudio={() => {
            audioEngine.unlockAudioContext();
            audioEngine.preloadAllServerSamples();
            setIsAudioUnlocked(true);
          }}
        />
      ) : (
        <>
          {/* Top Banner when viewing Desktop mode on mobile */}
          {isMobileScreen && forceDesktopMode && (
            <div className="bg-amber-950/90 border-b border-amber-500/80 px-4 py-2 flex items-center justify-between text-xs text-amber-200">
              <span className="font-semibold">🖥️ Modo Estúdio Completo (PC) Ativo</span>
              <button
                type="button"
                onClick={() => setForceDesktopMode(false)}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg cursor-pointer shadow-sm"
              >
                Voltar ao Modo Celular (Live)
              </button>
            </div>
          )}

          {/* Header */}
          <Header
            activeView={activeView}
            onSelectView={setActiveView}
            onOpenCreateModal={() => setIsCreateRhythmOpen(true)}
            onOpenDrumKitModal={() => setIsDrumKitModalOpen(true)}
            onEnterMobileLiveView={() => setIsManualMobileLiveView(true)}
            onOpenFootswitchModal={() => setIsFootswitchConfigOpen(true)}
            onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
            onOpenShareMobile={() => setIsShareMobileOpen(true)}
            onExportRhythmsJson={handleExportRhythmsJson}
            onImportRhythmsJson={() => setIsLocalFileManagerOpen(true)}
            onOpenLocalFileManager={() => setIsLocalFileManagerOpen(true)}
            isPedalEnabled={isPedalEnabled}
            onTogglePedalEnabled={togglePedalEnabled}
          />

      {/* Mobile Audio Activation Banner (shown until first user touch/click) */}
      {!isAudioUnlocked && (
        <div
          onClick={() => {
            audioEngine.unlockAudioContext();
            audioEngine.preloadAllServerSamples();
            setIsAudioUnlocked(true);
          }}
          className="bg-amber-400/20 border-b border-amber-400/50 px-4 py-2 text-center text-xs font-bold text-amber-300 flex items-center justify-center gap-2 cursor-pointer hover:bg-amber-400/30 transition-colors"
        >
          <Volume2 className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
          <span>📱 Modo Celular: Toque aqui para ativar o áudio e conectar o pedal</span>
        </div>
      )}

      {/* Floating Real-time Pedal Toast Notification */}
      {pedalToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 border-2 border-amber-400/80 text-white px-4 py-2.5 rounded-xl shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-150">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          <span className="text-xs font-bold font-mono tracking-wide text-amber-200">
            {pedalToast.msg}
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Master Toolbar */}
        <MasterToolbar
          project={project}
          rhythms={rhythms}
          isPlaying={isPlaying}
          masterVolume={masterVolume}
          metronomeOn={metronomeOn}
          playIntroOnStart={playIntroOnStart}
          canDeleteRhythm={true}
          isSavedRecently={isSavedRecently}
          onOpenDrumKitModal={() => setIsDrumKitModalOpen(true)}
          onSaveProjectToApp={handleSaveProjectToApp}
          onTogglePlay={handleTogglePlay}
          onBpmChange={handleBpmChange}
          onSwingChange={handleSwingChange}
          onHumanizeChange={handleHumanizeChange}
          onTimeSignatureChange={handleTimeSignatureChange}
          onResolutionChange={handleResolutionChange}
          onBarsCountChange={handleBarsCountChange}
          onMasterVolumeChange={handleMasterVolumeChange}
          onToggleMetronome={handleToggleMetronome}
          onTogglePlayIntroOnStart={handleTogglePlayIntroOnStart}
          onSelectPreset={handleSelectPreset}
          onOpenCreateModal={() => setIsCreateRhythmOpen(true)}
          onOpenDeleteModal={() => setIsDeleteRhythmOpen(true)}
          onExportProject={handleExportProjectJson}
          onImportProject={handleImportProjectJson}
        />

        {/* View 1: Studio Sequencer Matrix View */}
        {activeView === 'sequencer' && (
          <div className="flex-1 flex flex-col">
            {isMobileScreen && (
              <div className="bg-amber-950/70 border-b border-amber-500/60 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
                <span>🖥️ Sequenciador Matrix (recomendado para PC/Computador)</span>
                <button
                  type="button"
                  onClick={() => setActiveView('pedal')}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  Voltar ao Pedal Live
                </button>
              </div>
            )}

            {/* BeatBuddy Hardware LCD Banner */}
            <div className="bg-[#0b101d] px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[320px]">
                <BeatBuddyDisplay
                  songName={project.name}
                  partName={playingPartData.name}
                  partId={playingPartId}
                  basePartId={basePartId}
                  selectedStartPart={selectedStartPart}
                  activeFillId={activeFillId}
                  activeTransitionId={activeTransitionId}
                  bpm={project.bpm}
                  timeSignature={project.timeSignature}
                  currentBeat={currentBeat}
                  currentBar={currentBar}
                  subdivision={subdivision}
                  isPlaying={isPlaying}
                  isFill={isFill}
                  isTransition={isTransition}
                  isOutro={isOutro}
                  isIntro={isIntro}
                />
              </div>

              {/* Master VU & Quick Pedal Widget */}
              <div className="flex items-center gap-3">
                <AudioVisualizer />
                <button
                  type="button"
                  onClick={handlePedal1Tap}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    isPlaying
                      ? isIntro
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm'
                        : isFill
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                      : 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50 hover:bg-emerald-600/50'
                  }`}
                >
                  {isPlaying
                    ? isIntro
                      ? 'Pular Intro'
                      : basePartId === 'part_b'
                      ? 'Pedal 1: Virada (Fill B)'
                      : 'Pedal 1: Virada (Fill A)'
                    : 'Pedal 1: Tocar Intro'}
                </button>
                <button
                  type="button"
                  onClick={handlePedal2Tap}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all cursor-pointer"
                >
                  {isPlaying
                    ? basePartId === 'part_b'
                      ? 'Pedal 2: Transição B ➔ A'
                      : 'Pedal 2: Transição A ➔ B'
                    : selectedStartPart === 'part_b'
                    ? 'Pedal 2: Ir p/ Parte A'
                    : 'Pedal 2: Ir p/ Parte B'}
                </button>
              </div>
            </div>

            {/* Song Parts Navigation Bar */}
            <SongPartsBar
              project={project}
              activePartId={activePartId}
              playingPartId={playingPartId}
              selectedStartPart={selectedStartPart}
              basePartId={basePartId}
              isPlaying={isPlaying}
              onSelectPart={handleSelectPart}
              onOpenCopyModal={() => setIsCopyPartOpen(true)}
              onClearPart={handleClearPart}
            />

            {/* Multi-Track Step Sequencer Matrix */}
            <SequencerGrid
              tracks={project.tracks}
              partSteps={currentPartData.trackSteps}
              partStepCounts={currentPartData.trackStepCounts}
              activePartId={activePartId}
              playingTick={currentTick}
              activeTrackSteps={activeTrackSteps}
              isPlaying={isPlaying}
              resolution={project.resolution || '1/16'}
              barsCount={project.barsCount || 1}
              timeSignature={project.timeSignature}
              onResolutionChange={handleResolutionChange}
              onBarsCountChange={handleBarsCountChange}
              onToggleStep={handleToggleStep}
              onUpdateStep={handleUpdateStep}
              onUpdateTrackLength={handleUpdateTrackLength}
              onUpdateTrackVolume={(tId, vol) => handleUpdateTrackParams(tId, { volume: vol })}
              onUpdateTrackPan={(tId, pan) => handleUpdateTrackParams(tId, { pan })}
              onUpdateTrackColor={(tId, color) => handleUpdateTrackParams(tId, { color })}
              onToggleTrackMute={handleToggleTrackMute}
              onToggleTrackSolo={handleToggleTrackSolo}
              onTriggerTrack={handleTriggerTrack}
              onOpenTrackSettings={setEditingTrack}
              onDeleteTrack={handleDeleteTrack}
              onRemoveTrackSample={handleRemoveTrackSample}
              onAddTrackClick={() => setIsAddTrackOpen(true)}
            />
          </div>
        )}

        {/* View 2: BeatBuddy Pedal Live View */}
        {activeView === 'pedal' && (
          <div className="flex-1 p-3 sm:p-6 flex flex-col justify-start items-center gap-4 max-w-4xl mx-auto w-full">
            {/* Quick Song Selector & Live Controls */}
            <div className="w-full bg-[#0b101d] p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Ritmo Atual:</span>
                <select
                  value={project.id}
                  onChange={(e) => {
                    const sel = rhythms.find((r) => r.id === e.target.value);
                    if (sel) {
                      setProject(sel);
                      audioEngine.updateProject(sel);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 text-white font-bold text-xs sm:text-sm px-3 py-1.5 rounded-lg focus:outline-hidden focus:border-amber-400 cursor-pointer"
                >
                  {rhythms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.bpm} BPM - {r.timeSignature})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsCreateRhythmOpen(true)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 rounded-lg cursor-pointer transition-colors"
                >
                  + Novo Ritmo
                </button>
              </div>

              {/* Quick BPM stepper */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400">BPM:</span>
                <button
                  type="button"
                  onClick={() => handleBpmChange(Math.max(40, project.bpm - 5))}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded cursor-pointer"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => handleBpmChange(Math.max(40, project.bpm - 1))}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded cursor-pointer"
                >
                  -1
                </button>
                <span className="font-mono font-extrabold text-amber-400 text-sm px-1.5">
                  {project.bpm}
                </span>
                <button
                  type="button"
                  onClick={() => handleBpmChange(Math.min(260, project.bpm + 1))}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded cursor-pointer"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleBpmChange(Math.min(260, project.bpm + 5))}
                  className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded cursor-pointer"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Song Parts Bar on Pedal view */}
            <div className="w-full">
              <SongPartsBar
                project={project}
                activePartId={activePartId}
                playingPartId={playingPartId}
                selectedStartPart={selectedStartPart}
                basePartId={basePartId}
                isPlaying={isPlaying}
                onSelectPart={handleSelectPart}
                onOpenCopyModal={() => setIsCopyPartOpen(true)}
                onClearPart={handleClearPart}
              />
            </div>

            {/* Unmute prompt for Mobile */}
            {!isAudioUnlocked && (
              <button
                type="button"
                onClick={() => {
                  audioEngine.unlockAudioContext();
                  audioEngine.preloadAllServerSamples();
                  setIsAudioUnlocked(true);
                }}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-center cursor-pointer shadow-lg animate-bounce text-xs sm:text-sm"
              >
                🔊 Toque aqui para ativar o áudio no celular (Sons 100% Fiéis)
              </button>
            )}

            <div className="w-full">
              <BeatBuddyDisplay
                songName={project.name}
                partName={playingPartData.name}
                partId={playingPartId}
                basePartId={basePartId}
                selectedStartPart={selectedStartPart}
                activeFillId={activeFillId}
                activeTransitionId={activeTransitionId}
                bpm={project.bpm}
                timeSignature={project.timeSignature}
                currentBeat={currentBeat}
                currentBar={currentBar}
                subdivision={subdivision}
                isPlaying={isPlaying}
                isFill={isFill}
                isTransition={isTransition}
                isOutro={isOutro}
                isIntro={isIntro}
              />
            </div>

            <div className="w-full">
              <PedalController
                isPlaying={isPlaying}
                currentPartId={playingPartId}
                basePartId={basePartId}
                selectedStartPart={selectedStartPart}
                isFill={isFill}
                isTransition={isTransition}
                isOutro={isOutro}
                isIntro={isIntro}
                activeFillId={activeFillId}
                activeTransitionId={activeTransitionId}
                isExternalPedal1Pressed={isExternalPedal1Pressed}
                isExternalPedal2Pressed={isExternalPedal2Pressed}
                onPedal1Down={() => pedalActionCallbacksRef.current.onPedal1Down(false)}
                onPedal1Up={() => pedalActionCallbacksRef.current.onPedal1Up()}
                onPedal2Down={() => pedalActionCallbacksRef.current.onPedal2Down()}
                onPedal2Up={() => pedalActionCallbacksRef.current.onPedal2Up()}
                onPedal1Tap={handlePedal1Tap}
                onPedal1HoldStart={handlePedal1HoldStart}
                onPedal2Tap={handlePedal2Tap}
                onStop={handleStop}
                onOpenFootswitchConfig={() => setIsFootswitchConfigOpen(true)}
                isPedalEnabled={isPedalEnabled}
                onTogglePedalEnabled={togglePedalEnabled}
              />
            </div>
          </div>
        )}

        {/* View 3: My Samples & Audio Recording */}
        {activeView === 'samples' && (
          <SamplesLibraryView
            onAddTrackWithSample={handleAddTrackWithSample}
            onDeleteSample={handleDeleteSample}
            onRenameSample={handleRenameSample}
            customSamplesList={customSamplesList}
            rhythms={rhythms}
          />
        )}
      </main>
      </>
      )}

      {/* Track Sound & Custom Sample Modal */}
      {editingTrack && (
        <SampleManagerModal
          track={editingTrack}
          onClose={() => setEditingTrack(null)}
          onUpdateTrackParams={handleUpdateTrackParams}
          rhythms={rhythms}
        />
      )}

      {/* Add New Instrument Modal */}
      {isAddTrackOpen && (
        <AddInstrumentModal
          onClose={() => setIsAddTrackOpen(false)}
          onAddTrack={handleAddTrack}
          onDeleteSample={handleDeleteSample}
        />
      )}

      {/* Create New Rhythm Modal */}
      {isCreateRhythmOpen && (
        <CreateRhythmModal
          onClose={() => setIsCreateRhythmOpen(false)}
          onCreate={handleCreateNewRhythm}
          isPedalEnabled={isPedalEnabled}
          onTogglePedalEnabled={togglePedalEnabled}
        />
      )}

      {/* Delete Rhythm Confirmation Modal */}
      {isDeleteRhythmOpen && (
        <DeleteRhythmModal
          rhythm={project}
          onClose={() => setIsDeleteRhythmOpen(false)}
          onConfirmDelete={handleDeleteRhythm}
        />
      )}

      {/* Copy Part Modal */}
      {isCopyPartOpen && (
        <CopyPartModal
          project={project}
          currentActivePartId={activePartId}
          onClose={() => setIsCopyPartOpen(false)}
          onCopyPart={handleCopyPart}
        />
      )}

      {/* Footswitch / Cuvave Pedal & MIDI Config Modal */}
      {isFootswitchConfigOpen && (
        <FootswitchConfigModal
          onClose={() => setIsFootswitchConfigOpen(false)}
          isPedalEnabled={isPedalEnabled}
          onTogglePedalEnabled={togglePedalEnabled}
        />
      )}

      {/* Mobile PWA, APK Android and iPhone Guide Modal */}
      {isMobileGuideOpen && (
        <MobileAndPedalGuideModal
          onClose={() => setIsMobileGuideOpen(false)}
          onOpenPedalSettings={() => setIsFootswitchConfigOpen(true)}
        />
      )}

      {/* Drum Kit Manager & Creator Modal */}
      {isDrumKitModalOpen && (
        <DrumKitManagerModal
          currentProjectTracks={project.tracks}
          onClose={() => setIsDrumKitModalOpen(false)}
          onApplyKitToProject={handleApplyDrumKitToProject}
        />
      )}

      {/* Share / Open on Mobile Modal */}
      <ShareMobileModal
        isOpen={isShareMobileOpen}
        onClose={() => setIsShareMobileOpen(false)}
        currentProject={project}
        samplesCount={customSamplesList.length}
      />

      {/* Shared rhythm library, JSON backups, and local sample manager */}
      <LocalFileManagerModal
        isOpen={isLocalFileManagerOpen}
        onClose={() => setIsLocalFileManagerOpen(false)}
        rhythms={rhythms}
        onRhythmsUpdated={handleRhythmsUpdated}
        onOpenSamplesLibrary={() => setActiveView('samples')}
        onShowToast={triggerPedalToast}
      />
    </div>
  );
}
