/**
 * MAQAM v4.0 - Maqam Tuning Engine
 * Implements Just Intonation and Microtonal Tuning for Arabic Maqamat.
 * Uses Cents-based frequency mapping for authentic quarter-tone precision.
 */

export type MaqamType = 'Rast' | 'Bayati' | 'Hijaz' | 'Saba' | 'Sikah' | 'Nahawand' | 'Ajam';

interface TuningMap {
  [note: string]: number; // Cents offset from Equal Temperament
}

class MaqamTuningEngine {
  /**
   * Tuning Maps (§2.1)
   * Values in Cents (100 cents = 1 semitone)
   */
  private readonly TUNING_PRESETS: Record<MaqamType, TuningMap> = {
    'Rast': {
      'E': -50, // Quarter-tone flat
      'B': -50
    },
    'Bayati': {
      'E': -50,
      'B': -50
    },
    'Sikah': {
      'E': -50,
      'B': -50,
      'A': -50
    },
    'Saba': {
      'E': -50,
      'B': -50,
      'G': -50
    },
    'Hijaz': {
      'Eb': -50, // Often subtle variations in Hijaz
      'F#': 50
    },
    'Nahawand': {}, // Natural Minor (Equal Temperament)
    'Ajam': {}      // Major Scale (Equal Temperament)
  };

  /**
   * Calculate exact frequency for a note in a specific Maqam
   * Formula: f = f_ref * 2^((cents_offset + semitones_from_ref) / 1200)
   */
  public getFrequency(baseNote: string, octave: number, maqam: MaqamType): number {
    const standardFrequencies: Record<string, number> = {
      'C': 16.35, 'C#': 17.32, 'Db': 17.32, 'D': 18.35, 'D#': 19.45, 'Eb': 19.45,
      'E': 20.60, 'F': 21.83, 'F#': 23.12, 'Gb': 23.12, 'G': 24.50, 'G#': 25.96,
      'Ab': 25.96, 'A': 27.50, 'A#': 29.14, 'Bb': 29.14, 'B': 30.87
    };

    const baseFreq = standardFrequencies[baseNote] * Math.pow(2, octave);
    const offset = this.TUNING_PRESETS[maqam][baseNote] || 0;

    // f = f0 * 2^(cents / 1200)
    return baseFreq * Math.pow(2, offset / 1200);
  }

  /**
   * Get Detune value for Tone.js (in cents)
   */
  public getDetune(note: string, maqam: MaqamType): number {
    return this.TUNING_PRESETS[maqam][note] || 0;
  }

  /**
   * Get all available Maqamat
   */
  public getAvailableMaqamat(): MaqamType[] {
    return Object.keys(this.TUNING_PRESETS) as MaqamType[];
  }
}

export const maqamTuningEngine = new MaqamTuningEngine();
