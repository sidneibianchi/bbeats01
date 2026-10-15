/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Radio, Sparkles, Target, RotateCcw, CheckCircle2 } from 'lucide-react';
import {
  footswitchManager,
  FootswitchConfig,
  DEFAULT_FOOTSWITCH_CONFIG,
} from '../audio/midiAndPedalManager';

interface FootswitchConfigModalProps {
  onClose: () => void;
  isPedalEnabled?: boolean;
  onTogglePedalEnabled?: () => void;
}

export const FootswitchConfigModal: React.FC<FootswitchConfigModalProps> = ({
  onClose,
  isPedalEnabled = true,
  onTogglePedalEnabled,
}) => {
  const [config, setConfig] = useState<FootswitchConfig>(() =>
    footswitchManager.getConfig()
  );
  const [midiDevices, setMidiDevices] = useState<string[]>(() =>
    footswitchManager.getConnectedMidiDevices()
  );
  const [learningTarget, setLearningTarget] = useState<'main' | 'accent' | null>(null);
  const [lastActivity, setLastActivity] = useState<{
    type: 'key' | 'midi' | 'ble';
    value: string;
    timestamp: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = footswitchManager.addActivityListener((signal) => {
      setLastActivity({ ...signal, timestamp: Date.now() });
      setConfig(footswitchManager.getConfig());
      if (footswitchManager.getLearningTarget() === null) {
        setLearningTarget(null);
      }
    });

    const handleKeyActivity = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const codeDesc = e.code || e.key || `KeyCode: ${e.keyCode}`;
      const isLearning = footswitchManager.getLearningTarget() !== null;

      if (isLearning) {
        e.preventDefault();
        footswitchManager.handleKeyEventForLearning(e);
        setConfig(footswitchManager.getConfig());
        setLearningTarget(null);
      } else {
        setLastActivity({
          type: 'key',
          value: `${codeDesc} (Key: "${e.key}", Code: "${e.code}")`,
          timestamp: Date.now(),
        });
      }
    };

    window.addEventListener('keydown', handleKeyActivity, { capture: true, passive: false });
    document.addEventListener('keydown', handleKeyActivity, { capture: true, passive: false });

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyActivity, { capture: true });
      document.removeEventListener('keydown', handleKeyActivity, { capture: true });
    };
  }, []);

  const handleSelectPreset = (preset: FootswitchConfig['preset']) => {
    let mainKeys = [...DEFAULT_FOOTSWITCH_CONFIG.mainKeys];
    let mainKeyCodes = [...DEFAULT_FOOTSWITCH_CONFIG.mainKeyCodes];
    let accentKeys = [...DEFAULT_FOOTSWITCH_CONFIG.accentKeys];
    let accentKeyCodes = [...DEFAULT_FOOTSWITCH_CONFIG.accentKeyCodes];

    if (preset === 'cuvave_pgdn_pgup') {
      mainKeys = ['PageDown', 'pagedown', 'pgdn', 'next'];
      mainKeyCodes = [34, 93];
      accentKeys = ['PageUp', 'pageup', 'pgup', 'prior'];
      accentKeyCodes = [33, 92];
    } else if (preset === 'cuvave_pgup_pgdn') {
      mainKeys = ['PageUp', 'pageup', 'pgup', 'prior'];
      mainKeyCodes = [33, 92];
      accentKeys = ['PageDown', 'pagedown', 'pgdn', 'next'];
      accentKeyCodes = [34, 93];
    } else if (preset === 'cuvave_arrows') {
      mainKeys = ['ArrowLeft', 'ArrowDown', 'arrowleft', 'arrowdown', 'Left', 'Down'];
      mainKeyCodes = [37, 40];
      accentKeys = ['ArrowRight', 'ArrowUp', 'arrowright', 'arrowup', 'Right', 'Up'];
      accentKeyCodes = [39, 38];
    } else if (preset === 'cuvave_space') {
      mainKeys = ['Space', ' ', 'Spacebar', 'Enter', 'Return'];
      mainKeyCodes = [32, 13];
      accentKeys = ['ShiftLeft', 'ShiftRight', 'Shift'];
      accentKeyCodes = [16];
    }

    const nextConfig: FootswitchConfig = {
      ...config,
      preset,
      mainKeys,
      mainKeyCodes,
      accentKeys,
      accentKeyCodes,
    };
    setConfig(nextConfig);
    footswitchManager.saveConfig(nextConfig);
  };

  const handleStartLearn = (target: 'main' | 'accent') => {
    footswitchManager.startLearning(target);
    setLearningTarget(target);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_FOOTSWITCH_CONFIG);
    footswitchManager.saveConfig(DEFAULT_FOOTSWITCH_CONFIG);
  };

  const handleRequestMidi = async () => {
    await footswitchManager.requestMidiPermission();
    setMidiDevices(footswitchManager.getConnectedMidiDevices());
  };

  const isRecentActivity = lastActivity && Date.now() - lastActivity.timestamp < 2000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Radio className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Configurar Pedal Cuvave / M-Vave Cube Turner Pro
              </h3>
              <p className="text-xs text-slate-400">
                Suporte universal Bluetooth, USB e aprendizado automático de botões
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

        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Quick Pedal Enable/Disable Toggle */}
          {onTogglePedalEnabled && (
            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Reconhecimento do Pedal Físico:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isPedalEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {isPedalEnabled ? 'LIGADO / ATIVO' : 'DESATIVADO (DIGITAÇÃO 100% LIVRE)'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isPedalEnabled
                    ? 'O app recebe os sinais do pedal e atalhos físicos. (Textos e campos de formulário nunca são bloqueados).'
                    : 'Pedal pausado. Teclas A, D, PageUp/Down e espaço atuam exclusivamente como teclas normais do computador.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onTogglePedalEnabled}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs ${
                  isPedalEnabled
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isPedalEnabled ? 'Desativar Pedal Físico' : 'Ativar Pedal Físico'}
              </button>
            </div>
          )}

          {/* Live Signal Sensor Box */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              learningTarget
                ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                : isRecentActivity
                ? 'bg-emerald-950/50 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    learningTarget
                      ? 'bg-amber-400 animate-ping'
                      : isRecentActivity
                      ? 'bg-emerald-400 animate-ping'
                      : 'bg-slate-600'
                  }`}
                />
                {learningTarget
                  ? `MODO APRENDER ATIVO: Pise agora no botão que deseja mapear para [${
                      learningTarget === 'main' ? 'PEDAL 1 (INTRO / FILLS / END)' : 'PEDAL 2 (SELEÇÃO A/B & TRANSIÇÕES)'
                    }]`
                  : 'Sensor em Tempo Real (Pise no Pedal Cuvave para testar)'}
              </span>
              <span
                className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                  learningTarget
                    ? 'bg-amber-400 text-slate-950'
                    : isRecentActivity
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-900 text-slate-500'
                }`}
              >
                {learningTarget ? 'AGUARDANDO TOQUE NO PEDAL...' : isRecentActivity ? 'SINAL RECEBIDO!' : 'AGUARDANDO SINAL'}
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">Último sinal detectado:</span>
              <span className="font-mono text-amber-300 font-bold bg-slate-900 px-2 py-1 rounded border border-slate-800 text-xs truncate max-w-full">
                {lastActivity ? `${lastActivity.value}` : 'Nenhum sinal detectado ainda'}
              </span>
            </div>
          </div>

          {/* Key Learn Section */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Aprender Teclas Automaticamente (Key Learn)</span>
              </span>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrão Universal</span>
              </button>
            </div>
            <p className="text-slate-400 text-[11px]">
              Se o seu pedal Cuvave estiver configurado em um modo diferente, clique abaixo e pise no footswitch para calibrar instantaneamente:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Learn Button 1 */}
              <button
                type="button"
                onClick={() => handleStartLearn('main')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  learningTarget === 'main'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400 font-extrabold'
                    : 'bg-slate-900 hover:bg-slate-850 text-white border-slate-700 hover:border-amber-400'
                }`}
              >
                <span className="text-xs font-bold block">
                  {learningTarget === 'main' ? 'Pise no PEDAL 1 Agora!' : '🎯 Calibrar PEDAL 1 (Esquerdo)'}
                </span>
                <span className="text-[10px] opacity-80 mt-1">
                  (Intro / Fill A & Fill B / Segurar End)
                </span>
                <span className="text-[10px] text-cyan-300 font-mono mt-1 block">
                  Atuais: {config.mainKeys.slice(0, 4).join(', ')}...
                </span>
              </button>

              {/* Learn Button 2 */}
              <button
                type="button"
                onClick={() => handleStartLearn('accent')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  learningTarget === 'accent'
                    ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-400 font-extrabold'
                    : 'bg-slate-900 hover:bg-slate-850 text-white border-slate-700 hover:border-amber-400'
                }`}
              >
                <span className="text-xs font-bold block">
                  {learningTarget === 'accent' ? 'Pise no PEDAL 2 Agora!' : '🎯 Calibrar PEDAL 2 (Direito)'}
                </span>
                <span className="text-[10px] opacity-80 mt-1">
                  (Parado: Parte A/B • Tocando: Transições)
                </span>
                <span className="text-[10px] text-purple-300 font-mono mt-1 block">
                  Atuais: {config.accentKeys.slice(0, 4).join(', ')}...
                </span>
              </button>
            </div>
          </div>

          {/* Sensibilidade / Hold Time Section */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <span>⏱️ Sensibilidade do Pedal (Tempo de Hold para Ending)</span>
              </span>
              <span className="text-amber-400 font-mono font-bold text-xs">
                {config.holdThresholdMs || 650}ms
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Dica: Agora você pode <strong className="text-amber-400">pisar duas vezes rápidas no Pedal 1</strong> para chamar o Ending instantaneamente, ou segurar o pé pisado pelo tempo configurado abaixo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {[
                { ms: 450, label: '450ms (Rápido)', desc: 'Para pés muito ágeis' },
                { ms: 650, label: '650ms (Normal - Padrão)', desc: 'Ideal para Cuvave / BeatBuddy' },
                { ms: 850, label: '850ms (Seguro)', desc: 'Evita acionamento acidental' },
              ].map((opt) => (
                <button
                  key={opt.ms}
                  type="button"
                  onClick={() => {
                    const next = { ...config, holdThresholdMs: opt.ms };
                    setConfig(next);
                    footswitchManager.saveConfig(next);
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    (config.holdThresholdMs || 650) === opt.ms
                      ? 'bg-amber-400/20 border-amber-400 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[11px] block">{opt.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Mode Selector Presets */}
          <div>
            <label className="block text-slate-300 font-bold mb-2 uppercase tracking-wider text-[11px]">
              Presets Rápidos de Teclas
            </label>
            <div className="space-y-2">
              {[
                {
                  id: 'cuvave_pgdn_pgup',
                  title: 'Modo 1: PageDown (Play / Virada) + PageUp (Acento / Transição)',
                  desc: 'Padrão do Cuvave com chave em PgUp/PgDn. O botão PageDown inicia a levada e dispara viradas.',
                  keys: 'Footswitch 1: PageDown | Footswitch 2: PageUp',
                },
                {
                  id: 'cuvave_pgup_pgdn',
                  title: 'Modo 2: Invertido - PageUp (Play / Virada) + PageDown (Acento)',
                  desc: 'Inverte os pedais caso prefira o botão esquerdo para Play/Virada.',
                  keys: 'Footswitch 1: PageUp | Footswitch 2: PageDown',
                },
                {
                  id: 'universal',
                  title: 'Modo Universal (Auto-Detecção Completa)',
                  desc: 'Aceita simultaneamente PageDown/PageUp, Setas, Espaço/Enter e Teclas B/C sem precisar configurar.',
                  keys: 'Footswitch 1: PgDown, Seta Esq, Espaço, B | Footswitch 2: PgUp, Seta Dir, Shift, C',
                },
                {
                  id: 'cuvave_arrows',
                  title: 'Modo Setas do Teclado (Left / Right / Down / Up)',
                  desc: 'Ideal se a chave traseira do Cuvave estiver apontada para as Setas.',
                  keys: 'Footswitch 1: Seta Esquerda / Baixo | Footswitch 2: Seta Direita / Cima',
                },
                {
                  id: 'cuvave_space',
                  title: 'Modo Teclado Padrão (Espaço / Shift)',
                  desc: 'Ideal para pedais simples de 1 ou 2 botões via USB ou Bluetooth.',
                  keys: 'Footswitch 1: Barra de Espaço / Enter | Footswitch 2: Tecla Shift',
                },
              ].map((m) => (
                <label
                  key={m.id}
                  onClick={() => handleSelectPreset(m.id as FootswitchConfig['preset'])}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    config.preset === m.id
                      ? 'bg-amber-400/10 border-amber-400/60 shadow-xs'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="footswitchPreset"
                    checked={config.preset === m.id}
                    onChange={() => handleSelectPreset(m.id as FootswitchConfig['preset'])}
                    className="mt-0.5 accent-amber-400"
                  />
                  <div className="flex-1">
                    <span className="font-bold text-white block text-xs">{m.title}</span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">{m.desc}</span>
                    <span className="text-[10px] text-amber-300/80 font-mono block mt-1">
                      {m.keys}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Web MIDI Connection */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white block text-xs">Suporte a MIDI USB e Bluetooth</span>
                <span className="text-[11px] text-slate-400">
                  {midiDevices.length > 0
                    ? `Dispositivos ativos: ${midiDevices.join(', ')}`
                    : 'Nenhum controlador MIDI detectado no momento'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRequestMidi}
                className="px-3 py-1.5 text-xs font-bold bg-slate-850 hover:bg-slate-750 text-cyan-300 border border-cyan-700/60 rounded-lg cursor-pointer transition-colors"
              >
                Conectar / Atualizar MIDI
              </button>
            </div>
          </div>

          {/* Instructions for Cuvave Pairing */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-cyan-200">
            <h4 className="font-bold text-xs text-cyan-300 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Dica rápida de conexão do Cube Turner Pro:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-300 pl-1">
              <li>Pareie o <strong>Cube Turner Pro</strong> no Bluetooth do aparelho (ele é reconhecido como teclado Bluetooth ou MIDI).</li>
              <li>Deixe a chave seletora atrás do pedal no modo <strong>PageUp / PageDown</strong> ou <strong>Setas</strong>.</li>
              <li>Pronto! O pedal agora funciona em qualquer tela do BeatBuddy Studio, tanto no PC quanto no celular.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Configuração salva automaticamente</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            Concluir & Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
