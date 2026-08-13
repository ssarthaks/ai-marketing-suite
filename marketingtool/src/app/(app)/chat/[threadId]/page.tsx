import { ChatLayout } from "@/components/chat/layout";
import { ChatView } from "@/components/chat/chat-view";

export const maxDuration = 300;

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return (
    <ChatLayout>
      <ChatView threadId={threadId} />
    </ChatLayout>
  );
}
