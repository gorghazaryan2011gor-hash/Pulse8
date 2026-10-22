import React, { useEffect, useState, useCallback } from 'react';
import { SynthParams, WaveformType } from '../audio/types.ts';
import { SCALES } from '../audio/notes.ts';
import { audioEngine } from '../audio/engine.ts';
import { Piano, Volume2 } from 'lucide-react';

interface VirtualKeyboardProps {
  synthParams: SynthParams;
  onSynthChange: (params: Partial<SynthParams>) => void;
}

const KEYBOARD_MAP: Record<string, string> = {
  // Lower octave keys
  a: 'C',
  w: 'C#',
  s: 'D',
  e: 'D#',
  d: 'E',
  f: 'F',
  t: 'F#',
  g: 'G',
  y: 'G#',
  h: 'A',
  u: 'A#',
  j: 'B',
  // Upper octave keys
  k: 'C+',
  o: 'C#+',
  l: 'D+',
  p: 'D#+',
  ';': 'E+',
};

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  synthParams,
  onSynthChange,
}) => {
  const [octave, setOctave] = useState<number>(4);
  const [scale, setScale] = useState<keyof typeof SCALES>('minor');
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());

  const activeReleasersRef = React.useRef<Map<string, () => void>>(new Map());

  const playNote = useCallback((noteName: string) => {
    if (activeReleasersRef.current.has(noteName)) return;

    audioEngine.init();
    const releaser = audioEngine.triggerLiveNote(noteName, 0.85);
    activeReleasersRef.current.set(noteName, releaser);

    setActiveNotes((prev) => new Set(prev).add(noteName));
  }, []);

  const stopNote = useCallback((noteName: string) => {
    const releaser = activeReleasersRef.current.get(noteName);
    if (releaser) {
      releaser();
      activeReleasersRef.current.delete(noteName);
    }
    setActiveNotes((prev) => {
      const next = new Set(prev);
      next.delete(noteName);
      return next;
    });
  }, []);

  // Listen for physical QWERTY key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      const mapped = KEYBOARD_MAP[key];
      if (!mapped) return;

      const isUpper = mapped.endsWith('+');
      const baseNote = mapped.replace('+', '');
      const noteOctave = isUpper ? octave + 1 : octave;
      const fullNote = `${baseNote}${noteOctave}`;

      playNote(fullNote);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const mapped = KEYBOARD_MAP[key];
      if (!mapped) return;

      const isUpper = mapped.endsWith('+');
      const baseNote = mapped.replace('+', '');
      const noteOctave = isUpper ? octave + 1 : octave;
      const fullNote = `${baseNote}${noteOctave}`;

      stopNote(fullNote);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [octave, playNote, stopNote]);

  // Two Octaves of Keys
  const baseNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const allKeys = [
    ...baseNotes.map((n) => `${n}${octave}`),
    ...baseNotes.map((n) => `${n}${octave + 1}`),
    `C${octave + 2}`,
  ];

  return (
    <div className="w-full bg-[#0a0e17] border border-slate-800 rounded-xl p-4 sm:p-5 shadow-2xl flex flex-col gap-4">
      {/* Synth Engine Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Piano className="w-4 h-4 text-fuchsia-400" />
          <span className="font-mono font-bold tracking-wider text-slate-200 text-sm">
            POLYPHONIC SYNTH & KEYBOARD
          </span>
          <span className="text-slate-500 text-xs hidden md:inline font-mono">
            · Play with mouse or QWERTY keys (A-W-S-E-D-F...)
          </span>
        </div>

        {/* Waveform Selector & Octave */}
        <div className="flex items-center gap-3">
          {/* Waveforms */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {(['sawtooth', 'square', 'sine', 'triangle'] as WaveformType[]).map((wf) => (
              <button
                key={wf}
                onClick={() => {
                  onSynthChange({ waveform: wf });
                  audioEngine.setSynthParams({ waveform: wf });
                }}
                className={`px-2.5 py-1 text-xs font-mono capitalize rounded-md transition-all ${
                  synthParams.waveform === wf
                    ? 'bg-fuchsia-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {wf === 'sawtooth' ? 'Saw' : wf === 'square' ? 'Sqr' : wf === 'triangle' ? 'Tri' : 'Sin'}
              </button>
            ))}
          </div>

          {/* Sub-Oscillator Toggle */}
          <button
            onClick={() => {
              const next = !synthParams.subOsc;
              onSynthChange({ subOsc: next });
              audioEngine.setSynthParams({ subOsc: next });
            }}
            className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
              synthParams.subOsc
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-semibold'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            Sub 808
          </button>

          {/* Octave Shifter */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setOctave((o) => Math.max(1, o - 1))}
              disabled={octave <= 1}
              className="px-2 py-0.5 text-xs font-mono text-slate-400 hover:text-white disabled:opacity-30"
            >
              -
            </button>
            <span className="text-xs font-mono font-bold text-sky-400 px-1">
              OCT {octave}
            </span>
            <button
              onClick={() => setOctave((o) => Math.min(6, o + 1))}
              disabled={octave >= 6}
              className="px-2 py-0.5 text-xs font-mono text-slate-400 hover:text-white disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* ADSR & Filter Envelope Knobs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-[#0f1422] p-3 rounded-lg border border-slate-800/80">
        <div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>ATTACK</span>
            <span className="text-fuchsia-400">{Math.round(synthParams.attack * 1000)}ms</span>
          </div>
          <input
            type="range"
            min="0.005"
            max="0.5"
            step="0.01"
            value={synthParams.attack}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSynthChange({ attack: val });
              audioEngine.setSynthParams({ attack: val });
            }}
            className="w-full h-1.5 bg-slate-800 rounded accent-fuchsia-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>DECAY</span>
            <span className="text-fuchsia-400">{Math.round(synthParams.decay * 1000)}ms</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.5"
            step="0.05"
            value={synthParams.decay}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSynthChange({ decay: val });
              audioEngine.setSynthParams({ decay: val });
            }}
            className="w-full h-1.5 bg-slate-800 rounded accent-fuchsia-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>SUSTAIN</span>
            <span className="text-fuchsia-400">{Math.round(synthParams.sustain * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={synthParams.sustain}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSynthChange({ sustain: val });
              audioEngine.setSynthParams({ sustain: val });
            }}
            className="w-full h-1.5 bg-slate-800 rounded accent-fuchsia-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>RELEASE</span>
            <span className="text-fuchsia-400">{Math.round(synthParams.release * 1000)}ms</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="2.0"
            step="0.05"
            value={synthParams.release}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSynthChange({ release: val });
              audioEngine.setSynthParams({ release: val });
            }}
            className="w-full h-1.5 bg-slate-800 rounded accent-fuchsia-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>SYNTH CUTOFF</span>
            <span className="text-sky-400">{Math.round(synthParams.cutoff)}Hz</span>
          </div>
          <input
            type="range"
            min="200"
            max="12000"
            step="100"
            value={synthParams.cutoff}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSynthChange({ cutoff: val });
              audioEngine.setSynthParams({ cutoff: val });
            }}
            className="w-full h-1.5 bg-slate-800 rounded accent-sky-400 cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>RESONANCE</span>
            <span className="text-sky-400">{synthParams.resonance.toFixed(1)} Q</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="14"
            step="0.5"
            value={synthParams.resonance}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onSynthChange({ resonance: val });
              audioEngine.setSynthParams({ resonance: val });
            }}
            className="w-full h-1.5 bg-slate-800 rounded accent-sky-400 cursor-pointer"
          />
        </div>
      </div>

      {/* Visual Piano Keyboard */}
      <div className="relative w-full h-36 sm:h-44 bg-[#070a10] border border-slate-800 rounded-xl p-2 select-none overflow-x-auto flex justify-center">
        <div className="relative flex h-full">
          {/* White keys */}
          {allKeys
            .filter((k) => !k.includes('#'))
            .map((note) => {
              const isPressed = activeNotes.has(note);
              return (
                <div
                  key={note}
                  onMouseDown={() => playNote(note)}
                  onMouseUp={() => stopNote(note)}
                  onMouseLeave={() => stopNote(note)}
                  onTouchStart={() => playNote(note)}
                  onTouchEnd={() => stopNote(note)}
                  className={`w-9 sm:w-11 h-full rounded-b-md border border-slate-700/80 cursor-pointer transition-all flex flex-col justify-end items-center pb-2 ${
                    isPressed
                      ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/50 scale-[0.99] translate-y-0.5'
                      : 'bg-gradient-to-b from-slate-100 to-slate-300 hover:from-white hover:to-slate-200 text-slate-800 shadow-sm'
                  }`}
                >
                  <span className="font-mono text-[10px] font-bold opacity-75">
                    {note}
                  </span>
                </div>
              );
            })}

          {/* Black keys layered absolutely on top */}
          <div className="absolute top-0 left-0 right-0 flex pointer-events-none">
            {allKeys
              .filter((k) => !k.includes('#'))
              .map((whiteNote, idx) => {
                const noteLetter = whiteNote.charAt(0);
                // Check if this white note has an accidental (#) after it (C, D, F, G, A)
                const hasAccidental = ['C', 'D', 'F', 'G', 'A'].includes(noteLetter);
                const blackNoteName = `${noteLetter}#${whiteNote.slice(1)}`;
                const isBlackPressed = activeNotes.has(blackNoteName);

                return (
                  <div
                    key={`container-${whiteNote}`}
                    className="w-9 sm:w-11 relative h-24 sm:h-28 shrink-0 flex justify-end"
                  >
                    {hasAccidental && (
                      <div
                        onMouseDown={() => playNote(blackNoteName)}
                        onMouseUp={() => stopNote(blackNoteName)}
                        onMouseLeave={() => stopNote(blackNoteName)}
                        onTouchStart={() => playNote(blackNoteName)}
                        onTouchEnd={() => stopNote(blackNoteName)}
                        className={`absolute -right-3 sm:-right-3.5 top-0 w-6 sm:w-7 h-full z-20 pointer-events-auto rounded-b-md border border-black cursor-pointer transition-all flex flex-col justify-end items-center pb-1 ${
                          isBlackPressed
                            ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/50'
                            : 'bg-gradient-to-b from-slate-900 to-slate-950 hover:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-mono text-[8px] font-semibold opacity-70">
                          {blackNoteName}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
