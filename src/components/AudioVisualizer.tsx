/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/AudioEngine';

export const AudioVisualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const analyser = audioEngine.getAnalyser();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!analyser || !audioEngine.getIsPlaying()) {
        ctx.fillStyle = 'rgba(71, 85, 105, 0.2)';
        ctx.fillRect(0, canvas.height - 2, canvas.width, 2);
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteFrequencyData(dataArray);

      const barCount = 28;
      const barWidth = canvas.width / barCount - 1;

      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * (bufferLength / 2));
        const val = dataArray[dataIdx] || 0;
        const barHeight = (val / 255) * canvas.height;
        const hue = 40 + (i / barCount) * 140;
        ctx.fillStyle = `hsl(${hue}, 90%, 55%)`;
        ctx.fillRect(
          i * (barWidth + 1),
          canvas.height - barHeight,
          barWidth,
          barHeight
        );
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
      <span className="text-[10px] text-slate-500 font-mono">VU:</span>
      <canvas
        ref={canvasRef}
        width={100}
        height={18}
        className="rounded"
      />
    </div>
  );
};
