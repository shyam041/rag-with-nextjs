"use client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings2, X } from "lucide-react"
import { useInstructions } from "@/hooks/api/use-instructions"
import {
  useConversationInstructions,
  useAddConversationInstruction,
  useRemoveConversationInstruction,
} from "@/hooks/api/use-conversations"
import type { Instruction } from "@/types"

interface Props {
  conversationId: string
  focusArea: string
}

export function InstructionPicker({ conversationId, focusArea }: Props) {
  const { data: all = [] } = useInstructions(focusArea)
  const { data: active = [] } = useConversationInstructions(conversationId)
  const add = useAddConversationInstruction(conversationId)
  const remove = useRemoveConversationInstruction(conversationId)

  const activeIds = new Set((active as Instruction[]).map((i) => i.id))

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="w-4 h-4 mr-1" />
          Instructions
          {activeIds.size > 0 && (
            <Badge variant="secondary" className="ml-1">{activeIds.size}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Active instructions</p>
        {(all as Instruction[]).map((inst) => {
          const isActive = activeIds.has(inst.id)
          return (
            <div key={inst.id} className="flex items-center justify-between gap-2">
              <span className="text-sm truncate">{inst.title}</span>
              {isActive ? (
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(inst.id)}>
                  <X className="w-3 h-3" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => add.mutate(inst.id)}>
                  Add
                </Button>
              )}
            </div>
          )
        })}
        {(all as Instruction[]).length === 0 && (
          <p className="text-xs text-muted-foreground">No instructions for this focus area</p>
        )}
      </PopoverContent>
    </Popover>
  )
}
