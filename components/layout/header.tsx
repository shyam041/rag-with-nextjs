"use client"
import { useFocusAreaStore } from "@/store/use-focus-area-store"

export function Header() {
  const selected = useFocusAreaStore((s) => s.selectedFocusArea())
  return (
    <header className="border-b px-6 py-3 flex items-center justify-between bg-background">
      <h1 className="text-lg font-semibold">simple-rag</h1>
      {selected && (
        <span className="text-sm text-muted-foreground">
          Focus: <span className="font-medium text-foreground">{selected.name}</span>
        </span>
      )}
    </header>
  )
}
