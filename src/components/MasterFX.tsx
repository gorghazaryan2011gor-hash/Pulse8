import React, { useState } from 'react';
import { MasterFXParams } from '../audio/types.ts';
import { audioEngine } from '../audio/engine.ts';
import { Sliders, Zap, Waves, Disc } from 'lucide-react';

interface MasterFXProps {
  fxParams: MasterFXParams;
  onFxChange: (params: Partial<MasterFXParams>) => void;
}

export const MasterFX: React.FC<MasterFXProps> = ({ fxParams, onFxChange }) => {
  const [isStutterActive, setIsStutterActive] = useState(false);

  const handleCutoff = (val: number) => {
    onFxChange({ filterCutoff: val });
    audioEngine.setMasterFX({ filterCutoff: val });
  };

  const handleResonance = (val: number) => {
    onFxChange({ filterResonance: val });
    audioEngine.setMasterFX({ filterResonance: val });
  };

  const handleDelayTime = (val: number) => {
    onFxChange({ delayTime: val });
    audioEngine.setMasterFX({ delayTime: val });
  };

  const handleDelayMix = (val: number) => {
    onFxChange({ delayMix: val });
    audioEngine.setMasterFX({ delayMix: val });
  };

  const handleDistortion = (val: number) => {
    onFxChange({ distortionDrive: val });
    audioEngine.setMasterFX({ distortionDrive: val });
  };

  const handleReverbMix = (val: number) => {
    onFxChange({ reverbMix: val });
    audioEngine.setMasterFX({ reverbMix: val });
  };

  // Live Performance Stutter Glitch effect
  const handleStutterDown = (rate: '1/8' | '1/16' | '1/32') => {
    audioEngine.init();
    setIsStutterActive(true);
    // Instant resonant cut + fast delay roll
    const delayTimeMap = { '1/8': 0.125, '1/16': 0.0625, '1/32': 0.03125 };
    audioEngine.setMasterFX({
      delayTime: delayTimeMap[rate],
      delayFeedback: 0.82,
      delayMix: 0.85,
    });
  };

  const handleStutterUp = () => {
    setIsStutterActive(false);
    audioEngine.setMasterFX({
      delayTime: fxParams.delayTime,
      delayFeedback: fxParams.delayFeedback,
      delayMix: fxParams.delayMix,
    });
  };

  return (
    <div className="w-full bg-[#0a0e17] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
      {/* FX Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="font-mono font-bold tracking-wider text-slate-200 text-sm">
            MASTER FX RACK
          </span>
        </div>
        <span className="text-slate-500 font-mono text-xs hidden sm:inline">
          Analog-modeled DSP chain
        </span>
      </div>

      {/* FX Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Module 1: Master Filter */}
        <div className="bg-[#0f1422] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-sky-400">01. FILTER</span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800">
              <button
                onClick={() => {
                  onFxChange({ filterType: 'lowpass' });
                  audioEngine.setMasterFX({ filterType: 'lowpass' });
                }}
                className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                  fxParams.filterType === 'lowpass'
                    ? 'bg-sky-500 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                LP
              </button>
              <button
                onClick={() => {
                  onFxChange({ filterType: 'highpass' });
                  audioEngine.setMasterFX({ filterType: 'highpass' });
                }}
                className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                  fxParams.filterType === 'highpass'
                    ? 'bg-sky-500 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HP
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>CUTOFF</span>
                <span className="text-sky-400 tabular-nums">
                  {Math.round(fxParams.filterCutoff)} Hz
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="18000"
                step="50"
                value={fxParams.filterCutoff}
                onChange={(e) => handleCutoff(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>RESONANCE</span>
                <span className="text-sky-400 tabular-nums">
                  {fxParams.filterResonance.toFixed(1)} Q
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="15"
                step="0.1"
                value={fxParams.filterResonance}
                onChange={(e) => handleResonance(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-sky-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Module 2: Stereo Echo / Delay */}
        <div className="bg-[#0f1422] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-amber-400">02. DELAY</span>
            <Waves className="w-3.5 h-3.5 text-amber-400" />
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>TIME</span>
                <span className="text-amber-400 tabular-nums">
                  {Math.round(fxParams.delayTime * 1000)} ms
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.01"
                value={fxParams.delayTime}
                onChange={(e) => handleDelayTime(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>WET / DRY</span>
                <span className="text-amber-400 tabular-nums">
                  {Math.round(fxParams.delayMix * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.8"
                step="0.02"
                value={fxParams.delayMix}
                onChange={(e) => handleDelayMix(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Module 3: Tube Drive & Reverb */}
        <div className="bg-[#0f1422] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-rose-400">03. WARMTH & SPACE</span>
            <Disc className="w-3.5 h-3.5 text-rose-400" />
          </div>

          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>SATURATION DRIVE</span>
                <span className="text-rose-400 tabular-nums">
                  {Math.round(fxParams.distortionDrive * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.02"
                value={fxParams.distortionDrive}
                onChange={(e) => handleDistortion(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-rose-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>REVERB SPACE</span>
                <span className="text-rose-400 tabular-nums">
                  {Math.round(fxParams.reverbMix * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.85"
                step="0.02"
                value={fxParams.reverbMix}
                onChange={(e) => handleReverbMix(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded accent-rose-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Module 4: Live Performance Glitch Pads */}
        <div className="bg-[#0f1422] border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-purple-400">04. LIVE GLITCH</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>

          <span className="text-[10px] text-slate-400">
            Hold button down to trigger live beat-repeat roll:
          </span>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onMouseDown={() => handleStutterDown('1/8')}
              onMouseUp={handleStutterUp}
              onMouseLeave={handleStutterUp}
              onTouchStart={() => handleStutterDown('1/8')}
              onTouchEnd={handleStutterUp}
              className="py-2.5 bg-purple-600/20 hover:bg-purple-600/40 active:bg-purple-600 text-purple-300 active:text-white border border-purple-500/40 rounded font-mono text-xs font-bold transition-colors select-none"
            >
              1/8
            </button>
            <button
              onMouseDown={() => handleStutterDown('1/16')}
              onMouseUp={handleStutterUp}
              onMouseLeave={handleStutterUp}
              onTouchStart={() => handleStutterDown('1/16')}
              onTouchEnd={handleStutterUp}
              className="py-2.5 bg-purple-600/20 hover:bg-purple-600/40 active:bg-purple-600 text-purple-300 active:text-white border border-purple-500/40 rounded font-mono text-xs font-bold transition-colors select-none"
            >
              1/16
            </button>
            <button
              onMouseDown={() => handleStutterDown('1/32')}
              onMouseUp={handleStutterUp}
              onMouseLeave={handleStutterUp}
              onTouchStart={() => handleStutterDown('1/32')}
              onTouchEnd={handleStutterUp}
              className="py-2.5 bg-purple-600/20 hover:bg-purple-600/40 active:bg-purple-600 text-purple-300 active:text-white border border-purple-500/40 rounded font-mono text-xs font-bold transition-colors select-none"
            >
              1/32
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
