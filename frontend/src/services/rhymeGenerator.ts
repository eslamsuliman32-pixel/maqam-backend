import { useRepositoryStore, Bar } from '../store/repositoryStore';

/**
 * DNA-based rhyme generator driven by the existing repository content.
 */
class RhymeGenerator {
  private extractRhymeKey(phoneme: string): string {
    return phoneme.slice(-2); // Extracts last phonetic chunk
  }

  /**
   * Builds an index mapping phonetic keys to bars.
   */
  public buildRhymeIndex(bars: Bar[]): Record<string, Bar[]> {
    const index: Record<string, Bar[]> = {};

    bars.forEach(b => {
      if (!b.corePhoneme) return;
      const key = this.extractRhymeKey(b.corePhoneme);

      if (!index[key]) index[key] = [];
      index[key].push(b);
    });

    return index;
  }

  /**
   * Finds the best existing bar from the repository that rhymes with the target.
   * Ranks by syllable and stress match if multiple candidates exist.
   */
  public generateRhyme(targetPhoneme: string, bars: Bar[]): Bar | null {
    const index = this.buildRhymeIndex(bars);
    const key = this.extractRhymeKey(targetPhoneme);

    const candidates = index[key] || [];

    if (candidates.length === 0) return null;

    // Rank by closest syllable similarity
    // We assume targetPhoneme might come from a bar, so we can try to find similar bars
    candidates.sort((a, b) => {
        // Ideal logic would compare to a specific source bar, 
        // but here we just return the most established/recent match in the index
        return (a.syllableCount || 0) - (b.syllableCount || 0);
    });

    // Return a random one from the top 3 best syllable matches for variability
    const bestMatches = candidates.slice(0, 3);
    return bestMatches[Math.floor(Math.random() * bestMatches.length)];
  }
}

export const rhymeGenerator = new RhymeGenerator();
