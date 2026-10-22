import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine.ts';
import { PRESETS } from '../audio/presets.ts';
import { Pattern, TrackId } from '../audio/types.ts';
import {
  Play,
  Square,
  Volume2,
  Sparkles,
  RotateCcw,
  Download,
  Flame,
  Radio
} from 'lucide-react';

interface TransportBarProps {
  isPlaying: boolean;
  bpm: number;
  swing: number;
  activePresetId: string;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swing: number) => void;
  onPresetSelect: (presetId: string) => void;
  onRandomize: () => void;
  onClear: () => void;
  onExportWav: () => void;
  isExporting: boolean;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  bpm,
  swing,
  activePresetId,
  onBpmChange,
  onSwingChange,
  onPresetSelect,
  onRandomize,
  onClear,
  onExportWav,
  isExporting,
}) => {
  const [metronome, setMetronome] = useState(false);
  const [masterVol, setMasterVol] = useState(85);

  // Tap tempo tracking
  const tapTimesRef = useRef<number[]>([]);

  const handleTapTempo = () => {
    const now = performance.now();
    const tapTimes = tapTimesRef.current;
    
    // Reset if last tap was more than 2 seconds ago
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }

    tapTimes.push(now);
    if (tapTimes.length > 4) {
      tapTimes.shift();
    }

    if (tapTimes.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 60 && calculatedBpm <= 220) {
        onBpmChange(calculatedBpm);
        audioEngine.setBpm(calculatedBpm);
      }
    }
  };

  const toggleMetronome = () => {
    const next = !metronome;
    setMetronome(next);
    audioEngine.metronomeEnabled = next;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setMasterVol(val);
    audioEngine.setMasterVolume(val / 100);
  };

  return (
    <div className="w-full bg-[#0d131f] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col gap-3">
      {/* Row 1: Primary Controls & Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Play / Stop / Transport */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => audioEngine.togglePlay()}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg active:scale-95 ${
              isPlaying
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 animate-pulse'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Play Loop</span>
              </>
            )}
          </button>

          <button
            onClick={() => audioEngine.stop()}
            title="Stop & Reset"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700/60"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMetronome}
            title="Metronome Click"
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium border transition-colors ${
              metronome
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Click</span>
          </button>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
            Style:
          </span>
          {PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onPresetSelect(preset.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  isActive
                    ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20 font-semibold'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {preset.title}
              </button>
            );
          })}
        </div>

        {/* Actions: Randomize & Export WAV */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRandomize}
            title="Generate algorithmic rhythm"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition-all active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mutate Beat</span>
          </button>

          <button
            onClick={onExportWav}
            disabled={isExporting}
            title="Export master audio loop as 16-bit uncompressed WAV file"
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-medium text-xs rounded-lg transition-all shadow-md shadow-sky-500/20 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Rendering...' : 'Export WAV'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: Precision Sliders (BPM, Swing, Volume) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/60">
        {/* BPM & Tap Tempo */}
        <div className="flex items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/80 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">TEMPO</span>
            <span className="text-sm font-mono font-bold text-sky-400 tabular-nums">
              {bpm} <span className="text-[10px] text-slate-500 font-normal">BPM</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min={60}
              max={180}
              value={bpm}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                onBpmChange(val);
                audioEngine.setBpm(val);
              }}
              className="w-20 accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <button
              onClick={handleTapTempo}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] font-mono border border-slate-700 active:bg-sky-500 active:text-white transition-all"
            >
              TAP
            </button>
          </div>
        </div>

        {/* Groove / Swing */}
        <div className="flex items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/80 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">GROOVE / SWING</span>
            <span className="text-sm font-mono font-bold text-amber-400 tabular-nums">
              {swing}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            value={swing}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onSwingChange(val);
              audioEngine.setSwing(val);
            }}
            className="w-28 accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Master Output Volume */}
        <div className="flex items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/80 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-400">OUTPUT</span>
            <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums">
              {masterVol}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={masterVol}
            onChange={handleVolumeChange}
            className="w-28 accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
