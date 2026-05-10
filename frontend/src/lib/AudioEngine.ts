
/**
 * 🏛️ AFL Sonic Engine - Production Grade Web Audio Scheduler
 * Uses high-precision lookahead timing to guarantee rhythm stability.
 */
export class AFLSonicEngine {
  private ctx: AudioContext;
  private isRunning: boolean = false;
  private currentStep: number = 0;
  private bpm: number = 120;
  private schedulerTimer: number | null = null;
  private nextStepTime: number = 0;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // seconds
  
  private analyser: AnalyserNode;
  
  // Audio Buffers & Nodes
  private masterGain: GainNode;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public start(onStep: (step: number) => void) {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isRunning = true;
    this.nextStepTime = this.ctx.currentTime;
    this.scheduler(onStep);
  }

  public stop() {
    this.isRunning = false;
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
    }
    this.currentStep = 0;
  }

  private scheduler(onStep: (step: number) => void) {
    while (this.isRunning && this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleStep(this.currentStep, this.nextStepTime, onStep);
      this.advanceStep();
    }
    if (this.isRunning) {
      this.schedulerTimer = window.setTimeout(() => this.scheduler(onStep), this.lookahead);
    }
  }

  private advanceStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextStepTime += 0.25 * secondsPerBeat; // 16th notes
    this.currentStep = (this.currentStep + 1) % 16;
  }

  private scheduleStep(step: number, time: number, onStep: (step: number) => void) {
    // Notify React layer for visual feedback
    onStep(step);
    
    // Check internal buffers/triggers (actual synthesis happens here)
    // For this implementation, we emit a trigger event that the UI can hook into
    const event = new CustomEvent('afl-step-trigger', { detail: { step, time } });
    window.dispatchEvent(event);
  }

  public triggerKick(time: number = 0) {
    const t = time || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    g.gain.setValueAtTime(1, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    osc.connect(g);
    g.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.5);
  }

  public triggerSnare(time: number = 0) {
    const t = time || this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBuffer.length; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    
    noise.start(t);
  }

  public triggerHiHat(time: number = 0) {
    const t = time || this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const length = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) output[i] = Math.random() * 2 - 1;
    
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  public setBPM(val: number) {
    this.bpm = Math.max(40, Math.min(240, val));
  }

  public getVisuals() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray;
  }
}

export const sonicEngine = new AFLSonicEngine();
