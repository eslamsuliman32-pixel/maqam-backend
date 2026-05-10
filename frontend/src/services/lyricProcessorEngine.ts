/**
 * Metric Matrix OS2 - Smart Lyric Processor (v4.0)
 * Logic for Phonetic Vector Mapping and Prosodic Density Analysis
 */

export interface FlowValidation {
  isCompatible: boolean;
  currentDensity: number;
  suggestion: 'speed_up' | 'slow_down' | 'perfect';
  temporalVector: number; // Total temporal weight of the text
}

class LyricProcessorEngine {
  /**
   * Arabic Prosodic Rules (§3.1)
   * Vs (Short Syllable) = 1 unit (Haraka)
   * Vl (Long Syllable) = 2 units (Sabab/Watad)
   */
  private readonly LONG_SYLLABLE_REGEX = /([أ-ي][َُِ][أ-ي]ْ)|([أ-ي][َُِ][اوي])|([أ-ي][ًٌٍ])/g;
  private readonly SHORT_SYLLABLE_REGEX = /[أ-ي][َُِِّْ]?/g;

  /**
   * تحليل المتجه الصوتي (Phonetic Vector Mapping)
   * Calculates the temporal weight of the text based on Arabic prosody
   */
  public calculateTemporalVector(text: string): number {
    if (!text) return 0;
    const cleanText = text.trim();
    
    // 1. Identify Long Syllables (Asbab/Awtad) - Weight: 2
    const longMatches = cleanText.match(this.LONG_SYLLABLE_REGEX) || [];
    const longWeight = longMatches.length * 2;

    // 2. Remove long syllables to count remaining short ones
    let remainingText = cleanText;
    longMatches.forEach(m => {
      remainingText = remainingText.replace(m, '');
    });

    // 3. Identify Short Syllables (Haraka) - Weight: 1
    const shortMatches = remainingText.match(this.SHORT_SYLLABLE_REGEX) || [];
    const shortWeight = shortMatches.length * 1;

    return longWeight + shortWeight;
  }

  /**
   * التنبؤ بمدى ملاءمة النص للمساحة الزمنية المتاحة (Advanced Density Algorithm)
   * Equation: Density = Σ(Vs + Vl) / T_available
   */
  public validateFlow(text: string, durationMs: number, bpm: number): FlowValidation {
    const temporalVector = this.calculateTemporalVector(text);
    const durationSec = durationMs / 1000;
    const beatsInZone = (durationSec * bpm) / 60;
    
    if (beatsInZone === 0) return { isCompatible: true, currentDensity: 0, suggestion: 'perfect', temporalVector: 0 };

    // حساب الكثافة الفعلية بناءً على المتجه الصوتي
    const density = temporalVector / beatsInZone;

    let suggestion: 'speed_up' | 'slow_down' | 'perfect' = 'perfect';
    
    // Advanced Thresholds for Arabic Prosody (§3.2):
    // < 2.0: Sparse (Needs more flow)
    // 2.0 - 6.0: Optimal Range
    // > 6.0: Overloaded (Unbreathable)
    if (density > 6.0) suggestion = 'slow_down'; 
    if (density < 2.0 && temporalVector > 0) suggestion = 'speed_up';

    return {
      isCompatible: density <= 8.0, // Absolute physical limit for rapid Arabic delivery
      currentDensity: density,
      suggestion,
      temporalVector
    };
  }

  /**
   * Legacy support for simple syllable counting
   */
  public countSyllables(text: string): number {
    return this.calculateTemporalVector(text);
  }
}

export const lyricProcessorEngine = new LyricProcessorEngine();
