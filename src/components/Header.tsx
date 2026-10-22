import React from 'react';
import { Download, Play, Square, Disc } from 'lucide-react';

interface HeaderProps {
  activeTab: 'sequencer' | 'keyboard' | 'fx';
  onTabChange: (tab: 'sequencer' | 'keyboard' | 'fx') => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExportWav: () => void;
  isExporting: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  isPlaying,
  onTogglePlay,
  onExportWav,
  isExporting,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5 bg-[#080c14]/95 backdrop-blur border-b border-slate-800/80 sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark (Single line, display face) */}
      <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Disc className="w-4 h-4 text-white animate-spin [animation-duration:6s]" />
        </div>
        <span className="text-lg font-black tracking-tight text-white font-mono">
          PULSE<span className="text-sky-400">·8</span>
        </span>
      </div>

      {/* Zone 2: 3-4 clean single-line nav tabs */}
      <nav className="flex items-center gap-1 sm:gap-4 text-xs font-semibold text-slate-400">
        <button
          onClick={() => onTabChange('sequencer')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'sequencer'
              ? 'text-white bg-slate-800/90 shadow-sm'
              : 'hover:text-slate-200'
          }`}
        >
          Sequencer
        </button>
        <button
          onClick={() => onTabChange('keyboard')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'keyboard'
              ? 'text-white bg-slate-800/90 shadow-sm'
              : 'hover:text-slate-200'
          }`}
        >
          Keyboard & Synth
        </button>
        <button
          onClick={() => onTabChange('fx')}
          className={`px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
            activeTab === 'fx'
              ? 'text-white bg-slate-800/90 shadow-sm'
              : 'hover:text-slate-200'
          }`}
        >
          Master FX
        </button>
      </nav>

      {/* Zone 3: 1 Primary CTA Button */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onExportWav}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-white font-medium text-xs rounded-lg transition-all shadow-md shadow-sky-500/20 whitespace-nowrap shrink-0 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isExporting ? 'Exporting...' : 'Export WAV'}</span>
        </button>
      </div>
    </header>
  );
};
