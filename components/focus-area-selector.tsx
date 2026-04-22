"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFocusAreas } from "@/hooks/api/use-focus-areas"
import { useFocusAreaStore } from "@/store/use-focus-area-store"

interface Props {
  value?: string
  onChange?: (namespace: string) => void
  placeholder?: string
}

export function FocusAreaSelector({ value, onChange, placeholder = "Select focus area" }: Props) {
  useFocusAreas()
  const focusAreas = useFocusAreaStore((s) => s.focusAreas)

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {focusAreas.map((fa) => (
          <SelectItem key={fa.namespace} value={fa.namespace}>
            {fa.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
