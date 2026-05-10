/**
 * MAQAM v3.0 — Beat-to-Lyric Pipeline: Complete Type System
 * ============================================================
 * Pipeline: YouTube → Analysis → Generation → PhonosonicGrid → Lyric Placement → Quality
 *
 * Based on:
 *  - Existing audioAnalysisEngine.ts (AudioMetadata, BeatInfo, SpectralFeatures)
 *  - دراسة_فلو.txt (DTW, Peak Detection, Rhyme Density, Flow Engineering, LSA)
 *  - MetricMatrix OS2/OS3 PCE concept (3D coordinate grid)
 */

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTS (compatible with existing audioAnalysisEngine.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type { AudioMetadata, SpectralFeatures, BeatInfo, SilenceMap } from './audioAnalysisEngine';
export type MaqamType = 'Rast' | 'Bayati' | 'Hijaz' | 'Saba' | 'Sikah' | 'Nahawand' | 'Ajam';

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — YouTube Ingestion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input to the entire pipeline.
 * User provides a YouTube/SoundCloud URL plus analysis preferences.
 */
export interface YouTubeIngestionRequest {
  url: string;
  youtubeVideoId?: string; // auto-extracted from url
  startOffsetSeconds?: number; // crop from start
  endOffsetSeconds?: number; // crop from end
  analysisPreset: 'standard' | 'deep' | 'elite';
  outputOptions: {
    generateBeat: boolean;
    buildPhonosonicGrid: boolean;
    targetBarCount?: number; // desired bars for generated beat
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — Professional Beat Analysis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Millisecond-precise beat grid (micrometric precision per دراسة_فلو section §4.1).
 * Extends the simple BeatInfo in audioAnalysisEngine with a full 16-step grid.
 */
export interface TemporalGrid {
  bpm: number;
  bpmConfidence: number; // 0–1
  timeSignature: [numerator: number, denominator: number]; // e.g. [4, 4]
  barDurationMs: number;
  beatDurationMs: number;
  subBeatDurationMs: number; // 16th-note duration

  // Per-beat timestamps for the full track
  beatTimestamps: number[]; // seconds
  downbeatTimestamps: number[]; // bar-1 beats
  subBeatTimestamps: number[]; // every 16th note position

  totalBars: number;
  loopLengthBars: 1 | 2 | 4 | 8;

  /**
   * The canonical 16-step grid used by PhonosonicGrid.
   * Each step maps to a 16th-note slot in a single bar.
   */
  grid: Array<{
    position: number; // 1–16
    timestampMs: number; // absolute offset in the audio
    isDownbeat: boolean; // position 1, 5, 9, 13
    metricWeight: 'heavy' | 'medium' | 'light'; // beat 1/3 = heavy, 2/4 = medium, else light
  }>;
}

/**
 * Sample-level precision transient map per §4.1 (Peak Detection).
 * Maps kick/snare/hat positions to their grid slots.
 */
export interface TransientMap {
  kickPositions: Array<{
    timestampMs: number;
    intensity: number; // 0–1 amplitude
    gridPosition: number; // 1–16
    peakThreshold: number; // the detection threshold used
  }>;
  snarePositions: Array<{
    timestampMs: number;
    intensity: number;
    gridPosition: number;
  }>;
  hatPattern: {
    type: 'closed' | 'open' | 'triplet' | '16th' | 'complex';
    positions: Array<{
      timestampMs: number;
      isOpen: boolean;
      velocity: number; // 0–1
      gridPosition: number;
    }>;
  };
  otherPercussion: Array<{
    instrumentType: string; // e.g. 'rimshot', 'clap', 'shaker'
    positions: Array<{ timestampMs: number; intensity: number; gridPosition: number }>;
  }>;

  /** 16-element density map, one float per 16th-note position (0 = silent, 1 = full) */
  densityMap: [
    number, number, number, number, // beat 1
    number, number, number, number, // beat 2
    number, number, number, number, // beat 3
    number, number, number, number  // beat 4
  ];
}

/**
 * Full spectral decomposition using Meyda features (extends SpectralFeatures).
 */
export interface SpectralProfile {
  // Frequency band energies (normalized 0–1)
  subEnergy: number; // <60 Hz
  bassEnergy: number; // 60–250 Hz
  midEnergy: number; // 250–2000 Hz
  highEnergy: number; // >2000 Hz

  spectralCentroid: number; // Hz — overall brightness
  zeroCrossingRate: number;
  mfcc: number[]; // 13 Mel-frequency cepstral coefficients
  chroma: number[]; // 12 pitch-class energies
  harmonicContent: number; // 0–100 (chroma variance scaled)

  // Harmonic analysis
  key: string; // e.g. "Am", "Dm", "Cmaj"
  mode: 'major' | 'minor' | 'modal' | 'chromatic' | 'pentatonic';
  dominantFrequencies: Array<{ freq: number; magnitude: number }>; // top 5

  /** Per-band presence in the vocal frequency range (important for Frequency Masking prevention) */
  vocalPresenceScore: number; // 0–1, per §4.4 Spectral Density Analysis
  frequencyMaskingRisk: number; // 0–1, how much the beat will mask a rapper's voice
}

/**
 * RMS energy over time + structural section detection (per §4.1 RMS Energy Mapping).
 */
export interface DynamicMap {
  /** Per-bar RMS energy array */
  rmsEnergy: number[];

  /** Auto-detected sections: verse, chorus, bridge, etc. */
  sections: Array<{
    type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'break' | 'outro' | 'drop';
    startBar: number;
    endBar: number;
    averageEnergy: number; // 0–1
    sonicDensity: number; // 0–1 (how crowded the frequency spectrum is)
  }>;

  /** Silence / open space architecture for lyric breathing points (§2 دراسة_فلو) */
  silenceArchitecture: {
    breathingPoints: number[]; // timestamps in seconds
    fillableSpaces: Array<{
      startMs: number;
      endMs: number;
      durationMs: number;
      gridPositions: number[]; // which 1–16 slots are open
    }>;
    openGridPositions: number[]; // 1–16 slots with no strong transient
  };

  /** Energy peaks useful for placing impact syllables */
  peakMoments: Array<{ timestampMs: number; magnitude: number; gridPosition: number }>;
}

/**
 * The complete professional analysis output for a beat.
 * Supersedes the flat analysis object returned by audioAnalysisEngine.
 */
export interface ProfessionalBeatAnalysis {
  /** Original file / stream metadata */
  source: {
    youtubeUrl?: string;
    filename?: string;
    durationSeconds: number;
    sampleRate: number;
    channels: 1 | 2;
    sizeMB: number;
    format: string;
  };

  temporalGrid: TemporalGrid;
  transientMap: TransientMap;
  spectralProfile: SpectralProfile;
  dynamicMap: DynamicMap;
  
  // Flattened properties for convenience
  beatType?: string;
  bpm?: number;
  mood?: string;
  key?: string;

  /** High-level style classification */
  styleFingerprint: {
    genre: string[]; // e.g. ['trap', 'boom-bap', 'drill']
    mood: string[]; // e.g. ['aggressive', 'melancholic']
    energy: number; // 0–1
    complexity: number; // 0–1
    arabicStyleMarkers: string[]; // e.g. ['maqam-hijaz', 'dabke-rhythm', 'oriental-melody']
    tempo_feel: 'half-time' | 'on-beat' | 'double-time' | 'laid-back';
  };

  /** Processing metadata */
  analysisVersion: '3.0';
  processedAt: number; // Unix timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 3 — Beat Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Specification passed to an AI music generation model (e.g. Google Lyria).
 * Built automatically from ProfessionalBeatAnalysis to create a similar beat.
 */
export interface BeatGenerationSpec {
  /** Temporal constraints — must match the reference */
  targetBpm: number;
  targetDurationSeconds: number;
  targetLoopBars: 1 | 2 | 4 | 8;
  timeSignature: [number, number];

  /** Style constraints derived from styleFingerprint */
  styleReference: {
    genre: string[];
    mood: string[];
    energy: number;
    arabicStyle?: string; // specific maqam or rhythm type
    tempoFeel: string;
  };

  /** Instrumentation blueprint derived from TransientMap + SpectralProfile */
  instrumentationMap: {
    drums: {
      kickPattern: boolean[]; // 16-step grid
      snarePattern: boolean[];
      hatPattern: boolean[];
      velocity: number[]; // per-step velocity 0–1
    };
    bass: {
      present: boolean;
      rootNote?: string;
      octave?: number;
    };
    melody: {
      present: boolean;
      scale?: string;
      key?: string;
      rangeHz?: [number, number];
    };
    pads: {
      present: boolean;
      chordProgression?: string[];
    };
    orientalElements: {
      oud?: boolean;
      qanun?: boolean;
      ney?: boolean;
      darbuka?: boolean;
    };
    fx: string[]; // e.g. ['reverb', 'delay', '808-sub']
  };

  /** Natural-language prompt for the AI model */
  generationPrompt: string;

  /** The analysis this spec was derived from */
  referenceAnalysis: ProfessionalBeatAnalysis;

  /** Similarity target — how close should the generated beat be? */
  similarityTarget: number; // 0–1
}

/**
 * The output beat produced by the AI generation model.
 */
export interface GeneratedBeat {
  audioBlob?: Blob;
  audioUrl?: string; // object URL or remote URL
  actualBpm: number;
  actualDurationSeconds: number;
  bars: number;
  generationModel: string; // e.g. 'Lyria', 'MusicGen', 'AudioCraft'
  generationJobId?: string;

  /** How similar the generated beat is to the reference (0–1) */
  similarity: number;

  /** Full analysis of the generated beat (same pipeline as input) */
  analysis: ProfessionalBeatAnalysis;

  generatedAt: number; // Unix timestamp
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 4 — PhonosonicGrid (PCE: Phonosonic Coordinate Engine)
// ─────────────────────────────────────────────────────────────────────────────
//
// The 3D coordinate system: Beat Position (X) × Acoustic Resonance (Y) × Phoneme Category (Z→color)
// This is the visual geometric map for lyric placement per the research document §2 and the PCE concept.

/**
 * Arabic phoneme categories with associated visual colors.
 * Each category has unique acoustic properties that interact differently with beat positions.
 */
export type PhonemeCategory =
  | 'sun_letter'   // حروف شمسية: ت ث د ذ ر ز س ش ص ض ط ظ ل ن
  | 'moon_letter'  // حروف قمرية: ا ب ج ح خ ع غ ف ق ك م ه و ي
  | 'heavy_vowel'  // فتحة طويلة / ضمة — ثقيلة صوتياً
  | 'light_vowel'  // كسرة / سكون — خفيفة
  | 'fricative'    // احتكاكي: س ش خ ف ح
  | 'plosive'      // انفجاري: ب ت د ك ق
  | 'emphatic'     // مفخم: ص ض ط ظ — high acoustic weight
  | 'nasal'        // أنفي: م ن
  | 'glottal'      // حلقي/لهوي: ع غ ه ء
  | 'lateral'      // جانبي: ل ر
  | 'silence';     // صمت / breathing space

export const PHONEME_COLORS: Record<PhonemeCategory, string> = {
  sun_letter:  '#D4A017', // gold     — الذهبي للحروف الشمسية
  moon_letter: '#4A90D9', // blue     — الأزرق للحروف القمرية
  heavy_vowel: '#E74C3C', // red      — الأحمر للحركات الثقيلة
  light_vowel: '#2ECC71', // green    — الأخضر للحركات الخفيفة
  fricative:   '#9B59B6', // purple   — البنفسجي للاحتكاكي
  plosive:     '#E67E22', // orange   — البرتقالي للانفجاري
  emphatic:    '#C0392B', // dark-red — الأحمر الغامق للمفخم
  nasal:       '#1ABC9C', // teal     — الفيروزي للأنفي
  glottal:     '#F39C12', // amber    — الكهرماني للحلقي
  lateral:     '#3498DB', // lt-blue  — الأزرق الفاتح للجانبي
  silence:     'transparent',
};

/**
 * X-Axis: Beat position grid (1–16 = one full bar in 16th notes).
 */
export interface BeatAxis {
  totalSteps: 16;
  stepDurationMs: number;

  positions: Array<{
    step: number; // 1–16
    timestampMs: number;
    isDownbeat: boolean; // steps 1, 5, 9, 13
    metricWeight: 'heavy' | 'medium' | 'light';
    hasKick: boolean;
    hasSnare: boolean;
    energy: number; // 0–1 from DynamicMap
  }>;

  /** Recommended positions for anchor/rhyme syllables */
  strongPositions: number[]; // e.g. [1, 5, 9, 13] — kick-aligned
  weakPositions: number[]; // off-beat — good for connecting syllables
}

/**
 * Y-Axis: Acoustic resonance zones — vertical layers in the grid.
 * Each zone corresponds to a frequency/energy register within the beat.
 */
export interface ResonanceZone {
  id: string;
  arabicName: string; // e.g. "منطقة الجهير"
  englishName: string;
  frequencyRange: [low: number, high: number]; // Hz
  resonanceLevel: number; // 0–1, intensity of this zone in the beat
  pocketType: 'on-beat' | 'ahead' | 'behind' | 'pocket';
  microTimingOffsetMs: number; // negative = ahead of beat (urgent), positive = behind (laid-back)
  recommendedPhonemeCategories: PhonemeCategory[];
}

export interface ResonanceAxis {
  zones: ResonanceZone[];
  activeZoneId: string; // currently most energetic zone
  overallMicroTimingMs: number; // global push/pull for the beat's groove feel
}

/**
 * Z-Axis (color-encoded): Phoneme category layer.
 * Each entry defines how a phoneme category behaves in the coordinate space.
 */
export interface PhonemeAxisEntry {
  category: PhonemeCategory;
  color: string; // hex from PHONEME_COLORS
  moraWeight: number; // phonetic mora weight (1 = light, 2 = heavy)
  preferredBeatPositions: number[]; // which steps in 1–16 work best for this category
  arabicExamples: string[]; // example Arabic letters/phonemes
  sonicCharacter: string; // brief description for UI
  compatibleResonanceZones: string[]; // zone ids that resonate well with this phoneme type
}

export interface PhonemeAxis {
  entries: PhonemeAxisEntry[];
  colorLegend: Record<PhonemeCategory, string>;
}

/**
 * A single cell in the 3D coordinate grid.
 * Coordinates: (x=beat_step, y=resonance_zone_index, z=phoneme_category)
 */
export interface GridCell {
  x: number; // beat step 1–16
  y: number; // resonance zone index (0-based)
  z: PhonemeCategory; // phoneme category (visualized as color)

  isEmpty: boolean;
  isAnchorPoint: boolean; // strong position for rhyme/emphasis
  isBreathingSpace: boolean; // from DynamicMap.silenceArchitecture

  /** Suggested phoneme for Arabic lyric writing */
  suggestedArabicPhoneme?: string; // e.g. "ق", "م", "آ"
  optimalWordEnding?: string; // e.g. "ين", "ان", "ة"

  moraWeight: number; // how many morae this cell slot supports
  syncScore: number; // 0–1, how well a phoneme placed here syncs with the beat
  dynamicIntensity: number; // energy value from the beat at this position

  visualColor: string; // hex, derived from z (PhonemeCategory)
}

/**
 * The complete PhonosonicGrid — the geometric coordinate map for lyric placement.
 * This is the core of the PCE (Phonosonic Coordinate Engine).
 *
 * Dimensions:
 *   X: 16 beat positions (one bar in 16th notes)
 *   Y: N resonance zones (typically 4–6)
 *   Z: PhonemeCategory (color-encoded, not a spatial axis)
 *
 * Usage: Arabic lyrics are written to fill cells in this grid,
 * aligning syllables to coordinates for professional flow engineering.
 */
export interface PhonosonicGrid {
  beatAxis: BeatAxis;
  resonanceAxis: ResonanceAxis;
  phonemeAxis: PhonemeAxis;

  /**
   * 2D matrix [step 1–16][zone index].
   * The Z dimension (phoneme category) is encoded per-cell as `GridCell.z`.
   */
  cells: GridCell[][];

  totalMoraCapacity: number; // total mora slots across the whole grid
  recommendedMoraRange: [min: number, max: number]; // ideal mora count for one bar

  coordinateSystem: {
    xLabel: 'beat_position';
    yLabel: 'acoustic_resonance';
    zLabel: 'phoneme_category';
    colorEncoding: Record<PhonemeCategory, string>;
  };

  /** SVG visual map string — can be rendered directly into <div dangerouslySetInnerHTML> */
  visualMap: {
    svgString?: string;
    colorMatrix: string[][]; // [step][zone] hex colors for quick rendering
    annotationOverlay?: string; // SVG overlay with lyric annotations
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 5a — Lyric Placement Map
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DTW (Dynamic Time Warping) alignment between lyric phoneme sequence and beat grid.
 * Per دراسة_فلو §3: محاذاة الصوت والكلمات عبر التواء الزمن الديناميكي
 */
export interface DTWAlignment {
  /** Phoneme duration sequence (ms) — the "query" sequence */
  phonemeSequence: Array<{ phoneme: string; durationMs: number; category: PhonemeCategory }>;
  /** Beat position sequence (ms timestamps) — the "reference" sequence */
  beatPositionSequence: number[];
  /** Optimal warping path: pairs of [phoneme_index, beat_position_index] */
  warpPath: Array<[number, number]>;
  /** Overall alignment quality 0–1 */
  alignmentScore: number;
  /** Per-phoneme micro-timing adjustments (negative = push ahead, positive = lay back) */
  microTimingAdjustments: Array<{
    phonemeIndex: number;
    gridPosition: number;
    offsetMs: number;
    timingType: 'ahead' | 'on-beat' | 'behind';
  }>;
}

/** A zone within the grid where lyrics are placed */
export interface PlacementZone {
  id: string;
  gridCells: Array<{ x: number; y: number }>;
  capacity: number; // max mora count for this zone
  currentLoad: number; // currently placed morae
  isAnchorPoint: boolean; // for rhyme/emphasis syllable
  placementType: 'strong' | 'weak' | 'pocket' | 'overflow';
  suggestedContent?: string; // Arabic text suggestion
}

/**
 * The complete lyric placement map: where to write each word/syllable on the grid.
 */
export interface LyricPlacementMap {
  grid: PhonosonicGrid;
  zones: PlacementZone[];

  /** Key anchor points for rhymes and stressed syllables */
  anchorPoints: Array<{
    gridX: number;
    gridY: number;
    phonemeCategory: PhonemeCategory;
    moraWeight: number;
    isRhymePoint: boolean;
    suggestedEnding?: string; // e.g. "ين", "ات", "ة"
  }>;

  dtwAlignment: DTWAlignment;

  /** Per-step lyric writing guide */
  barWritingGuide: Array<{
    gridPosition: number; // 1–16
    resonanceZone: string;
    suggestedArabicPhoneme: string;
    optimalWordEnding?: string;
    moraWeight: number;
    timingHint: 'ahead' | 'on-beat' | 'behind';
    isBreath: boolean;
    isFillable: boolean; // can accept an extra syllable
    isOverCapacity: boolean; // exceeds recommended mora weight
  }>;

  /** Overflow / pocket zones (spillover from main bar) */
  overflowZones: Array<{
    startPosition: number;
    endPosition: number;
    type: 'pocket' | 'spillover' | 'anticipation';
    capacityMs: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 5b — Flow Engineering Profile
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rhyme scheme analysis and generation spec.
 * Per دراسة_فلو §1: النمذجة الحاسوبية للقوافي
 */
export interface RhymeScheme {
  pattern: string; // e.g. 'AABB', 'ABAB', 'AAAA', 'nested'
  internalRhymes: Array<{
    gridPosition: number;
    phoneme: string;
    partnerPosition: number; // the other position this rhymes with
    rhymeType: 'exact' | 'assonance' | 'consonance' | 'slant';
  }>;
  externalRhymes: Array<{
    lineEndPosition: number;
    phoneme: string;
    pairLineEndPosition: number;
    rhymeType: 'exact' | 'assonance' | 'consonance' | 'slant';
  }>;
  multisyllabicClusters: Array<{
    startPosition: number;
    length: number;
    phonemes: string[];
    rhymeTarget?: string; // the cluster this maps to
  }>;
  /** Rhyme density: ratio of positions with active rhyme to total positions (0–1) */
  rhymeDensity: number;
}

/**
 * The phonetic cadence (Phonetic Cadence) of the bar — rhythm of vowels and consonants.
 * Per دراسة_فلو §3: الإيقاع اللفظي
 */
export interface PhoneticCadenceMap {
  /** Ratio of vowels to consonants in the bar (higher = more melodic, easier to rap) */
  vowelConsonantRatio: number;
  /** Per-step stress pattern across the 16 positions */
  stressPattern: Array<'heavy' | 'medium' | 'light' | 'rest'>;
  /** Dominant cadence type */
  cadenceType: 'laid-back' | 'on-beat' | 'aggressive' | 'syncopated' | 'triplet' | 'double-time';
  /** How naturally the phonetic pattern flows with the beat (0–1) */
  naturalFlowScore: number;
  /** Specific Arabic phonetic metrics */
  arabicMetrics: {
    sunMoonLetterBalance: number; // ratio of sun to moon letters (affects assimilation)
    emphaticDensity: number; // ratio of مفخمات (emphatic consonants)
    vowelHarmony: number; // consistency of vowel patterns
    tashkilScore: number; // how many diacritics are implied (affects pronunciation clarity)
  };
}

/**
 * The complete flow engineering profile for a bar.
 * Integrates rhyme scheme, DTW timing, micro-timing grid, and LSA coherence.
 */
export interface FlowEngineeringProfile {
  rhymeScheme: RhymeScheme;
  phoneticCadence: PhoneticCadenceMap;

  /**
   * Per-step micro-timing grid.
   * Implements "push and pull" per دراسة_فلو §3: Micro-timing Adjustment using DTW.
   * Negative offset = ahead of beat (urgency, aggression)
   * Positive offset = behind beat (laid-back, cool)
   */
  microTimingGrid: Array<{
    gridPosition: number; // 1–16
    timing: 'ahead' | 'on-beat' | 'behind';
    offsetMs: number;
    dramaticIntent: 'urgency' | 'calm' | 'neutral' | 'climax' | 'resolve';
    reason?: string;
  }>;

  /**
   * Rhyme density metric — key quality benchmark from دراسة_فلو §4.4.
   * World-class threshold: > 0.7 (the study cites 21% improvement over human baselines
   * when density is mathematically maximized)
   */
  rhymeDensityMetric: number; // 0–1, target ≥ 0.7 for world-class

  internalRhymeCount: number;
  externalRhymeCount: number;

  /** Classification of the overall flow feel */
  flowType: 'flowing' | 'choppy' | 'triplet' | 'double-time' | 'half-time' | 'polymetric';

  /**
   * Latent Semantic Analysis coherence score per دراسة_فلو §4.2.
   * Measures semantic coherence between lines — ensures meaning is preserved
   * when fitting words to the beat grid.
   */
  lsaCoherenceScore: number; // 0–1

  /**
   * DTW alignment score: how well the phoneme sequence matches the beat grid
   * (combines micro-timing precision with grid alignment quality)
   */
  dtwAlignmentScore: number; // 0–1

  /** Dominant emotional/dramatic arc of the bar */
  emotionalArc: 'ascending' | 'descending' | 'flat' | 'wave';
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 6 — Quality Benchmark Report
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Automated quality assessment per the benchmark framework in دراسة_فلو §4.4.
 * Four quality dimensions, each with its own AI algorithm reference.
 */
export interface QualityBenchmarkReport {
  overallScore: number; // 0–100

  /**
   * Semantic Coherence — LSA + PLSA analysis
   * Algorithm: Latent Semantic Analysis / Probabilistic LSA
   * Goal: Ensure narrative coherence is not sacrificed for rhyme
   */
  semanticCoherence: {
    score: number; // 0–100
    lsaScore: number; // raw LSA coherence
    thematicProgressionScore: number; // how well themes develop bar-to-bar
    polysemyRisk: number; // risk of unintended double meaning
    details: string;
    isWorldClassReady: boolean;
  };

  /**
   * Rhythmic Accuracy — DTW + Transient Peak alignment
   * Algorithm: Dynamic Time Warping, Peak Detection
   * Goal: Stress syllables land precisely on kick/snare transients
   */
  rhythmicAccuracy: {
    score: number; // 0–100
    dtwAlignmentScore: number;
    transientMatchRate: number; // % of heavy syllables aligned to kick/snare
    microTimingVariance: number; // ms, lower = more precise
    details: string;
    isWorldClassReady: boolean;
  };

  /**
   * Sonic Texture — Spectral Density + Vocal Presence
   * Algorithm: Spectral Density Analysis, Rectified Flow Matching (YingMusic-SVC concept)
   * Goal: Ensure the rap voice presence in mid-range without frequency masking
   */
  sonicTexture: {
    score: number; // 0–100
    spectralPresenceScore: number; // vocal presence in 200–3000 Hz range
    frequencyMaskingRisk: number; // 0 = none, 1 = high risk from beat
    warmthScore: number; // overall tonal warmth (perceptual quality)
    details: string;
    isWorldClassReady: boolean;
  };

  /**
   * Rhyme Density Metric — per §1 and §4.4 of the research.
   * Research benchmark: > 0.7 density surpasses human performance by ~21%
   */
  rhymeDensity: {
    score: number; // 0–100
    density: number; // 0–1
    internalRhymeScore: number;
    multisyllabicScore: number;
    exceedsWorldClassThreshold: boolean; // density > 0.70
    details: string;
    isWorldClassReady: boolean;
  };

  /** Aggregate readiness flag */
  isWorldClassReady: boolean;

  /** Prioritized improvement recommendations */
  recommendations: string[];

  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE ORCHESTRATOR STATE
// ─────────────────────────────────────────────────────────────────────────────

/** All 7 pipeline stages with their status */
export type PipelineStage =
  | 'idle'
  | 'ingesting'       // Stage 1: fetching YouTube audio
  | 'analyzing'       // Stage 2: ProfessionalBeatAnalysis
  | 'generating'      // Stage 3: BeatGenerationSpec + GeneratedBeat
  | 'grid_building'   // Stage 4: PhonosonicGrid construction
  | 'flow_engineering'// Stage 5: LyricPlacementMap + FlowEngineeringProfile
  | 'quality_check'   // Stage 6: QualityBenchmarkReport
  | 'complete'
  | 'error';

/**
 * Global state for the entire Beat-to-Lyric pipeline.
 * Store this in useEditorStore or a dedicated pipelineStore.
 */
export interface PipelineState {
  stage: PipelineStage;
  progress: number; // 0–100

  // Stage inputs/outputs (populated as pipeline progresses)
  request?: YouTubeIngestionRequest;
  beatAnalysis?: ProfessionalBeatAnalysis;
  generationSpec?: BeatGenerationSpec;
  generatedBeat?: GeneratedBeat;
  phonosonicGrid?: PhonosonicGrid;
  lyricPlacementMap?: LyricPlacementMap;
  flowProfile?: FlowEngineeringProfile;
  qualityReport?: QualityBenchmarkReport;

  // Error handling
  error?: string;
  errorStage?: PipelineStage;

  // UI hints
  currentBarText?: string; // the Arabic bar being written
  activeCellCoordinates?: { x: number; y: number }; // currently selected grid cell
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Bar stored in the repository (extends existing BarType in repositoryStore) */
export interface EnhancedBar {
  id: string;
  text: string; // Arabic bar text
  createdAt: number;

  // Analysis results
  moraProfile?: {
    totalMorae: number;
    lightMorae: number;
    heavyMorae: number;
    syllables: Array<{ text: string; weight: 'light' | 'heavy'; position: number }>;
  };
  flowProfile?: FlowEngineeringProfile;
  lyricMap?: LyricPlacementMap;
  qualityReport?: QualityBenchmarkReport;

  // Categorization
  tags: string[];
  isFavorite: boolean;
  serialNumber: number;

  // Associated beat
  beatId?: string; // references a GeneratedBeat or uploaded beat
  beatAnalysis?: ProfessionalBeatAnalysis;
}

/** Grid coordinates for the phonosonic system */
export interface GridCoordinates {
  x: number; // beat step 1–16
  y: number; // resonance zone index
  z: PhonemeCategory; // color-coded phoneme axis
}

/** A single phoneme placed on the grid */
export interface PlacedPhoneme {
  coordinates: GridCoordinates;
  arabicChar: string;
  category: PhonemeCategory;
  color: string;
  moraWeight: number;
  timestampMs: number;
  syncScore: number;
}
