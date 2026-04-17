"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage, ChatMessageId } from "@/lib/chat/types";
import { AssistantMessage } from "./AssistantMessage";
import { UserBubble } from "./UserBubble";

export interface MessageListProps {
  messages: ChatMessage[];
  reasoningOn: boolean;
  focusedMessageId: ChatMessageId | null;
  onFocusMessage: (id: ChatMessageId) => void;
  onClarificationSelect: (
    assistantId: ChatMessageId,
    blockIndex: number,
    value: string,
  ) => void;
  onRegenerate: (assistantId: ChatMessageId) => void;
}

export function MessageList({
  messages,
  reasoningOn,
  focusedMessageId,
  onFocusMessage,
  onClarificationSelect,
  onRegenerate,
}: MessageListProps): React.JSX.Element {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // A message can be regenerated only if it's preceded by a user message.
  const lastAssistantId = [...messages]
    .reverse()
    .find((m) => m.role === "assistant")?.id;

  return (
    <div className="flex w-full flex-col gap-6 px-4 pb-6 pt-4 md:px-6">
      {messages.map((m, i) =>
        m.role === "user" ? (
          <UserBubble key={m.id} message={m} />
        ) : (
          <AssistantMessage
            key={m.id}
            message={m}
            reasoningOn={reasoningOn}
            focused={focusedMessageId === m.id}
            onFocus={() => onFocusMessage(m.id)}
            onClarificationSelect={(blockIndex, value) =>
              onClarificationSelect(m.id, blockIndex, value)
            }
            canRegenerate={
              m.id === lastAssistantId &&
              i > 0 &&
              messages[i - 1]?.role === "user"
            }
            onRegenerate={() => onRegenerate(m.id)}
          />
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
