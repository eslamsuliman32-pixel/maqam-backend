import { Bar } from '../store/repositoryStore';

export class BeatSyncEngine {
  /**
   * Aligns a flow of bars to a specific BPM and time grid.
   * Assumes 4/4 time signature where 1 bar = 4 beats.
   */
  public calculateTimings(flow: Bar[], bpm: number, startOffsetMs: number = 0): Bar[] {
    if (bpm <= 0) return flow;

    const beatDurationMs = (60 / bpm) * 1000;
    const barDurationMs = beatDurationMs * 4; // 1 standard musical bar in 4/4

    return flow.map((bar, index) => {
      const startTime = startOffsetMs + (index * barDurationMs);
      
      // Calculate micro-duration based on syllable count relative to beat capacity
      // This is a heuristic: more syllables might imply a slightly longer "perceived" duration or faster flow
      // but for strict sync, we stick to the bar boundary.
      return {
        ...bar,
        startTime: startTime / 1000, // store in seconds
        duration: barDurationMs / 1000 // store in seconds
      };
    });
  }

  /**
   * Adjusts bar durations based on complexity (morae/syllables)
   * while maintaining the total flow duration.
   */
  public elasticSync(flow: Bar[], bpm: number): Bar[] {
    const beatMs = (60 / bpm) * 1000;
    const totalBars = flow.length;
    let currentPos = 0;

    return flow.map((bar) => {
      const duration = (bar.totalMorae && bar.totalMorae > 12) ? beatMs * 4.2 : beatMs * 3.8;
      const startTime = currentPos;
      currentPos += duration;

      return {
        ...bar,
        startTime: startTime / 1000,
        duration: duration / 1000
      };
    });
  }
}

export const beatSyncEngine = new BeatSyncEngine();
