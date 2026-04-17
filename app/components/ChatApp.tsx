"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChat } from "@/lib/chat/useChat";
import { ChatInput } from "./ChatInput";
import { Header } from "./Header";
import { HomeScreen } from "./HomeScreen";
import { MessageList } from "./MessageList";
import { SourcesSidebar } from "./SourcesSidebar";

const REASONING_KEY = "prox:reasoning-visible";

export function ChatApp(): React.JSX.Element {
  const [reasoningOn, setReasoningOn] = useState(false);
  const chat = useChat();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(REASONING_KEY);
    if (stored === "1") setReasoningOn(true);
  }, []);
  useEffect(() => {
    localStorage.setItem(REASONING_KEY, reasoningOn ? "1" : "0");
  }, [reasoningOn]);

  const handleSuggested = (prompt: string) => {
    void chat.send(prompt);
  };

  const toggleReasoning = useCallback(() => {
    setReasoningOn((prev) => !prev);
  }, []);

  // Global keyboard shortcuts: ⌘K focus input, ⌘/ toggle reasoning.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        toggleReasoning();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleReasoning]);

  const hasMessages = chat.messages.length > 0;

  return (
    <div className="flex h-screen min-h-0 flex-col">
      <Header reasoningOn={reasoningOn} onReasoningToggle={setReasoningOn} />

      <main className="mx-auto flex w-full min-h-0 max-w-[1180px] flex-1 gap-0 overflow-hidden md:gap-6 md:px-6">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            {hasMessages ? (
              <MessageList
                messages={chat.messages}
                reasoningOn={reasoningOn}
                focusedMessageId={chat.focusedMessageId}
                onFocusMessage={chat.setFocus}
                onClarificationSelect={chat.answerClarification}
                onRegenerate={(id) => void chat.regenerate(id)}
              />
            ) : (
              <HomeScreen onSelect={handleSuggested} />
            )}
          </div>

          <div className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-background)] px-4 py-3 md:border-t-0 md:bg-transparent md:px-0 md:pb-6">
            <div className="mx-auto w-full max-w-3xl">
              <ChatInput
                onSend={(text, images) => void chat.send(text, images)}
                onStop={chat.stop}
                isStreaming={chat.isStreaming}
                inputRef={inputRef}
              />
              <p className="mt-1.5 text-center text-[10px] text-[color:var(--color-muted)]">
                Enter to send · Shift+Enter for newline · paste or drop images
              </p>
            </div>
          </div>
        </section>

        <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-[color:var(--color-border)] px-4 py-4 md:block">
          <SourcesSidebar
            messages={chat.messages}
            focusedMessageId={chat.focusedMessageId}
          />
        </aside>
      </main>
    </div>
  );
}
