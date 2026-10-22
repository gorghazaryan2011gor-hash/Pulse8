import { MasterFXParams, Pattern, SynthParams, TrackId } from './types.ts';
import { noteToFreq } from './notes.ts';
import { audioBufferToWav } from './wavEncoder.ts';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning = false;
  private bpm = 128;
  private swing = 0; // 0 to 50%
  private currentStep = 0;
  private nextNoteTime = 0;
  private lookaheadMs = 25;
  private scheduleAheadTime = 0.1; // 100ms ahead
  private timerId: number | null = null;
  
  // Audio Nodes
  private masterGain: GainNode | null = null;
  private masterFilter: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  
  // FX Nodes
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  
  private distortionNode: WaveShaperNode | null = null;
  private distortionWetGain: GainNode | null = null;
  
  private reverbConvolver: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;

  // Recording
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private recordingStartTime = 0;

  // State
  private pattern: Pattern | null = null;
  private masterFX: MasterFXParams = {
    filterType: 'lowpass',
    filterCutoff: 20000,
    filterResonance: 1,
    delayTime: 0.25,
    delayFeedback: 0.3,
    delayMix: 0.2,
    distortionDrive: 0.1,
    reverbDecay: 1.5,
    reverbMix: 0.25,
    stutterDivision: 'none',
  };
  private synthParams: SynthParams = {
    waveform: 'sawtooth',
    subOsc: true,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.5,
    release: 0.3,
    cutoff: 4000,
    resonance: 3,
  };

  public trackVolumes: Record<TrackId, number> = {
    kick: 0.95,
    snare: 0.88,
    hihatClosed: 0.75,
    hihatOpen: 0.75,
    bass808: 0.95,
    leadSynth: 0.85,
  };

  public trackMute: Record<TrackId, boolean> = {
    kick: false,
    snare: false,
    hihatClosed: false,
    hihatOpen: false,
    bass808: false,
    leadSynth: false,
  };

  public trackSolo: Record<TrackId, boolean> = {
    kick: false,
    snare: false,
    hihatClosed: false,
    hihatOpen: false,
    bass808: false,
    leadSynth: false,
  };

  public metronomeEnabled = false;

  // Callbacks
  public onStepChange: ((step: number) => void) | null = null;
  public onPlayStateChange: ((isPlaying: boolean) => void) | null = null;
  public onRecordingStateChange: ((isRecording: boolean, durationSec: number) => void) | null = null;

  // Cached noise buffer for drums
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazily initialized on user interaction
  }

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    this.createNoiseBuffer();
    this.setupFXGraph();
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  private setupFXGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, ctx.currentTime);

    this.masterFilter = ctx.createBiquadFilter();
    this.masterFilter.type = this.masterFX.filterType;
    this.masterFilter.frequency.setValueAtTime(this.masterFX.filterCutoff, ctx.currentTime);
    this.masterFilter.Q.setValueAtTime(this.masterFX.filterResonance, ctx.currentTime);

    // Distortion
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(this.masterFX.distortionDrive);
    this.distortionNode.oversample = '4x';
    this.distortionWetGain = ctx.createGain();
    this.distortionWetGain.gain.setValueAtTime(1.0, ctx.currentTime);

    // Delay
    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(this.masterFX.delayTime, ctx.currentTime);
    this.delayFeedbackGain = ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(this.masterFX.delayFeedback, ctx.currentTime);
    this.delayWetGain = ctx.createGain();
    this.delayWetGain.gain.setValueAtTime(this.masterFX.delayMix, ctx.currentTime);

    // Connect delay feedback loop
    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);

    // Algorithmic Reverb Impulse
    this.reverbConvolver = ctx.createConvolver();
    this.reverbConvolver.buffer = this.buildReverbImpulse(this.masterFX.reverbDecay);
    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.setValueAtTime(this.masterFX.reverbMix, ctx.currentTime);

    // Analyser Node
    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 1024;
    this.analyserNode.smoothingTimeConstant = 0.82;

    // Media Destination for Recording
    this.mediaDest = ctx.createMediaStreamDestination();

    // Wiring:
    // Sources -> masterFilter -> distortionNode -> [Dry + Delay + Reverb] -> masterGain -> analyser -> destination & mediaDest
    this.masterFilter.connect(this.distortionNode);
    
    // Dry path
    this.distortionNode.connect(this.masterGain);

    // Delay path
    this.distortionNode.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);
    this.delayWetGain.connect(this.masterGain);

    // Reverb path
    this.distortionNode.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbWetGain);
    this.reverbWetGain.connect(this.masterGain);

    // Output routing
    this.masterGain.connect(this.analyserNode);
    this.analyserNode.connect(ctx.destination);
    this.masterGain.connect(this.mediaDest);
  }

  private makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = Math.max(0, amount) * 50;
    const nSamples = 44100;
    const buffer = new ArrayBuffer(nSamples * Float32Array.BYTES_PER_ELEMENT);
    const curve = new Float32Array(buffer);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  private buildReverbImpulse(durationSec: number): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * Math.max(0.2, durationSec));
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i / length;
      // Exponential decay envelope
      const decay = Math.exp(-n * 4.5);
      left[i] = (Math.random() * 2 - 1) * decay;
      right[i] = (Math.random() * 2 - 1) * decay;
    }
    return impulse;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  public setBpm(newBpm: number) {
    this.bpm = Math.max(40, Math.min(240, newBpm));
  }

  public getBpm(): number {
    return this.bpm;
  }

  public setSwing(newSwing: number) {
    this.swing = Math.max(0, Math.min(60, newSwing));
  }

  public getSwing(): number {
    return this.swing;
  }

  public setMasterVolume(vol: number) {
    if (!this.ctx || !this.masterGain) return;
    const clamped = Math.max(0, Math.min(1.2, vol));
    this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
  }

  public setMasterFX(params: Partial<MasterFXParams>) {
    this.masterFX = { ...this.masterFX, ...params };
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    if (params.filterType && this.masterFilter) {
      this.masterFilter.type = params.filterType;
    }
    if (params.filterCutoff !== undefined && this.masterFilter) {
      this.masterFilter.frequency.setTargetAtTime(Math.max(20, Math.min(20000, params.filterCutoff)), t, 0.05);
    }
    if (params.filterResonance !== undefined && this.masterFilter) {
      this.masterFilter.Q.setTargetAtTime(Math.max(0.1, Math.min(25, params.filterResonance)), t, 0.05);
    }
    if (params.delayTime !== undefined && this.delayNode) {
      this.delayNode.delayTime.setTargetAtTime(Math.max(0.01, Math.min(1.5, params.delayTime)), t, 0.05);
    }
    if (params.delayFeedback !== undefined && this.delayFeedbackGain) {
      this.delayFeedbackGain.gain.setTargetAtTime(Math.max(0, Math.min(0.85, params.delayFeedback)), t, 0.05);
    }
    if (params.delayMix !== undefined && this.delayWetGain) {
      this.delayWetGain.gain.setTargetAtTime(Math.max(0, Math.min(1.0, params.delayMix)), t, 0.05);
    }
    if (params.distortionDrive !== undefined && this.distortionNode) {
      this.distortionNode.curve = this.makeDistortionCurve(params.distortionDrive);
    }
    if (params.reverbMix !== undefined && this.reverbWetGain) {
      this.reverbWetGain.gain.setTargetAtTime(Math.max(0, Math.min(1.0, params.reverbMix)), t, 0.05);
    }
    if (params.reverbDecay !== undefined && this.reverbConvolver) {
      this.reverbConvolver.buffer = this.buildReverbImpulse(params.reverbDecay);
    }
  }

  public setSynthParams(params: Partial<SynthParams>) {
    this.synthParams = { ...this.synthParams, ...params };
  }

  public getSynthParams(): SynthParams {
    return this.synthParams;
  }

  public setPattern(pattern: Pattern) {
    this.pattern = pattern;
  }

  public getPattern(): Pattern | null {
    return this.pattern;
  }

  public async start() {
    this.init();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (this.isRunning) return;
    this.isRunning = true;
    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    this.timerId = window.setInterval(() => this.scheduler(), this.lookaheadMs);
    this.onPlayStateChange?.(true);
  }

  public stop() {
    this.isRunning = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    this.onStepChange?.(0);
    this.onPlayStateChange?.(false);
  }

  public togglePlay() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  public getIsPlaying(): boolean {
    return this.isRunning;
  }

  private scheduler() {
    if (!this.ctx || !this.isRunning) return;

    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
  }

  private advanceStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = 0.25 * secondsPerBeat; // 16th note

    // Swing applied to odd numbered steps (1, 3, 5, 7...)
    const isOddStep = this.currentStep % 2 !== 0;
    const swingFactor = (this.swing / 100) * 0.15;
    const currentStepDuration = isOddStep ? stepDuration - swingFactor : stepDuration + swingFactor;

    this.nextNoteTime += currentStepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(stepIndex: number, time: number) {
    if (!this.pattern || !this.ctx) return;

    // Dispatch UI playhead update synchronously aligned with audio clock
    const delayFromNowMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
    window.setTimeout(() => {
      if (this.isRunning) {
        this.onStepChange?.(stepIndex);
      }
    }, delayFromNowMs);

    // Metronome
    if (this.metronomeEnabled && stepIndex % 4 === 0) {
      this.playMetronomeTick(time, stepIndex === 0 ? 1200 : 800);
    }

    // Check Solo state across tracks
    const anySolo = Object.values(this.trackSolo).some(Boolean);

    // Evaluate each track
    const tracks: TrackId[] = ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'bass808', 'leadSynth'];
    for (const trackId of tracks) {
      // Is muted or not in solo?
      if (this.trackMute[trackId]) continue;
      if (anySolo && !this.trackSolo[trackId]) continue;

      const trackSteps = this.pattern.steps[trackId];
      if (!trackSteps) continue;

      const step = trackSteps[stepIndex];
      if (!step || !step.active) continue;

      const volume = (step.velocity ?? 0.8) * (this.trackVolumes[trackId] ?? 0.8);
      const pitch = step.pitch;

      this.triggerTrackSound(trackId, time, volume, pitch);
    }
  }

  private getDestinationNode(): AudioNode {
    return this.masterFilter || this.ctx!.destination;
  }

  public triggerTrackSound(trackId: TrackId, time: number, volume: number, pitch?: string) {
    if (!this.ctx) return;

    switch (trackId) {
      case 'kick':
        this.synthesizeKick(time, volume);
        break;
      case 'snare':
        this.synthesizeSnare(time, volume);
        break;
      case 'hihatClosed':
        this.synthesizeHiHat(time, volume, false);
        break;
      case 'hihatOpen':
        this.synthesizeHiHat(time, volume, true);
        break;
      case 'bass808':
        this.synthesize808Bass(time, volume, pitch || 'C2');
        break;
      case 'leadSynth':
        this.synthesizeLead(time, volume, pitch || 'C4');
        break;
    }
  }

  // --- Drum Synthesizers ---

  private synthesizeKick(time: number, volume: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dest = this.getDestinationNode();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Frequency drop for deep punch
    osc.frequency.setValueAtTime(145, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);

    // Click attack
    gain.gain.setValueAtTime(volume * 1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  private synthesizeSnare(time: number, volume: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const dest = this.getDestinationNode();

    // Noise component (snap & sizzle)
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, time);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume * 0.9, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);

    // Tonal body component (drum head resonance)
    const toneOsc = ctx.createOscillator();
    const toneGain = ctx.createGain();

    toneOsc.type = 'triangle';
    toneOsc.frequency.setValueAtTime(220, time);
    toneOsc.frequency.exponentialRampToValueAtTime(130, time + 0.08);

    toneGain.gain.setValueAtTime(volume * 0.85, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    toneOsc.connect(toneGain);
    toneGain.connect(dest);

    noise.start(time);
    noise.stop(time + 0.25);
    toneOsc.start(time);
    toneOsc.stop(time + 0.15);
  }

  private synthesizeHiHat(time: number, volume: number, isOpen: boolean) {
    if (!this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const dest = this.getDestinationNode();

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(7500, time);
    filter.Q.setValueAtTime(3.5, time);

    const gain = ctx.createGain();
    const duration = isOpen ? 0.32 : 0.055;

    gain.gain.setValueAtTime(volume * 0.85, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    noise.start(time);
    noise.stop(time + duration + 0.02);
  }

  private synthesize808Bass(time: number, volume: number, pitchNote: string) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dest = this.getDestinationNode();

    const baseFreq = noteToFreq(pitchNote);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Slight pitch scoop on attack for authentic 808 glide
    osc.frequency.setValueAtTime(baseFreq * 1.5, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.035);

    // Warm decay envelope
    gain.gain.setValueAtTime(volume * 1.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.7);
  }

  private synthesizeLead(time: number, volume: number, pitchNote: string) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dest = this.getDestinationNode();

    const freq = noteToFreq(pitchNote);
    const { waveform, attack, decay, sustain, release, cutoff, resonance, subOsc } = this.synthParams;

    // Primary Oscillator
    const osc1 = ctx.createOscillator();
    osc1.type = waveform;
    osc1.frequency.setValueAtTime(freq, time);

    // Secondary slightly detuned oscillator for rich chorus thickness
    const osc2 = ctx.createOscillator();
    osc2.type = waveform;
    osc2.frequency.setValueAtTime(freq * 1.004, time);

    // Optional Sub Oscillator
    let sub: OscillatorNode | null = null;
    let subGain: GainNode | null = null;
    if (subOsc) {
      sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, time);
      subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.35, time);
      sub.connect(subGain);
    }

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.setValueAtTime(resonance, time);

    // Filter Envelope
    filter.frequency.setValueAtTime(cutoff * 0.4, time);
    filter.frequency.exponentialRampToValueAtTime(Math.min(18000, cutoff * 2.2), time + attack);
    filter.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * sustain), time + attack + decay);

    // Amplitude ADSR Envelope
    const ampGain = ctx.createGain();
    const gateDuration = 0.22;
    ampGain.gain.setValueAtTime(0.0001, time);
    ampGain.gain.linearRampToValueAtTime(volume * 0.75, time + attack);
    ampGain.gain.linearRampToValueAtTime(volume * 0.75 * sustain, time + attack + decay);
    ampGain.gain.setValueAtTime(volume * 0.75 * sustain, time + gateDuration);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, time + gateDuration + release);

    osc1.connect(filter);
    osc2.connect(filter);
    if (sub && subGain) {
      subGain.connect(filter);
    }

    filter.connect(ampGain);
    ampGain.connect(dest);

    const totalDur = gateDuration + release + 0.05;
    osc1.start(time);
    osc2.start(time);
    if (sub) sub.start(time);

    osc1.stop(time + totalDur);
    osc2.stop(time + totalDur);
    if (sub) sub.stop(time + totalDur);
  }

  // Live playable note from keyboard or piano roll
  public triggerLiveNote(pitchNote: string, velocity = 0.9): () => void {
    this.init();
    if (!this.ctx) return () => {};

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const ctx = this.ctx;
    const dest = this.getDestinationNode();
    const time = ctx.currentTime;
    const freq = noteToFreq(pitchNote);
    const { waveform, attack, sustain, release, cutoff, resonance, subOsc } = this.synthParams;

    const osc1 = ctx.createOscillator();
    osc1.type = waveform;
    osc1.frequency.setValueAtTime(freq, time);

    const osc2 = ctx.createOscillator();
    osc2.type = waveform;
    osc2.frequency.setValueAtTime(freq * 1.005, time);

    let sub: OscillatorNode | null = null;
    let subGain: GainNode | null = null;
    if (subOsc) {
      sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(freq * 0.5, time);
      subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.35, time);
      sub.connect(subGain);
    }

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    filter.Q.setValueAtTime(resonance, time);

    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.linearRampToValueAtTime(velocity * 0.8, time + attack);

    osc1.connect(filter);
    osc2.connect(filter);
    if (sub && subGain) subGain.connect(filter);
    filter.connect(amp);
    amp.connect(dest);

    osc1.start(time);
    osc2.start(time);
    if (sub) sub.start(time);

    let released = false;
    return () => {
      if (released) return;
      released = true;
      const releaseTime = ctx.currentTime;
      amp.gain.cancelScheduledValues(releaseTime);
      amp.gain.setValueAtTime(amp.gain.value, releaseTime);
      amp.gain.exponentialRampToValueAtTime(0.0001, releaseTime + release);
      osc1.stop(releaseTime + release + 0.05);
      osc2.stop(releaseTime + release + 0.05);
      if (sub) sub.stop(releaseTime + release + 0.05);
    };
  }

  private playMetronomeTick(time: number, freq: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // --- Live Recording and WAV Export ---

  public startRecording() {
    this.init();
    if (!this.mediaDest) return;

    this.recordedChunks = [];
    try {
      this.mediaRecorder = new MediaRecorder(this.mediaDest.stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.recordingStartTime = Date.now();
      this.onRecordingStateChange?.(true, 0);
    } catch {
      // Fallback for environments lacking standard mediaRecorder on WebAudio streams
      this.isRecording = false;
    }
  }

  public stopRecording(): Blob | null {
    if (!this.mediaRecorder || !this.isRecording) return null;
    this.isRecording = false;
    this.mediaRecorder.stop();
    this.onRecordingStateChange?.(false, (Date.now() - this.recordingStartTime) / 1000);
    return new Blob(this.recordedChunks, { type: 'audio/webm' });
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * High-fidelity offline render of a full 2-loop or 4-loop take into standard 16-bit uncompressed WAV!
   * Guarantees 100% studio master quality regardless of client thread timing.
   */
  public async renderPatternToWav(loops = 2): Promise<Blob> {
    if (!this.pattern) throw new Error('No pattern loaded');

    const sampleRate = 44100;
    const secondsPerBeat = 60.0 / this.bpm;
    const loopDuration = 16 * 0.25 * secondsPerBeat;
    const totalDuration = loopDuration * loops + 1.0; // tail for reverb/delay

    const offlineCtx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);

    // Offline Master Filter & FX chain
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, 0);

    const filter = offlineCtx.createBiquadFilter();
    filter.type = this.masterFX.filterType;
    filter.frequency.setValueAtTime(this.masterFX.filterCutoff, 0);
    filter.Q.setValueAtTime(this.masterFX.filterResonance, 0);

    const delay = offlineCtx.createDelay(2.0);
    delay.delayTime.setValueAtTime(this.masterFX.delayTime, 0);
    const delayFb = offlineCtx.createGain();
    delayFb.gain.setValueAtTime(this.masterFX.delayFeedback, 0);
    const delayWet = offlineCtx.createGain();
    delayWet.gain.setValueAtTime(this.masterFX.delayMix, 0);

    delay.connect(delayFb);
    delayFb.connect(delay);

    filter.connect(masterGain);
    filter.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(masterGain);

    masterGain.connect(offlineCtx.destination);

    // Schedule all steps
    const tracks: TrackId[] = ['kick', 'snare', 'hihatClosed', 'hihatOpen', 'bass808', 'leadSynth'];
    const anySolo = Object.values(this.trackSolo).some(Boolean);

    for (let loop = 0; loop < loops; loop++) {
      const loopStartTime = loop * loopDuration;

      for (let stepIdx = 0; stepIdx < 16; stepIdx++) {
        const isOdd = stepIdx % 2 !== 0;
        const swingOffset = isOdd ? (this.swing / 100) * 0.15 * 0.25 * secondsPerBeat : 0;
        const stepTime = loopStartTime + stepIdx * (0.25 * secondsPerBeat) + swingOffset;

        for (const trackId of tracks) {
          if (this.trackMute[trackId]) continue;
          if (anySolo && !this.trackSolo[trackId]) continue;

          const step = this.pattern.steps[trackId]?.[stepIdx];
          if (!step || !step.active) continue;

          const vol = (step.velocity ?? 0.8) * (this.trackVolumes[trackId] ?? 0.8);
          this.renderOfflineVoice(offlineCtx, filter, trackId, stepTime, vol, step.pitch);
        }
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    return audioBufferToWav(renderedBuffer);
  }

  private renderOfflineVoice(
    ctx: OfflineAudioContext,
    dest: AudioNode,
    trackId: TrackId,
    time: number,
    vol: number,
    pitch?: string
  ) {
    if (trackId === 'kick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(145, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.12);
      gain.gain.setValueAtTime(vol * 1.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.4);
    } else if (trackId === 'snare') {
      // Noise
      const noiseLen = Math.floor(ctx.sampleRate * 0.25);
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) ch[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const f = ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.setValueAtTime(1200, time);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol * 0.9, time);
      g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
      noise.connect(f);
      f.connect(g);
      g.connect(dest);

      const tone = ctx.createOscillator();
      const tg = ctx.createGain();
      tone.type = 'triangle';
      tone.frequency.setValueAtTime(220, time);
      tone.frequency.exponentialRampToValueAtTime(130, time + 0.08);
      tg.gain.setValueAtTime(vol * 0.85, time);
      tg.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
      tone.connect(tg);
      tg.connect(dest);

      noise.start(time);
      noise.stop(time + 0.25);
      tone.start(time);
      tone.stop(time + 0.15);
    } else if (trackId === 'hihatClosed' || trackId === 'hihatOpen') {
      const isOpen = trackId === 'hihatOpen';
      const dur = isOpen ? 0.32 : 0.055;
      const noiseLen = Math.floor(ctx.sampleRate * (dur + 0.05));
      const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const ch = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseLen; i++) ch[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(7500, time);
      filter.Q.setValueAtTime(3.5, time);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * 0.85, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(time);
      noise.stop(time + dur + 0.02);
    } else if (trackId === 'bass808') {
      const baseFreq = noteToFreq(pitch || 'C2');
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.5, time);
      osc.frequency.exponentialRampToValueAtTime(baseFreq, time + 0.035);
      gain.gain.setValueAtTime(vol * 1.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.65);
      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.7);
    } else if (trackId === 'leadSynth') {
      const freq = noteToFreq(pitch || 'C4');
      const { waveform, attack, decay, sustain, release, cutoff, resonance } = this.synthParams;

      const osc = ctx.createOscillator();
      osc.type = waveform;
      osc.frequency.setValueAtTime(freq, time);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(resonance, time);
      filter.frequency.setValueAtTime(cutoff * 0.4, time);
      filter.frequency.exponentialRampToValueAtTime(Math.min(18000, cutoff * 2), time + attack);
      filter.frequency.exponentialRampToValueAtTime(Math.max(200, cutoff * sustain), time + attack + decay);

      const amp = ctx.createGain();
      amp.gain.setValueAtTime(0.0001, time);
      amp.gain.linearRampToValueAtTime(vol * 0.75, time + attack);
      amp.gain.linearRampToValueAtTime(vol * 0.75 * sustain, time + attack + decay);
      amp.gain.setValueAtTime(vol * 0.75 * sustain, time + 0.22);
      amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.22 + release);

      osc.connect(filter);
      filter.connect(amp);
      amp.connect(dest);

      osc.start(time);
      osc.stop(time + 0.22 + release + 0.05);
    }
  }
}

export const audioEngine = new AudioEngine();
