import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createCloudSyncStorage } from '../services/firebaseSync';
import { BarAnalysis } from '../services/geminiService';
import {
  AcousticResonanceProfile,
  ArabicDialect,
  moraEngine,
  BarRole,
  DominantAcousticCharacter,
  PhonemeCharacterization
} from '../services/moraEngine';
import { accentScanner } from '../services/accentScanner';
import {
  NarrativeArcLabel,
  ThematicVector,
  SemanticTag
} from '../services/geminiService';
import { AccentBit } from '../types/accent';

const cloudSyncStorage = createCloudSyncStorage();

import { Bar, CompositeFilter } from '../types';
export type { Bar, CompositeFilter };

interface RepositoryStore {
  bars: Bar[];
  filteredBars: Bar[];
  selectedBars: string[];
  isLoading: boolean;

  searchQuery: string;
  stressFilter: string;
  rhymeFilter: string;
  twoFactorFilter: { factor1: string; factor2: string } | null;
  threeFactorFilter: { factor1: string; factor2: string; factor3: string } | null;

  narrativeArcFilter: string;
  barRoleFilter: string;
  resonanceCharacterFilter: string;
  semanticTagFilter: string;
  compositeFilter: CompositeFilter | null;

  addBar: (bar: Partial<Bar> & { text: string; dialect: ArabicDialect }) => string;
  addBatch: (bars: (Partial<Bar> & { text: string; dialect: ArabicDialect })[]) => void;
  updateBar: (id: string, updates: Partial<Bar>) => void;
  updateBatch: (updates: { id: string; updates: Partial<Bar> }[]) => void;
  deleteBar: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateRating: (id: string, rating: number) => void;
  toggleSelection: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;

  setSearchQuery: (query: string) => void;
  setStressFilter: (filter: string) => void;
  setRhymeFilter: (filter: string) => void;
  setTwoFactorFilter: (filters: { factor1: string; factor2: string } | null) => void;
  setThreeFactorFilter: (filters: { factor1: string; factor2: string; factor3: string } | null) => void;

  setNarrativeArcFilter: (arc: string) => void;
  setBarRoleFilter: (role: string) => void;
  setResonanceCharacterFilter: (character: string) => void;
  setSemanticTagFilter: (tag: string) => void;
  setCompositeFilter: (filter: CompositeFilter | null) => void;
  clearAllFilters: () => void;

  enrichBarAcoustic: (id: string) => void;
  enrichBarSemantic: (id: string, semanticData: Partial<Bar>) => void;
  enrichBatchAcoustic: (ids?: string[]) => void;

  getNextSerialNumber: () => string;
}

const generateId = (): string => {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2, 11);
  }
};

const normalizeText = (value: string): string => value.trim().toLowerCase();

const analyzeBarInternally = (text: string, dialect: ArabicDialect): Partial<Bar> => {
  const profile = moraEngine.analyze(text, dialect);
  const corePhoneme = moraEngine.extractCorePhoneme(text);
  const stressBits = accentScanner.scan(text, dialect === 'fusha' ? 'standard' : dialect as any);
  const fingerprintCode = accentScanner.generateFingerprintCode(
    text,
    stressBits,
    profile.totalMorae,
    corePhoneme
  );

  const resonance = moraEngine.analyzeAcousticResonance(text);
  const characterization = moraEngine.analyzePhonemeCharacterization(text);
  const polyrhythm = accentScanner.analyzePolyrhythm(text, dialect === 'fusha' ? 'standard' : dialect as any);

  // Derive weight class
  let weightClass: Bar['weightClass'] = 'medium_light';
  if (profile.sonicWeight > 40) weightClass = 'super_heavy';
  else if (profile.sonicWeight > 30) weightClass = 'heavy';
  else if (profile.sonicWeight > 20) weightClass = 'medium_heavy';
  else if (profile.sonicWeight < 10) weightClass = 'light';

  return {
    totalMorae: profile.totalMorae,
    sonicWeight: profile.sonicWeight,
    rhythmicWeight: profile.rhythmicWeight,
    corePhoneme,
    fingerprintCode,
    syllableCount: accentScanner.countSyllables(text),
    emotion: moraEngine.getEmotionalTone(text),
    acousticResonance: resonance,
    phonemeCharacterization: characterization,
    resonanceFingerprint: resonance.resonanceFingerprint,
    qalqalaIntensity: resonance.qalqalaIntensity,
    rakhwaIndex: resonance.rakhwaIndex,
    shiddaScore: resonance.shiddaScore,
    safirDensity: resonance.safirDensity,
    hulqiDepth: resonance.hulqiDepth,
    overallResonance: resonance.overallResonance,
    dominantAcousticCharacter: resonance.dominantCharacter,
    suggestedBarRole: resonance.suggestedRole,
    acousticEmotionalSignature: resonance.emotionalSignature,
    isAcousticEnriched: true,
    polyrhythmIndex: polyrhythm.index,
    syncopeScore: polyrhythm.syncopeScore,
    flowSwitchCount: polyrhythm.switchCount,
    dominantGrid: polyrhythm.dominantGrid,
    rhythmicTension: polyrhythm.tension,
    flowCode: (accentScanner as any).buildFlowCode?.(polyrhythm.flowSwitches) ?? 'STEADY',
    
    // Missing required fields from BarAnalysis
    index: 0,
    weightClass,
    flowMode: 'pocket',
    endPhoneme: corePhoneme,
    internalRhymes: 0,
    alignmentScore: 0,
    compatibleBeats: [],
    strengthNote: 'تحليل آلي',
    weaknessNote: 'لا يوجد',
  };
};

const computeBarMatchScore = (bar: Bar, filter: CompositeFilter): number => {
  const criteria: Array<{ weight: number; satisfied: boolean }> = [];

  const addCriterion = (satisfied: boolean, weight = 1) => {
    criteria.push({ weight, satisfied });
  };

  if (filter.narrativeArcs?.length) {
    addCriterion(filter.narrativeArcs.includes(bar.narrativeArc ?? 'unclassified'), 1.5);
  }

  if (filter.barRoles?.length) {
    addCriterion(filter.barRoles.includes(bar.suggestedBarRole ?? 'verse_body'), 1.3);
  }

  if (filter.resonanceCharacters?.length) {
    addCriterion(filter.resonanceCharacters.includes(bar.dominantAcousticCharacter ?? 'balanced'), 1.2);
  }

  if (filter.semanticTags?.length) {
    const barTags = (bar.semanticTags ?? []).map((tag) => tag.tag.toLowerCase());
    const hasMatch = filter.semanticTags.some((tag) =>
      barTags.some((candidate) => candidate.includes(tag.toLowerCase()))
    );
    addCriterion(hasMatch, 1.4);
  }

  if (filter.minQalqala !== undefined) addCriterion((bar.qalqalaIntensity ?? 0) >= filter.minQalqala, 1);
  if (filter.maxQalqala !== undefined) addCriterion((bar.qalqalaIntensity ?? 0) <= filter.maxQalqala, 1);
  if (filter.minRakhwa !== undefined) addCriterion((bar.rakhwaIndex ?? 0) >= filter.minRakhwa, 1);
  if (filter.minResonance !== undefined) addCriterion((bar.overallResonance ?? 0) >= filter.minResonance, 1);
  if (filter.minMetaphoricalDepth !== undefined) addCriterion((bar.metaphoricalDepth ?? 0) >= filter.minMetaphoricalDepth, 1.2);

  if (filter.dominantFeet?.length) {
    addCriterion(filter.dominantFeet.includes(bar.fingerprintCode?.split('-')[0] ?? ''), 1);
  }

  if (filter.minPolyrhythmIndex !== undefined) {
    addCriterion((bar.polyrhythmIndex ?? 0) >= filter.minPolyrhythmIndex, 1);
  }

  if (filter.minCompositeSemanticScore !== undefined) {
    addCriterion((bar.compositeSemanticScore ?? 0) >= filter.minCompositeSemanticScore, 1.1);
  }

  if (filter.minLyricDensity !== undefined) {
    addCriterion((bar.lyricDensity ?? 0) >= filter.minLyricDensity, 1);
  }

  if (filter.thematicMinima && bar.thematicVector) {
    for (const [axis, minVal] of Object.entries(filter.thematicMinima) as [keyof ThematicVector, number][]) {
      addCriterion((bar.thematicVector[axis] ?? 0) >= minVal, 1.1);
    }
  }

  if (criteria.length === 0) return 100;

  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  const satisfiedWeight = criteria.filter((item) => item.satisfied).reduce((sum, item) => sum + item.weight, 0);

  return Math.round((satisfiedWeight / totalWeight) * 100);
};

const applyCompositeFilterToPool = (bars: Bar[], filter: CompositeFilter): Bar[] => {
  const scored = bars.map((bar) => {
    const score = computeBarMatchScore(bar, filter);
    return {
      bar: { ...bar, _compositeMatchScore: score },
      score,
    };
  });

  if (filter.operator === 'AND') {
    return scored.filter((item) => item.score === 100).map((item) => item.bar);
  }

  return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score).map((item) => item.bar);
};

const matchesSearchQuery = (bar: Bar, query: string): boolean => {
  const q = normalizeText(query);
  if (!q) return true;

  return (
    normalizeText(bar.text).includes(q) ||
    (bar.tags ?? []).some((tag) => normalizeText(tag).includes(q)) ||
    normalizeText(bar.fingerprintCode ?? '').includes(q) ||
    normalizeText(bar.serialNumber ?? '').includes(q) ||
    (bar.semanticTags ?? []).some((semanticTag) => normalizeText(semanticTag.tag).includes(q)) ||
    normalizeText(bar.dominantMood ?? '').includes(q)
  );
};

const applyDerivedFilters = (bars: Bar[], state: Pick<RepositoryStore,
  'searchQuery' |
  'narrativeArcFilter' |
  'barRoleFilter' |
  'resonanceCharacterFilter' |
  'semanticTagFilter' |
  'compositeFilter'
>): Bar[] => {
  const activeBars = bars.filter((bar) => !bar.deleted);

  let result = activeBars;

  if (state.searchQuery.trim()) {
    result = result.filter((bar) => matchesSearchQuery(bar, state.searchQuery));
  }

  if (state.narrativeArcFilter && state.narrativeArcFilter !== 'all') {
    result = result.filter((bar) => bar.narrativeArc === state.narrativeArcFilter);
  }

  if (state.barRoleFilter && state.barRoleFilter !== 'all') {
    result = result.filter((bar) => bar.suggestedBarRole === state.barRoleFilter);
  }

  if (state.resonanceCharacterFilter && state.resonanceCharacterFilter !== 'all') {
    result = result.filter((bar) => bar.dominantAcousticCharacter === state.resonanceCharacterFilter);
  }

  if (state.semanticTagFilter.trim()) {
    const lowered = state.semanticTagFilter.trim().toLowerCase();
    result = result.filter((bar) =>
      (bar.semanticTags ?? []).some((semanticTag) => semanticTag.tag.toLowerCase().includes(lowered)) ||
      (bar.dominantMood ?? '').toLowerCase().includes(lowered)
    );
  }

  if (state.compositeFilter) {
    result = applyCompositeFilterToPool(result, state.compositeFilter);
  }

  return result;
};

export const useRepositoryStore = create<RepositoryStore>()(
  persist(
    (set, get) => ({
      bars: [],
      filteredBars: [],
      selectedBars: [],
      isLoading: false,

      searchQuery: '',
      stressFilter: '',
      rhymeFilter: '',
      twoFactorFilter: null,
      threeFactorFilter: null,

      narrativeArcFilter: '',
      barRoleFilter: '',
      resonanceCharacterFilter: '',
      semanticTagFilter: '',
      compositeFilter: null,

      getNextSerialNumber: () => {
        const { bars } = get();
        const count = bars.filter((bar) => !bar.deleted).length + 1;
        return `BAR-${count.toString().padStart(4, '0')}`;
      },

      toggleSelection: (id) => set((state) => ({
        selectedBars: state.selectedBars.includes(id)
          ? state.selectedBars.filter((selectedId) => selectedId !== id)
          : [...state.selectedBars, id],
      })),

      setSelection: (ids) => set({ selectedBars: ids }),

      clearSelection: () => set({ selectedBars: [] }),

      addBar: (barData) => {
        const id = generateId();
        let resultId = id;
        
        set((state) => {
          const analysis = analyzeBarInternally(barData.text, barData.dialect);
          const newBar: Bar = {
            id,
            serialNumber: state.getNextSerialNumber(),
            isFavorite: false,
            createdAt: new Date().toISOString(),
            tags: [],
            ...barData,
            ...analysis,
          } as Bar;

          const bars = [newBar, ...state.bars];
          return {
            bars,
            filteredBars: applyDerivedFilters(bars, state),
          };
        });
        
        return resultId;
      },

      addBatch: (incoming) => set((state) => {
        const uniqueIncoming = incoming.filter((newBar) =>
          !state.bars.some((existing) => existing.text.trim() === newBar.text.trim())
        );

        if (uniqueIncoming.length === 0) return state;

        const baseCount = state.bars.filter((bar) => !bar.deleted).length;
        const enriched = uniqueIncoming.map((barData, index) => {
          const analysis = analyzeBarInternally(barData.text, barData.dialect);
          return {
            id: generateId(),
            serialNumber: `BAR-${(baseCount + index + 1).toString().padStart(4, '0')}`,
            isFavorite: false,
            createdAt: new Date().toISOString(),
            tags: [],
            ...barData,
            ...analysis,
          } as Bar;
        });

        const bars = [...enriched, ...state.bars];
        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      updateBar: (id, updates) => set((state) => {
        const bars = state.bars.map((bar) => (bar.id === id ? { ...bar, ...updates } : bar));
        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      updateBatch: (updates) => set((state) => {
        const updateMap = new Map<string, Partial<Bar>>(updates.map((item) => [item.id, item.updates] as const));
        const bars = state.bars.map((bar) => {
          const patch = updateMap.get(bar.id);
          return patch ? { ...bar, ...patch } : bar;
        });

        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      deleteBar: (id) => set((state) => {
        const target = state.bars.find((bar) => bar.id === id);
        if (target?.isPermanent) {
          console.warn('Cannot delete a permanent bar');
          return state;
        }

        const bars = state.bars.map((bar) => (bar.id === id ? { ...bar, deleted: true } : bar));
        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      toggleFavorite: (id) => set((state) => {
        const bars = state.bars.map((bar) => (bar.id === id ? { ...bar, isFavorite: !bar.isFavorite } : bar));
        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      updateRating: (id, rating) => set((state) => {
        const bars = state.bars.map((bar) => (bar.id === id ? { ...bar, rating } : bar));
        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      setSearchQuery: (query) => set((state) => {
        const nextState = { ...state, searchQuery: query };
        return {
          searchQuery: query,
          filteredBars: applyDerivedFilters(state.bars, nextState),
        };
      }),

      setStressFilter: (filter) => set({ stressFilter: filter }),
      setRhymeFilter: (filter) => set({ rhymeFilter: filter }),
      setTwoFactorFilter: (filter) => set({ twoFactorFilter: filter }),
      setThreeFactorFilter: (filter) => set({ threeFactorFilter: filter }),

      setNarrativeArcFilter: (arc) => set((state) => {
        const nextState = { ...state, narrativeArcFilter: arc };
        return {
          narrativeArcFilter: arc,
          filteredBars: applyDerivedFilters(state.bars, nextState),
        };
      }),

      setBarRoleFilter: (role) => set((state) => {
        const nextState = { ...state, barRoleFilter: role };
        return {
          barRoleFilter: role,
          filteredBars: applyDerivedFilters(state.bars, nextState),
        };
      }),

      setResonanceCharacterFilter: (character) => set((state) => {
        const nextState = { ...state, resonanceCharacterFilter: character };
        return {
          resonanceCharacterFilter: character,
          filteredBars: applyDerivedFilters(state.bars, nextState),
        };
      }),

      setSemanticTagFilter: (tag) => set((state) => {
        const nextState = { ...state, semanticTagFilter: tag };
        return {
          semanticTagFilter: tag,
          filteredBars: applyDerivedFilters(state.bars, nextState),
        };
      }),

      setCompositeFilter: (filter) => set((state) => {
        const nextState = { ...state, compositeFilter: filter };
        return {
          compositeFilter: filter,
          filteredBars: applyDerivedFilters(state.bars, nextState),
        };
      }),

      clearAllFilters: () => set((state) => ({
        searchQuery: '',
        stressFilter: '',
        rhymeFilter: '',
        twoFactorFilter: null,
        threeFactorFilter: null,
        narrativeArcFilter: '',
        barRoleFilter: '',
        resonanceCharacterFilter: '',
        semanticTagFilter: '',
        compositeFilter: null,
        filteredBars: state.bars.filter((bar) => !bar.deleted),
      })),

      enrichBarAcoustic: (id) => set((state) => {
        const bar = state.bars.find((item) => item.id === id);
        if (!bar) return state;

        const resonance = moraEngine.analyzeAcousticResonance(bar.text);
        const characterization = moraEngine.analyzePhonemeCharacterization(bar.text);
        const polyrhythm = accentScanner.analyzePolyrhythm(
          bar.text,
          bar.dialect === 'fusha' ? 'standard' : bar.dialect as any
        );

        const updates: Partial<Bar> = {
          acousticResonance: resonance,
          phonemeCharacterization: characterization,
          resonanceFingerprint: resonance.resonanceFingerprint,
          qalqalaIntensity: resonance.qalqalaIntensity,
          rakhwaIndex: resonance.rakhwaIndex,
          shiddaScore: resonance.shiddaScore,
          safirDensity: resonance.safirDensity,
          hulqiDepth: resonance.hulqiDepth,
          overallResonance: resonance.overallResonance,
          dominantAcousticCharacter: resonance.dominantCharacter,
          suggestedBarRole: resonance.suggestedRole,
          acousticEmotionalSignature: resonance.emotionalSignature,
          polyrhythmIndex: polyrhythm.index,
          syncopeScore: polyrhythm.syncopeScore,
          flowSwitchCount: polyrhythm.switchCount,
          dominantGrid: polyrhythm.dominantGrid,
          rhythmicTension: polyrhythm.tension,
          isAcousticEnriched: true,
        };

        const bars = state.bars.map((item) => (item.id === id ? { ...item, ...updates } : item));
        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      enrichBarSemantic: (id, semanticData) => set((state) => {
        const bars = state.bars.map((bar) =>
          bar.id === id
            ? { ...bar, ...semanticData, isSemanticEnriched: true }
            : bar
        );

        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),

      enrichBatchAcoustic: (ids) => set((state) => {
        const targetIds = ids ? new Set(ids) : null;
        const bars = state.bars.map((bar) => {
          if (targetIds && !targetIds.has(bar.id)) return bar;

          const resonance = moraEngine.analyzeAcousticResonance(bar.text);
          const characterization = moraEngine.analyzePhonemeCharacterization(bar.text);
          const polyrhythm = accentScanner.analyzePolyrhythm(
            bar.text,
            bar.dialect === 'fusha' ? 'standard' : bar.dialect as any
          );

          return {
            ...bar,
            acousticResonance: resonance,
            phonemeCharacterization: characterization,
            resonanceFingerprint: resonance.resonanceFingerprint,
            qalqalaIntensity: resonance.qalqalaIntensity,
            rakhwaIndex: resonance.rakhwaIndex,
            shiddaScore: resonance.shiddaScore,
            safirDensity: resonance.safirDensity,
            hulqiDepth: resonance.hulqiDepth,
            overallResonance: resonance.overallResonance,
            dominantAcousticCharacter: resonance.dominantCharacter,
            suggestedBarRole: resonance.suggestedRole,
            acousticEmotionalSignature: resonance.emotionalSignature,
            polyrhythmIndex: polyrhythm.index,
            syncopeScore: polyrhythm.syncopeScore,
            flowSwitchCount: polyrhythm.switchCount,
            dominantGrid: polyrhythm.dominantGrid,
            rhythmicTension: polyrhythm.tension,
            isAcousticEnriched: true,
          } as Bar;
        });

        return {
          bars,
          filteredBars: applyDerivedFilters(bars, state),
        };
      }),
    }),
    {
      name: 'maqam-repository-storage',
      version: 3,
      storage: createJSONStorage(() => cloudSyncStorage),
      partialize: (state) => ({
        bars: state.bars,
        searchQuery: state.searchQuery,
        stressFilter: state.stressFilter,
        rhymeFilter: state.rhymeFilter,
        twoFactorFilter: state.twoFactorFilter,
        threeFactorFilter: state.threeFactorFilter,
        narrativeArcFilter: state.narrativeArcFilter,
        barRoleFilter: state.barRoleFilter,
        resonanceCharacterFilter: state.resonanceCharacterFilter,
        semanticTagFilter: state.semanticTagFilter,
        compositeFilter: state.compositeFilter,
      }),
      migrate: (persistedState: any, version: number) => {
        console.log(`[RepositoryStore] Migrating from version ${version} to 3`);
        
        let legacyBars = (persistedState as any)?.bars ?? [];
        
        // Ensure every bar has the mandatory new fields
        const upgradedBars = legacyBars.map((bar: any) => {
          if (!bar.text) return bar;
          
          // If the bar is missing core metadata, re-analyze it partially
          if (!bar.corePhoneme || bar.index === undefined) {
            const analysis = analyzeBarInternally(bar.text, bar.dialect || 'fusha');
            return {
              ...analysis,
              ...bar, // Keep existing if present
              id: bar.id || generateId(),
              serialNumber: bar.serialNumber || 'BAR-OLD',
              createdAt: bar.createdAt || new Date().toISOString(),
              isFavorite: !!bar.isFavorite,
              tags: bar.tags || [],
            };
          }
          return bar;
        });

        const migratedState = {
          bars: upgradedBars,
          selectedBars: [],
          isLoading: false,
          searchQuery: (persistedState as any)?.searchQuery ?? '',
          stressFilter: (persistedState as any)?.stressFilter ?? '',
          rhymeFilter: (persistedState as any)?.rhymeFilter ?? '',
          twoFactorFilter: (persistedState as any)?.twoFactorFilter ?? null,
          threeFactorFilter: (persistedState as any)?.threeFactorFilter ?? null,
          narrativeArcFilter: (persistedState as any)?.narrativeArcFilter ?? '',
          barRoleFilter: (persistedState as any)?.barRoleFilter ?? '',
          resonanceCharacterFilter: (persistedState as any)?.resonanceCharacterFilter ?? '',
          semanticTagFilter: (persistedState as any)?.semanticTagFilter ?? '',
          compositeFilter: (persistedState as any)?.compositeFilter ?? null,
        } as RepositoryStore;
        
        migratedState.filteredBars = applyDerivedFilters(migratedState.bars, migratedState);
        return migratedState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        setTimeout(() => {
            useRepositoryStore.setState((s) => ({
                filteredBars: applyDerivedFilters(s.bars, s)
            }));
        }, 10);
      },
    }
  )
);

export { computeBarMatchScore, applyCompositeFilterToPool };
