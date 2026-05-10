import { moraEngine } from './moraEngine';
import { accentScanner } from './accentScanner';

export interface PhonemeNode {
  char: string;
  isVowel: boolean;
  durationCode: number; // 0.5 for short, 1.0 for long, etc.
}

export interface CloudConcept {
  word: string;
  phonemicMatchScore: number; // Matching 1st and 3rd syllables
  type: 'phonetic' | 'semantic' | 'idiom' | 'double_entendre' | 'repository_bar';
  connectionLabel?: string;
  syllableCount: number;
}

export class LinguisticEngine {
  // A mock dictionary of Arabic words and their phonetic representation
  // In a real AI app, this would call a backend G2P (Grapheme-to-Phoneme) model
  private phoneticDB: Record<string, string[]> = {
    "قوة": ["قُ", "وَ", "ة"],
    "عدوة": ["عَ", "دُ", "وَ", "ة"],
    "خلوة": ["خَ", "لْ", "وَ", "ة"],
    "فجوة": ["فَ", "جْ", "وَ", "ة"],
    "مخرج": ["مُ", "خْ", "رِ", "ج"],
    "مدرج": ["مُ", "دْ", "رِ", "ج"],
    "مشهد": ["مَ", "شْ", "هَ", "د"],
    "تفجير": ["تَ", "فْ", "جِ", "ي", "ر"],
    "تدمير": ["تَ", "دْ", "مِ", "ي", "ر"],
    "تصوير": ["تَ", "صْ", "وِ", "ي", "ر"]
  };

  private semanticDB: Record<string, string[]> = {
    "مخرج": ["شاهد", "عدسة", "كلاكيت", "تصوير", "زوايا"],
    "قوة": ["قبضة", "تدمير", "حديد", "نار", "بقاء"]
  };

  private idiomsDB: Array<{ phrase: string, tags: string[] }> = [
    { phrase: "وضع العربة قبل الحصان", tags: ["ترتيب", "تسرع", "مخرج"] },
    { phrase: "يصطاد في الماء العكر", tags: ["خديعة", "قوة", "انتهاز"] },
    { phrase: "الضرب في الميت حرام", tags: ["قسوة", "قوة", "نهاية"] }
  ];

  /* 
   * 1. The Gathering & Word Clouding:
   * Generates a mix of phonetic slant-rhymes and semantic connective tissues.
   * Includes checking existing user bars from the repository.
   */
  generateWordCloud(seedPhrase: string, repositoryBars: string[] = []): CloudConcept[] {
    const cloud: CloudConcept[] = [];
    const words = seedPhrase.trim().split(/\s+/);
    const mainWord = words[words.length - 1]; // Focus on the last word for phonetic anchoring

    const seedPhoneme = moraEngine.extractCorePhoneme(mainWord) || mainWord;

    // 0. Repository Bars (Checking user's own bars)
    repositoryBars.forEach(barText => {
      const phoneticScore = this.calculatePhoneticMatch(mainWord, barText);
      const semanticMatch = words.some(w => barText.includes(w));
      
      // High-quality filter: Must have reasonable phonetic similarity or exact semantic keyword match
      if (phoneticScore > 0.4 || semanticMatch) {
         cloud.push({
            word: barText,
            phonemicMatchScore: phoneticScore,
            type: 'repository_bar',
            connectionLabel: semanticMatch ? 'رابط دلالي من مستودعك' : 'رابط صوتي من مستودعك',
            syllableCount: moraEngine.analyze(barText).totalMorae
         });
      }
    });

    // 1. Phonetic Matches (Slant Rhymes / Multisyllabic matching)
    Object.keys(this.phoneticDB).forEach(key => {
      if (key !== mainWord) {
        const matchScore = this.calculatePhoneticMatch(mainWord, key);
        if (matchScore > 0.4) {
          cloud.push({
            word: key,
            phonemicMatchScore: matchScore,
            type: 'phonetic',
            syllableCount: this.phoneticDB[key]?.length || 3
          });
        }
      }
    });

    // 2. Semantic Connective Tissue
    words.forEach(word => {
      const semanticLinks = this.semanticDB[word];
      if (semanticLinks) {
        semanticLinks.forEach(link => {
          cloud.push({
            word: link,
            phonemicMatchScore: 0,
            type: 'semantic',
            connectionLabel: `مرتبط دلالياً بـ "${word}"`,
            syllableCount: 3
          });
        });
      }
    });

    // 3. Idiom Mining
    this.idiomsDB.forEach(idiom => {
      const isRelevant = words.some(w => idiom.tags.includes(w)) || 
                         cloud.some(c => idiom.tags.includes(c.word));
      if (isRelevant) {
        cloud.push({
          word: idiom.phrase,
          phonemicMatchScore: 0,
          type: 'idiom',
          connectionLabel: "مثل اصطلاحي مقترح",
          syllableCount: idiom.phrase.split(/\s+/).length * 2
        });
      }
    });

    // Deduplicate and evaluate quality
    const uniqueMap = new Map<string, CloudConcept>();
    cloud.forEach(item => {
      if (!uniqueMap.has(item.word) || uniqueMap.get(item.word)!.phonemicMatchScore < item.phonemicMatchScore) {
        uniqueMap.set(item.word, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => b.phonemicMatchScore - a.phonemicMatchScore || Math.random() - 0.5);
  }

  /* 
   * Phonetic comparison prioritizing core phonemes, accent patterns, and syllable endings.
   */
  private calculatePhoneticMatch(wordA: string, wordB: string): number {
    const pA = moraEngine.extractCorePhoneme(wordA);
    const pB = moraEngine.extractCorePhoneme(wordB);
    
    let score = 0;
    if (pA === pB && pA.length > 0) return 0.95; // Exact rhyme core

    const wA_parts = wordA.split(' ');
    const wB_parts = wordB.split(' ');
    const lastA = wA_parts[wA_parts.length - 1];
    const lastB = wB_parts[wB_parts.length - 1];

    // Common ending characters
    if (lastA.slice(-2) === lastB.slice(-2)) score += 0.4;
    else if (lastA.slice(-1) === lastB.slice(-1)) score += 0.2;

    // Cross-check with phonetic dictionary if available
    const dictA = this.phoneticDB[wordA] || lastA.split('');
    const dictB = this.phoneticDB[wordB] || lastB.split('');
    
    if (dictA[0] && dictB[0] && dictA[0] === dictB[0]) score += 0.2;
    if (dictA[2] && dictB[2] && dictA[2] === dictB[2]) score += 0.2;

    if (Math.abs(dictA.length - dictB.length) <= 1) score += 0.1;

    return Math.min(score, 1.0);
  }

  /*
   * 2. Connective Tissue Analyzer:
   * Finds bridging concepts between two words or concepts.
   */
  findConnectiveTissue(wordA: string, wordB: string): string[] {
    const tissue: string[] = [];
    
    // Very basic mock logic for connective tissue
    const mockConnections: Record<string, string[]> = {
      "مخرج-قوة": ["سيطرة", "رؤية ثاقبة", "كاميرا سلاح", "قطع (Cut) كالسيف"],
      "شبح-مدينة": ["شوارع خالية", "ذاكرة منسية", "أصوات بلا جسد"],
      "كلمة-رصاصة": ["تخترق العقل", "لا يمكن استرجاعها", "تصيب بدقة"],
    };

    const key1 = `${wordA.trim()}-${wordB.trim()}`;
    const key2 = `${wordB.trim()}-${wordA.trim()}`;

    if (mockConnections[key1]) tissue.push(...mockConnections[key1]);
    if (mockConnections[key2]) tissue.push(...mockConnections[key2]);

    if (tissue.length === 0) {
      tissue.push(`نقطة التقاء خفية بين ${wordA} و ${wordB}`);
      tissue.push("استعارة مبتكرة");
      tissue.push("تضاد يخلق معنى جديد (Contrast)");
    }

    return tissue;
  }

  /*
   * 3. Piano-Key Composer & Syllabic Bending
   * Breaks a phrase down into "Piano Keys" (syllables) and suggests bends using moraEngine and accentScanner.
   */
  decomposeToPianoKeys(phrase: string): { syllable: string, weight: number, index: number }[] {
    const keys: { syllable: string, weight: number, index: number }[] = [];
    
    // Use actual accent scanner to get rhythmic beats
    const stresses = accentScanner.scan(phrase);
    const words = phrase.trim().split(/\s+/);
    
    let stressIdx = 0;
    words.forEach((word, wordIdx) => {
        // Approximate syllables per word using morae split logic (simplified)
        const parts = word.match(/.{1,2}/g) || [word]; // Naive chunking for UI
        
        parts.forEach((part) => {
            const isStressed = stresses[stressIdx] === '[!]';
            keys.push({
                syllable: part,
                weight: isStressed ? 1.5 : (moraEngine.analyze(part).totalMorae > 1 ? 1.2 : 0.8),
                index: keys.length
            });
            if (stressIdx < stresses.length - 1) stressIdx++;
        });
        
        // Add space as a rest if not last word
        if (wordIdx < words.length - 1) {
             keys.push({ syllable: '-', weight: 0.2, index: keys.length });
        }
    });

    return keys;
  }

  /* 
   * Tidying up the rhythm: Propose rhythmic adjustments for selected syllables
   */
  tidyRhythm(syllables: string[]): { suggestion: string, surpriseFactor: boolean }[] {
    if (syllables.length === 0) return [];
    const joined = syllables.join('');
    const morae = moraEngine.analyze(joined).totalMorae;
    
    const options = [
      {
        suggestion: `نطق "${joined}" بشكل أسرع (تسريع الإيقاع) لتفريغ مساحة للبار القادم.`,
        surpriseFactor: false
      },
      {
        suggestion: `تحويل النطق إلى "${joined}ـا" أو مد الحرف الأخير لخلق وقفة (Syncopation).`,
        surpriseFactor: true
      },
      {
        suggestion: `إضافة كلمة حشو قبل "${joined}" لضبط الوزن (الوزن الحالي: ${morae} مقاطع صوتية).`,
        surpriseFactor: false
      },
      {
        suggestion: `تأخير نطق "${joined}" للنبضة التالية (Delayed Entry) وخلق عنصر مفاجأة.`,
        surpriseFactor: true
      }
    ];

    return options.sort(() => 0.5 - Math.random()).slice(0, 2);
  }

  /* 
   * Syllabic Bending (تطويع المقاطع):
   * Suggests how a word can be forced into a rhythm.
   */
  bendSyllable(word: string): { suggestedBend: string, surpriseFactor: boolean } {
    const phoneme = moraEngine.extractCorePhoneme(word);
    const bends = [
      `دمج المقطع الأوسط لإزاحة الوزن: كسر القافية التقليدية إلى (${phoneme || '...'})`,
      `نطق كلمة بلهجة مختلفة لتغيير حرف العلة الأساسي للتحايل على الإيقاع`,
      `مد الحرف الأخير لخلق مساحة صمت (Rest) قبل البار القادم`,
      `إضافة حرف حشو (Fill) أو Ad-lib لجبر الكسر الإيقاعي`
    ];
    
    return {
      suggestedBend: bends[Math.floor(Math.random() * bends.length)],
      surpriseFactor: Math.random() > 0.6 // Simulate discovering an unexpected pattern
    };
  }
  /* 
   * 4. Acoustic Engineering (Dafencii Methodology)
   * Applies specific acoustic manipulation techniques to words.
   */
  applyAcousticEngineering(word: string, technique: 'derivation' | 'suffix' | 'deconstruct' | 'anchor' | 'cross_lang'): string[] {
    const w = word.trim();
    if (!w && technique !== 'anchor') return [];

    switch(technique) {
      case 'derivation':
         if (w.includes("طلق")) return ["منطلق", "انطلق", "انطلاقة", "تنتقل", "انتقال", "كالطلقة", "المنطلقة"];
         if (w.includes("دقق")) return ["دقة", "مدقق", "دقيق", "تدقيق", "استدقاق", "دقات"];
         if (w.includes("كسر")) return ["مكسور", "انكسار", "كسره", "تكسير", "تكتيك مستتر"];
         
         const base = w.slice(0, 3); // naive arabic root approximation
         return [`مِ${base}`, `ان${base}`, `${base}ة`, `يَتَ${base}`, `است${base}`];
         
      case 'suffix':
         const suffix = w.slice(-2);
         if (suffix === "كي" || suffix.toLowerCase() === "ki" || w.includes("تكتيك") || w.includes("ميكي")) {
            return ["Sleepy", "تكتيكي", "Luis Enrique", "ميكي", "الأمريكي", "أوتوماتيكي"];
         }
         if (suffix === "ين" || w.includes("فيتامين") || w.includes("مين")) {
            return ["فيتامين", "دوبامين", "مجانين", "ياسمين", "Mean", "Lean"];
         }
         return [`كلمة تنتهي بـ (${suffix})`, `مصطلح أنمي/إنجليزي ينتهي بـ (${suffix})`, `ماركة تجارية تنتهي بـ (${suffix})`];
         
      case 'deconstruct':
         if (w === "قنبلة") return ["قنبلة من دون النون (قبلة)", "فنون", "مجنون"];
         if (w.length > 3) {
            return [
               `افجرك بـ (${w}) من دون الـ (${w[Math.floor(w.length / 2)]})`,
               `اعكس كلمة (${w}) لتصبح (${w.split('').reverse().join('')})`,
               `تجزئة الكلمة لخلق إيقاع مقطع: ${w[0]}.. ${w.slice(1)}`
            ];
         }
         return [`تفكيك مقاطع "${w}" لمقابلة إيقاع جديد`];
         
      case 'anchor':
         return [
           "«أمسك» : استخدمها كضربة Snare وهمية في بداية أو نهاية التدفق.",
           "«يااا» : استخدمها لمد زمن البار (Sustain) قبل الدخول في السطر التالي.",
           "«ها» : لتثبيت الإيقاع وتأكيد الموقف (Punch/Ad-lib).",
           "ترنيمة متكررة (Chant) مثل: «أنا الزيت.. أنا زي الـ..» كخلفية إيقاعية ثابتة."
         ];
         
      case 'cross_lang':
         if (w.includes("أناناسة") || w.toLowerCase().includes("juice")) return ["I got the juice", "أناناسة", "شفت كيف السلاسة؟", "رئاسة"];
         if (w.includes("ديل") || w.toLowerCase().includes("deal")) return ["Deal", "تقيل", "Real", "طويل"];
         return [
           `كلمة إنجليزية بوزن "${w}"`, 
           `مصطلح ثقافة Pop أجنبي يطابق القافية الجرسية لـ "${w}"`
         ];
         
      default:
        return [];
    }
  }
}

export const linguisticEngine = new LinguisticEngine();