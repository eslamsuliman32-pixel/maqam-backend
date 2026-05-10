import { Bar } from '../store/repositoryStore';

export interface TransitionMap {
  [fingerprint: string]: {
    [nextFingerprint: string]: number; // count/score
  };
}

export interface FrequencyMap {
  rhymes: Record<string, number>;
  stress: Record<string, number>;
  syllables: Record<number, number>;
}

export class PatternPredictionEngine {
  private transitionMap: TransitionMap = {};
  private frequencies: FrequencyMap = {
    rhymes: {},
    stress: {},
    syllables: {}
  };

  /**
   * Analyzes the current repository to build statistical models.
   */
  public analyzeRepository(bars: Bar[]) {
    this.reset();
    if (bars.length < 2) return;

    // We process in reverse order because bars are usually stored [newest, ..., oldest]
    // but sequences are usually written oldest -> newest.
    const chronologicalBars = [...bars].reverse();

    for (let i = 0; i < chronologicalBars.length; i++) {
        const current = chronologicalBars[i];
        const next = chronologicalBars[i + 1];

        // Update frequencies
        this.updateFrequencies(current);

        // Update transitions
        if (next) {
            const currentFP = current.fingerprintCode || 'unknown';
            const nextFP = next.fingerprintCode || 'unknown';

            if (!this.transitionMap[currentFP]) this.transitionMap[currentFP] = {};
            this.transitionMap[currentFP][nextFP] = (this.transitionMap[currentFP][nextFP] || 0) + 1;
        }
    }
  }

  private reset() {
    this.transitionMap = {};
    this.frequencies = { rhymes: {}, stress: {}, syllables: {} };
  }

  private updateFrequencies(bar: Bar) {
    if (bar.corePhoneme) {
        this.frequencies.rhymes[bar.corePhoneme] = (this.frequencies.rhymes[bar.corePhoneme] || 0) + 1;
    }
    if (bar.syllableCount) {
        this.frequencies.syllables[bar.syllableCount] = (this.frequencies.syllables[bar.syllableCount] || 0) + 1;
    }
    // Extract stress pattern from fingerprint
    const stress = bar.fingerprintCode?.split('-')[0];
    if (stress) {
        this.frequencies.stress[stress] = (this.frequencies.stress[stress] || 0) + 1;
    }
  }

  /**
   * Predicts the next most likely fingerprints based on a seed.
   */
  public predictNext(seedFingerprint: string): string[] {
    const transitions = this.transitionMap[seedFingerprint];
    if (!transitions) {
        // Fallback: Return most frequent similar fingerprints
        return this.getGlobalFrequentFingerprints(seedFingerprint);
    }

    return Object.entries(transitions)
      .sort(([, a], [, b]) => b - a)
      .map(([fp]) => fp);
  }

  private getGlobalFrequentFingerprints(seed: string): string[] {
    // Rank all existing fingerprints by their frequency and similarity to seed
    const allFPs = Object.keys(this.transitionMap);
    // This is a simple fallback: just return the top used ones
    return allFPs.slice(0, 5);
  }

  public getFrequencies() {
    return this.frequencies;
  }
}

export const predictionEngine = new PatternPredictionEngine();
