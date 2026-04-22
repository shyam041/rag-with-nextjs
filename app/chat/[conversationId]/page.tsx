import { AppShell } from "@/components/layout/app-shell"
import { ChatView } from "@/components/chat/chat-view"

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  return (
    <AppShell>
      <ChatView conversationId={conversationId} />
    </AppShell>
  )
}
