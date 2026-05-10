import { Bar } from '../store/repositoryStore';

export interface StyleProfile {
  id: string;
  name: string;
  avgSyllables: number;
  dominantRhymes: string[];
  dominantStress: string[];
  moraDensity: number; // Avg morae per bar
}

export class StyleTransferEngine {
  /**
   * Extracts a style profile from a set of bars (e.g., from a specific artist or genre).
   */
  public extractStyle(name: string, bars: Bar[]): StyleProfile {
    if (bars.length === 0) {
      return { id: 'empty', name, avgSyllables: 0, dominantRhymes: [], dominantStress: [], moraDensity: 0 };
    }

    const totalSyllables = bars.reduce((acc, bar) => acc + (bar.syllableCount || 0), 0);
    const totalMorae = bars.reduce((acc, bar) => acc + (bar.totalMorae || 0), 0);
    
    const rhymeFreq: Record<string, number> = {};
    const stressFreq: Record<string, number> = {};

    bars.forEach(bar => {
      if (bar.corePhoneme) rhymeFreq[bar.corePhoneme] = (rhymeFreq[bar.corePhoneme] || 0) + 1;
      const stress = bar.fingerprintCode?.split('-')[0];
      if (stress) stressFreq[stress] = (stressFreq[stress] || 0) + 1;
    });

    const dominantRhymes = Object.entries(rhymeFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => k);

    const dominantStress = Object.entries(stressFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => k);

    return {
      id: crypto.randomUUID(),
      name,
      avgSyllables: totalSyllables / bars.length,
      moraDensity: totalMorae / bars.length,
      dominantRhymes,
      dominantStress
    };
  }

  /**
   * Filters or ranks bars based on how well they match a style profile.
   */
  public matchStyle(bars: Bar[], profile: StyleProfile): Bar[] {
    return bars.map(bar => {
      let score = 0;
      
      // Syllable proximity
      const sylDiff = Math.abs((bar.syllableCount || 0) - profile.avgSyllables);
      if (sylDiff <= 1) score += 3;
      else if (sylDiff <= 2) score += 1;

      // Rhyme matching
      if (profile.dominantRhymes.includes(bar.corePhoneme || '')) score += 5;

      // Stress matching
      const barStress = bar.fingerprintCode?.split('-')[0];
      if (profile.dominantStress.includes(barStress || '')) score += 4;

      return { bar, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score > 2)
    .map(x => x.bar);
  }
}

export const styleEngine = new StyleTransferEngine();
