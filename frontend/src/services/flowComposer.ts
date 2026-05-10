import { Bar } from '../store/repositoryStore';
import { predictionEngine } from './predictionEngine';
import { neuralPredictNext } from './neuralPredictor';
import { rhymeGenerator } from './rhymeGenerator';

export interface FlowConstraint {
  targetLength: number;
  rhymeScheme?: 'fixed' | 'variable';
  preferredDialect?: string;
  minSimilarity?: number;
}

export class FlowComposer {
  /**
   * Generates a dynamic rap flow (list of bars) starting from a seed bar.
   */
  public composeFlow(
    seedBarId: string, 
    allBars: Bar[], 
    constraints: FlowConstraint
  ): Bar[] {
    const seedBar = allBars.find(b => b.id === seedBarId);
    if (!seedBar) return [];

    // Analyze first
    predictionEngine.analyzeRepository(allBars);

    const flow: Bar[] = [seedBar];
    let currentBar = seedBar;

    for (let i = 1; i < constraints.targetLength; i++) {
      const nextBar = this.findNextOptimalBar(currentBar, allBars, flow);
      if (nextBar) {
        flow.push(nextBar);
        currentBar = nextBar;
      } else {
        break; // Stop if no bars found (too restrictive or out of data)
      }
    }

    return flow;
  }

  /**
   * Mutates an existing flow by replacing bars with siblings that share 
   * the same DNA (fingerprint) or core phonetics.
   */
  public mutateFlow(flow: Bar[], allBars: Bar[]): Bar[] {
    return flow.map(bar => {
      // Find bars with same fingerprint but different text
      const siblings = allBars.filter(b => 
        b.fingerprintCode === bar.fingerprintCode && 
        b.id !== bar.id &&
        !flow.some(f => f.id === b.id)
      );

      if (siblings.length > 0) {
        return siblings[Math.floor(Math.random() * siblings.length)];
      }

      // Fallback: Same rhyme and syllable count
      const phoneticSiblings = allBars.filter(b => 
        b.corePhoneme === bar.corePhoneme && 
        b.syllableCount === bar.syllableCount &&
        b.id !== bar.id
      );

      if (phoneticSiblings.length > 0) {
        return phoneticSiblings[Math.floor(Math.random() * phoneticSiblings.length)];
      }

      return bar; // Keep original if no mutation found
    });
  }

  private findNextOptimalBar(current: Bar, allBars: Bar[], currentFlow: Bar[]): Bar | null {
    const currentFP = current.fingerprintCode || '';
    
    // Phase 1: Neural Prediction (Learn pattern mapping)
    const neuralFP = neuralPredictNext(currentFP);
    
    // Phase 2: Statistical candidates
    const candidates = predictionEngine.predictNext(currentFP);
    
    const combinedCandidates = neuralFP ? [neuralFP, ...candidates] : candidates;

    // Try fingerprint-based candidates first
    for (const fp of combinedCandidates) {
        const matches = allBars.filter(b => 
            b.fingerprintCode === fp && 
            !currentFlow.some(f => f.id === b.id) // Avoid repeats
        );
        if (matches.length > 0) {
            // Pick the one with best rhyme match or just random from matches
            return matches[Math.floor(Math.random() * matches.length)];
        }
    }

    // Phase 3: DNA-based Rhyme Matching if no direct path found
    if (current.corePhoneme) {
      const rhymeMatch = rhymeGenerator.generateRhyme(current.corePhoneme, allBars.filter(b => !currentFlow.some(f => f.id === b.id)));
      if (rhymeMatch) return rhymeMatch;
    }

    // Phase 4: Secondary strategy: Rhyme cluster matching if no transition found
    const rhymeGroup = allBars.filter(b => 
        b.corePhoneme === current.corePhoneme && 
        !currentFlow.some(f => f.id === b.id)
    );
    if (rhymeGroup.length > 0) {
        // Find one with similar rhythmic weight
        return rhymeGroup.sort((a, b) => 
            Math.abs((a.rhythmicWeight || 0) - (current.rhythmicWeight || 0)) -
            Math.abs((b.rhythmicWeight || 0) - (current.rhythmicWeight || 0))
        )[0];
    }

    return null;
  }
}

export const flowComposer = new FlowComposer();
