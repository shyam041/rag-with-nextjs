import { useQuery } from "@tanstack/react-query"
import { useEffect } from "react"
import { useFocusAreaStore } from "@/store/use-focus-area-store"
import type { FocusArea } from "@/types"

export function useFocusAreas() {
  const setFocusAreas = useFocusAreaStore((s) => s.setFocusAreas)

  const query = useQuery<FocusArea[]>({
    queryKey: ["focus-areas"],
    queryFn: () => fetch("/api/focus-areas").then((r) => r.json()),
  })

  useEffect(() => {
    if (query.data) setFocusAreas(query.data)
  }, [query.data, setFocusAreas])

  return query
}
