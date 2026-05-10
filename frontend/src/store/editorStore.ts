import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createCloudSyncStorage } from '../services/firebaseSync';

interface EditorState {
  currentBarText: string;
  beatBlueprint: any;
  flowMarkers: Array<{ cellId: number, text: string }>;
  setCurrentBarText: (text: string) => void;
  setBeatBlueprint: (blueprint: any) => void;
  addFlowMarker: (marker: { cellId: number, text: string }) => void;
  updateFlowMarkerText: (cellId: number, text: string) => void;
  removeFlowMarker: (cellId: number) => void;
  clearFlowMarkers: () => void;
  injectBar: (text: string) => void;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      currentBarText: '',
      beatBlueprint: null,
      flowMarkers: [],
      setCurrentBarText: (text) => set({ currentBarText: text }),
      setBeatBlueprint: (blueprint) => set({ beatBlueprint: blueprint }),
      addFlowMarker: (marker) => set((state) => ({ 
        flowMarkers: [...state.flowMarkers.filter(m => m.cellId !== marker.cellId), marker] 
      })),
      updateFlowMarkerText: (cellId, text) => set((state) => ({
        flowMarkers: state.flowMarkers.map(m => m.cellId === cellId ? { ...m, text } : m)
      })),
      removeFlowMarker: (cellId) => set((state) => ({ 
        flowMarkers: state.flowMarkers.filter(m => m.cellId !== cellId) 
      })),
      clearFlowMarkers: () => set({ flowMarkers: [] }),
      injectBar: (text) => set((state) => {
        const nextCellId = state.flowMarkers.length;
        return {
          flowMarkers: [...state.flowMarkers, { cellId: nextCellId, text }]
        };
      }),
    }),
    {
      name: 'maqam-editor-storage',
      storage: createJSONStorage(() => createCloudSyncStorage()),
    }
  )
);
