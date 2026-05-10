/**
 * MAQAM v2.0 - Arabic Accent Scanner + Elite Polyrhythm Engine
 * =============================================================
 * Phase 1 Upgrade: Polyrhythm, Syncope & Flow-Switch Detection
 *
 * New Capabilities:
 *  - PolyrhythmProfile: full rhythmic complexity map per bar
 *  - FlowSwitchEvent: detects rhythmic breaks/surprises (التفاتات موسيقية)
 *  - Syncope scoring: measures off-beat density
 *  - Dominant grid analysis: 2/4, 3/4, 4/4, 6/8, free
 *  - Velocity profile: per-position rhythmic velocity map
 *  - FullPhonemicFingerprint: extends original with polyrhythm layer
 */

import { PhonemicFingerprint, AccentBit, MetricalFoot } from '../types/accent';
import { fingerprintStorage } from './fingerprintStorage';
import { moraEngine } from './moraEngine';

export type Dialect = 'standard' | 'sudanese' | 'egyptian' | 'gulf' | 'levantine' | 'maghrebi';

// ─── NEW: Flow Switch Types ───────────────────────────────────────────────────

export type FlowSwitchType =
  | 'acceleration'  // sudden increase in stressed syllable density
  | 'deceleration'  // sudden drop in stressed syllable density
  | 'reversal'      // pattern flips from [!][.] to [.][!] or vice versa
  | 'polymetric';   // meter shifts from duple to triple or vice versa

export interface FlowSwitchEvent {
  /** Position in the bit array where the switch occurs */
  position: number;
  /** Character position in original text (approx) */
  textPosition: number;
  /** Type of rhythmic break */
  type: FlowSwitchType;
  /** How dramatic the change is — 0–100 */
  magnitude: number;
  /** Previous pattern (3-bit context) */
  beforePattern: string;
  /** New pattern (3-bit context) */
  afterPattern: string;
  /** Human-readable Arabic description */
  description: string;
}

// ─── NEW: Polyrhythm Profile ──────────────────────────────────────────────────

export type RhythmicGrid = '2/4' | '3/4' | '4/4' | '6/8' | 'free';

export interface PolyrhythmProfile {
  /** 0–100: how far from a simple, even pulse this bar is */
  index: number;
  /** 0–100: density of off-beat stresses (syncopation) */
  syncopeScore: number;
  /** Detected flow-switch events within this bar */
  flowSwitches: FlowSwitchEvent[];
  /** Number of distinct flow switches */
  switchCount: number;
  /** Most likely rhythmic grid this bar sits in */
  dominantGrid: RhythmicGrid;
  /** 0–100: tension level created by the polyrhythm */
  tension: number;
  /** Per-position rhythmic velocity (0–1 array, length = bitCount) */
  velocityProfile: number[];
  /** Human-readable summary in Arabic */
  description: string;
}

// ─── NEW: Full Phonemic Fingerprint (extends original) ───────────────────────

export interface FullPhonemicFingerprint extends PhonemicFingerprint {
  polyrhythm: PolyrhythmProfile;
  /** Extended fingerprint code including polyrhythm data */
  extendedCode: string;
  /** Flow switch summary code, e.g. "2A-1R" (2 accelerations, 1 reversal) */
  flowCode: string;
}

// ─── AccentScanner Class ─────────────────────────────────────────────────────

class AccentScanner {

  // ────────────────────────────────────────────────────────────────────────────
  //  ORIGINAL METHODS (preserved exactly)
  // ────────────────────────────────────────────────────────────────────────────

  public countSyllables(text: string): number {
    return text
      .replace(/[^\u0600-\u06FF]/g, '')
      .split(/[اوي]/)
      .filter(Boolean).length;
  }

  public generateFingerprintCode(
    text: string, bits: AccentBit[], morae: number, rhyme: string
  ): string {
    const stressPattern = bits.join('').replace(/\[/g, '').replace(/\]/g, '');
    const syllables = this.countSyllables(text);
    return `${stressPattern}-${syllables}-${morae}-${rhyme}`;
  }

  public scan(text: string, dialect: Dialect = 'standard'): AccentBit[] {
    if (!text) return [];
    const chars = Array.from(text.replace(/\s+/g, ''));
    const bits: AccentBit[] = [];
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      if (/[اوي]/.test(char) || chars[i + 1] === 'ّ') {
        bits.push('[!]');
        if (chars[i + 1] === 'ّ') i++;
      } else if (i % 2 === 1) {
        bits.push('[!]');
      } else {
        bits.push('[.]');
      }
    }
    return bits;
  }

  public classify(bits: AccentBit[]): MetricalFoot {
    if (bits.length === 0) return 'Iamb';
    const bitString = bits.join('');
    const counts: Record<MetricalFoot, number> = {
      'Anapest': (bitString.match(/\[\.\]\[\.\]\[\!\]/g) || []).length,
      'Dactyl':  (bitString.match(/\[\!\]\[\.\]\[\.\]/g) || []).length,
      'Iamb':    (bitString.match(/\[\.\]\[\!\]/g) || []).length,
      'Trochee': (bitString.match(/\[\!\]\[\.\]/g) || []).length,
      'Spondee': (bitString.match(/\[\!\]\[\!\]/g) || []).length,
      'Pyrrhic': (bitString.match(/\[\.\]\[\.\]/g) || []).length,
    };
    counts['Anapest'] *= 1.5;
    counts['Dactyl']  *= 1.5;
    let maxFoot: MetricalFoot = 'Iamb';
    let maxCount = -1;
    for (const [foot, count] of Object.entries(counts)) {
      if (count > maxCount) { maxCount = count; maxFoot = foot as MetricalFoot; }
    }
    return maxFoot;
  }

  private async generateHash(text: string): Promise<string> {
    const msgUint8  = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  public async buildFingerprint(text: string, dialect: Dialect = 'standard'): Promise<PhonemicFingerprint> {
    const hash   = await this.generateHash(text + '_' + dialect);
    const cached = await fingerprintStorage.get(hash);
    if (cached) return cached;

    const bits    = this.scan(text, dialect);
    const profile = moraEngine.analyze(text, dialect === 'standard' ? 'fusha' : dialect as any);
    const rhyme   = moraEngine.extractCorePhoneme(text);
    const code    = this.generateFingerprintCode(text, bits, profile.totalMorae, rhyme);

    const fingerprint: PhonemicFingerprint = {
      bits,
      dominantFoot: this.classify(bits),
      syllableCount: this.countSyllables(text),
      syncopationScore: 0,
      polyrhythmicComplexity: 0,
      rhythmicGait: 'Iambic', // default
      stressFingerprintCode: code,
    };

    await fingerprintStorage.save(hash, fingerprint, code);
    return fingerprint;
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  NEW PUBLIC METHODS: POLYRHYTHM ENGINE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Computes the polyrhythm index for a bit array.
   *
   * Algorithm:
   *  1. Divide bits into windows of 4 (representing one metric unit)
   *  2. Compute the stressed-bit density for each window
   *  3. Measure variance across windows → high variance = high polyrhythm
   *  4. Normalise to 0–100
   */
  public computePolyrhythmIndex(bits: AccentBit[]): number {
    if (bits.length < 4) return 0;
    const windowSize = 4;
    const windows: number[] = [];
    for (let i = 0; i < bits.length - windowSize + 1; i += windowSize) {
      const window = bits.slice(i, i + windowSize);
      const stressCount = window.filter(b => b === '[!]').length;
      windows.push(stressCount / windowSize);
    }
    if (windows.length < 2) return 0;
    const mean = windows.reduce((s, v) => s + v, 0) / windows.length;
    const variance = windows.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / windows.length;
    // Max possible variance is 0.25 (alternating 0 and 1 density windows)
    return Math.min(100, Math.round((variance / 0.25) * 100));
  }

  /**
   * Computes the syncope score: density of stresses on "off-beat" positions.
   *
   * In a standard 4/4 grid, beats 0, 2 (0-indexed) are "strong" (ictus),
   * beats 1, 3 are "weak". Syncope = stresses appearing on weak beats.
   */
  public computeSyncopeScore(bits: AccentBit[]): number {
    if (bits.length === 0) return 0;
    const offBeatStresses = bits.filter((b, i) => b === '[!]' && i % 2 === 1).length;
    const totalStresses   = bits.filter(b => b === '[!]').length;
    if (totalStresses === 0) return 0;
    return Math.min(100, Math.round((offBeatStresses / totalStresses) * 100));
  }

  /**
   * Detects flow switch events: positions where the rhythmic pattern
   * changes significantly, creating "التفاتات موسيقية" (musical turns).
   *
   * Algorithm:
   *  1. Compute local stress density in overlapping 4-bit windows
   *  2. Find window transitions where density changes by > threshold
   *  3. Classify each switch by type (acceleration/deceleration/reversal)
   */
  public detectFlowSwitches(bits: AccentBit[], threshold: number = 0.35): FlowSwitchEvent[] {
    if (bits.length < 6) return [];
    const events: FlowSwitchEvent[] = [];
    const windowSize = 4;

    for (let i = 0; i < bits.length - windowSize; i += 2) {
      const prevWindow = bits.slice(Math.max(0, i - windowSize), i);
      const nextWindow = bits.slice(i, Math.min(bits.length, i + windowSize));

      if (prevWindow.length < 2 || nextWindow.length < 2) continue;

      const prevDensity = prevWindow.filter(b => b === '[!]').length / prevWindow.length;
      const nextDensity = nextWindow.filter(b => b === '[!]').length / nextWindow.length;
      const delta = nextDensity - prevDensity;

      if (Math.abs(delta) < threshold) continue;

      const prevPattern = prevWindow.slice(-3).join('').replace(/[\[\]]/g, '');
      const nextPattern = nextWindow.slice(0, 3).join('').replace(/[\[\]]/g, '');

      let type: FlowSwitchType;
      let description: string;

      if (delta > 0.5) {
        type = 'acceleration';
        description = 'تسارع مفاجئ في الكثافة الإيقاعية — صدمة إيقاعية';
      } else if (delta < -0.5) {
        type = 'deceleration';
        description = 'تباطؤ إيقاعي مدروس — فضاء للتنفس الموسيقي';
      } else if (this.isPatternReversal(prevWindow, nextWindow)) {
        type = 'reversal';
        description = 'قلب النمط الإيقاعي — التفاتة موسيقية حادة';
      } else {
        type = 'polymetric';
        description = 'تحول بوليمتري — انتقال من دورة ثنائية إلى ثلاثية';
      }

      const magnitude = Math.min(100, Math.round(Math.abs(delta) * 150));

      events.push({
        position: i,
        textPosition: Math.round(i * 1.5),
        type,
        magnitude,
        beforePattern: prevPattern,
        afterPattern: nextPattern,
        description,
      });
    }

    // Deduplicate: keep only the highest-magnitude event per 4-bit zone
    return this.deduplicateSwitches(events);
  }

  /**
   * Analyses the dominant rhythmic grid (time signature) of a bit pattern.
   * Uses autocorrelation to detect the strongest periodic pulse.
   */
  public analyzeDominantGrid(bits: AccentBit[]): RhythmicGrid {
    if (bits.length < 4) return 'free';
    const stressBinary = bits.map(b => b === '[!]' ? 1 : 0);

    // Test periodicity for common grids
    const periods: Record<number, number> = { 2: 0, 3: 0, 4: 0, 6: 0 };
    for (const period of Object.keys(periods).map(Number)) {
      let matchScore = 0;
      for (let i = 0; i < stressBinary.length - period; i++) {
        if (stressBinary[i] === stressBinary[i + period]) matchScore++;
      }
      periods[period] = matchScore / (stressBinary.length - period);
    }

    const best = (Object.entries(periods) as [string, number][])
      .reduce((a, b) => b[1] > a[1] ? b : a);

    const bestScore = best[1];
    const bestPeriod = parseInt(best[0]);

    if (bestScore < 0.55) return 'free';

    const gridMap: Record<number, RhythmicGrid> = {
      2: '2/4',
      3: '3/4',
      4: '4/4',
      6: '6/8',
    };
    return gridMap[bestPeriod] ?? 'free';
  }

  /**
   * Computes a per-position velocity profile: 0.0–1.0 per bit.
   * Velocity = local stress momentum (how many recent stresses build up tension).
   */
  public computeVelocityProfile(bits: AccentBit[]): number[] {
    const lookback = 3;
    return bits.map((_, i) => {
      const window = bits.slice(Math.max(0, i - lookback), i + 1);
      const stressCount = window.filter(b => b === '[!]').length;
      return parseFloat((stressCount / window.length).toFixed(3));
    });
  }

  /**
   * Full polyrhythm analysis for a bar text.
   * Combines all sub-analyses into a PolyrhythmProfile.
   */
  public analyzePolyrhythm(text: string, dialect: Dialect = 'standard'): PolyrhythmProfile {
    const bits         = this.scan(text, dialect);
    const index        = this.computePolyrhythmIndex(bits);
    const syncopeScore = this.computeSyncopeScore(bits);
    const flowSwitches = this.detectFlowSwitches(bits);
    const dominantGrid = this.analyzeDominantGrid(bits);
    const velocity     = this.computeVelocityProfile(bits);

    // Tension: weighted combination of polyrhythm complexity + syncope
    const tension = Math.min(100, Math.round(index * 0.55 + syncopeScore * 0.45));

    const description = this.buildPolyrhythmDescription(
      index, syncopeScore, flowSwitches.length, dominantGrid, tension
    );

    return {
      index,
      syncopeScore,
      flowSwitches,
      switchCount: flowSwitches.length,
      dominantGrid,
      tension,
      velocityProfile: velocity,
      description,
    };
  }

  /**
   * Builds a FullPhonemicFingerprint that extends the base PhonemicFingerprint
   * with a complete polyrhythm profile and flow codes.
   */
  public async buildFullFingerprint(
    text: string, dialect: Dialect = 'standard'
  ): Promise<FullPhonemicFingerprint> {
    const base       = await this.buildFingerprint(text, dialect);
    const polyrhythm = this.analyzePolyrhythm(text, dialect);
    const bits       = this.scan(text, dialect);
    const profile    = moraEngine.analyze(text, dialect === 'standard' ? 'fusha' : dialect as any);
    const rhyme      = moraEngine.extractCorePhoneme(text);

    const extendedCode = this.generateFingerprintCode(text, bits, profile.totalMorae, rhyme)
      + `-P${polyrhythm.index}-T${polyrhythm.tension}`;

    const flowCode = this.buildFlowCode(polyrhythm.flowSwitches);

    return {
      ...base,
      polyrhythm,
      extendedCode,
      flowCode,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS: POLYRHYTHM ENGINE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Detects if two consecutive bit windows represent a "reversal":
   * the dominant pattern flips (e.g. [!][.][!][.] → [.][!][.][!]).
   */
  private isPatternReversal(prev: AccentBit[], next: AccentBit[]): boolean {
    if (prev.length < 2 || next.length < 2) return false;
    const prevStart = prev[prev.length - 2];
    const nextStart = next[0];
    return prevStart !== nextStart;
  }

  /** Removes duplicate flow switch events within overlapping 4-bit zones. */
  private deduplicateSwitches(events: FlowSwitchEvent[]): FlowSwitchEvent[] {
    if (events.length === 0) return events;
    const result: FlowSwitchEvent[] = [];
    let lastPosition = -8;
    for (const ev of events.sort((a, b) => b.magnitude - a.magnitude)) {
      if (ev.position - lastPosition >= 4) {
        result.push(ev);
        lastPosition = ev.position;
      }
    }
    return result.sort((a, b) => a.position - b.position);
  }

  /** Generates a compact flow switch summary code. Example: "2A-1R-1D" */
  private buildFlowCode(switches: FlowSwitchEvent[]): string {
    if (switches.length === 0) return 'STEADY';
    const counts: Record<FlowSwitchType, number> = {
      acceleration: 0, deceleration: 0, reversal: 0, polymetric: 0,
    };
    for (const s of switches) counts[s.type]++;
    const parts: string[] = [];
    if (counts.acceleration > 0) parts.push(`${counts.acceleration}A`);
    if (counts.deceleration > 0) parts.push(`${counts.deceleration}D`);
    if (counts.reversal > 0)     parts.push(`${counts.reversal}R`);
    if (counts.polymetric > 0)   parts.push(`${counts.polymetric}P`);
    return parts.join('-');
  }

  private buildPolyrhythmDescription(
    index: number, syncope: number, switchCount: number,
    grid: RhythmicGrid, tension: number
  ): string {
    const gridLabels: Record<RhythmicGrid, string> = {
      '2/4': 'ثنائي (مارش)',
      '3/4': 'ثلاثي (والتز)',
      '4/4': 'رباعي (هيب-هوب كلاسيكي)',
      '6/8': 'سداسي (أفروبيت)',
      'free': 'حر (إيقاع طليق)',
    };
    const gridDesc = gridLabels[grid];

    if (tension >= 75 && switchCount >= 3)
      return `إيقاع مفخخ — توتر شديد (${tension}/100) مع ${switchCount} التفاتات • شبكة ${gridDesc}`;
    if (index >= 60 && syncope >= 50)
      return `بوليريثم متقدم — تشابك إيقاعي مع نقر مضطرب عالٍ (${syncope}/100) • شبكة ${gridDesc}`;
    if (switchCount >= 2)
      return `فلو متحول — ${switchCount} تحولات إيقاعية تخلق مفاجآت موسيقية • شبكة ${gridDesc}`;
    if (syncope >= 40)
      return `نقر مضطرب (Syncopated) — ${syncope}/100 • شبكة ${gridDesc}`;
    return `إيقاع منتظم — استقرار كافٍ مع إيقاع شبكة ${gridDesc}`;
  }

  // ─── Web Worker Integration (original, preserved) ────────────────────────
  private worker: Worker | null = null;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

  private getWorker(): Worker | null {
    // Workers currently fail to resolve during build. 
    // Fall back to synchronous processing on main thread.
    return null;
  }

  private async dispatchToWorker<T>(method: string, args: any[]): Promise<T> {
    const w = this.getWorker();
    if (!w) return (this as any)[method](...args) as T;
    return new Promise((resolve, reject) => {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 9);
      this.pendingRequests.set(id, { resolve, reject });
      w.postMessage({ id, method, args });
    });
  }

  async countSyllablesAsync(text: string): Promise<number> {
    return this.dispatchToWorker<number>('countSyllables', [text]);
  }

  async processBatchCountAsync(texts: string[]): Promise<number[]> {
    return this.dispatchToWorker<number[]>('processBatchCount', [texts]);
  }

  async analyzePolyrhythmAsync(text: string, dialect?: Dialect): Promise<PolyrhythmProfile> {
    return this.dispatchToWorker<PolyrhythmProfile>('analyzePolyrhythm', [text, dialect]);
  }

  async buildFullFingerprintAsync(text: string, dialect?: Dialect): Promise<FullPhonemicFingerprint> {
    return this.dispatchToWorker<FullPhonemicFingerprint>('buildFullFingerprint', [text, dialect]);
  }
}

export const accentScanner = new AccentScanner();
