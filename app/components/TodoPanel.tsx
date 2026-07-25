"use client";

import { TodoItem } from "./ConversationList";

interface TodoPanelProps {
  todos: TodoItem[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onGenerateSummary?: () => void;
  summary?: {
    emotion: string;
    trigger: string;
    coreThought: string;
    adjustment: string;
    actions: string[];
    generatedAt: number;
  } | null;
  isGeneratingSummary?: boolean;
  onClose?: () => void;
}

export default function TodoPanel({
  todos,
  onToggle,
  onDelete,
  onGenerateSummary,
  summary,
  isGeneratingSummary,
  onClose,
}: TodoPanelProps) {
  const pendingTodos = todos.filter((t) => !t.done);
  const completedTodos = todos.filter((t) => t.done);

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">待办与总结</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {summary && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📋</span>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">本次对话总结</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">负面情绪</p>
                <p className="text-gray-700 dark:text-gray-200">{summary.emotion}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">触发事件</p>
                <p className="text-gray-700 dark:text-gray-200">{summary.trigger}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">核心思维</p>
                <p className="text-gray-700 dark:text-gray-200">{summary.coreThought}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">调整方法</p>
                <p className="text-gray-700 dark:text-gray-200">{summary.adjustment}</p>
              </div>
              {summary.actions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">行动建议</p>
                  <ul className="space-y-1">
                    {summary.actions.map((action, idx) => (
                      <li key={idx} className="text-gray-700 dark:text-gray-200 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 pt-1">
                生成于 {new Date(summary.generatedAt).toLocaleString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        )}

        {onGenerateSummary && (
          <div className="p-4">
            {!isGeneratingSummary ? (
              <button
                onClick={onGenerateSummary}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white rounded-xl text-sm font-medium transition-all"
              >
                {summary ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 2v6h-6M3 12a9 9 0 0115-6.7L21 8M3 22v-6h6M21 12a9 9 0 01-15 6.7L3 16" />
                    </svg>
                    <span>重新生成总结</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>生成本次对话总结</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl text-sm font-medium">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>生成中...</span>
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              {summary ? "基于最新对话重新生成总结" : "总结本次情绪和解决方法，方便下次快速回查"}
            </p>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">待办事项</h3>
              {pendingTodos.length > 0 && (
                <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                  {pendingTodos.length}
                </span>
              )}
            </div>
          </div>

          {todos.length === 0 ? (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                还没有待办事项
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                接受 AI 的行动建议后会显示在这里
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingTodos.length > 0 && (
                <div className="space-y-2">
                  {pendingTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="group flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <button
                        onClick={() => onToggle(todo.id)}
                        className="flex-shrink-0 w-5 h-5 mt-0.5 border-2 border-gray-300 dark:border-gray-600 rounded-md hover:border-green-500 dark:hover:border-green-400 transition-colors"
                        aria-label="标记完成"
                      />
                      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                        {todo.content}
                      </p>
                      <button
                        onClick={() => onDelete(todo.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                        aria-label="删除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {completedTodos.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 px-1">
                    已完成 ({completedTodos.length})
                  </p>
                  <div className="space-y-2">
                    {completedTodos.map((todo) => (
                      <div
                        key={todo.id}
                        className="group flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl opacity-60"
                      >
                        <button
                          onClick={() => onToggle(todo.id)}
                          className="flex-shrink-0 w-5 h-5 mt-0.5 bg-green-500 border-2 border-green-500 rounded-md flex items-center justify-center"
                          aria-label="标记未完成"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <p className="flex-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-through">
                          {todo.content}
                        </p>
                        <button
                          onClick={() => onDelete(todo.id)}
                          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
                          aria-label="删除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
