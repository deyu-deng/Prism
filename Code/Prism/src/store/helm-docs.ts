import { create } from 'zustand';
import type { HelmDoc } from '../types/helm';

interface HelmDocsState {
  docs: HelmDoc[];
  selectedDocTitle: string | null;
  setDocs: (docs: HelmDoc[]) => void;
  updateDoc: (title: string, partial: Partial<Omit<HelmDoc, 'title'>>) => void;
  selectDoc: (title: string | null) => void;
}

export const useHelmDocsStore = create<HelmDocsState>((set) => ({
  docs: [],
  selectedDocTitle: null,

  setDocs: (docs) => set({ docs }),

  updateDoc: (title, partial) =>
    set((state) => ({
      docs: state.docs.map((doc) =>
        doc.title === title ? { ...doc, ...partial } : doc
      ),
    })),

  selectDoc: (title) => set({ selectedDocTitle: title }),
}));
