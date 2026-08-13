import { ChatLayout } from "@/components/chat/layout";
import { ChatView } from "@/components/chat/chat-view";

export const maxDuration = 300;

export default function IndexPage() {
  return (
    <ChatLayout>
      <ChatView threadId={null} />
    </ChatLayout>
  );
}
