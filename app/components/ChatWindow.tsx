"use client";

import { useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  hasActionSuggestion?: (content: string) => boolean;
  extractActionSuggestion?: (content: string) => string | null;
  onAcceptAction?: (messageId: string, content: string) => void;
  onRejectAction?: (messageId: string) => void;
  acceptedActionIds?: Set<string>;
  rejectedActionIds?: Set<string>;
}

export default function ChatWindow({
  messages,
  isLoading,
  hasActionSuggestion,
  extractActionSuggestion,
  onAcceptAction,
  onRejectAction,
  acceptedActionIds,
  rejectedActionIds,
}: ChatWindowProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const lastMessage = messages[messages.length - 1];
  const isStreaming = isLoading && lastMessage?.role === "assistant";

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 md:px-8 lg:px-10"
    >
      <div className="w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
            <div className="w-16 h-16 mb-6 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
              你好，我是心伴
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
              我是一个基于CBT理论的认知疗愈助手。
              <br />
              说说你现在的感受，让我们一起梳理情绪，找回内心的秩序。
            </p>
          </div>
        ) : (
          <div className="pt-2 pb-4">
            {messages.map((msg) => {
              const isAsst = msg.role === "assistant";
              const hasSuggestion = isAsst && hasActionSuggestion ? hasActionSuggestion(msg.content) : false;
              const suggestionText = isAsst && hasSuggestion && extractActionSuggestion
                ? (extractActionSuggestion(msg.content) ?? undefined)
                : undefined;
              return (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isStreaming={msg.id === lastMessage?.id && isStreaming}
                  messageId={msg.id}
                  hasActionSuggestion={hasSuggestion}
                  actionSuggestionText={suggestionText}
                  onAcceptAction={onAcceptAction}
                  onRejectAction={onRejectAction}
                  actionAccepted={acceptedActionIds?.has(msg.id)}
                  actionRejected={rejectedActionIds?.has(msg.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
