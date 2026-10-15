/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Smartphone,
  Radio,
  CheckCircle2,
  Apple,
  Cpu,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface MobileAndPedalGuideModalProps {
  onClose: () => void;
  onOpenPedalSettings?: () => void;
}

export const MobileAndPedalGuideModal: React.FC<MobileAndPedalGuideModalProps> = ({
  onClose,
  onOpenPedalSettings,
}) => {
  const [activeTab, setActiveTab] = useState<'cuvave' | 'mobile_pwa' | 'apk_capacitor'>('cuvave');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Guia: Pedal Cuvave & App no Celular (Android / iPhone)
              </h3>
              <p className="text-xs text-slate-400">
                Suporte completo ao Cuvave Cube Turner Pro e como usar como aplicativo nativo
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

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 px-6 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('cuvave')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'cuvave'
                ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Pedal Cuvave Cube Turner Pro</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mobile_pwa')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'mobile_pwa'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Instalar no Celular (1 Clique)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk_capacitor')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'apk_capacitor'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-400/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Gerar APK Android / iOS</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-slate-300">
          {/* TAB 1: CUVAVE CUBE TURNER PRO */}
          {activeTab === 'cuvave' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Radio className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                    SIM! O pedal Cuvave Cube Turner Pro é 100% suportado
                  </h4>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    O BeatBuddy Studio já possui integração nativa para o <strong>Cuvave Cube Turner Pro</strong> (e M-Vave Chocolate), tanto via <strong>Bluetooth HID</strong> (modo de teclado sem fio) quanto via <strong>Web MIDI</strong> (Bluetooth MIDI ou cabo USB).
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                  Como configurar o Cuvave em 3 passos simples:
                </h5>
                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Conecte o Cuvave no Bluetooth do seu computador, tablet ou celular
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Ligue o pedal Cuvave no modo Bluetooth. Ele se conectará como um dispositivo sem fio (HID ou MIDI).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Escolha o modo no pedal Cuvave Cube Turner:
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        • <strong>Modo PageUp / PageDown</strong>: O footswitch direito envia PageDown (Pedal Principal: Iniciar/Virada) e o esquerdo envia PageUp (Acento/Crash).<br />
                        • <strong>Modo Setas (Arrows)</strong>: Seta Esquerda (Pedal Principal) e Seta Direita (Acento/Crash).<br />
                        • <strong>Modo Espaço / Enter</strong>: Barra de espaço (Pedal Principal).
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Comandos em tempo real durante o show:
                      </span>
                      <p className="text-xs text-slate-400 mt-1">
                        • <strong>1 Toque curto</strong>: Inicia a música com Intro completa, ou dispara Virada (Fill) sincronizada.<br />
                        • <strong>Segurar o pedal (Hold)</strong>: Inicia a Transição contínua para a Parte B (Refrão). Solte para entrar na nova parte!<br />
                        • <strong>2 Toques rápidos</strong>: Dispara o Encerramento (Outro) com prato final e parada automática.<br />
                        • <strong>Outro botão do Cuvave</strong>: Toca golpe de acento (Crash) instantâneo a qualquer momento.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {onOpenPedalSettings && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPedalSettings();
                    }}
                    className="w-full py-2.5 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Abrir Configurações do Pedal Cuvave / MIDI</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INSTALAR NO CELULAR (PWA) */}
          {activeTab === 'mobile_pwa' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                    SIM! Funciona como App no Android e iPhone imediatamente
                  </h4>
                  <p className="text-xs text-cyan-200/90 leading-relaxed">
                    Você pode instalar o BeatBuddy Studio diretamente no seu smartphone sem precisar passar pela Play Store ou App Store. Ele vira um aplicativo completo com ícone próprio na sua tela de início, tela cheia e áudio sem delay!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Android Guide */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>No Android (Google Chrome)</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Abra o link deste aplicativo no <strong>Google Chrome</strong> do seu celular.</li>
                    <li>Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.</li>
                    <li>Toque em <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.</li>
                    <li>Pronto! O app abre em tela cheia, sem barra de navegação, com suporte ao pedal Bluetooth.</li>
                  </ol>
                </div>

                {/* iPhone / iOS Guide */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wide">
                    <Apple className="w-4 h-4 text-slate-200" />
                    <span>No iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Abra o link no navegador <strong>Safari</strong> do iPhone.</li>
                    <li>Toque no botão de <strong>Compartilhar</strong> (ícone do quadrado com a seta para cima ⎋ na barra inferior).</li>
                    <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                    <li>Toque em <strong>"Adicionar"</strong> no canto superior direito.</li>
                  </ol>
                </div>
              </div>

              <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Todos os ritmos criados e samples gravados ficam guardados com segurança no banco de dados interno do seu aparelho (IndexedDB).
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: GERAR APK NATIVO (CAPACITOR) */}
          {activeTab === 'apk_capacitor' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <Terminal className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    Como compilar em APK nativo (.apk / .aab) e iOS (.ipa)
                  </h4>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    Como o projeto é construído em <strong>React + Vite + TypeScript</strong>, ele é 100% compatível com a biblioteca <strong>Capacitor</strong> (do ecossistema Ionic). Com 3 comandos você gera o projeto Android Studio para compilar o APK!
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Passo a passo no seu computador:
                </span>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 space-y-2 select-all">
                  <p className="text-slate-500"># 1. Instalar o Capacitor no projeto</p>
                  <p className="text-white">npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios</p>
                  
                  <p className="text-slate-500 mt-2"># 2. Inicializar o aplicativo</p>
                  <p className="text-white">npx cap init "BeatBuddy Studio" com.beatbuddy.studio --web-dir dist</p>
                  
                  <p className="text-slate-500 mt-2"># 3. Compilar e adicionar plataforma Android</p>
                  <p className="text-white">npm run build</p>
                  <p className="text-white">npx cap add android</p>
                  <p className="text-white">npx cap sync</p>
                  
                  <p className="text-slate-500 mt-2"># 4. Abrir no Android Studio para gerar o .APK</p>
                  <p className="text-white">npx cap open android</p>
                </div>

                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <strong className="text-white block mb-1">Para iPhone (iOS):</strong>
                  Basta rodar <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">npx cap add ios</code> e <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300">npx cap open ios</code> para abrir no Xcode em um Mac e compilar para qualquer iPhone.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            BeatBuddy Studio – Totalmente independente e autônomo
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
