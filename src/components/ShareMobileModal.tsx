/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Smartphone, Copy, Check, Radio, Volume2, CloudCheck, ExternalLink, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { SongProject } from '../types/rhythm';

interface ShareMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: SongProject;
  samplesCount: number;
}

export const ShareMobileModal: React.FC<ShareMobileModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  samplesCount,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const url = window.location.href;
    setCurrentUrl(url);

    QRCode.toDataURL(url, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error('Error generating QR Code:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-amber-400/40 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Abrir & Tocar no Celular
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Nuvem Ativa
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Seus ritmos e sons ficam salvos no app prontos para tocar em qualquer aparelho
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* QR Code and Quick Scan */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="bg-white p-2 rounded-xl shadow-md shrink-0 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code para celular"
                  className="w-36 h-36 rounded-lg object-contain"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                  <QrCode className="w-8 h-8 animate-pulse text-slate-500" />
                </div>
              )}
            </div>

            <div className="space-y-2.5 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span>Passo 1: Aponte a Câmera</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Abra a câmera do seu smartphone (Android ou iPhone) e aponte para o QR Code para abrir este app diretamente no celular.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Link Copiado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Link para Enviar por WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sync info banner */}
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 flex items-start gap-3">
            <CloudCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-bold text-emerald-300">
                Ritmo atual pronto no servidor: &ldquo;{currentProject.name}&rdquo;
              </span>
              <p className="text-slate-300">
                {currentProject.tracks.length} pistas configuradas com {samplesCount} sons de áudio salvos. Ao abrir no celular, o ritmo carrega automaticamente sem precisar recriar!
              </p>
            </div>
          </div>

          {/* Mobile instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Instruções para tocar no Celular:
            </h4>

            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <Volume2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-white block">1. Toque na tela para ativar o áudio</span>
                  <span className="text-slate-400">
                    Sistemas mobile (Android e iOS) exigem 1 toque na tela para liberar o alto-falante.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <Radio className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold text-white block">2. Pedal Cuvave Cube Turner Pro no Celular</span>
                  <span className="text-slate-400">
                    No celular, conecte o pedal via Bluetooth. Qualquer toque no pedal agora dispara o ritmo, viradas e acentos com resposta imediata.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                <span className="font-bold block text-amber-200">3. Sincronização no Vercel:</span>
                <span className="text-slate-300">
                  Os 8 samples de percussão padrão carregam automaticamente no celular. Para sincronizar ritmos modificados ou novos samples gravados no Vercel, faça login com o Google no botão do topo em ambos os aparelhos ou use a opção <strong>Exportar Kit</strong> na aba de Samples.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            Entendido, fechar
          </button>
        </div>
      </div>
    </div>
  );
};
