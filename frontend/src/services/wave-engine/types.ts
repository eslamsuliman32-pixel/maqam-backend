// Wave System Engine Type Definitions

// Phoneme Types
export type Phoneme = {
    id: string;
    name: string;
    duration: number; // duration in milliseconds
    pitch: number; // pitch frequency in Hz
    // additional phoneme properties
};

// Tolerance Configuration
export type ToleranceConfig = {
    maxDeviation: number; // max allowed deviation in milliseconds
    maxPitchVariation: number; // max allowed pitch variation in Hz
};

// Keystone Sync
export type KeystoneSync = {
    enabled: boolean;
    offset: number; // sync offset in milliseconds
};

// Rhythm Lock
export type RhythmLock = {
    enabled: boolean;
    tempo: number; // tempo in beats per minute
};

// Filler Word Engine
export type FillerWordEngine = {
    enabled: boolean;
    fillerWords: string[]; // array of filler words
};

// LRU Cache Implementation
export class LRUCache<K, V> {
    private capacity: number;
    private cache: Map<K, V>;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.cache = new Map<K, V>();
    }
    
    public get(key: K): V | undefined {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        this.cache.delete(key); // remove from cache
        this.cache.set(key, value!); // reinsert to update order
        return value;
    }
    
    public set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key); // remove existing to update order
        } else if (this.cache.size >= this.capacity) {
            // remove the least recently used item
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
        this.cache.set(key, value);
    }
}