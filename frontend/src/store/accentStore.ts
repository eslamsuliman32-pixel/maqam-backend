import { create } from 'zustand';
import { EncodedBar, PhonemicFingerprint, MetricalFoot } from '../types/accent';
import { fingerprintStorage } from '../services/fingerprintStorage';
import { accentScanner } from '../services/accentScanner';

interface AccentState {
  bars: EncodedBar[];
  cache: Map<string, PhonemicFingerprint>;
  addBar: (bar: EncodedBar) => Promise<void>;
  filterByFoot: (foot: string) => EncodedBar[];
  getCachedFingerprint: (text: string) => Promise<PhonemicFingerprint | null>;
  getOrGenerateFingerprint: (text: string) => Promise<PhonemicFingerprint>;
  searchByPattern: (pattern: string) => Promise<{hash: string, fingerprint: PhonemicFingerprint}[]>;
  searchByFoot: (foot: MetricalFoot) => Promise<{hash: string, fingerprint: PhonemicFingerprint}[]>;
}

export const useAccentStore = create<AccentState>((set, get) => ({
  bars: [],
  cache: new Map(),

  addBar: async (bar) => {
    const msgUint8 = new TextEncoder().encode(bar.text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await fingerprintStorage.save(hash, bar.fingerprint);
    
    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(hash, bar.fingerprint);
      return {
        bars: [...state.bars, bar],
        cache: newCache
      };
    });
  },

  filterByFoot: (foot) => {
    return get().bars.filter(b => b.fingerprint.dominantFoot === foot);
  },

  getCachedFingerprint: async (text: string) => {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const cache = get().cache;
    if (cache.has(hash)) {
      return cache.get(hash)!;
    }

    const stored = await fingerprintStorage.get(hash);
    if (stored) {
      set((state) => {
        const newCache = new Map(state.cache);
        newCache.set(hash, stored);
        return { cache: newCache };
      });
    }
    return stored;
  },

  getOrGenerateFingerprint: async (text: string) => {
    const cached = await get().getCachedFingerprint(text);
    if (cached) return cached;

    const fingerprint = await accentScanner.buildFingerprint(text);
    
    // buildFingerprint already saves to storage, but we should update in-memory cache
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    set((state) => {
      const newCache = new Map(state.cache);
      newCache.set(hash, fingerprint);
      return { cache: newCache };
    });

    return fingerprint;
  },

  searchByPattern: async (pattern: string) => {
    return await fingerprintStorage.findByPattern(pattern);
  },

  searchByFoot: async (foot: MetricalFoot) => {
    return await fingerprintStorage.findByFoot(foot);
  }
}));
