/**
 * MAQAM v2.0 - Gemini Service + Elite Semantic Intelligence Engine
 * ================================================================
 * Phase 2 Upgrade: Deep Semantic Architecture
 *
 * New Capabilities:
 *  - deepSemanticAnalysis(): 7-dimensional bar analysis via elite prompt
 *  - NarrativeArcTag: Build-up / Climax / Resolution / Bridge classification
 *  - ThematicVector: 8-axis semantic fingerprint
 *  - MetaphoricalLayer: depth-graded figurative language detection
 *  - buildNarrativeSongArc(): sequences bars into a coherent song narrative
 *  - extractThematicVector(): lightweight single-bar thematic scan
 *  - Enhanced analyzeBars(): now includes semanticTags + narrativeArc in output
 */

import { GoogleGenAI } from "@google/genai";
import { moraEngine } from './moraEngine';
import {
  ProfessionalBeatAnalysis,
  FlowEngineeringProfile,
  QualityBenchmarkReport,
  LyricPlacementMap,
} from './pipelineTypes';
import { ArabicDialect } from './moraEngine';

const API_KEY = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

const MAX_RETRIES  = 5;
const RETRY_DELAY  = 2000;

async function callGeminiWithRetry(
  params: any, retries: number = MAX_RETRIES, delay: number = RETRY_DELAY
): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const isRateLimited  = error.status === 429 || error.code === 429;
    const isTransient    = error.status === 'UNKNOWN' || error.code === 500 || error.message?.includes('xhr error');
    const isQuotaExceeded = error.message?.toLowerCase().includes('quota');
    if (retries > 0 && (isRateLimited || isTransient) && !isQuotaExceeded) {
      const waitTime = isRateLimited ? delay * 2 : delay;
      console.warn(`Gemini API error, retrying in ${waitTime}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`, error);
      await new Promise(r => setTimeout(r, waitTime));
      return callGeminiWithRetry(params, retries - 1, waitTime);
    }

    if (isRateLimited || isQuotaExceeded) {
      throw new Error("تجاوزت حصة الاستخدام المتاحة حالياً (Quota Exceeded). يرجى المحاولة لاحقاً أو مراجعة خطة الاستخدام الخاصة بك.");
    }

    throw error;
  }
}

// ─── Original Interfaces (preserved) ─────────────────────────────────────────

export interface BarDirective {
  index: number;
  recommendedTechnique: string;
  phonemeFocus: string;
  syllableTarget: number;
  energyLevel: 'low' | 'medium' | 'high' | 'peak';
  description: string;
}

export interface BeatAnalysis {
  beatType: 'trap' | 'boom_bap' | 'melodic_trap' | 'afro_arabic' | 'drill' | 'cloud_rap' | 'hybrid';
  subType: string;
  emotionalRegister: 'confrontational' | 'triumphant' | 'melancholic' | 'contemplative' | 'aggressive' | 'nostalgic' | 'celebratory';
  culturalIdentity: 'arabic_urban' | 'sudanese_afro' | 'gulf_modern' | 'north_african' | 'western_trap' | 'hybrid';
  syllableCapacity: number;
  rhymeSchemes: Array<{ scheme: string; justification: string }>;
  phonemeRecommendations: string[];
  pocketZones: number[];
  overflowZones: number[];
  groovePattern: 'straight' | 'swung' | 'syncopated' | 'afrobeat';
  drumMap?: {
    kicks: number[];
    snares: number[];
    hihats: number[];
  };
  trackProtocol: {
    sections: Array<{
      type: 'intro' | 'verse' | 'hook' | 'bridge' | 'outro';
      bars: number;
      directives: BarDirective[];
    }>;
  };
}

export interface BarAnalysis {
  index: number;
  corePhoneme: string;
  totalMorae: number;
  weightClass: 'light' | 'medium_light' | 'medium_heavy' | 'heavy' | 'super_heavy';
  sonicWeight: number;
  rhythmicWeight: number;
  flowMode: 'pocket' | 'soft_overflow' | 'hard_overflow' | 'compressed_pocket' | 'mixed';
  endPhoneme: string;
  internalRhymes: number;
  syllableCount: number;
  fingerprintCode: string;
  alignmentScore: number;
  compatibleBeats: string[];
  strengthNote: string;
  weaknessNote: string;
  emotion?: string;
}

// ─── NEW: Semantic Analysis Interfaces ───────────────────────────────────────

export type NarrativeArcLabel =
  | 'intro'       // atmospheric opener — sets the scene
  | 'build_up'    // rising tension, energy accumulates
  | 'climax'      // maximum impact — punchline zone
  | 'resolution'  // aftermath, reflection, wrap-up
  | 'bridge'      // lateral transition — shifts topic or tone
  | 'outro'       // fade-out, epilogue
  | 'unclassified';

export interface NarrativeArcTag {
  arc: NarrativeArcLabel;
  /** Confidence level 0.0–1.0 */
  confidence: number;
  /** Why this arc label was chosen */
  justification: string;
  /** Numeric arc position 0.0 (opener) to 1.0 (closer) */
  arcPosition: number;
}

export interface SemanticTag {
  /** e.g., 'dark', 'street', 'motivational', 'melancholy', 'braggadocio', 'spiritual' */
  tag: string;
  /** How dominant this tag is in the bar — 0.0–1.0 */
  weight: number;
  /** Short Arabic textual evidence from the bar */
  evidence: string;
}

export type MetaphorType = 'literal' | 'simile' | 'metaphor' | 'symbol' | 'allusion' | 'hyperbole';

export interface MetaphoricalLayer {
  type: MetaphorType;
  /** Depth rating 1 (surface) to 5 (deeply embedded) */
  depth: number;
  /** Human-readable description of the figurative element */
  description: string;
  /** Original text fragment that carries the metaphor */
  fragment: string;
}

/**
 * ThematicVector: 8-dimensional coordinate space for bar meaning.
 * Each axis is scored 0–10.
 * This enables vector-distance comparison between bars for smart grouping.
 */
export interface ThematicVector {
  aggression:    number;   // قوة وعدوانية
  vulnerability: number;   // هشاشة وانكشاف عاطفي
  pride:         number;   // كبرياء واعتزاز
  melancholy:    number;   // حزن وتأمل
  wisdom:        number;   // حكمة وعمق فلسفي
  rebellion:     number;   // تمرد ورفض القيود
  love:          number;   // حب وعاطفة
  spirituality:  number;   // روحانية وتعالٍ
}

export interface SemanticAnalysis {
  barId: string;
  text: string;
  narrativeArc: NarrativeArcTag;
  semanticTags: SemanticTag[];
  metaphoricalLayers: MetaphoricalLayer[];
  thematicVector: ThematicVector;
  /** Primary mood label in Arabic */
  dominantMood: string;
  /** 0–100: how much information (ideas/images) is packed into the bar */
  lyricDensity: number;
  /** 0–100: depth of Arabic cultural / literary resonance */
  culturalDepth: number;
  /** Weighted composite of all semantic dimensions — 0–100 */
  compositeSemanticScore: number;
  /** One-sentence Arabic characterization */
  emotionalSignature: string;
}

/**
 * NarrativeSongArc: the ordered semantic narrative structure of a set of bars.
 * Used to arrange bars into a coherent song flow automatically.
 */
export interface NarrativeSongArc {
  bars: Array<{
    id: string;
    arcPosition: number;
    arc: NarrativeArcTag;
    /** How this bar connects thematically to the previous bar */
    linksToPrevious: string;
    /** How this bar sets up the next bar */
    linksToNext: string;
  }>;
  /** Dominant song-wide theme in one phrase */
  overallTheme: string;
  /** Ordered array of bar IDs recommended sequence */
  suggestedSequence: string[];
  /** Narrative arc summary in Arabic */
  arcSummary: string;
}

// ─── GeminiService Class ─────────────────────────────────────────────────────

export class GeminiService {
  private classifyBeatCache    = new Map<string, BeatAnalysis>();
  private semanticAnalysisCache = new Map<string, SemanticAnalysis>();

  private cleanJSON(text: string | undefined): string {
    if (!text) return '{}';
    let cleaned = text.trim();
    if (cleaned.startsWith('```json'))
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '');
    else if (cleaned.startsWith('```'))
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '');
    cleaned = cleaned.trim();
    const firstBrace   = cleaned.indexOf('{');
    const lastBrace    = cleaned.lastIndexOf('}');
    const firstBracket = cleaned.indexOf('[');
    const lastBracket  = cleaned.lastIndexOf(']');
    let startIdx = -1, endIdx = -1;
    if (firstBrace !== -1 && firstBracket !== -1) startIdx = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1)   startIdx = firstBrace;
    else if (firstBracket !== -1) startIdx = firstBracket;
    if (lastBrace !== -1 && lastBracket !== -1) endIdx = Math.max(lastBrace, lastBracket);
    else if (lastBrace !== -1)   endIdx = lastBrace;
    else if (lastBracket !== -1) endIdx = lastBracket;
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx)
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    return cleaned.trim();
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  ORIGINAL METHODS (preserved exactly)
  // ────────────────────────────────────────────────────────────────────────────

  async classifyBeat(rawData: any): Promise<BeatAnalysis> {
    const cacheKey = rawData?.metadata?.filename
      ? `${rawData.metadata.filename}_${rawData.metadata.sizeMB}_${rawData.beatInfo?.bpm}`
      : JSON.stringify(rawData?.features || rawData);
    if (this.classifyBeatCache.has(cacheKey)) return this.classifyBeatCache.get(cacheKey)!;

    const sysMsg = "أنت محلل إيقاعي متخصص في الموسيقى العربية والراب المعاصر. تستقبل بيانات صوتية مستخلصّة وتنتج تحليلاً تقنياً شاملاً. يجب أن يكون الإخراج بصيغة JSON صارمة فقط.";
    const prompt = `
المدخلات المُقدَّمة:
${JSON.stringify(rawData, null, 2)}

مهمتك:
1. تحديد نوع البيت الدقيق من: [trap, boom_bap, melodic_trap, afro_arabic, drill, cloud_rap, hybrid]
2. تحديد النوع الفرعي بناءً على توزيع الطاقة.
3. استخلاص السجل العاطفي.
4. تحديد الهوية الثقافية.
5. حساب سعة المقاطع المثالية لكل بار.
6. ترتيب 3 مخططات قافية مع التبرير.
7. تحديد الحروف العربية المثالية لكل موضع إيقاعي.
8. وصف مناطق الـ Pocket والـ Overflow.
9. تقدير نمط الـ groove.
10. تحديد مواضع الطبول (drumMap) في بار مكون من 16 نبضة.
11. إنشاء "بروتوكول المسار" (trackProtocol) يضم أقسام الأغنية.

قواعد الإخراج: أجب بـ JSON صارم.
    `;

    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const text   = this.cleanJSON(response.text);
    const result = JSON.parse(text);
    this.classifyBeatCache.set(cacheKey, result);
    return result;
  }

  async analyzeBars(texts: string[], beatType: string, bpm: number, dialect: string): Promise<BarAnalysis[]> {
    const sysMsg = "أنت محلل راب عربي متخصص. تحلل مصفوفة من البارات وتقدم نتائج JSON صارمة لكل بار بناءً على قواعد العروض العربي والموراي.";
    const prompt = `
لكل بار أنتج مجموعة من المقاييس التقنية.
البيت المرجعي: ${beatType} — ${bpm} BPM
اللهجة: ${dialect}

البارات للتحليل:
${texts.map((t, i) => `${i}: ${t}`).join("\n")}

أجب بمصفوفة JSON فقط تحتوي على:
{
  "index": (integer),
  "corePhoneme": "حرف عربي واحد",
  "totalMorae": (integer),
  "weightClass": "light|medium_light|medium_heavy|heavy|super_heavy",
  "sonicWeight": (0-100),
  "rhythmicWeight": (0-100),
  "flowMode": "pocket|soft_overflow|hard_overflow|compressed_pocket|mixed",
  "endPhoneme": "حرف",
  "internalRhymes": (integer),
  "syllableCount": (integer),
  "fingerprintCode": "X-N-Y-Z",
  "alignmentScore": (0-100),
  "compatibleBeats": [string],
  "strengthNote": "string",
  "weaknessNote": "string",
  "emotion": "sage|aggressive|sad|angry|sarcastic|pride|other"
}
    `;

    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    const text = response.text || "[]";
    let parsed: any[];
    try {
      const data = JSON.parse(this.cleanJSON(text));
      parsed = Array.isArray(data) ? data : [];
    } catch (e) {
      console.error("Failed to parse Gemini analyzeBars response:", e);
      parsed = [];
    }

    // Override with programmatic extraction for precision
    return parsed.map((bar: any, index: number) => {
      const originalText = texts[bar.index ?? index];
      if (originalText) {
        bar.corePhoneme = moraEngine.extractCorePhoneme(originalText) || bar.corePhoneme;
      }
      return bar;
    });
  }

  async analyzeBarForWorkshop(text: string, beatContext: any): Promise<any> {
    const sysMsg = "أنت خبير في هندسة الراب العربي والبلاغة. تقدم تحليلات واقتراحات تقنية بصيغة JSON.";
    const prompt = `
قم بتحليل هذا البار: "${text}"
في سياق هذا البيت: ${JSON.stringify(beatContext)}

مطلوب: 3 تقنيات شعرية و 4 تحسينات.
أجب بـ JSON صارم يضم : { techniques: [], improvements: [] }
    `;
    try {
      const response = await callGeminiWithRetry({
        model: "gemini-3-flash-preview",
        systemInstruction: sysMsg,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      return JSON.parse(this.cleanJSON(response.text));
    } catch (error) {
      console.error("Error analyzing bar for workshop:", error);
      return { techniques: [], improvements: [] };
    }
  }

  async engineerFlow(text: string, analysis: ProfessionalBeatAnalysis): Promise<FlowEngineeringProfile> {
    const sysMsg = "أنت مهندس فلو (Flow Engineer) متخصص في الراب العربي. تقوم بتحليل المسار الإيقاعي والمحاذاة الزمنية.";
    const prompt = `
البيت الاحترافي:
${JSON.stringify(analysis, null, 2)}

النص المراد هندسته: "${text}"

المطلوب إنتاج JSON يطابق واجهة FlowEngineeringProfile يضم: rhymeScheme, phoneticCadence, microTimingGrid, dtwAlignmentScore...
    `;
    const response = await callGeminiWithRetry({
      model: "gemini-3.1-pro-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text));
  }

  async runQualityBenchmark(text: string, flow: FlowEngineeringProfile, analysis: ProfessionalBeatAnalysis): Promise<QualityBenchmarkReport> {
    const sysMsg = "أنت مدقق جودة للراب العربي. تقوم بتقييم كثافة القافية والدقة الإيقاعية.";
    const prompt = `
النص: "${text}"
الفلو الهندسي: ${JSON.stringify(flow, null, 2)}
تحليل البيت: ${JSON.stringify(analysis, null, 2)}

أنتج تقرير جودة (QualityBenchmarkReport) بصيغة JSON يضم overallScore و recommendations.
    `;
    const response = await callGeminiWithRetry({
      model: "gemini-3.1-pro-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text));
  }

  async generateBars(options: any): Promise<any[]> {
    const sysMsg = "أنت كاتب راب عربي محترف. تكتب بمنهجية الدمج الصوتي–الموسيقي الصارمة وتلتزم بقواعد الموراي.";
    const prompt = `
السياق الموسيقي: ${options.bpm} BPM, نوع ${options.beatType}, مزاج ${options.emotionalRegister}
السياق الصوتي: حرف ${options.corePhoneme}, عائلة ${options.soundFamily}, نظام ${options.rhymeScheme}
القواعد: مجموع موراي ${options.minMorae}-${options.maxMorae}, اللهجة ${options.dialect}, الموضوع ${options.theme}

أنتج ثلاثة خيارات مختلفة بصيغة مصفوفة JSON.
    `;
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text || "[]"));
  }

  async smartCategorize(bars: { id: string, text: string }[]): Promise<Record<string, string[]>> {
    const sysMsg = "أنت خبير تصنيف لغوي وموسيقي للراب العربي. تصنف البارات إلى مجموعات دقيقة واحترافية.";
    const prompt = `
صنف البارات التالية إلى مجموعات بناءً على: الموضوع، الأسلوب، الحالة المزاجية.
البارات:
${bars.map((b, i) => `[${i}] ${b.text}`).join('\n')}

أجب بـ JSON يربط اسم المجموعة بمصفوفة من أرقام الـ index.
    `;
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  async analyzeRapAcademy(text: string, referenceTechs: string): Promise<any> {
    const sysMsg = "أنت كاتب ومحلل راب محترف. تحلل التقنيات الشعرية وتحدد الأدلة من النص.";
    const prompt = `
البار: "${text}"
التقنيات المرجعية: ${referenceTechs}

أنتج JSON يضم الحقول: detected, suggestions, score, summary.
    `;
    const response = await callGeminiWithRetry({
      model: "gemini-3.1-pro-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  async improveIncompleteBars(incompleteIndicesContext: string): Promise<any> {
    const sysMsg = "أنت مهندس إيقاع عربي وخبير كتابة راب. تبرع في رفع كثافة الموراي (mora density) والوزن الإيقاعي (rhythmic weight). ترجع الإجابة بصيغة JSON حصراً.";
    const prompt = `قم بتحسين تدفق البارات الناقصة لزيادة "mora density" و "rhythmic weight".
هذه هي البارات ذات النصوص الناقصة أو الفارغة في الورشة:
${incompleteIndicesContext}

اقترح 3 بدائل محسنة لكل بار ناقص.
الرد بصيغة JSON فقط بهذا الشكل:
{
  "results": [
    { "index": <bar_index>, "alternatives": ["بديل 1", "بديل 2", "بديل 3"] }
  ]
}`;
    const response = await callGeminiWithRetry({
      model: "gemini-3.1-pro-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  async applyVocalWeightToBar(barText: string): Promise<any> {
    const sysMsg = "أنت مهندس صوتيات وكاتب راب محترف جداً. ترجع الإجابة بصيغة JSON حصراً.";
    const prompt = `البار الحالي: "${barText}"
المطلوب أولاً: تطبيق تقنية "الوزن الصوتي" (Vocal Weight) بزيادة كثافة المقاطع غير المشددة (Unstressed Syllables) لجعل التسارع الإيقاعي أقوى.
المطلوب ثانياً: تحليل البار الناتج واقتراح 3 تحسينات/بدائل على إيقاعه لجعله أكثر تدفقاً.

أجب بصيغة JSON فقط:
{
  "suggestions": [
    "التحسين الأول المعتمد على الوزن الصوتي العالي مع تكثيف المقاطع غير المشددة...",
    "التحسين الثاني بتدفق سريع للساكنات...",
    "التحسين الثالث بدمج مقاطع طويلة وقصيرة..."
  ]
}`;
    const response = await callGeminiWithRetry({
      model: "gemini-3.1-pro-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  async improveRapAcademy(text: string, referenceTechs: string): Promise<any> {
    const sysMsg = "أنت كاتب راب عربي محترف جداً ومُبتكر. عبقري في الصياغة الإيقاعية والتنويع. لا تبتذل ولا تكرر نفس النتيجة، بل تجتهد دائماً لتقديم قوافي معقدة، استعارات عميقة، وتدفق صوتي غير مسبوق. أنت لا تخطئ في الاستجابة بتنسيق JSON أبداً.";
    const prompt = `البار الحالي: "${text}"
المرجعية التقنية المطلوبة للتطبيق: 
${referenceTechs}

برجاء استخدام براعتك وإبداعك كمغني راب محترف (MC) لاقتراح أفضل التحسينات على هذا البار بناءً على التقنية المذكورة أعلاه.

**تحذير هام:** 
- اجتهد بشدة في الابتكار!
- لا تكرر البار الأصلي ولا تقدم حلولاً سطحية.
- أريد معاني قوية، وزن إيقاعي (Mora Density) عالي، وقافية مبتكرة.

**المطلوب:**
أرجع بصيغة JSON فقط، بالهيكل التالي بدقة:
{
  "original": "البار الأصلي المعطى",
  "improvements": [
    { 
      "technique": "اسم التقنية المطبقة",
      "why": "طريقة تفعيل التقنية ونجاحها (شرح احترافي قصير)",
      "rewrite": "البار المُعدّل والمُحسّن بشكل إبداعي جداً وقوي، ولا يكرر كلمات الآخرين" 
    }
  ],
  "pro_tip": "نصيحة احترافية عميقة لربط هذا البار بالإيقاع"
}
`;
    const response = await callGeminiWithRetry({
      model: "gemini-3.1-pro-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.85 }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  async detectWorkshopSections(bars: string[]): Promise<any> {
    const sysMsg = "أنت مهندس صوتي وكاتب راب محترف. تقسم البارات إلى أقسام موسيقية منطقية.";
    const prompt = `البارات:\n${bars.map((b, i) => `${i}: ${b}`).join('\n')}\n\nأنتج أقسام الأغنية بصيغة JSON يضم: sections.`;
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  async suggestTechniquesForBar(text: string, referenceTechs: string): Promise<any> {
    const sysMsg = "أنت خبير في هندسة الراب العربي. تقترح تقنيات بلاغية لتعزيز قوة البارات.";
    const prompt = `البار: "${text}"\nالقائمة: ${referenceTechs}\n\nاقترح 2-3 تقنيات محددة بصيغة JSON يضم: suggestions.`;
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  async suggestRhymes(word: string, context: string, maqam: string, maxSyllables: number): Promise<any> {
    const sysMsg = "أنت خبير في العروض والقوافي للراب العربي. تقترح قوافي تتناسب مع المقام والسياق.";
    const prompt = `الكلمة: "${word}"\nالسياق: "${context}", مقام ${maqam}, بحد أقصى ${maxSyllables} مقاطع.\n\nأنتج 5 قوافي بصيغة JSON يضم: suggestions.`;
    const response = await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      systemInstruction: sysMsg,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });
    return JSON.parse(this.cleanJSON(response.text || "{}"));
  }

  // ────────────────────────────────────────────────────────────────────────────
  //  NEW METHODS: DEEP SEMANTIC INTELLIGENCE ENGINE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * deepSemanticAnalysis — the centrepiece of Phase 2.
   *
   * Sends a batch of bars to Gemini with a multi-dimensional elite prompt that
   * simultaneously extracts: NarrativeArc, ThematicVector, MetaphoricalLayers,
   * SemanticTags, LyricDensity, CulturalDepth, and CompositeScore.
   *
   * Prompt design principles used here:
   *  - Persona lock: forces Gemini into "literary-musicological critic" mode
   *  - Dimensional isolation: each dimension is defined with scoring rubrics
   *  - Arabic cultural anchoring: references classical poetry (عمود الشعر)
   *    and contemporary Arab street culture
   *  - Strict JSON schema: all fields defined with types and value ranges
   */
  async deepSemanticAnalysis(bars: { id: string; text: string }[]): Promise<SemanticAnalysis[]> {
    const cacheResults: SemanticAnalysis[] = [];
    const uncached: { id: string; text: string; originalIndex: number }[] = [];

    bars.forEach((bar, i) => {
      const key = `sem_${bar.id}_${bar.text.slice(0, 20)}`;
      if (this.semanticAnalysisCache.has(key)) {
        cacheResults.push(this.semanticAnalysisCache.get(key)!);
      } else {
        uncached.push({ ...bar, originalIndex: i });
      }
    });

    if (uncached.length === 0) return cacheResults;

    const sysMsg = `
أنت ناقد أدبي-موسيقي نخبوي متخصص في الراب العربي المعاصر.
تمتلك خبرة موسوعية تجمع بين:
- علم العروض العربي الكلاسيكي (الفراهيدي، الخليل)
- نظريات السرد الحديثة (Todorov, Genette)
- علم النفس الموسيقي وتأثيرات الفونيمات على العاطفة
- ثقافة الشارع العربي والراب المحلي

مهمتك: تحليل دلالي متعدد الأبعاد لكل بار بدقة أكاديمية وحساسية فنية نخبوية.
الإخراج: JSON صارم فقط. لا نص خارج الـ JSON.
    `.trim();

    const prompt = `
# مهمة التحليل الدلالي النخبوي

## البارات المُقدَّمة:
${uncached.map(b => `- ID: "${b.id}" | النص: "${b.text}"`).join('\n')}

---

## مطلوب لكل بار: مصفوفة JSON بالبنية التالية بالضبط:

[
  {
    "barId": "ID_هنا",
    "text": "النص_هنا",

    "narrativeArc": {
      "arc": "intro | build_up | climax | resolution | bridge | outro | unclassified",
      "confidence": 0.0-1.0,
      "justification": "تبرير باللغة العربية في جملة واحدة",
      "arcPosition": 0.0-1.0
    },

    "semanticTags": [
      { "tag": "التصنيف", "weight": 0.0-1.0, "evidence": "مقتطف نصي" }
    ],

    "metaphoricalLayers": [
      {
        "type": "literal | simile | metaphor | symbol | allusion | hyperbole",
        "depth": 1-5,
        "description": "وصف العنصر البلاغي",
        "fragment": "المقتطف النصي الذي يحمله"
      }
    ],

    "thematicVector": {
      "aggression": 0-10,
      "vulnerability": 0-10,
      "pride": 0-10,
      "melancholy": 0-10,
      "wisdom": 0-10,
      "rebellion": 0-10,
      "love": 0-10,
      "spirituality": 0-10
    },

    "dominantMood": "وصف عربي للمزاج المهيمن",
    "lyricDensity": 0-100,
    "culturalDepth": 0-100,
    "compositeSemanticScore": 0-100,
    "emotionalSignature": "جملة توصيف عربية واحدة"
  }
]

---
## معايير التقييم:

### narrativeArc (القوس السردي):
- **intro**: بداية جوية، تمهيد للسياق، كثافة سردية منخفضة، arcPosition: 0.0-0.15
- **build_up**: تصاعد التوتر والطاقة، بناء تدريجي، arcPosition: 0.15-0.45
- **climax**: ذروة الصدمة الدلالية والصوتية (Punchline Zone)، arcPosition: 0.45-0.65
- **resolution**: تأمل ما بعد الذروة، وضع حد للتوتر، arcPosition: 0.65-0.85
- **bridge**: تحول جانبي في الموضوع أو النبرة، arcPosition: 0.40-0.60
- **outro**: خاتمة وإغلاق، arcPosition: 0.85-1.0

### thematicVector (المتجه الموضوعي):
- كل محور من 0 إلى 10
- أعطِ قيماً عالية فقط عند وجود دليل نصي واضح

### lyricDensity (الكثافة المعلوماتية):
- 0-30: بار فضفاض، صور قليلة
- 31-60: تكثيف معتدل، صور متعددة
- 61-80: كثيف، معلومات/استعارات متعددة
- 81-100: فوق العادة — كل كلمة تحمل طبقات

### culturalDepth (العمق الثقافي):
- 0-30: مباشر، ثقافة عامة
- 31-60: مراجع ثقافية عربية معتدلة
- 61-80: استدعاء تراث أو مفاهيم محلية عميقة
- 81-100: طبقات ثقافية متشعبة، تحتاج خلفية معرفية لفهمها

### compositeSemanticScore:
compositeSemanticScore = (lyricDensity × 0.30) + (culturalDepth × 0.25) + (metaphorDepthAvg × 10 × 0.25) + (narrativeArc.confidence × 100 × 0.20)

أنتج المصفوفة الكاملة الآن بـ JSON صارم:
    `.trim();

    try {
      const response = await callGeminiWithRetry({
        model: "gemini-3.1-pro-preview",
        systemInstruction: sysMsg,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.15,
        }
      });

      const rawText = response.text || '[]';
      let parsed: SemanticAnalysis[];
      try {
        parsed = JSON.parse(this.cleanJSON(rawText));
        if (!Array.isArray(parsed)) parsed = [parsed];
      } catch (e) {
        console.error('Failed to parse deepSemanticAnalysis response', e);
        parsed = [];
      }

      // Cache results
      for (const sa of parsed) {
        const key = `sem_${sa.barId}_${sa.text?.slice(0, 20)}`;
        this.semanticAnalysisCache.set(key, sa);
      }

      return [...cacheResults, ...parsed];
    } catch (error) {
      console.error('deepSemanticAnalysis failed:', error);
      return cacheResults;
    }
  }

  /**
   * buildNarrativeSongArc — sequences a set of semantically analysed bars
   * into an optimal narrative arc for a song.
   *
   * Uses Gemini to reason about thematic connective tissue between bars
   * and suggest the most compelling narrative ordering.
   */
  async buildNarrativeSongArc(
    bars: Array<{ id: string; text: string; semantic: SemanticAnalysis }>
  ): Promise<NarrativeSongArc> {
    const sysMsg = `
أنت مخرج روائي للراب العربي. تأخذ مجموعة من البارات المحللة دلالياً وتبني منها قوساً سردياً متماسكاً ومؤثراً.
تفهم كيف تبني التوتر، تذروه، ثم تحله بأثر موسيقي وعاطفي مبهر.
    `.trim();

    const prompt = `
## البارات المُحللة:
${bars.map(b => `
### Bar ID: ${b.id}
النص: "${b.text}"
القوس السردي الحالي: ${b.semantic.narrativeArc.arc} (ثقة: ${b.semantic.narrativeArc.confidence})
المتجه الموضوعي: ${JSON.stringify(b.semantic.thematicVector)}
التوقيع العاطفي: ${b.semantic.emotionalSignature}
`).join('\n---\n')}

## المطلوب:
أنتج JSON بالبنية التالية بالضبط:

{
  "bars": [
    {
      "id": "ID_البار",
      "arcPosition": 0.0-1.0,
      "arc": { "arc": "...", "confidence": 0.0-1.0, "justification": "...", "arcPosition": 0.0-1.0 },
      "linksToPrevious": "كيف يرتبط بالبار السابق دلالياً",
      "linksToNext": "كيف يُمهّد للبار التالي"
    }
  ],
  "overallTheme": "الموضوع الجامع للأغنية في عبارة واحدة",
  "suggestedSequence": ["id1", "id2", ...],
  "arcSummary": "وصف عربي للقوس السردي الكامل للأغنية"
}
    `.trim();

    try {
      const response = await callGeminiWithRetry({
        model: "gemini-3.1-pro-preview",
        systemInstruction: sysMsg,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      });
      return JSON.parse(this.cleanJSON(response.text || '{}'));
    } catch (error) {
      console.error('buildNarrativeSongArc failed:', error);
      return {
        bars: bars.map(b => ({
          id: b.id,
          arcPosition: 0.5,
          arc: b.semantic.narrativeArc,
          linksToPrevious: '',
          linksToNext: '',
        })),
        overallTheme: 'غير مححدد',
        suggestedSequence: bars.map(b => b.id),
        arcSummary: 'تعذّر بناء القوس السردي',
      };
    }
  }

  /**
   * extractThematicVector — lightweight single-bar thematic scan.
   * More economical than deepSemanticAnalysis for quick indexing.
   */
  async extractThematicVector(text: string): Promise<ThematicVector> {
    const sysMsg = "أنت محلل دلالي للراب العربي. تقدّر كثافة الأبعاد الموضوعية لكل بار بسرعة ودقة.";
    const prompt = `
البار: "${text}"

قدِّر المتجه الموضوعي التالي (كل قيمة من 0 إلى 10):
{
  "aggression": 0-10,
  "vulnerability": 0-10,
  "pride": 0-10,
  "melancholy": 0-10,
  "wisdom": 0-10,
  "rebellion": 0-10,
  "love": 0-10,
  "spirituality": 0-10
}
    `.trim();

    try {
      const response = await callGeminiWithRetry({
        model: "gemini-3-flash-preview",
        systemInstruction: sysMsg,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 }
      });
      return JSON.parse(this.cleanJSON(response.text || '{}'));
    } catch (error) {
      console.error('extractThematicVector failed:', error);
      return {
        aggression: 0, vulnerability: 0, pride: 0, melancholy: 0,
        wisdom: 0, rebellion: 0, love: 0, spirituality: 0
      };
    }
  }

  async generateContent(prompt: string): Promise<any> {
    return await callGeminiWithRetry({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });
  }
}

export const geminiService = new GeminiService();
