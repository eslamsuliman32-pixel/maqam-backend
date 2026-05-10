export type AccentBit = '[!]' | '[.]';
export type MetricalFoot = 'Iamb' | 'Trochee' | 'Spondee' | 'Pyrrhic' | 'Anapest' | 'Dactyl';

export interface PhonemicFingerprint {
  bits: AccentBit[];
  dominantFoot: MetricalFoot;
  syllableCount: number;
  syncopationScore: number;
  polyrhythmicComplexity: number;
  rhythmicGait: string;
  stressFingerprintCode: string;
}

export interface EncodedBar {
  id: string;
  text: string;
  fingerprint: PhonemicFingerprint;
  tags: string[];
  isFromLocalRepo: true;
}
