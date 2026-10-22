import React, { useState } from 'react';
import { Pattern, TrackId } from '../audio/types.ts';
import { TRACK_LIST, NOTE_NAMES } from '../audio/notes.ts';
import { audioEngine } from '../audio/engine.ts';
import { VolumeX, Volume2, Music, Check, ChevronDown } from 'lucide-react';

interface StepSequencerProps {
  pattern: Pattern;
  currentStep: number;
  isPlaying: boolean;
  onStepToggle: (trackId: TrackId, stepIndex: number) => void;
  onStepPitchChange: (trackId: TrackId, stepIndex: number, newPitch: string) => void;
  onTrackVolumeChange: (trackId: TrackId, volume: number) => void;
  onTrackMuteToggle: (trackId: TrackId) => void;
  onTrackSoloToggle: (trackId: TrackId) => void;
}

export const StepSequencer: React.FC<StepSequencerProps> = ({
  pattern,
  currentStep,
  isPlaying,
  onStepToggle,
  onStepPitchChange,
  onTrackVolumeChange,
  onTrackMuteToggle,
  onTrackSoloToggle,
}) => {
  const [activePitchPicker, setActivePitchPicker] = useState<{
    trackId: TrackId;
    stepIndex: number;
    currentPitch: string;
  } | null>(null);

  const [trackVols, setTrackVols] = useState<Record<TrackId, number>>(audioEngine.trackVolumes);
  const [trackMutes, setTrackMutes] = useState<Record<TrackId, boolean>>(audioEngine.trackMute);
  const [trackSolos, setTrackSolos] = useState<Record<TrackId, boolean>>(audioEngine.trackSolo);

  const handleAudition = (trackId: TrackId) => {
    audioEngine.init();
    audioEngine.triggerTrackSound(trackId, 0, 0.9, trackId === 'bass808' ? 'C2' : 'C4');
  };

  const handleMute = (trackId: TrackId) => {
    const next = !trackMutes[trackId];
    audioEngine.trackMute[trackId] = next;
    setTrackMutes({ ...trackMutes, [trackId]: next });
    onTrackMuteToggle(trackId);
  };

  const handleSolo = (trackId: TrackId) => {
    const next = !trackSolos[trackId];
    audioEngine.trackSolo[trackId] = next;
    setTrackSolos({ ...trackSolos, [trackId]: next });
    onTrackSoloToggle(trackId);
  };

  const handleVolume = (trackId: TrackId, val: number) => {
    audioEngine.trackVolumes[trackId] = val;
    setTrackVols({ ...trackVols, [trackId]: val });
    onTrackVolumeChange(trackId, val);
  };

  // Quick Pitch Options for Tonal Tracks
  const bassNotes = ['C1', 'D1', 'D#1', 'F1', 'G1', 'A1', 'A#1', 'C2', 'D2', 'F2'];
  const synthNotes = ['C4', 'D4', 'D#4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'];

  return (
    <div className="w-full bg-[#0a0e17] border border-slate-800 rounded-xl p-3 sm:p-5 shadow-2xl flex flex-col gap-4">
      {/* Sequencer Header & Step Numbers Indicator */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold tracking-wider text-slate-200 text-sm">
            16-STEP MATRIX
          </span>
          <span className="text-slate-500 text-xs hidden sm:inline">
            · Click to toggle note · Right-click/Shift-click tonal notes for pitch
          </span>
        </div>

        {/* 16 Step Beat Markers Header */}
        <div className="hidden lg:flex items-center gap-1.5 pl-60 pr-2">
          {Array.from({ length: 16 }).map((_, i) => {
            const isDownbeat = i % 4 === 0;
            const isCurrent = isPlaying && currentStep === i;
            return (
              <div
                key={i}
                className={`w-9 text-center font-mono text-[11px] font-semibold transition-colors ${
                  isCurrent
                    ? 'text-sky-400 font-bold scale-110'
                    : isDownbeat
                    ? 'text-slate-400'
                    : 'text-slate-600'
                }`}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid of 6 Tracks */}
      <div className="flex flex-col gap-2.5 overflow-x-auto pb-2">
        {TRACK_LIST.map((track) => {
          const isMuted = trackMutes[track.id];
          const isSolo = trackSolos[track.id];
          const trackSteps = pattern.steps[track.id] || [];

          return (
            <div
              key={track.id}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all border ${
                isMuted
                  ? 'bg-slate-950/40 border-slate-900 opacity-60'
                  : 'bg-[#0f1422]/90 border-slate-800/80 hover:border-slate-700/80'
              }`}
            >
              {/* Track Info & Controls (Left Zone) */}
              <div className="w-52 sm:w-60 shrink-0 flex items-center justify-between gap-2 pr-2 border-r border-slate-800/60">
                <button
                  onClick={() => handleAudition(track.id)}
                  title="Click to preview voice"
                  className="flex items-center gap-2 text-left group cursor-pointer"
                >
                  <div
                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[10px] font-bold text-white shadow-sm bg-gradient-to-br ${track.color} group-hover:scale-105 transition-transform`}
                  >
                    {track.shortName}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">
                      {track.name}
                    </div>
                    {track.isTonal && (
                      <span className="text-[10px] text-purple-400 font-mono">Tonal</span>
                    )}
                  </div>
                </button>

                {/* Track Mute, Solo, and Vol Slider */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleMute(track.id)}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    className={`w-6 h-6 rounded text-[10px] font-mono font-bold transition-colors ${
                      isMuted
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => handleSolo(track.id)}
                    title={isSolo ? 'Unsolo' : 'Solo'}
                    className={`w-6 h-6 rounded text-[10px] font-mono font-bold transition-colors ${
                      isSolo
                        ? 'bg-amber-500 text-black shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    S
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={trackVols[track.id] ?? 0.8}
                    onChange={(e) => handleVolume(track.id, parseFloat(e.target.value))}
                    className="w-14 h-1 accent-sky-400 bg-slate-800 rounded cursor-pointer"
                    title={`Track Volume: ${Math.round((trackVols[track.id] ?? 0.8) * 100)}%`}
                  />
                </div>
              </div>

              {/* 16 Step Buttons (Right Zone) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {Array.from({ length: 16 }).map((_, stepIdx) => {
                  const step = trackSteps[stepIdx] || { active: false, velocity: 0.8 };
                  const isCurrent = isPlaying && currentStep === stepIdx;
                  const isBeatStart = stepIdx % 4 === 0;

                  return (
                    <div key={stepIdx} className="relative">
                      <button
                        onClick={() => onStepToggle(track.id, stepIdx)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (track.isTonal) {
                            setActivePitchPicker({
                              trackId: track.id,
                              stepIndex: stepIdx,
                              currentPitch: step.pitch || (track.id === 'bass808' ? 'C2' : 'C4'),
                            });
                          }
                        }}
                        title={`Step ${stepIdx + 1}${
                          step.active
                            ? ` (ON${step.pitch ? ` · ${step.pitch}` : ''})`
                            : ' (OFF)'
                        }`}
                        className={`w-9 h-11 sm:h-12 rounded-md font-mono text-[10px] flex flex-col items-center justify-between p-1 transition-all border ${
                          step.active
                            ? `${track.activeColor} border-white/20 font-bold shadow-md`
                            : isBeatStart
                            ? 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-500'
                            : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800/80 text-slate-600'
                        } ${isCurrent ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-[#080c14] scale-105 z-10' : ''}`}
                      >
                        {/* Step indicator dot */}
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            step.active
                              ? 'bg-white'
                              : isCurrent
                              ? 'bg-sky-400 animate-ping'
                              : 'bg-transparent'
                          }`}
                        />

                        {/* Note Pitch (if tonal and active) */}
                        {track.isTonal && step.active && (
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePitchPicker({
                                trackId: track.id,
                                stepIndex: stepIdx,
                                currentPitch: step.pitch || (track.id === 'bass808' ? 'C2' : 'C4'),
                              });
                            }}
                            className="text-[9px] px-1 py-0.2 bg-black/40 rounded hover:bg-black/80 text-white font-mono cursor-pointer"
                          >
                            {step.pitch || (track.id === 'bass808' ? 'C2' : 'C4')}
                          </span>
                        )}

                        {/* Step number on downbeat */}
                        <span className="text-[8px] opacity-40">
                          {isBeatStart ? `${Math.floor(stepIdx / 4) + 1}` : ''}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Pitch Picker Modal for Tonal Step */}
      {activePitchPicker && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 rounded-xl max-w-sm w-full p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-slate-200">
                  Select Note Pitch (Step {activePitchPicker.stepIndex + 1})
                </span>
              </div>
              <button
                onClick={() => setActivePitchPicker(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2 pt-4">
              {(activePitchPicker.trackId === 'bass808' ? bassNotes : synthNotes).map((note) => {
                const isSelected = activePitchPicker.currentPitch === note;
                return (
                  <button
                    key={note}
                    onClick={() => {
                      onStepPitchChange(
                        activePitchPicker.trackId,
                        activePitchPicker.stepIndex,
                        note
                      );
                      audioEngine.init();
                      audioEngine.triggerTrackSound(
                        activePitchPicker.trackId,
                        0,
                        0.9,
                        note
                      );
                      setActivePitchPicker(null);
                    }}
                    className={`py-2 px-3 rounded-lg font-mono text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {note}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
