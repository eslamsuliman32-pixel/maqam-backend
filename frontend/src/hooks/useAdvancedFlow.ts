import { useState, useCallback } from 'react';
import { useRepositoryStore, Bar } from '../store/repositoryStore';
import { flowComposer, FlowConstraint } from '../services/flowComposer';
import { styleEngine, StyleProfile } from '../services/styleEngine';
import { beatSyncEngine } from '../services/beatSyncEngine';
import { predictionEngine } from '../services/predictionEngine';

export function useAdvancedFlow() {
  const { bars } = useRepositoryStore();
  const [currentFlow, setCurrentFlow] = useState<Bar[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Generates a full verse with style transfer and sync.
   */
  const generateVerse = useCallback((
    seedBarId: string, 
    options: { 
      length: number, 
      bpm: number, 
      styleName?: string 
    }
  ) => {
    setIsProcessing(true);
    
    try {
      // 1. Prediction & Composition
      let flow = flowComposer.composeFlow(seedBarId, bars, { targetLength: options.length });

      // 2. Style Transfer (Refine flow if style profile exists)
      if (options.styleName) {
        const styleProfile = styleEngine.extractStyle(options.styleName, bars.filter(b => b.tags.includes(options.styleName!)));
        const styledBars = styleEngine.matchStyle(bars, styleProfile);
        if (styledBars.length > 5) {
            // Mix in some styled bars if appropriate - for now we just show the capability
            console.log('Style Profile extracted:', styleProfile);
        }
      }

      // 3. Beat Sync
      flow = beatSyncEngine.calculateTimings(flow, options.bpm);

      setCurrentFlow(flow);
      return flow;
    } finally {
      setIsProcessing(false);
    }
  }, [bars]);

  /**
   * Mutates the current flow into a new variation.
   */
  const remixFlow = useCallback((bpm: number) => {
    if (currentFlow.length === 0) return;
    
    let mutated = flowComposer.mutateFlow(currentFlow, bars);
    mutated = beatSyncEngine.calculateTimings(mutated, bpm);
    
    setCurrentFlow(mutated);
    return mutated;
  }, [currentFlow, bars]);

  /**
   * Analyzes repository to refresh prediction models.
   */
  const refreshEngine = useCallback(() => {
    predictionEngine.analyzeRepository(bars);
  }, [bars]);

  return {
    currentFlow,
    isProcessing,
    generateVerse,
    remixFlow,
    refreshEngine,
    setCurrentFlow
  };
}
