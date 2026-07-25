"use client";

import { ChatMessage } from "./ChatWindow";

export interface TodoItem {
  id: string;
  content: string;
  done: boolean;
  createdAt: number;
  messageId?: string;
}

export interface ConversationSummary {
  emotion: string;
  trigger: string;
  coreThought: string;
  adjustment: string;
  actions: string[];
  generatedAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  systemPrompt: string;
  promptVersion: number;
  todos: TodoItem[];
  summary?: ConversationSummary;
  ended?: boolean;
  endedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
  onCollapse?: () => void;
  collapsed?: boolean;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `今天 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  } else if (diffDays === 1) {
    return "昨天";
  } else if (diffDays < 7) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return weekdays[date.getDay()];
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
}

export default function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onClose,
  onCollapse,
  collapsed,
}: ConversationListProps) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between w-full px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">对话记录</h2>
        <div className="flex items-center gap-1">
          {onCollapse && (
            <button
              onClick={onCollapse}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label={collapsed ? "展开" : "收起"}
              title={collapsed ? "展开侧边栏" : "收起侧边栏"}
            >
              {collapsed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
            </button>
          )}
          <button
            onClick={onNew}
            className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="新建对话"
            title="新建对话"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors md:hidden"
              aria-label="关闭"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto w-full min-w-0">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center pt-8 px-4 text-center">
            <div className="w-12 h-12 mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              还没有对话记录
              <br />
              开始你的第一段对话吧
            </p>
          </div>
        ) : (
          <div className="w-full">
            {sorted.map((conv) => (
              <div
                key={conv.id}
                className={`group w-full px-4 py-2.5 cursor-pointer transition-colors ${
                  activeId === conv.id
                    ? "bg-gray-200/60 dark:bg-gray-800"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                onClick={() => onSelect(conv.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {conv.title || "心伴"}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDate(conv.updatedAt)} · {conv.messages.length} 条
                      {conv.ended ? (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 rounded text-[10px] text-green-600 dark:text-green-400">
                          已结束
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(conv.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all flex-shrink-0"
                    aria-label="删除对话"
                    title="删除对话"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
