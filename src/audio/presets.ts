import { Preset, StepState, TrackId } from './types.ts';

function createEmptySteps(): StepState[] {
  return Array.from({ length: 16 }, () => ({
    active: false,
    velocity: 0.8,
  }));
}

function stepsFromIndices(indices: number[], velocities?: number[], pitches?: string[], defaultPitch?: string): StepState[] {
  const steps = createEmptySteps();
  indices.forEach((idx, i) => {
    if (idx >= 0 && idx < 16) {
      steps[idx] = {
        active: true,
        velocity: velocities && velocities[i] !== undefined ? velocities[i] : 0.85,
        pitch: pitches && pitches[i] !== undefined ? pitches[i] : defaultPitch,
      };
    }
  });
  return steps;
}

export const PRESETS: Preset[] = [
  {
    id: 'cyberpunk',
    title: 'Cyberpunk 2077',
    genre: 'Darksynth / Electro',
    bpm: 130,
    swing: 0,
    scale: 'minor',
    masterFX: {
      filterType: 'lowpass',
      filterCutoff: 14000,
      filterResonance: 3.5,
      delayTime: 0.23,
      delayFeedback: 0.35,
      delayMix: 0.25,
      distortionDrive: 0.4,
      reverbDecay: 1.8,
      reverbMix: 0.28,
      stutterDivision: 'none',
    },
    synthParams: {
      waveform: 'sawtooth',
      subOsc: true,
      attack: 0.01,
      decay: 0.35,
      sustain: 0.4,
      release: 0.4,
      cutoff: 4200,
      resonance: 5.5,
    },
    pattern: {
      id: 'pattern-cyberpunk',
      name: 'Night City Overdrive',
      steps: {
        kick: stepsFromIndices([0, 4, 8, 12], [1.0, 0.9, 1.0, 0.95]),
        snare: stepsFromIndices([4, 12], [0.95, 1.0]),
        hihatClosed: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14], [0.6, 0.8, 0.6, 0.9, 0.6, 0.8, 0.6, 0.9]),
        hihatOpen: stepsFromIndices([2, 10, 14], [0.7, 0.75, 0.8]),
        bass808: stepsFromIndices(
          [0, 2, 3, 6, 8, 10, 11, 14],
          [0.9, 0.85, 0.9, 0.85, 0.9, 0.85, 0.9, 0.85],
          ['D1', 'D1', 'F1', 'D1', 'C1', 'C1', 'D1', 'G1']
        ),
        leadSynth: stepsFromIndices(
          [0, 3, 6, 8, 11, 14],
          [0.85, 0.8, 0.85, 0.9, 0.8, 0.85],
          ['D4', 'F4', 'A4', 'D5', 'C5', 'A4']
        ),
      },
    },
  },
  {
    id: 'house',
    title: 'Neo French House',
    genre: 'Groove / Disco',
    bpm: 124,
    swing: 15,
    scale: 'dorian',
    masterFX: {
      filterType: 'lowpass',
      filterCutoff: 16000,
      filterResonance: 2.0,
      delayTime: 0.24,
      delayFeedback: 0.25,
      delayMix: 0.2,
      distortionDrive: 0.2,
      reverbDecay: 1.4,
      reverbMix: 0.25,
      stutterDivision: 'none',
    },
    synthParams: {
      waveform: 'square',
      subOsc: false,
      attack: 0.02,
      decay: 0.4,
      sustain: 0.5,
      release: 0.3,
      cutoff: 5500,
      resonance: 4.0,
    },
    pattern: {
      id: 'pattern-house',
      name: 'Starlight Disco',
      steps: {
        kick: stepsFromIndices([0, 4, 8, 12], [1.0, 1.0, 1.0, 1.0]),
        snare: stepsFromIndices([4, 12], [0.95, 1.0]),
        hihatClosed: stepsFromIndices([0, 4, 8, 12], [0.5, 0.5, 0.5, 0.5]),
        hihatOpen: stepsFromIndices([2, 6, 10, 14], [0.9, 0.9, 0.95, 0.9]),
        bass808: stepsFromIndices(
          [0, 3, 6, 8, 10, 13, 14],
          [0.9, 0.8, 0.85, 0.9, 0.8, 0.85, 0.85],
          ['A1', 'A1', 'C2', 'D2', 'D2', 'C2', 'G1']
        ),
        leadSynth: stepsFromIndices(
          [2, 6, 10, 14],
          [0.85, 0.85, 0.9, 0.9],
          ['C4', 'E4', 'G4', 'B4']
        ),
      },
    },
  },
  {
    id: 'lofi',
    title: 'Midnight Lo-Fi',
    genre: 'Chillhop / Boom-Bap',
    bpm: 85,
    swing: 32,
    scale: 'minorPentatonic',
    masterFX: {
      filterType: 'lowpass',
      filterCutoff: 6500,
      filterResonance: 1.8,
      delayTime: 0.35,
      delayFeedback: 0.4,
      delayMix: 0.3,
      distortionDrive: 0.25,
      reverbDecay: 2.8,
      reverbMix: 0.38,
      stutterDivision: 'none',
    },
    synthParams: {
      waveform: 'triangle',
      subOsc: true,
      attack: 0.05,
      decay: 0.6,
      sustain: 0.6,
      release: 0.8,
      cutoff: 2800,
      resonance: 2.2,
    },
    pattern: {
      id: 'pattern-lofi',
      name: 'Rainy Tokyo Tape',
      steps: {
        kick: stepsFromIndices([0, 6, 10], [0.9, 0.85, 0.8]),
        snare: stepsFromIndices([4, 12], [0.9, 0.88]),
        hihatClosed: stepsFromIndices([0, 2, 4, 6, 8, 10, 12, 14], [0.7, 0.5, 0.7, 0.6, 0.7, 0.5, 0.7, 0.6]),
        hihatOpen: stepsFromIndices([14], [0.65]),
        bass808: stepsFromIndices(
          [0, 6, 10, 13],
          [0.85, 0.8, 0.85, 0.75],
          ['F1', 'C2', 'D#2', 'D1']
        ),
        leadSynth: stepsFromIndices(
          [0, 4, 8, 12],
          [0.75, 0.8, 0.85, 0.8],
          ['F3', 'G#3', 'C4', 'D#4']
        ),
      },
    },
  },
  {
    id: 'acid',
    title: 'Acid 303 Core',
    genre: 'Acid Techno / Underground',
    bpm: 138,
    swing: 0,
    scale: 'cyberpunk',
    masterFX: {
      filterType: 'lowpass',
      filterCutoff: 11000,
      filterResonance: 7.0,
      delayTime: 0.18,
      delayFeedback: 0.45,
      delayMix: 0.3,
      distortionDrive: 0.65,
      reverbDecay: 1.6,
      reverbMix: 0.22,
      stutterDivision: 'none',
    },
    synthParams: {
      waveform: 'sawtooth',
      subOsc: true,
      attack: 0.005,
      decay: 0.22,
      sustain: 0.3,
      release: 0.15,
      cutoff: 3500,
      resonance: 10.0,
    },
    pattern: {
      id: 'pattern-acid',
      name: 'Resonant Sequence',
      steps: {
        kick: stepsFromIndices([0, 4, 8, 12], [1.0, 1.0, 1.0, 1.0]),
        snare: stepsFromIndices([4, 12], [0.9, 0.95]),
        hihatClosed: stepsFromIndices([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], [0.6, 0.4, 0.7, 0.4, 0.6, 0.4, 0.8, 0.4, 0.6, 0.4, 0.7, 0.4, 0.6, 0.4, 0.9, 0.5]),
        hihatOpen: stepsFromIndices([6, 14], [0.85, 0.9]),
        bass808: stepsFromIndices(
          [0, 1, 3, 4, 6, 7, 9, 10, 12, 13, 15],
          [0.9, 0.7, 0.85, 0.9, 0.7, 0.8, 0.85, 0.7, 0.9, 0.75, 0.85],
          ['A1', 'A1', 'C2', 'D2', 'F2', 'E2', 'D2', 'C2', 'A1', 'C2', 'G1']
        ),
        leadSynth: stepsFromIndices(
          [1, 5, 9, 13, 15],
          [0.85, 0.9, 0.85, 0.9, 0.8],
          ['E4', 'G4', 'A4', 'C5', 'B4']
        ),
      },
    },
  },
];
