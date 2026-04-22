import { create } from "zustand"
import type { FocusArea } from "@/types"

interface FocusAreaStore {
  focusAreas: FocusArea[]
  selectedNamespace: string | null
  setFocusAreas: (areas: FocusArea[]) => void
  setSelectedNamespace: (ns: string) => void
  selectedFocusArea: () => FocusArea | null
}

export const useFocusAreaStore = create<FocusAreaStore>((set, get) => ({
  focusAreas: [],
  selectedNamespace: null,
  setFocusAreas: (areas) => set({ focusAreas: areas }),
  setSelectedNamespace: (ns) => set({ selectedNamespace: ns }),
  selectedFocusArea: () => {
    const { focusAreas, selectedNamespace } = get()
    return focusAreas.find((f) => f.namespace === selectedNamespace) ?? null
  },
}))
