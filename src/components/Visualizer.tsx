import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine.ts';
import { Activity, BarChart2, Disc3 } from 'lucide-react';

type VisMode = 'oscilloscope' | 'spectrum' | 'radial';

export const Visualizer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<VisMode>('oscilloscope');
  const [peakL, setPeakL] = useState(0);
  const [peakR, setPeakR] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let peaks: number[] = new Array(32).fill(0);

    const render = () => {
      animId = requestAnimationFrame(render);
      const analyser = audioEngine.getAnalyser();

      const width = canvas.width;
      const height = canvas.height;

      // Dark background clearing with subtle motion blur trail
      ctx.fillStyle = 'rgba(11, 15, 25, 0.35)';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 4, 0);
      ctx.lineTo(width / 4, height);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo((3 * width) / 4, 0);
      ctx.lineTo((3 * width) / 4, height);
      ctx.stroke();

      if (!analyser) {
        // Idle animation
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const t = performance.now() * 0.002;
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.02 + t) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const timeData = new Uint8Array(bufferLength);
      const freqData = new Uint8Array(bufferLength);

      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // Compute peak VU meters
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (timeData[i] - 128) / 128;
        sumSquares += val * val;
      }
      const rms = Math.min(1, Math.sqrt(sumSquares / bufferLength) * 2.2);
      setPeakL((prev) => Math.max(rms, prev * 0.88));
      setPeakR((prev) => Math.max(rms * 0.95, prev * 0.88));

      if (mode === 'oscilloscope') {
        // Find zero-crossing for steady stable trace
        let zeroCross = 0;
        for (let i = 0; i < bufferLength / 2; i++) {
          if (timeData[i] < 128 && timeData[i + 1] >= 128) {
            zeroCross = i;
            break;
          }
        }

        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#06b6d4';
        ctx.lineWidth = 2.5;

        // Gradient stroke
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(0.5, '#3b82f6');
        grad.addColorStop(1, '#a855f7');
        ctx.strokeStyle = grad;

        ctx.beginPath();
        const sliceWidth = width / (bufferLength / 2);
        let x = 0;

        for (let i = zeroCross; i < zeroCross + bufferLength / 2; i++) {
          const v = (timeData[i] || 128) / 128.0;
          const y = (v * height) / 2;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.restore();
      } else if (mode === 'spectrum') {
        const barCount = 32;
        const barWidth = (width / barCount) - 4;
        const step = Math.floor(bufferLength / barCount / 2);

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) {
            sum += freqData[i * step + j] || 0;
          }
          const avg = sum / step;
          const barHeight = (avg / 255) * (height - 16);

          if (barHeight > peaks[i]) {
            peaks[i] = barHeight;
          } else {
            peaks[i] = Math.max(0, peaks[i] - 1.5);
          }

          const x = i * (barWidth + 4) + 2;
          const y = height - barHeight;

          // Gradient bar
          const grad = ctx.createLinearGradient(0, height, 0, 0);
          grad.addColorStop(0, '#3b82f6');
          grad.addColorStop(0.7, '#06b6d4');
          grad.addColorStop(1, '#f43f5e');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Peak indicator dot
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, height - peaks[i] - 3, barWidth, 2);
        }
      } else if (mode === 'radial') {
        const cx = width / 2;
        const cy = height / 2;
        const baseRadius = Math.min(width, height) * 0.28;

        ctx.save();
        ctx.translate(cx, cy);

        // Core glow
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#8b5cf6';

        ctx.beginPath();
        const points = 64;
        const step = Math.floor(bufferLength / points / 2);

        for (let i = 0; i < points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const amp = ((freqData[i * step] || 0) / 255) * 45;
          const r = baseRadius + amp;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mode]);

  return (
    <div className="relative w-full bg-[#0a0e17] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl">
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/60 bg-[#0d131f]/90 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono font-semibold tracking-wider text-slate-400 uppercase text-[11px]">
            Master Visualizer
          </span>
          <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] tabular-nums">
            <span>44.1 kHz</span>
            <span>·</span>
            <span>24-bit Stereo</span>
          </div>
        </div>

        {/* Visualizer Mode Switcher */}
        <div className="flex items-center gap-1 p-0.5 bg-slate-900/80 rounded-lg border border-slate-800">
          <button
            onClick={() => setMode('oscilloscope')}
            title="Oscilloscope Mode"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'oscilloscope'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Wave</span>
          </button>
          <button
            onClick={() => setMode('spectrum')}
            title="32-Band Spectrum"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'spectrum'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Spectrum</span>
          </button>
          <button
            onClick={() => setMode('radial')}
            title="Radial Pulsar"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              mode === 'radial'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Radial</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative h-44 sm:h-52 w-full flex items-center justify-center bg-radial from-[#0f172a] via-[#090d16] to-[#06090e]">
        <canvas
          ref={canvasRef}
          width={800}
          height={208}
          className="w-full h-full object-cover"
        />

        {/* Dual Peak VU Meters on Right Edge */}
        <div className="absolute right-3 top-3 bottom-3 flex items-end gap-1.5 px-1.5 py-1 bg-black/40 backdrop-blur border border-slate-800/80 rounded-md">
          <div className="flex flex-col items-center gap-1 text-[9px] font-mono text-slate-500">
            <div className="w-1.5 h-24 bg-slate-900 rounded-sm overflow-hidden flex flex-col-reverse p-[1px]">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-amber-500 to-rose-500 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, peakL * 100)}%` }}
              />
            </div>
            <span>L</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-[9px] font-mono text-slate-500">
            <div className="w-1.5 h-24 bg-slate-900 rounded-sm overflow-hidden flex flex-col-reverse p-[1px]">
              <div
                className="w-full bg-gradient-to-t from-emerald-500 via-amber-500 to-rose-500 rounded-xs transition-all duration-75"
                style={{ height: `${Math.min(100, peakR * 100)}%` }}
              />
            </div>
            <span>R</span>
          </div>
        </div>
      </div>
    </div>
  );
};
