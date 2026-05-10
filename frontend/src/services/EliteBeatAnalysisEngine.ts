/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  EliteBeatAnalysisEngine.ts  —  MAQAM Metric Matrix OS2 v4.0       ║
 * ║  Complete rewrite: autocorrelation BPM, Krumhansl-Schmuckler key,  ║
 * ║  onset-based instrument detection, genre fingerprinting            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import Meyda from 'meyda';

// ── Krumhansl-Schmuckler tonal profiles ───────────────────────────────
const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// ── Genre fingerprint rules ───────────────────────────────────────────
const GENRE_RULES: Record<string, {
  bpmMin: number; bpmMax: number;
  subThresh: number; centroidMin: number; centroidMax: number;
  hihDensityMin: number; weight: number;
}> = {
  UK_Drill:  { bpmMin: 130, bpmMax: 147, subThresh: 0.30, centroidMin: 2800, centroidMax: 6000, hihDensityMin: 0.12, weight: 1.0 },
  Trap:      { bpmMin: 128, bpmMax: 175, subThresh: 0.38, centroidMin: 1800, centroidMax: 7000, hihDensityMin: 0.18, weight: 1.0 },
  Boom_Bap:  { bpmMin: 80,  bpmMax: 105, subThresh: 0.10, centroidMin: 800,  centroidMax: 3000, hihDensityMin: 0.04, weight: 1.0 },
  Lo_Fi:     { bpmMin: 70,  bpmMax: 96,  subThresh: 0.08, centroidMin: 600,  centroidMax: 2500, hihDensityMin: 0.02, weight: 0.9 },
  Afrobeats: { bpmMin: 95,  bpmMax: 120, subThresh: 0.22, centroidMin: 1500, centroidMax: 4500, hihDensityMin: 0.08, weight: 0.8 },
};

// ══════════════════════════════════════════════════════════════════════
// Public interfaces
// ══════════════════════════════════════════════════════════════════════

export interface BeatDNA {
  // Source
  filename:       string;
  durationSec:    number;
  sampleRate:     number;

  // Temporal
  bpm:            number;
  bpmConfidence:  number;
  timeSignature:  [number, number];
  loopBars:       1 | 2 | 4 | 8;

  // Harmonic
  key:            string;  // e.g. "G#"
  mode:           'major' | 'minor';
  keyConfidence:  number;
  vibe:           string;
  chromaVector:   number[];  // 12-dim

  // Genre
  genre:          string;   // "Trap" | "UK_Drill" | etc.
  genreConfidence: number;
  mood:           string;
  energy:         number;   // 0–1

  // Instrumentation
  has808:         boolean;
  kickIntensity:  number;   // 0–1
  snareIntensity: number;
  hihatDensity:   number;   // 0–1 (ratio of occupied steps)
  hihatStyle:     'closed' | 'open' | 'triplet' | '16th' | 'complex' | 'roll';

  // Patterns (32-step grids per bar)
  kickGrid:   number[];  // length 32
  snareGrid:  number[];
  hihatGrid:  number[];
  openHatGrid: number[];

  // 808 / Bass
  bass808Hits: Array<{ stepIndex: number; note: string; durationSteps: number; velocity: number }>;

  // Spectral
  subEnergy:   number;
  bassEnergy:  number;
  midEnergy:   number;
  highEnergy:  number;
  spectralCentroid: number;
  mfcc:        number[];

  // Groove
  swing:       number;   // 0 = straight, 100 = full swing
  grooveFeel:  'on-beat' | 'laid-back' | 'ahead' | 'syncopated';

  // Meta
  analysisVersion: string;
  processedAt:     number;
}

// ══════════════════════════════════════════════════════════════════════
// EliteBeatAnalysisEngine
// ══════════════════════════════════════════════════════════════════════

export class EliteBeatAnalysisEngine {

  private readonly HOP      = 512;
  private readonly FRAME    = 2048;
  private readonly STEPS    = 32; // 32nd-note grid per bar

  // ──────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────

  async analyze(file: File, preArrayBuffer?: ArrayBuffer): Promise<BeatDNA> {
    const ab  = preArrayBuffer || await file.arrayBuffer();
    let raw = await this.decodeAudio(ab);

    // Memory Guard: Slice to first 60 seconds for analysis
    if (raw.duration > 60) {
      const sr = raw.sampleRate;
      const len = Math.floor(sr * 60);
      const shortCtx = new OfflineAudioContext(raw.numberOfChannels, len, sr);
      const shortBuf = shortCtx.createBuffer(raw.numberOfChannels, len, sr);
      for (let i = 0; i < raw.numberOfChannels; i++) {
        shortBuf.copyToChannel(raw.getChannelData(i).subarray(0, len), i);
      }
      raw = shortBuf;
    }

    // Yield to UI thread before heavy processing
    await this.yield();

    // ── 1. BPM via onset-envelope autocorrelation ──────────────────
    const { bpm, confidence: bpmConf } = this.detectBPM(raw);

    // ── 2. Spectral features (Meyda batch) ────────────────────────
    const spectral = await this.extractSpectralFeatures(raw);

    // ── 3. Key detection (Krumhansl-Schmuckler) ───────────────────
    const { key, mode, confidence: keyConf } = this.detectKey(spectral.chromaAvg);

    // ── 4. Genre fingerprinting ───────────────────────────────────
    const { genre, confidence: genreConf } = this.classifyGenre({
      bpm,
      spectralCentroid: spectral.centroid,
      subEnergy:        spectral.sub,
      highEnergy:       spectral.high,
      zeroCrossingRate: spectral.zcr,
    });

    // ── 5. Onset detection per band ───────────────────────────────
    const kickBuf  = await this.bandpass(raw, 40, 120);
    const snareBuf = await this.bandpass(raw, 150, 600);
    const hatBuf   = await this.bandpass(raw, 5000, 14000);
    const bassBuf  = await this.bandpass(raw, 30, 250);

    const kickTs   = this.detectOnsets(kickBuf,  bpm, 0.55);
    const snareTs  = this.detectOnsets(snareBuf, bpm, 0.50);
    const hatTs    = this.detectOnsets(hatBuf,   bpm, 0.35);

    // ── 6. Map timestamps → 32-step grid ─────────────────────────
    const barDuration = (60 / bpm) * 4; // seconds
    const kickGrid   = this.toGrid32(kickTs,  bpm, raw.duration);
    const snareGrid  = this.toGrid32(snareTs, bpm, raw.duration);
    const hihatGrid  = this.toGrid32(hatTs,   bpm, raw.duration);

    // Detect open hats (longer decay regions in hat band)
    const openHatGrid = this.detectOpenHats(hatBuf, bpm);

    // ── 7. 808 / bass analysis ────────────────────────────────────
    const bass808Hits = await this.extract808Hits(bassBuf, bpm);
    const has808 = bass808Hits.length > 0 && spectral.sub > 0.20;

    // ── 8. Swing / groove ─────────────────────────────────────────
    const { swing, grooveFeel } = this.analyzeGroove(kickTs, snareTs, bpm);

    // ── 9. Loop length ────────────────────────────────────────────
    const loopBars = this.estimateLoopLength(raw.duration, bpm);

    // ── 10. Energy & mood ─────────────────────────────────────────
    const energy = Math.min(1, (spectral.sub + spectral.bass + spectral.rms * 2) / 3);
    const mood   = this.inferMood(energy, spectral.centroid, mode);

    return {
      filename:       file.name,
      durationSec:    raw.duration,
      sampleRate:     raw.sampleRate,
      bpm,
      bpmConfidence:  bpmConf,
      timeSignature:  [4, 4],
      loopBars,
      key,
      mode,
      keyConfidence:  keyConf,
      vibe:           mood,
      chromaVector:   spectral.chromaAvg,
      genre,
      genreConfidence: genreConf,
      mood,
      energy,
      has808,
      kickIntensity:  Math.min(1, kickTs.length / (raw.duration * 2)),
      snareIntensity: Math.min(1, snareTs.length / (raw.duration * 1.5)),
      hihatDensity:   hihatGrid.filter(Boolean).length / this.STEPS,
      hihatStyle:     this.classifyHiHatStyle(hihatGrid),
      kickGrid,
      snareGrid,
      hihatGrid,
      openHatGrid,
      bass808Hits,
      subEnergy:      spectral.sub,
      bassEnergy:     spectral.bass,
      midEnergy:      spectral.mid,
      highEnergy:     spectral.high,
      spectralCentroid: spectral.centroid,
      mfcc:           spectral.mfcc,
      swing,
      grooveFeel,
      analysisVersion: '4.0',
      processedAt:    Date.now(),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // BPM — Onset Envelope Autocorrelation
  // ──────────────────────────────────────────────────────────────────

  private detectBPM(buf: AudioBuffer): { bpm: number; confidence: number } {
    const data   = buf.getChannelData(0);
    const sr     = buf.sampleRate;
    const HOP    = this.HOP;
    const FRAME  = this.FRAME;

    // 1. Build RMS onset-strength envelope
    const env: number[] = [];
    for (let i = 0; i < data.length - FRAME; i += HOP) {
      let s = 0;
      for (let j = 0; j < FRAME; j++) s += data[i + j] ** 2;
      env.push(Math.sqrt(s / FRAME));
    }

    // 2. First-order difference (onset strength)
    const odf: number[] = env.map((v, i) => i === 0 ? 0 : Math.max(0, v - env[i - 1]));

    // 3. Autocorrelation
    const fps       = sr / HOP;
    const minLag    = Math.floor((fps * 60) / 200);
    const maxLag    = Math.floor((fps * 60) / 55);
    const corrMap: Array<{ lag: number; val: number }> = [];

    for (let lag = minLag; lag <= maxLag; lag++) {
      let c = 0;
      for (let i = 0; i < odf.length - lag; i++) c += odf[i] * odf[i + lag];
      corrMap.push({ lag, val: c / (odf.length - lag) });
    }

    // 4. Find best lag
    const best = corrMap.reduce((a, b) => b.val > a.val ? b : a);
    const avg  = corrMap.reduce((s, v) => s + v.val, 0) / corrMap.length;

    let bpm = (fps * 60) / best.lag;
    // Octave correction: snap to 60–200
    while (bpm < 60)  bpm *= 2;
    while (bpm > 200) bpm /= 2;

    // Round to nearest 0.5
    bpm = Math.round(bpm * 2) / 2;

    const confidence = Math.min(1, Math.max(0, (best.val - avg) / (avg + 1e-9)));
    return { bpm, confidence };
  }

  // ──────────────────────────────────────────────────────────────────
  // Spectral Feature Extraction (Meyda batch)
  // ──────────────────────────────────────────────────────────────────

  private async extractSpectralFeatures(buf: AudioBuffer): Promise<{
    sub: number; bass: number; mid: number; high: number;
    centroid: number; zcr: number; rms: number;
    mfcc: number[]; chromaAvg: number[];
  }> {
    const data = buf.getChannelData(0);
    const sr   = buf.sampleRate;
    const SIZE = 4096;
    const HOP  = SIZE;

    let subS = 0, bassS = 0, midS = 0, highS = 0;
    let centS = 0, zcrS = 0, rmsS = 0;
    const mfccSum   = new Array(13).fill(0);
    const chromaSum = new Array(12).fill(0);
    let n = 0;

    for (let i = 0; i < data.length - SIZE; i += HOP) {
      if (n % 40 === 0) await this.yield();
      const chunk = data.slice(i, i + SIZE);
      const feats = Meyda.extract(
        ['amplitudeSpectrum', 'mfcc', 'chroma', 'spectralCentroid', 'zcr', 'rms'],
        chunk
      ) as any;
      if (!feats) continue;

      centS += feats.spectralCentroid || 0;
      zcrS  += feats.zcr || 0;
      rmsS  += feats.rms || 0;

      if (feats.amplitudeSpectrum) {
        const sp  = feats.amplitudeSpectrum as Float32Array;
        const bin = (sr / 2) / sp.length;
        let sub = 0, bass = 0, mid = 0, high = 0;
        for (let k = 0; k < sp.length; k++) {
          const f = k * bin;
          if (f < 60)        sub  += sp[k];
          else if (f < 250)  bass += sp[k];
          else if (f < 2000) mid  += sp[k];
          else               high += sp[k];
        }
        const tot = sub + bass + mid + high + 1e-9;
        subS  += sub / tot;
        bassS += bass / tot;
        midS  += mid / tot;
        highS += high / tot;
      }

      if (feats.mfcc)  (feats.mfcc as number[]).forEach((v, j) => mfccSum[j]   += v);
      if (feats.chroma)(feats.chroma as number[]).forEach((v, j) => chromaSum[j] += v);
      n++;
    }

    if (n === 0) n = 1;
    return {
      sub:     subS / n,
      bass:    bassS / n,
      mid:     midS / n,
      high:    highS / n,
      centroid: centS / n,
      zcr:     zcrS / n,
      rms:     rmsS / n,
      mfcc:    mfccSum.map(v => v / n),
      chromaAvg: chromaSum.map(v => v / n),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Key Detection — Krumhansl-Schmuckler
  // ──────────────────────────────────────────────────────────────────

  private detectKey(chroma: number[]): { key: string; mode: 'major' | 'minor'; confidence: number } {
    const correlate = (x: number[], y: number[]): number => {
      const mx = x.reduce((a, b) => a + b) / x.length;
      const my = y.reduce((a, b) => a + b) / y.length;
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < x.length; i++) {
        num += (x[i] - mx) * (y[i] - my);
        dx  += (x[i] - mx) ** 2;
        dy  += (y[i] - my) ** 2;
      }
      return num / Math.sqrt((dx * dy) || 1e-9);
    };

    let bestKey  = 0;
    let bestMode: 'major' | 'minor' = 'minor';
    let bestCorr = -Infinity;

    for (let root = 0; root < 12; root++) {
      const rotated = [...chroma.slice(root), ...chroma.slice(0, root)];
      const mjCorr  = correlate(rotated, KS_MAJOR);
      const mnCorr  = correlate(rotated, KS_MINOR);

      if (mjCorr > bestCorr) { bestCorr = mjCorr; bestKey = root; bestMode = 'major'; }
      if (mnCorr > bestCorr) { bestCorr = mnCorr; bestKey = root; bestMode = 'minor'; }
    }

    return {
      key:        NOTE_NAMES[bestKey],
      mode:       bestMode,
      confidence: Math.min(1, Math.max(0, (bestCorr + 1) / 2)),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Genre Classification
  // ──────────────────────────────────────────────────────────────────

  private classifyGenre(features: {
    bpm: number; spectralCentroid: number;
    subEnergy: number; highEnergy: number; zeroCrossingRate: number;
  }): { genre: string; confidence: number } {

    const scores: Record<string, number> = {};

    for (const [name, rule] of Object.entries(GENRE_RULES)) {
      let score = 0;
      // BPM fit (max 40 points)
      const bpmFit = Math.max(0, 1 - Math.abs(
        features.bpm - (rule.bpmMin + rule.bpmMax) / 2
      ) / ((rule.bpmMax - rule.bpmMin) / 2));
      score += bpmFit * 40;

      // Sub energy (max 25 points)
      if (features.subEnergy >= rule.subThresh) score += 25;
      else score += (features.subEnergy / rule.subThresh) * 25;

      // Centroid fit (max 20 points)
      if (features.spectralCentroid >= rule.centroidMin &&
          features.spectralCentroid <= rule.centroidMax) score += 20;

      // Hi-hat density (max 15 points)
      if (features.zeroCrossingRate >= rule.hihDensityMin) score += 15;
      else score += (features.zeroCrossingRate / rule.hihDensityMin) * 15;

      scores[name] = score * rule.weight;
    }

    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const total  = sorted.reduce((s, [, v]) => s + v, 0) || 1;

    return {
      genre:      sorted[0][0],
      confidence: sorted[0][1] / total,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Onset Detection (per-band)
  // ──────────────────────────────────────────────────────────────────

  private detectOnsets(buf: AudioBuffer, bpm: number, sensitivity = 0.5): number[] {
    const data   = buf.getChannelData(0);
    const sr     = buf.sampleRate;
    const HOP    = Math.floor(sr / 200);   // 5ms resolution
    const beatMs = (60 / bpm) * 1000;
    const minGap = Math.floor((beatMs / 4 / 1000) * sr / HOP); // min 1/16th note gap

    // RMS envelope
    const env: number[] = [];
    for (let i = 0; i < data.length - HOP; i += HOP) {
      let s = 0;
      for (let j = 0; j < HOP; j++) s += data[i + j] ** 2;
      env.push(Math.sqrt(s / HOP));
    }

    // Adaptive threshold (rolling median × sensitivity factor)
    const W        = Math.floor(sr / HOP * 0.1); // 100ms window
    const onsets: number[] = [];
    let lastOnset  = -minGap;

    for (let i = W; i < env.length - W; i++) {
      const window  = env.slice(i - W, i + W);
      const sorted  = [...window].sort((a, b) => a - b);
      const median  = sorted[Math.floor(sorted.length / 2)];
      const thresh  = median * (1 + (1 - sensitivity) * 4);

      if (env[i] > thresh && env[i] > env[i - 1] && env[i] >= env[i + 1] &&
          (i - lastOnset) >= minGap) {
        onsets.push(i * HOP / sr);
        lastOnset = i;
      }
    }

    return onsets;
  }

  // ──────────────────────────────────────────────────────────────────
  // Timestamps → 32-step grid (averaged over all bars)
  // ──────────────────────────────────────────────────────────────────

  private toGrid32(timestamps: number[], bpm: number, duration: number): number[] {
    const grid      = new Array(this.STEPS).fill(0);
    const stepSec   = (60 / bpm) * 4 / this.STEPS; // duration of one 32nd note
    const barSec    = stepSec * this.STEPS;
    const count     = new Array(this.STEPS).fill(0);
    const numBars   = Math.ceil(duration / barSec);

    timestamps.forEach(t => {
      const posInBar  = t % barSec;
      const stepFloat = posInBar / stepSec;
      const step      = Math.round(stepFloat) % this.STEPS;
      count[step]++;
    });

    // Normalize: > 50% of bars = occupied
    for (let i = 0; i < this.STEPS; i++) {
      grid[i] = count[i] > (numBars * 0.3) ? 1 : 0;
    }

    // Guarantee at least kick on beat 1 and snare on beat 3
    if (timestamps.length === 0) {
      grid[0] = 1; grid[16] = 1;
    }

    return grid;
  }

  // ──────────────────────────────────────────────────────────────────
  // Open Hat Detection (longer decay regions)
  // ──────────────────────────────────────────────────────────────────

  private detectOpenHats(hatBuf: AudioBuffer, bpm: number): number[] {
    const data   = hatBuf.getChannelData(0);
    const sr     = hatBuf.sampleRate;
    const step   = Math.floor(sr / 200);
    const stepSec = (60 / bpm) * 4 / this.STEPS;

    const env: number[] = [];
    for (let i = 0; i < data.length - step; i += step) {
      let s = 0;
      for (let j = 0; j < step; j++) s += data[i + j] ** 2;
      env.push(Math.sqrt(s / step));
    }

    const grid = new Array(this.STEPS).fill(0);
    const maxE = Math.max(...env);
    const th   = maxE * 0.3;

    // Find sustained regions > 80ms
    const sustainSamples = Math.floor(0.08 * (sr / step));
    for (let i = 0; i < env.length - sustainSamples; i++) {
      let sustained = true;
      for (let j = 0; j < sustainSamples; j++) {
        if (env[i + j] < th) { sustained = false; break; }
      }
      if (sustained) {
        const t    = (i * step) / sr;
        const barS = (60 / bpm) * 4;
        const pos  = t % barS;
        const sIdx = Math.round(pos / stepSec) % this.STEPS;
        grid[sIdx] = 1;
        i += sustainSamples; // skip ahead
      }
    }
    return grid;
  }

  // ──────────────────────────────────────────────────────────────────
  // 808 / Bass Hit Extraction
  // ──────────────────────────────────────────────────────────────────

  private async extract808Hits(
    bassBuf: AudioBuffer,
    bpm: number
  ): Promise<BeatDNA['bass808Hits']> {
    const data   = bassBuf.getChannelData(0);
    const sr     = bassBuf.sampleRate;
    const hits   = this.detectOnsets(bassBuf, bpm, 0.45);
    const stepSec = (60 / bpm) * 4 / this.STEPS;
    const barSec  = stepSec * this.STEPS;

    const MIDI_NOTES = [
      'A0','B0','C1','D1','E1','F1','G1',
      'A1','B1','C2','D2','E2','F2','G2',
      'A2','B2','C2','D2'
    ];

    return hits.slice(0, 32).map(t => {
      const posInBar  = t % barSec;
      const stepIdx   = Math.round(posInBar / stepSec) % this.STEPS;

      // Estimate fundamental frequency from autocorrelation of sub window
      const startSample = Math.floor(t * sr);
      const winLen      = Math.floor(0.05 * sr); // 50ms window
      const window      = data.slice(startSample, startSample + winLen);
      const fundHz      = this.estimateFundamental(window, sr);
      const note        = this.hzToNote(fundHz);

      // Estimate duration (time until next onset)
      const nextOnset   = hits.find(h => h > t + 0.05);
      const durSec      = nextOnset ? Math.min(nextOnset - t, 2.0) : 1.0;
      const durSteps    = Math.max(1, Math.round(durSec / stepSec));

      return {
        stepIndex:   stepIdx,
        note:        note || 'A1',
        durationSteps: durSteps,
        velocity:    0.85,
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────
  // Fundamental Frequency Estimation (Autocorrelation)
  // ──────────────────────────────────────────────────────────────────

  private estimateFundamental(data: Float32Array, sr: number): number {
    const minF = 30, maxF = 300;
    const minP = Math.floor(sr / maxF);
    const maxP = Math.floor(sr / minF);

    let bestCorr = -1;
    let bestPeriod = minP;

    for (let period = minP; period <= Math.min(maxP, data.length / 2); period++) {
      let corr = 0;
      for (let i = 0; i < data.length - period; i++) {
        corr += data[i] * data[i + period];
      }
      corr /= (data.length - period);
      if (corr > bestCorr) { bestCorr = corr; bestPeriod = period; }
    }

    return sr / bestPeriod;
  }

  // ──────────────────────────────────────────────────────────────────
  // Hz → MIDI note name
  // ──────────────────────────────────────────────────────────────────

  private hzToNote(hz: number): string {
    if (hz <= 0) return 'A1';
    const midi   = Math.round(12 * Math.log2(hz / 440) + 69);
    const clamped = Math.max(21, Math.min(midi, 60)); // sub-bass range
    const oct    = Math.floor((clamped - 12) / 12);
    const note   = NOTE_NAMES[((clamped % 12) + 12) % 12];
    return `${note}${oct}`;
  }

  // ──────────────────────────────────────────────────────────────────
  // Swing / Groove Analysis
  // ──────────────────────────────────────────────────────────────────

  private analyzeGroove(
    kickTs: number[],
    snareTs: number[],
    bpm: number
  ): { swing: number; grooveFeel: BeatDNA['grooveFeel'] } {
    const beatSec = 60 / bpm;
    const eighthSec = beatSec / 2;

    // Measure displacement of "even 8ths" (beats 2, 4, 6, 8...) from ideal
    let swingSum  = 0;
    let swingN    = 0;
    let lateness  = 0;

    [...kickTs, ...snareTs].forEach(t => {
      const beatPos  = (t % beatSec) / beatSec; // 0–1 within a beat
      // If this hit is near the "and" position (0.4–0.6 range)
      if (beatPos > 0.35 && beatPos < 0.65) {
        const deviation = (beatPos - 0.5) / 0.5; // –1 to +1
        swingSum += Math.abs(deviation);
        lateness += deviation;
        swingN++;
      }
    });

    const swing = swingN > 0 ? Math.round((swingSum / swingN) * 100) : 0;
    const avgLate = swingN > 0 ? lateness / swingN : 0;

    let grooveFeel: BeatDNA['grooveFeel'] = 'on-beat';
    if (swing > 40) grooveFeel = 'syncopated';
    else if (avgLate > 0.1) grooveFeel = 'laid-back';
    else if (avgLate < -0.1) grooveFeel = 'ahead';

    return { swing, grooveFeel };
  }

  // ──────────────────────────────────────────────────────────────────
  // Hi-Hat Style Classification
  // ──────────────────────────────────────────────────────────────────

  private classifyHiHatStyle(grid: number[]): BeatDNA['hihatStyle'] {
    const density = grid.filter(Boolean).length / grid.length;

    if (density > 0.80) return 'roll';     // dense 32nd note rolls (trap)
    if (density > 0.55) return 'complex';  // irregular / programmed
    if (density > 0.35) return '16th';     // straight 16ths

    // Check for triplet feel (steps 0, 10, 21 etc. — 3-step spacing in 32)
    const tripletPositions = [0, 10, 21];
    const tripletScore = tripletPositions.filter(p => grid[p] === 1).length;
    if (tripletScore >= 2) return 'triplet';

    // Check open vs closed via density
    if (density < 0.12) return 'open';
    return 'closed';
  }

  // ──────────────────────────────────────────────────────────────────
  // Energy → Mood
  // ──────────────────────────────────────────────────────────────────

  private inferMood(energy: number, centroid: number, mode: string): string {
    if (energy > 0.75 && centroid > 3000) return mode === 'minor' ? 'Dark Aggressive' : 'High Energy';
    if (energy > 0.6)  return mode === 'minor' ? 'Intense' : 'Upbeat';
    if (energy > 0.4)  return mode === 'minor' ? 'Melancholic' : 'Chill';
    return mode === 'minor' ? 'Sad' : 'Relaxed';
  }

  generateSearchQuery(dna: BeatDNA): string {
    const genreBase = dna.genre === 'Unknown' ? 'Hip Hop' : dna.genre;
    const components = [
      genreBase,
      dna.vibe,
      dna.mode === 'minor' ? 'Minor' : 'Major',
      `${dna.bpm} BPM`,
      dna.key,
      'Type Beat'
    ];
    
    const query = components.join(' ');
    const urlEncoded = encodeURIComponent(query);
    return `https://www.beatstars.com/search?q=${urlEncoded}`;
  }

  // ──────────────────────────────────────────────────────────────────
  // Loop Length Estimation
  // ──────────────────────────────────────────────────────────────────

  private estimateLoopLength(duration: number, bpm: number): 1 | 2 | 4 | 8 {
    const barSec = (60 / bpm) * 4;
    const bars   = duration / barSec;
    if (bars <= 1.5) return 1;
    if (bars <= 2.5) return 2;
    if (bars <= 5)   return 4;
    return 8;
  }

  // ──────────────────────────────────────────────────────────────────
  // Audio decode helpers
  // ──────────────────────────────────────────────────────────────────

  private async decodeAudio(ab: ArrayBuffer): Promise<AudioBuffer> {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buf = await ctx.decodeAudioData(ab);
    await ctx.close();
    return buf;
  }

  private async bandpass(buf: AudioBuffer, low: number, high: number): Promise<AudioBuffer> {
    const ctx = new OfflineAudioContext(
      buf.numberOfChannels, buf.length, buf.sampleRate
    );
    const src = ctx.createBufferSource();
    src.buffer = buf;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = high;

    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = low;

    src.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(ctx.destination);
    src.start(0);

    return await ctx.startRendering();
  }

  private yield = () => new Promise(r => setTimeout(r, 0));
}

export const eliteBeatAnalysisEngine = new EliteBeatAnalysisEngine();
