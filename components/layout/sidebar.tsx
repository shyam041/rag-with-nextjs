"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageSquare, FileText, BookOpen, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useConversations } from "@/hooks/api/use-conversations"
import { useFocusAreaStore } from "@/store/use-focus-area-store"

export function Sidebar() {
  const pathname = usePathname()
  const selectedNs = useFocusAreaStore((s) => s.selectedNamespace)
  const { data: conversations = [] } = useConversations(selectedNs ?? undefined)

  const navLinks = [
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/instructions", label: "Instructions", icon: BookOpen },
  ]

  return (
    <aside className="w-64 border-r flex flex-col bg-background">
      <div className="p-4 border-b">
        <Link href="/chat">
          <Button className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" /> New Chat
          </Button>
        </Link>
      </div>

      <nav className="p-2 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Button
              variant={pathname.startsWith(href) ? "secondary" : "ghost"}
              className="w-full justify-start"
              size="sm"
            >
              <Icon className="w-4 h-4 mr-2" /> {label}
            </Button>
          </Link>
        ))}
      </nav>

      <div className="flex-1 overflow-hidden">
        <p className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Recent Conversations
        </p>
        <ScrollArea className="h-full">
          <div className="px-2 space-y-1 pb-4">
            {conversations.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`}>
                <Button
                  variant={pathname === `/chat/${c.id}` ? "secondary" : "ghost"}
                  className="w-full justify-start text-left truncate"
                  size="sm"
                >
                  <span className="truncate">{c.title ?? "Untitled"}</span>
                </Button>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  )
}
