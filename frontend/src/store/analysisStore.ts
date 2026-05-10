import { create } from 'zustand';
import { ProfessionalBeatAnalysis, MaqamType } from '../services/pipelineTypes';

interface AnalysisState {
  analysis: ProfessionalBeatAnalysis | null;
  musicalMaqam: MaqamType;
  setAnalysis: (analysis: ProfessionalBeatAnalysis) => void;
  setMusicalMaqam: (maqam: MaqamType) => void;
  clearAnalysis: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  analysis: null,
  musicalMaqam: 'Nahawand',
  setAnalysis: (analysis) => set({ analysis }),
  setMusicalMaqam: (musicalMaqam) => set({ musicalMaqam }),
  clearAnalysis: () => set({ analysis: null }),
}));
