import React, { useEffect, useState, useCallback } from 'react';
import { audioEngine } from './audio/engine.ts';
import { PRESETS } from './audio/presets.ts';
import { MasterFXParams, Pattern, SynthParams, TrackId } from './audio/types.ts';
import { Header } from './components/Header.tsx';
import { TransportBar } from './components/TransportBar.tsx';
import { Visualizer } from './components/Visualizer.tsx';
import { StepSequencer } from './components/StepSequencer.tsx';
import { MasterFX } from './components/MasterFX.tsx';
import { VirtualKeyboard } from './components/VirtualKeyboard.tsx';
import { Sparkles, Check, HelpCircle } from 'lucide-react';

export default function App() {
  const initialPreset = PRESETS[0];

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activePresetId, setActivePresetId] = useState(initialPreset.id);
  const [pattern, setPattern] = useState<Pattern>(initialPreset.pattern);
  const [bpm, setBpm] = useState(initialPreset.bpm);
  const [swing, setSwing] = useState(initialPreset.swing);
  const [masterFX, setMasterFX] = useState<MasterFXParams>(initialPreset.masterFX);
  const [synthParams, setSynthParams] = useState<SynthParams>(initialPreset.synthParams);
  const [activeTab, setActiveTab] = useState<'sequencer' | 'keyboard' | 'fx'>('sequencer');
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state to engine on mount & preset changes
  useEffect(() => {
    audioEngine.setBpm(bpm);
    audioEngine.setSwing(swing);
    audioEngine.setPattern(pattern);
    audioEngine.setMasterFX(masterFX);
    audioEngine.setSynthParams(synthParams);

    audioEngine.onStepChange = (step) => {
      setCurrentStep(step);
    };

    audioEngine.onPlayStateChange = (playing) => {
      setIsPlaying(playing);
    };

    return () => {
      audioEngine.onStepChange = null;
      audioEngine.onPlayStateChange = null;
    };
  }, []);

  // Global spacebar listener for playback toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Preset Selector
  const handlePresetSelect = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePresetId(preset.id);
    setBpm(preset.bpm);
    setSwing(preset.swing);
    setPattern(preset.pattern);
    setMasterFX(preset.masterFX);
    setSynthParams(preset.synthParams);

    audioEngine.setBpm(preset.bpm);
    audioEngine.setSwing(preset.swing);
    audioEngine.setPattern(preset.pattern);
    audioEngine.setMasterFX(preset.masterFX);
    audioEngine.setSynthParams(preset.synthParams);

    showToast(`Loaded Style: ${preset.title}`);
  };

  // Step Toggle in Sequencer
  const handleStepToggle = (trackId: TrackId, stepIndex: number) => {
    setPattern((prev) => {
      const trackSteps = [...(prev.steps[trackId] || [])];
      const existing = trackSteps[stepIndex] || { active: false, velocity: 0.8 };
      
      const newActive = !existing.active;
      const defaultPitch = trackId === 'bass808' ? 'C2' : trackId === 'leadSynth' ? 'C4' : undefined;

      trackSteps[stepIndex] = {
        active: newActive,
        velocity: existing.velocity || 0.85,
        pitch: existing.pitch || defaultPitch,
      };

      const updatedPattern: Pattern = {
        ...prev,
        steps: {
          ...prev.steps,
          [trackId]: trackSteps,
        },
      };

      audioEngine.setPattern(updatedPattern);

      // Play audition preview if turning on
      if (newActive) {
        audioEngine.init();
        audioEngine.triggerTrackSound(trackId, 0, 0.9, trackSteps[stepIndex].pitch);
      }

      return updatedPattern;
    });
  };

  // Pitch Change on Tonal Step
  const handleStepPitchChange = (trackId: TrackId, stepIndex: number, newPitch: string) => {
    setPattern((prev) => {
      const trackSteps = [...(prev.steps[trackId] || [])];
      if (!trackSteps[stepIndex]) return prev;

      trackSteps[stepIndex] = {
        ...trackSteps[stepIndex],
        pitch: newPitch,
      };

      const updatedPattern: Pattern = {
        ...prev,
        steps: {
          ...prev.steps,
          [trackId]: trackSteps,
        },
      };

      audioEngine.setPattern(updatedPattern);
      return updatedPattern;
    });
  };

  // Algorithmic Beat Mutator
  const handleRandomize = () => {
    const bassScale = ['C2', 'D#2', 'F2', 'G2', 'A#2'];
    const leadScale = ['C4', 'D#4', 'F4', 'G4', 'A#4', 'C5', 'D#5'];

    const newSteps: Pattern['steps'] = {
      kick: Array.from({ length: 16 }, (_, i) => ({
        active: [0, 4, 8, 12].includes(i) || (Math.random() < 0.2 && [6, 10, 14].includes(i)),
        velocity: [0, 8].includes(i) ? 1.0 : 0.85,
      })),
      snare: Array.from({ length: 16 }, (_, i) => ({
        active: [4, 12].includes(i) || (Math.random() < 0.15 && i === 15),
        velocity: 0.9,
      })),
      hihatClosed: Array.from({ length: 16 }, (_, i) => ({
        active: i % 2 === 0 || Math.random() < 0.35,
        velocity: i % 4 === 2 ? 0.9 : 0.6,
      })),
      hihatOpen: Array.from({ length: 16 }, (_, i) => ({
        active: [2, 10, 14].includes(i) && Math.random() < 0.6,
        velocity: 0.8,
      })),
      bass808: Array.from({ length: 16 }, (_, i) => {
        const isHit = [0, 3, 6, 8, 11, 14].includes(i) && Math.random() < 0.75;
        return {
          active: isHit,
          velocity: 0.85,
          pitch: bassScale[Math.floor(Math.random() * bassScale.length)],
        };
      }),
      leadSynth: Array.from({ length: 16 }, (_, i) => {
        const isHit = Math.random() < 0.35;
        return {
          active: isHit,
          velocity: 0.8,
          pitch: leadScale[Math.floor(Math.random() * leadScale.length)],
        };
      }),
    };

    const newPattern: Pattern = {
      id: `mutated-${Date.now()}`,
      name: 'Algorithmic Mutation',
      steps: newSteps,
    };

    setPattern(newPattern);
    audioEngine.setPattern(newPattern);
    showToast('Beat Mutated! Fresh groove generated.');
  };

  // Clear Pattern
  const handleClear = () => {
    const emptySteps: Pattern['steps'] = {
      kick: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
      snare: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
      hihatClosed: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
      hihatOpen: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8 })),
      bass808: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8, pitch: 'C2' })),
      leadSynth: Array.from({ length: 16 }, () => ({ active: false, velocity: 0.8, pitch: 'C4' })),
    };

    const clearedPattern: Pattern = {
      id: `cleared-${Date.now()}`,
      name: 'Init Pattern',
      steps: emptySteps,
    };

    setPattern(clearedPattern);
    audioEngine.setPattern(clearedPattern);
    showToast('Grid Cleared');
  };

  // WAV Exporter
  const handleExportWav = async () => {
    try {
      setIsExporting(true);
      showToast('Rendering uncompressed master WAV file...');
      const wavBlob = await audioEngine.renderPatternToWav(2);

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `pulse8_${activePresetId}_${bpm}bpm.wav`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      showToast('WAV Downloaded! Studio quality audio ready.');
    } catch (err) {
      console.error(err);
      showToast('Export failed. Check audio context.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isPlaying={isPlaying}
        onTogglePlay={() => audioEngine.togglePlay()}
        onExportWav={handleExportWav}
        isExporting={isExporting}
      />

      {/* Main Studio Viewport (1440px desktop presence) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        {/* Visualizer & Transport Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Realtime 60fps Visualizer */}
          <div className="lg:col-span-5 flex flex-col">
            <Visualizer />
          </div>

          {/* Transport & Studio Master Bar */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <TransportBar
              isPlaying={isPlaying}
              bpm={bpm}
              swing={swing}
              activePresetId={activePresetId}
              onBpmChange={(newBpm) => {
                setBpm(newBpm);
                audioEngine.setBpm(newBpm);
              }}
              onSwingChange={(newSwing) => {
                setSwing(newSwing);
                audioEngine.setSwing(newSwing);
              }}
              onPresetSelect={handlePresetSelect}
              onRandomize={handleRandomize}
              onClear={handleClear}
              onExportWav={handleExportWav}
              isExporting={isExporting}
            />

            {/* Quick Helper / Keyboard Shortcut Strip */}
            <div className="mt-3 px-4 py-2.5 bg-[#0a0e17] border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-slate-500">HOTKEYS:</span>
                <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  Space = Play/Stop
                </span>
                <span className="font-mono bg-slate-800/80 px-2 py-0.5 rounded text-slate-300">
                  A-K = Play Synth Keys
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <span>100% Client-Side Web Audio</span>
                <span>·</span>
                <span>Zero Latency</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Studio Workspace Sections */}
        <div className="flex flex-col gap-5">
          {/* Tab 1: 16-Step Sequencer (Always accessible or active) */}
          {activeTab === 'sequencer' && (
            <StepSequencer
              pattern={pattern}
              currentStep={currentStep}
              isPlaying={isPlaying}
              onStepToggle={handleStepToggle}
              onStepPitchChange={handleStepPitchChange}
              onTrackVolumeChange={(trackId, vol) => {
                audioEngine.trackVolumes[trackId] = vol;
              }}
              onTrackMuteToggle={(trackId) => {
                // state handled inside engine
              }}
              onTrackSoloToggle={(trackId) => {
                // state handled inside engine
              }}
            />
          )}

          {/* Tab 2: Virtual Keyboard & Synth Designer */}
          {activeTab === 'keyboard' && (
            <VirtualKeyboard
              synthParams={synthParams}
              onSynthChange={(newParams) => {
                setSynthParams((prev) => ({ ...prev, ...newParams }));
              }}
            />
          )}

          {/* Tab 3: Master FX Rack */}
          {activeTab === 'fx' && (
            <MasterFX
              fxParams={masterFX}
              onFxChange={(newFx) => {
                setMasterFX((prev) => ({ ...prev, ...newFx }));
              }}
            />
          )}

          {/* Persistent Quick Performance View for Other Tabs */}
          {activeTab !== 'sequencer' && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Sequencer Mini-Monitor
                </span>
                <button
                  onClick={() => setActiveTab('sequencer')}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium"
                >
                  Switch to full step sequencer &rarr;
                </button>
              </div>
              <div
                className="gap-1 bg-[#0a0e17] p-2.5 rounded-lg border border-slate-800"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}
              >
                {Array.from({ length: 16 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 rounded-sm transition-colors ${
                      isPlaying && currentStep === i
                        ? 'bg-sky-400 shadow-sm shadow-sky-400'
                        : i % 4 === 0
                        ? 'bg-slate-700'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Status Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 border border-sky-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
