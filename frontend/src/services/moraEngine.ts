/**
 * MAQAM v2.0 - Arabic Mora Analyzer + Elite Acoustic Resonance Engine
 * =====================================================================
 * Phase 1 Upgrade: Phonetic Resonance & Acoustic Bar-Role Classification
 *
 * New Capabilities:
 *  - Full Arabic Phonetic Trait Matrix (Qalqala, Rakhwa, Shidda, Safir, Hulqi,
 *    Shafawi, Takrir, Mutawassita, Voiced/Whispered)
 *  - AcousticResonanceProfile: per-bar resonance fingerprint
 *  - Bar Role Suggestion: punchline / bridge / hook / verse_body / intro
 *  - Resonance Fingerprint Code: compact alphanumeric signature
 *  - Emotional Acoustic Signature: human-readable characterization
 */

// ─── Core Dialect Types ──────────────────────────────────────────────────────
export type ArabicDialect = 'fusha' | 'sudanese' | 'gulf' | 'egyptian' | 'maghrebi';

// ─── Mora Interfaces (original, preserved) ───────────────────────────────────
export interface MoraUnit {
  text: string;
  type: 'CV' | 'CVC' | 'CVV' | 'CVVC';
  morae: 1 | 2 | 3;
  phonemeClass: 'explosive' | 'resonant' | 'fricative' | 'pharyngeal' | 'vowel';
}

export interface MoraProfile {
  units: MoraUnit[];
  totalMorae: number;
  sonicWeight: number;
  rhythmicWeight: number;
  syllables?: number;
  rhythm?: number;
  rhymeScore?: number;
}

// ─── NEW: Phonetic Property Interface ────────────────────────────────────────
export interface PhoneticProperty {
  char: string;
  isQalqala: boolean;         // قلقلة – echo/bounce consonants: ق ط ب ج د
  isVoiced: boolean;          // مجهورة – vocal cord vibration present
  isWhispered: boolean;       // مهموسة – no vocal cord vibration
  isShidda: boolean;          // شديدة – complete oral stop/plosive
  isRakhwa: boolean;          // رخوة – fricative/continuant, air flows
  isMutawassita: boolean;     // متوسطة – approximants: between stop and fricative
  isSafir: boolean;           // صفيرية – sibilant whistle: ز س ص
  isHulqi: boolean;           // حلقية – pharyngeal/glottal depth: ع ح غ خ ء ه
  isShafawi: boolean;         // شفوية – labial: ب م و ف
  isTakrir: boolean;          // تكراري – trill/rhotic: ر
  articulationZone:
    | 'labial'
    | 'dental'
    | 'alveolar'
    | 'palatal'
    | 'velar'
    | 'pharyngeal'
    | 'glottal'
    | 'uvular'
    | 'vowel';
}

// ─── NEW: Phoneme Characterization ──────────────────────────────────────────
export interface PhonemeCharacterization {
  hardness: number; // 0-100
  softness: number; // 0-100
  nasality: number; // 0-100
  dominantTrait: 'hard' | 'soft' | 'nasal' | 'balanced';
  description: string;
}

// ─── NEW: Acoustic Resonance Profile ─────────────────────────────────────────
export type DominantAcousticCharacter =
  | 'aggressive'   // high qalqala + high shidda → hard-hitting punchlines
  | 'smooth'       // high rakhwa + high voiced → melodic, flowing
  | 'percussive'   // high shidda + medium qalqala → drum-like, rhythmic
  | 'ethereal'     // high pharyngeal + high voiced → deep, soulful
  | 'balanced';    // no dominant trait

export type BarRole =
  | 'punchline'    // peak impact line — dense, qalqala-heavy
  | 'bridge'       // transition line — smooth, rakhwa-dominant
  | 'hook'         // catchy, mid-resonance, memorable
  | 'verse_body'   // standard verse filler
  | 'intro';       // low-density, atmospheric opener

export interface AcousticResonanceProfile {
  /** Intensity of قلقلة bounce (ق ط ب ج د) — 0–100 */
  qalqalaIntensity: number;
  /** Softness index — ratio of fricative/continuant consonants — 0–100 */
  rakhwaIndex: number;
  /** Hardness score — density of plosive stops — 0–100 */
  shiddaScore: number;
  /** Sibilant density (ز س ص) — whistling, cutting presence — 0–100 */
  safirDensity: number;
  /** Pharyngeal depth (ع ح غ خ ء ه) — back-of-throat resonance — 0–100 */
  hulqiDepth: number;
  /** Ratio of voiced consonants to total consonants — 0.0–1.0 */
  voicedRatio: number;
  /** Composite resonance power score — 0–100 */
  overallResonance: number;
  /** Primary acoustic personality of this bar */
  dominantCharacter: DominantAcousticCharacter;
  /** Recommended structural role for this bar */
  suggestedRole: BarRole;
  /** Compact alphanumeric fingerprint e.g. "Q4-R2-S3-H1" */
  resonanceFingerprint: string;
  /** Human-readable emotional description in Arabic */
  emotionalSignature: string;
  /** Raw phoneme count map for debugging/visualization */
  phonemeCountMap: Record<string, number>;
}

// ─── Main MoraEngine Class ────────────────────────────────────────────────────
export class MoraEngine {

  // ── Original phoneme classification tables (preserved) ──
  private explosive  = ['ب','ت','د','ط','ق','ك','ض','ج','ء','أ','إ','آ'];
  private pharyngeal = ['ع','غ','ح','خ','هـ','ه','ة'];
  private fricative  = ['ش','س','ز','ف','ث','ذ','ظ','ص'];
  private resonant   = ['م','ن','ل','ر'];
  private vowels     = ['ا','و','ي','ى'];

  private emotionMap = {
    'حزن وحنين':       ['ا','و','ي','م'],
    'قوة وغضب':        ['ص','ض','ط','ق'],
    'دفء وحنان':       ['ح'],
    'فرح وانشراح':     ['هـ','ه'],
    'هدوء وسكينة':     ['س'],
  };

  private phoneticTraits = {
    'شديدة (قوة وقطع)': ['أ','ج','د','ق','ط','ب','ك','ت','ء','إ','آ'],
    'متوسطة (توازن)':   ['ل','ن','ع','م','ر'],
  };

  // ── NEW: Elite Phoneme Trait Tables ──────────────────────────────────────
  private readonly QALQALA: Set<string> = new Set(['ق','ط','ب','ج','د']);

  private readonly VOICED: Set<string> = new Set([
    'ب','ج','د','ذ','ر','ز','ض','ظ','ع','غ','ل','م','ن','و','ي','أ','ء','ئ','ؤ',
  ]);

  private readonly WHISPERED: Set<string> = new Set([
    'ت','ث','ح','خ','س','ش','ص','ط','ف','ك','هـ','ه',
  ]);

  /** صوامت شديدة — complete oral stop, no airflow during articulation */
  private readonly SHIDDA_STOPS: Set<string> = new Set([
    'ب','ت','د','ط','ق','ك','ض','ج','ء','أ','إ','آ',
  ]);

  /** صوامت رخوة — fricatives/continuants, air flows through constriction */
  private readonly RAKHWA_FRICATIVES: Set<string> = new Set([
    'ث','ح','خ','ذ','ز','س','ش','ص','ظ','ع','غ','ف','هـ','ه',
  ]);

  /** متوسطة — approximants/nasals/liquids */
  private readonly MUTAWASSITA: Set<string> = new Set(['ل','ن','ر','م','و','ي']);

  /** صفيرية — sibilant whistle consonants */
  private readonly SAFIR: Set<string> = new Set(['ز','س','ص']);

  /** حلقية + حلقية-حنجرية — pharyngeal and glottal */
  private readonly HULQI: Set<string> = new Set(['ع','ح','غ','خ','ء','هـ','ه']);

  /** شفوية — labial consonants */
  private readonly SHAFAWI: Set<string> = new Set(['ب','م','و','ف']);

  /** تكراري — trill/rhotic */
  private readonly TAKRIR: Set<string> = new Set(['ر']);

  private readonly ARTICULATION_ZONES: Record<string, PhoneticProperty['articulationZone']> = {
    'ب': 'labial', 'م': 'labial', 'و': 'labial', 'ف': 'labial',
    'ت': 'dental', 'ث': 'dental', 'د': 'dental', 'ذ': 'dental', 'ظ': 'dental',
    'ن': 'alveolar', 'ل': 'alveolar', 'ر': 'alveolar', 'ز': 'alveolar',
    'س': 'alveolar', 'ص': 'alveolar',
    'ج': 'palatal', 'ي': 'palatal', 'ش': 'palatal',
    'ك': 'velar', 'غ': 'uvular', 'خ': 'uvular', 'ق': 'uvular',
    'ع': 'pharyngeal', 'ح': 'pharyngeal',
    'ء': 'glottal', 'هـ': 'glottal', 'ه': 'glottal',
    'ط': 'dental', 'ض': 'alveolar',
    'ا': 'vowel', 'ى': 'vowel',
  };

  // ────────────────────────────────────────────────────────────────────────────
  //  ORIGINAL PUBLIC METHODS (preserved exactly)
  // ────────────────────────────────────────────────────────────────────────────

  getSlantRhymeGroup(phoneme: string): string {
    if (!phoneme) return 'أخرى';
    const lastChar = phoneme.slice(-1);
    if (['د','ت','ط','ض'].includes(lastChar)) return 'نطعية/مائلة (د، ت، ط، ض)';
    if (['ب','م','ف'].includes(lastChar))     return 'شفوية/مائلة (ب، م، ف)';
    if (['ق','ك','غ','خ'].includes(lastChar)) return 'لهوية/مائلة (ق، ك، غ، خ)';
    if (['س','ص','ز','ش'].includes(lastChar)) return 'أسلية/مائلة (س، ص، ز، ش)';
    if (['ل','ن','ر'].includes(lastChar))     return 'ذلقية/مائلة (ل، ن، ر)';
    if (['ع','ح','هـ','ه','ء','أ','إ','آ','ة'].includes(lastChar))
      return 'حلقية/مائلة (ع، ح، هـ، ء)';
    if (['ا','و','ي','ى'].includes(lastChar)) return 'جوفية/مائلة (ا، و، ي)';
    return 'أخرى';
  }

  getEmotionalTone(text: string): string {
    let maxEmotion = 'محايد';
    let maxScore   = 0;
    const cleanText = text.replace(/[^ء-ي]/g, '');
    if (!cleanText) return maxEmotion;
    for (const [emotion, letters] of Object.entries(this.emotionMap)) {
      let count = 0;
      for (const char of cleanText) if (letters.includes(char)) count++;
      const score = count / letters.length;
      if (score > maxScore) { maxScore = score; maxEmotion = emotion; }
    }
    return maxScore > 0 ? maxEmotion : 'محايد';
  }

  getPhoneticTrait(text: string): string {
    let shdeeda = 0, mutawassita = 0, rakhwa = 0;
    const cleanText = text.replace(/[^ء-ي]/g, '');
    if (!cleanText) return 'غير محدد';
    for (const char of cleanText) {
      if (this.phoneticTraits['شديدة (قوة وقطع)'].includes(char)) shdeeda++;
      else if (this.phoneticTraits['متوسطة (توازن)'].includes(char)) mutawassita++;
      else rakhwa++;
    }
    const max = Math.max(shdeeda, mutawassita, rakhwa);
    if (max === shdeeda)     return 'شديدة (قوة وقطع)';
    if (max === mutawassita) return 'متوسطة (توازن)';
    return 'رخوة (ليونة واستمرارية)';
  }

  extractCorePhoneme(text: string): string {
    if (!text) return '';
    let cleanText = text.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
    cleanText = cleanText.replace(/[^ء-ي]/g, '');
    if (cleanText.length === 0) return '';
    if (cleanText.length === 1) return cleanText;
    return cleanText.slice(-2);
  }

  analyze(text: string, dialect: ArabicDialect = 'fusha'): MoraProfile {
    const normalized   = this.normalize(text, dialect);
    const units        = this.segment(normalized);
    const totalMorae   = units.reduce((sum, u) => sum + u.morae, 0);
    const sonicWeight  = this.computeSonicWeight(units, totalMorae);
    const rhythmicWeight = this.computeRhythmicWeight(units, totalMorae);
    const syllables = units.length;
    const rhythm = rhythmicWeight;
    const rhymeScore = Math.min(100, totalMorae * 10); // placeholder
    return { units, totalMorae, sonicWeight, rhythmicWeight, syllables, rhythm, rhymeScore };
  }

  getStressCode(text: string): string {
    const words = text.trim().split(/\s+/);
    return words.map(word => {
      const normalized = this.normalize(word, 'fusha');
      const units = this.segment(normalized);
      return units.map(u => u.morae > 1 ? '#' : '/').join('');
    }).join(' ');
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  NEW PUBLIC METHODS: ACOUSTIC RESONANCE ENGINE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Returns the full phonetic property set for a single Arabic consonant.
   * This is the atomic unit of the acoustic resonance analysis.
   */
  getPhoneticProperties(char: string): PhoneticProperty {
    return {
      char,
      isQalqala:    this.QALQALA.has(char),
      isVoiced:     this.VOICED.has(char),
      isWhispered:  this.WHISPERED.has(char),
      isShidda:     this.SHIDDA_STOPS.has(char),
      isRakhwa:     this.RAKHWA_FRICATIVES.has(char),
      isMutawassita: this.MUTAWASSITA.has(char),
      isSafir:      this.SAFIR.has(char),
      isHulqi:      this.HULQI.has(char),
      isShafawi:    this.SHAFAWI.has(char),
      isTakrir:     this.TAKRIR.has(char),
      articulationZone:
        this.ARTICULATION_ZONES[char] ?? 'alveolar',
    };
  }

  /**
   * The core acoustic resonance analysis method.
   * Processes a full bar text and returns a rich AcousticResonanceProfile.
   *
   * Scoring model:
   *  qalqalaIntensity  = (qalqalaCount / consonantCount) * 100 * 1.6  (capped 100)
   *  rakhwaIndex       = (rakhwaCount  / consonantCount) * 100
   *  shiddaScore       = (shiddaCount  / consonantCount) * 100 * 1.2
   *  safirDensity      = (safirCount   / consonantCount) * 100 * 2.0  (rare, boosted)
   *  hulqiDepth        = (hulqiCount   / consonantCount) * 100 * 1.3
   *  voicedRatio       = voicedCount   / consonantCount
   *
   *  overallResonance  = weighted composite (see formula below)
   */
  analyzeAcousticResonance(text: string): AcousticResonanceProfile {
    const cleanText = text.replace(/[\u064B-\u065F\u0670\u0640\s]/g, '');
    const chars = Array.from(cleanText).filter(c => /[\u0600-\u06FF]/.test(c));

    if (chars.length === 0) {
      return this.emptyResonanceProfile();
    }

    // ── Count each category ──────────────────────────────────────────────
    let qalqalaCount  = 0;
    let rakhwaCount   = 0;
    let shiddaCount   = 0;
    let safirCount    = 0;
    let hulqiCount    = 0;
    let voicedCount   = 0;
    let consonantCount = 0;
    const phonemeCountMap: Record<string, number> = {};

    for (const char of chars) {
      // Skip pure vowel letters (حروف المد الطويلة)
      if (['ا','و','ي','ى'].includes(char)) continue;

      consonantCount++;
      phonemeCountMap[char] = (phonemeCountMap[char] ?? 0) + 1;

      if (this.QALQALA.has(char))          qalqalaCount++;
      if (this.RAKHWA_FRICATIVES.has(char)) rakhwaCount++;
      if (this.SHIDDA_STOPS.has(char))      shiddaCount++;
      if (this.SAFIR.has(char))             safirCount++;
      if (this.HULQI.has(char))             hulqiCount++;
      if (this.VOICED.has(char))            voicedCount++;
    }

    if (consonantCount === 0) return this.emptyResonanceProfile();

    // ── Raw ratios → scored indices (0–100) ─────────────────────────────
    const qalqalaIntensity = Math.min(100, Math.round((qalqalaCount / consonantCount) * 100 * 1.6));
    const rakhwaIndex      = Math.min(100, Math.round((rakhwaCount  / consonantCount) * 100));
    const shiddaScore      = Math.min(100, Math.round((shiddaCount  / consonantCount) * 100 * 1.2));
    const safirDensity     = Math.min(100, Math.round((safirCount   / consonantCount) * 100 * 2.0));
    const hulqiDepth       = Math.min(100, Math.round((hulqiCount   / consonantCount) * 100 * 1.3));
    const voicedRatio      = parseFloat((voicedCount / consonantCount).toFixed(3));

    // ── Overall Resonance: weighted composite ────────────────────────────
    // Formula rationale:
    //   Qalqala carries maximum impact weight (punch)
    //   Shidda adds percussive hardness
    //   Hulqi adds depth and soulfulness
    //   Rakhwa and Safir are secondary colour
    //   Voiced ratio boosts fluidity
    const overallResonance = Math.min(100, Math.round(
      qalqalaIntensity * 0.32 +
      shiddaScore      * 0.24 +
      hulqiDepth       * 0.18 +
      (voicedRatio * 100) * 0.12 +
      safirDensity     * 0.08 +
      rakhwaIndex      * 0.06
    ));

    const dominantCharacter = this.classifyAcousticCharacter(
      qalqalaIntensity, rakhwaIndex, shiddaScore, hulqiDepth, voicedRatio
    );

    const suggestedRole = this.inferBarRole(
      qalqalaIntensity, rakhwaIndex, shiddaScore, hulqiDepth, overallResonance
    );

    const resonanceFingerprint = this.buildResonanceFingerprint(
      qalqalaIntensity, rakhwaIndex, safirDensity, hulqiDepth
    );

    const emotionalSignature = this.buildEmotionalSignature(
      dominantCharacter, qalqalaIntensity, rakhwaIndex, hulqiDepth, safirDensity
    );

    return {
      qalqalaIntensity,
      rakhwaIndex,
      shiddaScore,
      safirDensity,
      hulqiDepth,
      voicedRatio,
      overallResonance,
      dominantCharacter,
      suggestedRole,
      resonanceFingerprint,
      emotionalSignature,
      phonemeCountMap,
    };
  }

  /**
   * Phoneme Characterization (Rap Academy Technique):
   * Identifies dominant traits like hardness (Shidda), softness (Rakhwa), and nasality (Ghunna).
   */
  analyzePhonemeCharacterization(text: string): PhonemeCharacterization {
    const chars = Array.from(text.replace(/[^ء-ي]/g, ''));
    if (chars.length === 0) {
      return { 
        hardness: 0, softness: 0, nasality: 0, 
        dominantTrait: 'balanced', 
        description: 'لا توجد بيانات صوتية كافية للتحليل.' 
      };
    }

    let hard = 0, soft = 0, nasal = 0;
    for (const char of chars) {
      if (this.SHIDDA_STOPS.has(char)) hard++;
      if (this.RAKHWA_FRICATIVES.has(char)) soft++;
      if (['م', 'ن'].includes(char)) nasal++;
    }

    const hardness = Math.min(100, Math.round((hard / chars.length) * 100));
    const softness = Math.min(100, Math.round((soft / chars.length) * 100));
    const nasality = Math.min(100, Math.round((nasal / chars.length) * 100));

    let dominantTrait: PhonemeCharacterization['dominantTrait'] = 'balanced';
    if (hardness > softness && hardness > nasality && hardness > 25) dominantTrait = 'hard';
    else if (softness > hardness && softness > nasality && softness > 25) dominantTrait = 'soft';
    else if (nasality > hardness && nasality > softness && nasality > 15) dominantTrait = 'nasal';

    const descMap = {
      hard: 'طابع حاد وقوي (Phonetic Hardness) يمنح البار قوة هجومية وصدمة صوتية واضحة.',
      soft: 'طابع رخو ولين (Phonetic Softness) يساعد على التدفق الانسيابي والسلاسة في الأداء.',
      nasal: 'طابع أنفي (Nasality) يخلق رنيناً متصلاً (Ghunna) يساعد على ربط الكلمات ببعضها.',
      balanced: 'طابع متوازن جرسياً يجمع بين القوة واللين بشكل معتدل.'
    };

    return { 
      hardness, 
      softness, 
      nasality, 
      dominantTrait, 
      description: descMap[dominantTrait] 
    };
  }

  /**
   * Returns a detailed phonetic properties array for every consonant in the text,
   * suitable for visualization (phoneme-by-phoneme colour mapping in the UI).
   */
  analyzePhonemeSequence(text: string): PhoneticProperty[] {
    const cleanText = text.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
    return Array.from(cleanText)
      .filter(c => /[\u0600-\u06FF]/.test(c) && !['ا','و','ي','ى'].includes(c))
      .map(c => this.getPhoneticProperties(c));
  }

  /**
   * Returns a compact "Acoustic Role Recommendation" string for display.
   * Example: "🔥 Punchline — رنين قلقلة عالي + صلابة شديدة"
   */
  getAcousticRoleLabel(profile: AcousticResonanceProfile): string {
    const roleLabels: Record<BarRole, string> = {
      punchline:  '🔥 Punchline — ذروة الصدمة الصوتية',
      bridge:     '🌊 Bridge — انتقال سلس ومتدفق',
      hook:       '🎯 Hook — تعليق لحني لاصق',
      verse_body: '📜 Verse Body — جسم البيت الأساسي',
      intro:      '🌫️ Intro — بداية جوية هادئة',
    };
    return roleLabels[profile.suggestedRole];
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  PRIVATE HELPERS: ACOUSTIC ENGINE
  // ────────────────────────────────────────────────────────────────────────────

  private classifyAcousticCharacter(
    qalqala: number, rakhwa: number, shidda: number,
    hulqi: number, voicedRatio: number
  ): DominantAcousticCharacter {
    const scores: Record<DominantAcousticCharacter, number> = {
      aggressive:  qalqala * 0.5 + shidda * 0.3 + (1 - rakhwa / 100) * 20,
      smooth:      rakhwa  * 0.5 + voicedRatio * 40 + (100 - qalqala) * 0.1,
      percussive:  shidda  * 0.45 + qalqala * 0.35 + (100 - rakhwa)  * 0.2,
      ethereal:    hulqi   * 0.55 + voicedRatio * 30 + rakhwa * 0.15,
      balanced:    50 - Math.abs(qalqala - rakhwa) * 0.3,
    };
    return (Object.entries(scores) as [DominantAcousticCharacter, number][])
      .reduce((a, b) => b[1] > a[1] ? b : a)[0];
  }

  private inferBarRole(
    qalqala: number, rakhwa: number, shidda: number,
    hulqi: number, overall: number
  ): BarRole {
    // Punchline: high punch + high shidda
    if (overall >= 68 && qalqala >= 45 && shidda >= 40) return 'punchline';
    // Bridge: smooth + low impact
    if (rakhwa >= 55 && qalqala <= 25 && overall < 60)  return 'bridge';
    // Hook: mid-range resonance + pharyngeal depth
    if (overall >= 42 && overall < 70 && hulqi >= 20)   return 'hook';
    // Intro: low overall resonance
    if (overall < 35)                                    return 'intro';
    // Default: verse body
    return 'verse_body';
  }

  /**
   * Compact fingerprint: Q{qalqala_tier}-R{rakhwa_tier}-S{safir_tier}-H{hulqi_tier}
   * Tiers: 0(0-19) 1(20-39) 2(40-59) 3(60-79) 4(80-99) 5(100)
   */
  private buildResonanceFingerprint(
    qalqala: number, rakhwa: number, safir: number, hulqi: number
  ): string {
    const tier = (v: number) => Math.min(5, Math.floor(v / 20));
    return `Q${tier(qalqala)}-R${tier(rakhwa)}-S${tier(safir)}-H${tier(hulqi)}`;
  }

  private buildEmotionalSignature(
    character: DominantAcousticCharacter,
    qalqala: number, rakhwa: number, hulqi: number, safir: number
  ): string {
    const characterDescriptions: Record<DominantAcousticCharacter, string> = {
      aggressive: 'بار قاتل — صدمة صوتية حادة ومتوهجة',
      smooth:     'بار متدفق — انسيابية لغوية وإيقاعية',
      percussive: 'بار إيقاعي — ضربات صوتية كالطبل',
      ethereal:   'بار روحاني — عمق حلقي دافئ وراسخ',
      balanced:   'بار متوازن — تنوع صوتي هادف',
    };

    const extras: string[] = [];
    if (qalqala >= 60) extras.push('قلقلة مكثفة');
    if (rakhwa >= 60)  extras.push('رخاوة مهيمنة');
    if (hulqi >= 50)   extras.push('حلقية غائرة');
    if (safir >= 40)   extras.push('صفير حاد');

    const base = characterDescriptions[character];
    return extras.length > 0 ? `${base} (${extras.join(' • ')})` : base;
  }

  private emptyResonanceProfile(): AcousticResonanceProfile {
    return {
      qalqalaIntensity: 0, rakhwaIndex: 0, shiddaScore: 0,
      safirDensity: 0, hulqiDepth: 0, voicedRatio: 0,
      overallResonance: 0,
      dominantCharacter: 'balanced',
      suggestedRole: 'verse_body',
      resonanceFingerprint: 'Q0-R0-S0-H0',
      emotionalSignature: 'بار فارغ أو غير محلل',
      phonemeCountMap: {},
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ORIGINAL PRIVATE METHODS (preserved exactly)
  // ────────────────────────────────────────────────────────────────────────────

  private normalize(text: string, dialect: ArabicDialect): string {
    let t = text.trim();
    t = t.replace(/[أإآ]/g, 'ا');
    t = t.replace(/ة/g, 'ه');
    return t;
  }

  private segment(text: string): MoraUnit[] {
    const units: MoraUnit[] = [];
    const chars = Array.from(text);
    let i = 0;
    while (i < chars.length) {
      const char = chars[i];
      if (char === ' ' || /[\u064B-\u065F]/.test(char)) { i++; continue; }
      const phonemeClass = this.getPhonemeClass(char);
      let type: MoraUnit['type'] = 'CV';
      let morae: MoraUnit['morae'] = 1;
      let unitText = char;
      if (chars[i + 1] === 'ّ') {
        morae = 2; unitText = char + 'ّ'; i += 2;
      } else if (this.vowels.includes(char)) {
        morae = 2; unitText = char; i += 1;
      } else {
        const next = chars[i + 1];
        if (next && this.vowels.includes(next)) {
          type = 'CVV'; morae = 2; unitText = char + next; i += 2;
        } else if (next && next !== ' ' && !/[\u064B-\u065F]/.test(next)) {
          type = 'CVC'; morae = 2; unitText = char + next; i += 2;
        } else {
          type = 'CV'; morae = 1; unitText = char; i += 1;
        }
      }
      units.push({ text: unitText, type, morae, phonemeClass });
    }
    return units;
  }

  private getPhonemeClass(char: string): MoraUnit['phonemeClass'] {
    if (this.explosive.includes(char))  return 'explosive';
    if (this.pharyngeal.includes(char)) return 'pharyngeal';
    if (this.fricative.includes(char))  return 'fricative';
    if (this.resonant.includes(char))   return 'resonant';
    return 'vowel';
  }

  private computeSonicWeight(units: MoraUnit[], totalMorae: number): number {
    const multipliers = {
      explosive: 1.4, pharyngeal: 1.3, fricative: 1.2, resonant: 1.1, vowel: 0.9,
    };
    const avgMultiplier = units.length > 0
      ? units.reduce((sum, u) => sum + multipliers[u.phonemeClass], 0) / units.length
      : 1;
    let densityMultiplier = 1.0;
    if      (totalMorae >= 14) densityMultiplier = 1.3;
    else if (totalMorae >= 10) densityMultiplier = 1.1;
    else if (totalMorae >= 7)  densityMultiplier = 1.0;
    else if (totalMorae >= 4)  densityMultiplier = 0.8;
    else                       densityMultiplier = 0.6;
    return Math.min(100, Math.round(totalMorae * avgMultiplier * densityMultiplier * 5));
  }

  private computeRhythmicWeight(units: MoraUnit[], totalMorae: number): number {
    const gridOccupancy = totalMorae / 16;
    return Math.min(100, Math.round(gridOccupancy * 100));
  }

  // ── Web Worker Integration (original, preserved) ──────────────────────────
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

  async analyzeAsync(text: string, dialect: ArabicDialect = 'fusha'): Promise<MoraProfile> {
    return this.dispatchToWorker<MoraProfile>('analyze', [text, dialect]);
  }

  async extractCorePhonemeAsync(text: string): Promise<string> {
    return this.dispatchToWorker<string>('extractCorePhoneme', [text]);
  }

  async processBatchAsync(texts: string[], dialect: ArabicDialect = 'fusha'): Promise<MoraProfile[]> {
    return this.dispatchToWorker<MoraProfile[]>('processBatch', [texts, dialect]);
  }

  /** Async wrapper for the new resonance analysis — dispatches to worker if available */
  async analyzeAcousticResonanceAsync(text: string): Promise<AcousticResonanceProfile> {
    return this.dispatchToWorker<AcousticResonanceProfile>('analyzeAcousticResonance', [text]);
  }

  /** Batch acoustic resonance analysis for bulk bar enrichment */
  async batchAcousticResonanceAsync(texts: string[]): Promise<AcousticResonanceProfile[]> {
    return this.dispatchToWorker<AcousticResonanceProfile[]>('batchAcousticResonance', [texts]);
  }
}

export const moraEngine = new MoraEngine();
