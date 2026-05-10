/**
 * MAQAM v4.0 - High-Performance Rhythmic Dispatcher
 * Implements a Lookahead Scheduler using Web Workers for zero-jitter performance.
 * Decouples audio timing from the React render cycle.
 */

export class FlowDispatcher {
  private worker: Worker | null = null;
  private audioCtx: AudioContext;
  private nextNoteTime: number = 0;
  private scheduleAheadTime: number = 0.1; // 100ms lookahead
  private lookaheadInterval: number = 25.0; // Check every 25ms
  
  private bpm: number = 120;
  private isRunning: boolean = false;
  
  private onTick: (time: number, beat: number) => void;
  private currentBeat: number = 0;

  constructor(ctx: AudioContext, onTick: (time: number, beat: number) => void) {
    this.audioCtx = ctx;
    this.onTick = onTick;
    
    try {
      // Initialize Worker for high-precision ticking
      this.worker = new Worker('/workers/schedulerWorker.js');
      this.worker.onmessage = (e) => {
        if (e.data === "TICK") this.scheduler();
      };
      this.worker.postMessage({ action: "SET_INTERVAL", interval: this.lookaheadInterval });
    } catch (err) {
      console.error("Failed to initialize FlowDispatcher Worker:", err);
      // Fallback to setInterval if worker fails
      setInterval(() => this.scheduler(), this.lookaheadInterval);
    }
  }

  public start(bpm: number) {
    this.bpm = bpm;
    this.nextNoteTime = this.audioCtx.currentTime;
    this.isRunning = true;
    this.worker?.postMessage({ action: "START" });
  }

  public stop() {
    this.isRunning = false;
    this.worker?.postMessage({ action: "STOP" });
  }

  public setBPM(bpm: number) {
    this.bpm = bpm;
  }

  private scheduler() {
    if (!this.isRunning) return;

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.nextNoteTime, this.currentBeat);
      this.advanceNote();
    }
  }

  private scheduleNote(time: number, beat: number) {
    // Execute the tick callback with precise audio time
    this.onTick(time, beat);
  }

  private advanceNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    // Advance by 1/16th note (sub-beat)
    const subBeatDuration = secondsPerBeat / 4;
    this.nextNoteTime += subBeatDuration;
    this.currentBeat = (this.currentBeat + 1) % 16;
  }
}
