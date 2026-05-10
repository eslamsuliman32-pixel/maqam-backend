
import { ArabicDialect, BarRole, DominantAcousticCharacter, PhonemeCharacterization, AcousticResonanceProfile } from '../services/moraEngine';
import { NarrativeArcLabel, ThematicVector, SemanticTag, BarAnalysis } from '../services/geminiService';
import { AccentBit } from './accent';

export interface CompositeFilter {
  narrativeArcs?: NarrativeArcLabel[];
  barRoles?: BarRole[];
  resonanceCharacters?: DominantAcousticCharacter[];
  semanticTags?: string[];
  minQalqala?: number;
  maxQalqala?: number;
  minRakhwa?: number;
  minResonance?: number;
  minMetaphoricalDepth?: number;
  dominantFeet?: string[];
  minPolyrhythmIndex?: number;
  minCompositeSemanticScore?: number;
  minLyricDensity?: number;
  thematicMinima?: Partial<ThematicVector>;
  operator?: 'AND' | 'OR';
}

export interface Bar extends BarAnalysis {
  id: string;
  repoId?: string; // If it's a clone in a workshop, this tracks its origin
  serialNumber: string;
  text: string;
  dialect: ArabicDialect;
  emotion?: string;
  isFavorite: boolean;
  isPermanent?: boolean;
  createdAt: string;
  tags: string[];
  startTime?: number;
  duration?: number;
  bits?: AccentBit[];
  dominantFoot?: string;
  deleted?: boolean;

  acousticResonance?: AcousticResonanceProfile;
  phonemeCharacterization?: PhonemeCharacterization;
  
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
  
  resonanceFingerprint?: string;
  qalqalaIntensity?: number;
  rakhwaIndex?: number;
  shiddaScore?: number;
  safirDensity?: number;
  hulqiDepth?: number;
  overallResonance?: number;
  dominantAcousticCharacter?: DominantAcousticCharacter;
  suggestedBarRole?: BarRole;
  acousticEmotionalSignature?: string;

  narrativeArc?: NarrativeArcLabel;
  arcPosition?: number;
  arcConfidence?: number;
  semanticTags?: SemanticTag[];
  thematicVector?: ThematicVector;
  metaphoricalDepth?: number;
  lyricDensity?: number;
  culturalDepth?: number;
  compositeSemanticScore?: number;
  dominantMood?: string;
  semanticEmotionalSignature?: string;

  polyrhythmIndex?: number;
  syncopeScore?: number;
  flowSwitchCount?: number;
  dominantGrid?: string;
  rhythmicTension?: number;
  flowCode?: string;

  isAcousticEnriched?: boolean;
  isSemanticEnriched?: boolean;
  _compositeMatchScore?: number;
}

export type WorkshopBar = Bar & {
  original: string;
}
