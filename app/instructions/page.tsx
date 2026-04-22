import { AppShell } from "@/components/layout/app-shell"
import { InstructionList } from "@/components/instructions/instruction-list"

export default function InstructionsPage() {
  return (
    <AppShell>
      <div className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Instructions</h2>
        <InstructionList />
      </div>
    </AppShell>
  )
}
