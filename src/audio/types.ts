export type TrackId = 'kick' | 'snare' | 'hihatClosed' | 'hihatOpen' | 'bass808' | 'leadSynth';

export type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface TrackConfig {
  id: TrackId;
  name: string;
  shortName: string;
  color: string;
  activeColor: string;
  isTonal: boolean;
  defaultPitch?: string; // e.g. "C2"
}

export interface StepState {
  active: boolean;
  velocity: number; // 0.1 to 1.0 (default 0.8)
  pitch?: string; // Tonal pitch (e.g. "C2", "D#2", "G2")
}

export interface Pattern {
  id: string;
  name: string;
  steps: Record<TrackId, StepState[]>;
}

export interface MasterFXParams {
  filterType: 'lowpass' | 'highpass';
  filterCutoff: number; // 20 to 20000 Hz
  filterResonance: number; // 0 to 20
  delayTime: number; // 0.05 to 0.8s
  delayFeedback: number; // 0 to 0.85
  delayMix: number; // 0 to 1
  distortionDrive: number; // 0 to 1
  reverbDecay: number; // 0.1 to 5s
  reverbMix: number; // 0 to 1
  stutterDivision: 'none' | '1/8' | '1/16' | '1/32';
}

export interface SynthParams {
  waveform: WaveformType;
  subOsc: boolean;
  attack: number; // 0.005 to 1.0s
  decay: number; // 0.05 to 2.0s
  sustain: number; // 0 to 1.0
  release: number; // 0.05 to 3.0s
  cutoff: number; // 100 to 12000 Hz
  resonance: number; // 0 to 15
}

export interface Preset {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  swing: number;
  scale: string;
  pattern: Pattern;
  masterFX: MasterFXParams;
  synthParams: SynthParams;
}
