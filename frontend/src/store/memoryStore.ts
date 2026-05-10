import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createCloudSyncStorage } from '../services/firebaseSync';

export interface MemoryEntry {
  id: string;
  timestamp: number;
  type: 'analysis' | 'sync' | 'chat' | 'beat';
  content: any;
  summary: string;
}

interface MemoryStore {
  entries: MemoryEntry[];
  addEntry: (entry: Omit<MemoryEntry, 'id' | 'timestamp'>) => void;
  clearMemory: () => void;
  getRecentContext: (limit?: number) => string;
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      addEntry: (entry) => {
        const newEntry: MemoryEntry = {
          ...entry,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        };
        set((state) => ({
          entries: [newEntry, ...state.entries].slice(0, 50), // Keep last 50 entries
        }));
      },
      clearMemory: () => set({ entries: [] }),
      getRecentContext: (limit = 5) => {
        const recent = get().entries.slice(0, limit);
        return recent
          .map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] ${e.type}: ${e.summary}`)
          .join('\n');
      },
    }),
    {
      name: 'metric-matrix-memory',
      storage: createJSONStorage(() => createCloudSyncStorage()),
    }
  )
);
