/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  EliteBeatSynthesizer.ts  —  MAQAM Metric Matrix OS2 v4.0          ║
 * ║  Professional offline rendering via Tone.js:                       ║
 * ║  - 808 bass with FrequencyEnvelope pitch-drop                      ║
 * ║  - Layered kick (MembraneSynth + click transient)                  ║
 * ║  - Snare (NoiseSynth body + membrane layer)                        ║
 * ║  - Trap hi-hat patterns (32nd note rolls w/ velocity variation)    ║
 * ║  - Melody / chord pad (PolySynth)                                  ║
 * ║  - Full FX chain: EQ → Compression → Reverb → Limiter             ║
 * ║  - Exports clean WAV Blob ready for download                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */

import * as Tone from 'tone';
import type { BeatDNA } from './EliteBeatAnalysisEngine';

// ══════════════════════════════════════════════════════════════════════
// Render Specification
// ══════════════════════════════════════════════════════════════════════

export interface BeatRenderSpec {
  bpm:           number;
  key:           string;           // e.g. "G#"
  mode:          'major' | 'minor';
  genre:         string;
  durationBars:  number;
  kickGrid:      number[];         // 32-step
  snareGrid:     number[];
  hihatGrid:     number[];
  openHatGrid:   number[];
  bass808Hits:   Array<{ stepIndex: number; note: string; durationSteps: number; velocity: number }>;
  melodyEnabled: boolean;
  swing:         number;           // 0–100
}

// Key → scale intervals (semitones from root)
const SCALE_INTERVALS: Record<string, number[]> = {
  minor:    [0, 2, 3, 5, 7, 8, 10],  // natural minor
  major:    [0, 2, 4, 5, 7, 9, 11],  // major
  dorian:   [0, 2, 3, 5, 7, 9, 10],  // dorian (common in drill)
  phrygian: [0, 1, 3, 5, 7, 8, 10],  // phrygian (dark)
};

// Genre → synthesis preset
const GENRE_PRESETS: Record<string, {
  kick808Tune: number;   // base freq Hz
  kickDecay:   number;
  snareDecay:  number;
  hihatDecay:  number;
  reverbWet:   number;
  swingAmount: number;
  masterComp:  { threshold: number; ratio: number };
}> = {
  Trap:    { kick808Tune: 52, kickDecay: 0.40, snareDecay: 0.28, hihatDecay: 0.045, reverbWet: 0.10, swingAmount: 5,  masterComp: { threshold: -14, ratio: 4 } },
  UK_Drill:{ kick808Tune: 48, kickDecay: 0.35, snareDecay: 0.32, hihatDecay: 0.038, reverbWet: 0.14, swingAmount: 3,  masterComp: { threshold: -12, ratio: 5 } },
  Boom_Bap:{ kick808Tune: 55, kickDecay: 0.50, snareDecay: 0.38, hihatDecay: 0.080, reverbWet: 0.22, swingAmount: 12, masterComp: { threshold: -16, ratio: 3 } },
  Lo_Fi:   { kick808Tune: 58, kickDecay: 0.45, snareDecay: 0.35, hihatDecay: 0.100, reverbWet: 0.30, swingAmount: 15, masterComp: { threshold: -18, ratio: 2.5 } },
  default: { kick808Tune: 52, kickDecay: 0.40, snareDecay: 0.28, hihatDecay: 0.045, reverbWet: 0.12, swingAmount: 5,  masterComp: { threshold: -14, ratio: 4 } },
};

// Chord progressions per mode (scale degrees, 0-indexed)
const CHORD_PROGS: Record<string, number[][]> = {
  minor: [[0, 2, 4], [5, 0, 2], [3, 5, 0], [6, 1, 3]],   // i VII VI VII
  major: [[0, 2, 4], [3, 5, 0], [4, 6, 1], [3, 5, 0]],   // I IV V IV
};

// ══════════════════════════════════════════════════════════════════════
// EliteBeatSynthesizer
// ══════════════════════════════════════════════════════════════════════

export class EliteBeatSynthesizer {

  // ──────────────────────────────────────────────────────────────────
  // Primary API: from BeatDNA → WAV Blob
  // ──────────────────────────────────────────────────────────────────

  async synthesizeFromAnalysis(analysis: BeatDNA): Promise<{ blob: Blob; audioUrl: string; spec: BeatRenderSpec }> {
    const spec = this.generateSpecFromDNA(analysis);
    const blob = await this.renderOffline(spec);
    const audioUrl = URL.createObjectURL(blob);
    return { blob, audioUrl, spec };
  }

  // ──────────────────────────────────────────────────────────────────
  // Analysis → Render Spec
  // ──────────────────────────────────────────────────────────────────

  generateSpecFromDNA(dna: BeatDNA): BeatRenderSpec {
    // If analysis gave us empty grids, use intelligent genre defaults
    const kickGrid   = dna.kickGrid.some(Boolean)   ? dna.kickGrid   : this.defaultKickGrid(dna.genre);
    const snareGrid  = dna.snareGrid.some(Boolean)  ? dna.snareGrid  : this.defaultSnareGrid();
    const hihatGrid  = dna.hihatGrid.some(Boolean)  ? dna.hihatGrid  : this.defaultHihatGrid(dna.genre);
    const openHatGrid = dna.openHatGrid.some(Boolean) ? dna.openHatGrid : this.defaultOpenHatGrid(dna.genre);

    const bass808Hits = dna.bass808Hits.length > 0
      ? dna.bass808Hits
      : this.defaultBassPattern(dna.key, dna.mode, dna.genre);

    return {
      bpm:          dna.bpm,
      key:          dna.key,
      mode:         dna.mode,
      genre:        dna.genre,
      durationBars: Math.max(4, dna.loopBars), // Keep it short and sweet for the clone preview (4-8 bars)
      kickGrid,
      snareGrid,
      hihatGrid,
      openHatGrid,
      bass808Hits,
      melodyEnabled: dna.midEnergy > 0.15,
      swing:        dna.swing,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Offline Rendering — the heart of the synthesizer
  // ──────────────────────────────────────────────────────────────────

  async renderOffline(spec: BeatRenderSpec): Promise<Blob> {
    const preset    = GENRE_PRESETS[spec.genre] ?? GENRE_PRESETS.default;
    const beatSec   = 60 / spec.bpm;
    const barSec    = beatSec * 4;
    const stepSec   = barSec / 32;  // 32nd note duration
    const totalSec  = Math.max(0.5, barSec * spec.durationBars + 0.2); 

    const toneBuffer = await Tone.Offline(async () => {
      try {
        // 1. Initial Offset to avoid issues at time 0
        const offset = 0.1;

        // 2. Master bus chain
        const masterLimiter  = new Tone.Limiter(-1).toDestination();
        const masterComp     = new Tone.Compressor({
          threshold: preset.masterComp.threshold,
          ratio:     preset.masterComp.ratio,
          attack:    0.003,
          release:   0.20,
          knee:      6,
        }).connect(masterLimiter);

        const reverb = new Tone.Freeverb({ dampening: 3000, roomSize: 0.7, wet: preset.reverbWet });
        reverb.connect(masterComp);

        // 3. Instruments
        const kickComp = new Tone.Compressor({ threshold: -12, ratio: 6, attack: 0.002, release: 0.05 }).connect(masterComp);
        const kickBody = new Tone.MembraneSynth({
          pitchDecay:  preset.kickDecay * 0.15,
          octaves:     8,
          oscillator:  { type: 'sine' },
          envelope:    { attack: 0.001, decay: preset.kickDecay, sustain: 0.01, release: 0.4 },
          volume:      0,
        }).connect(kickComp);

        const kickClick = new Tone.NoiseSynth({
          noise:    { type: 'white' },
          envelope: { attack: 0.0005, decay: 0.02, sustain: 0, release: 0.005 },
          volume:   -16,
        });
        const clickHPF = new Tone.Filter({ type: 'highpass', frequency: 3500 }).connect(kickComp);
        kickClick.connect(clickHPF);

        const snareComp = new Tone.Compressor({ threshold: -14, ratio: 4, attack: 0.001, release: 0.1 }).connect(masterComp);
        const snareNoise = new Tone.NoiseSynth({
          noise:    { type: 'pink' },
          envelope: { attack: 0.001, decay: preset.snareDecay, sustain: 0, release: 0.1 },
          volume:   -8,
        });
        const snareBPF = new Tone.Filter({ type: 'bandpass', frequency: 2800, Q: 1.2 }).connect(snareComp);
        snareNoise.connect(snareBPF);
        snareComp.connect(reverb);

        const snareBody = new Tone.MembraneSynth({
          pitchDecay:  0.03,
          octaves:     3,
          envelope:    { attack: 0.0005, decay: 0.2, sustain: 0.01, release: 0.1 },
          volume:      -10,
        }).connect(snareComp);

        const hatComp = new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.001, release: 0.05 }).connect(masterComp);
        const hatHPF = new Tone.Filter({ type: 'highpass', frequency: 7000 }).connect(hatComp);
        const closedHat = new Tone.MetalSynth({
          envelope:        { attack: 0.001, decay: preset.hihatDecay, release: 0.01 },
          harmonicity:     5.1,
          resonance:       8000,
          volume:          -20,
        }).connect(hatHPF);

        const openHat = new Tone.MetalSynth({
          envelope:        { attack: 0.002, decay: 0.35, release: 0.15 },
          harmonicity:     4.5,
          resonance:       6000,
          volume:          -22,
        }).connect(hatHPF);
        openHat.connect(reverb);

        const bass808Dist = new Tone.Distortion({ distortion: 0.15, wet: 0.2 }).connect(masterComp);
        const bass808 = new Tone.MonoSynth({
          oscillator: { type: 'sine' },
          envelope: { attack: 0.015, decay: 2.0, sustain: 0.1, release: 1.2 },
          filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0, baseFrequency: 200, octaves: 1 },
          volume: -1,
        }).connect(bass808Dist);

        let melodyPad: Tone.PolySynth | null = null;
        if (spec.melodyEnabled) {
          melodyPad = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'fmsine', harmonicity: 1.5, modulationIndex: 5 },
            envelope:   { attack: 0.2, decay: 0.5, sustain: 0.6, release: 1.5 },
            volume:     -28,
          }).connect(reverb);
        }

        // 4. Scheduling Logic
        const scale = this.buildScale(spec.key, spec.mode);
        const chords = CHORD_PROGS[spec.mode] ?? CHORD_PROGS.minor;

        for (let bar = 0; bar < spec.durationBars; bar++) {
          const barStart = bar * barSec + offset;
          const chordIdx = bar % chords.length;

          spec.kickGrid.forEach((hit, step) => {
            if (!hit) return;
            const t = barStart + step * stepSec;
            kickBody.triggerAttackRelease('C1', '8n', t, 0.9);
            kickClick.triggerAttackRelease('16n', t, 0.4);
          });

          spec.snareGrid.forEach((hit, step) => {
            if (!hit) return;
            const t = barStart + step * stepSec;
            snareNoise.triggerAttackRelease('16n', t, 0.7);
            snareBody.triggerAttackRelease('G2', '16n', t, 0.8);
          });

          spec.hihatGrid.forEach((hit, step) => {
            if (!hit) return;
            const t = barStart + step * stepSec;
            const vel = 0.5 + Math.random() * 0.4;
            closedHat.triggerAttackRelease(800, '32n', t, vel);
          });

          spec.openHatGrid.forEach((hit, step) => {
            if (!hit) return;
            const t = barStart + step * stepSec;
            openHat.triggerAttackRelease(400, '8n', t, 0.6);
          });

          // 808 Hits - Ensure no overlapping parameter automations within this bar
          const uniqueBarHits = Array.from(
            spec.bass808Hits.filter(h => h.stepIndex >= 0 && h.stepIndex < 32).reduce((map, hit) => {
              map.set(hit.stepIndex, hit);
              return map;
            }, new Map()).values()
          ).sort((a: any, b: any) => a.stepIndex - b.stepIndex);

          uniqueBarHits.forEach((hit: any) => {
            const t = barStart + hit.stepIndex * stepSec;
            const dur = (hit.durationSteps * stepSec) * 0.95;
            const note = this.ensureOctaveRange(hit.note, 1, 2);
            const freq = Tone.Frequency(note).toFrequency();
            
            bass808.triggerAttackRelease(note, dur, t, hit.velocity);
            
            const glideTime = Math.min(0.04, stepSec * 0.5);
            // Use scheduled frequency drop
            bass808.frequency.setValueAtTime(freq * 1.5, t);
            bass808.frequency.exponentialRampToValueAtTime(freq, t + glideTime);
          });

          if (melodyPad) {
            const chordNotes = chords[chordIdx].map(deg => scale[deg % scale.length]);
            [0, 16].forEach(step => {
              const t = barStart + step * stepSec;
              const dur = barSec / 2.2;
              melodyPad!.triggerAttackRelease(chordNotes, dur, t, 0.35);
            });
          }
        }
      } catch (e) {
        console.error('Synthesis internal error:', e);
        throw e;
      }


    }, totalSec, 2, 44100);

    const audioBuffer = toneBuffer.get()!;
    return this.audioBufferToWAV(audioBuffer);
  }

  // ──────────────────────────────────────────────────────────────────
  // Scale Builder
  // ──────────────────────────────────────────────────────────────────

  private buildScale(key: string, mode: 'major' | 'minor', octaves = 3): string[] {
    const rootMidi  = this.noteToMidi(key + '3'); // base at octave 3
    const intervals = SCALE_INTERVALS[mode] ?? SCALE_INTERVALS.minor;
    const notes: string[] = [];

    for (let oct = -1; oct < octaves; oct++) {
      intervals.forEach(interval => {
        const midi = rootMidi + interval + oct * 12;
        if (midi >= 36 && midi <= 84) notes.push(this.midiToNote(midi));
      });
    }

    return notes;
  }

  private noteToMidi(note: string): number {
    const map: Record<string, number> = {
      C:0,  'C#':1, Db:1, D:2, 'D#':3, Eb:3,
      E:4,  F:5,  'F#':6, Gb:6, G:7,
      'G#':8, Ab:8, A:9, 'A#':10, Bb:10, B:11,
    };
    const match = note.match(/^([A-G]#?)(\d+)$/);
    if (!match) return 45;
    return (parseInt(match[2]) + 1) * 12 + (map[match[1]] ?? 0);
  }

  private midiToNote(midi: number): string {
    const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    const oct   = Math.floor(midi / 12) - 1;
    return notes[midi % 12] + oct;
  }

  private ensureOctaveRange(note: string, minOct: number, maxOct: number): string {
    const match = note.match(/^([A-G]#?)(\d+)$/);
    if (!match) return note;
    const noteName = match[1];
    const oct = Math.max(minOct, Math.min(maxOct, parseInt(match[2])));
    return noteName + oct;
  }

  // ──────────────────────────────────────────────────────────────────
  // Default Pattern Generators (fallback when analysis gives empty grids)
  // ──────────────────────────────────────────────────────────────────

  private defaultKickGrid(genre: string): number[] {
    const patterns: Record<string, number[]> = {
      Trap:     this.grid32([0, 7, 8, 16, 22, 24, 30]),
      UK_Drill: this.grid32([0, 6, 9, 16, 22, 25]),
      Boom_Bap: this.grid32([0, 8, 11, 16, 24, 27]),
      Lo_Fi:    this.grid32([0, 10, 16, 26]),
    };
    return patterns[genre] ?? patterns.Trap;
  }

  private defaultSnareGrid(): number[] {
    // Standard snare on beats 2 and 4 (steps 8 and 24 in 32-step grid)
    return this.grid32([8, 24]);
  }

  private defaultHihatGrid(genre: string): number[] {
    if (genre === 'Trap' || genre === 'UK_Drill') {
      // Dense 32nd note hi-hat rolls
      const g = new Array(32).fill(1);
      // Remove a few for variation
      [4, 12, 20, 28].forEach(s => g[s] = 0);
      return g;
    }
    if (genre === 'Boom_Bap') {
      // 8th notes + some 16ths
      return this.grid32([0, 4, 8, 12, 16, 20, 24, 28, 6, 22]);
    }
    // Lo-Fi: sparse
    return this.grid32([0, 8, 16, 24, 4, 20]);
  }

  private defaultOpenHatGrid(genre: string): number[] {
    if (genre === 'Trap')     return this.grid32([6, 14, 22, 30]);
    if (genre === 'UK_Drill') return this.grid32([7, 15, 23, 31]);
    if (genre === 'Boom_Bap') return this.grid32([7, 23]);
    return this.grid32([15, 31]);
  }

  private defaultBassPattern(
    key: string,
    mode: 'major' | 'minor',
    genre: string
  ): BeatRenderSpec['bass808Hits'] {
    const scale  = this.buildScale(key, mode);
    const root   = this.ensureOctaveRange(scale[0], 1, 2);
    const fifth  = this.ensureOctaveRange(scale[4] ?? scale[0], 1, 2);
    const third  = this.ensureOctaveRange(scale[2] ?? scale[0], 1, 2);
    const seventh = this.ensureOctaveRange(scale[6] ?? scale[0], 1, 2);

    if (genre === 'Trap' || genre === 'UK_Drill') {
      return [
        { stepIndex: 0,  note: root,   durationSteps: 6,  velocity: 0.9 },
        { stepIndex: 8,  note: third,  durationSteps: 4,  velocity: 0.8 },
        { stepIndex: 14, note: root,   durationSteps: 3,  velocity: 0.85 },
        { stepIndex: 16, note: fifth,  durationSteps: 5,  velocity: 0.9 },
        { stepIndex: 22, note: seventh, durationSteps: 3, velocity: 0.75 },
        { stepIndex: 26, note: root,   durationSteps: 6,  velocity: 0.85 },
      ];
    }
    if (genre === 'Boom_Bap') {
      return [
        { stepIndex: 0,  note: root,  durationSteps: 8,  velocity: 0.85 },
        { stepIndex: 10, note: third, durationSteps: 6,  velocity: 0.75 },
        { stepIndex: 16, note: fifth, durationSteps: 8,  velocity: 0.85 },
        { stepIndex: 26, note: root,  durationSteps: 6,  velocity: 0.75 },
      ];
    }
    // Lo-Fi / default: slow sparse pattern
    return [
      { stepIndex: 0,  note: root,  durationSteps: 12, velocity: 0.7 },
      { stepIndex: 16, note: third, durationSteps: 12, velocity: 0.7 },
    ];
  }

  // ──────────────────────────────────────────────────────────────────
  // Grid helper
  // ──────────────────────────────────────────────────────────────────

  private grid32(steps: number[]): number[] {
    const g = new Array(32).fill(0);
    steps.forEach(s => { if (s >= 0 && s < 32) g[s] = 1; });
    return g;
  }

  // ──────────────────────────────────────────────────────────────────
  // WAV Encoder — converts AudioBuffer → Blob (PCM 16-bit stereo)
  // ──────────────────────────────────────────────────────────────────

  private audioBufferToWAV(buffer: AudioBuffer): Blob {
    const numCh    = Math.min(buffer.numberOfChannels, 2);
    const sr       = buffer.sampleRate;
    const frames   = buffer.length;
    const bps      = 16;
    const block    = numCh * (bps / 8);
    const dataSize = frames * block;
    const ab       = new ArrayBuffer(44 + dataSize);
    const view     = new DataView(ab);

    const ws = (off: number, str: string) =>
      [...str].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));

    ws(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    ws(8, 'WAVE');
    ws(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);          // PCM
    view.setUint16(22, numCh, true);
    view.setUint32(24, sr, true);
    view.setUint32(28, sr * block, true);
    view.setUint16(32, block, true);
    view.setUint16(34, bps, true);
    ws(36, 'data');
    view.setUint32(40, dataSize, true);

    let off = 44;
    for (let i = 0; i < frames; i++) {
      for (let ch = 0; ch < numCh; ch++) {
        const s   = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
        const i16 = Math.round(s < 0 ? s * 32768 : s * 32767);
        view.setInt16(off, i16, true);
        off += 2;
      }
    }

    return new Blob([ab], { type: 'audio/wav' });
  }
}

export const eliteBeatSynthesizer = new EliteBeatSynthesizer();
