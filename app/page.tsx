"use client";

import { useState, useEffect, useCallback } from "react";
import ChatWindow, { ChatMessage as UIChatMessage } from "./components/ChatWindow";
import InputArea from "./components/InputArea";
import SettingsModal from "./components/SettingsModal";
import ConversationList, { Conversation, TodoItem, ConversationSummary } from "./components/ConversationList";
import TodoPanel from "./components/TodoPanel";
import { streamChat, ChatMessage as ApiChatMessage } from "./lib/api";
import { DEFAULT_SYSTEM_PROMPT, PROMPT_VERSION } from "./lib/prompt";

interface Settings {
  apiKey: string;
  model: string;
  systemPrompt: string;
  apiBaseUrl: string;
  apiType: "openai" | "anthropic";
  promptVersion?: number;
}

const STORAGE_KEY = "xinban_settings";
const CONVERSATIONS_KEY = "xinban_conversations";
const ACTIVE_CONV_KEY = "xinban_active_conv";

const defaultSettings: Settings = {
  apiKey: "",
  model: "deepseek-ai/DeepSeek-V3",
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  apiBaseUrl: "https://api.siliconflow.cn/v1/chat/completions",
  apiType: "openai",
  promptVersion: PROMPT_VERSION,
};

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateTitle(messages: UIChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (!firstUserMsg) return "新对话";
  const text = firstUserMsg.content.replace(/\s+/g, " ").trim();
  return text.length > 20 ? text.slice(0, 20) + "..." : text;
}

export default function Home() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTodoPanelOpen, setIsTodoPanelOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showApiKeyTip, setShowApiKeyTip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [rejectedActionIds, setRejectedActionIds] = useState<Set<string>>(new Set());

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const messages = activeConv?.messages || [];

  const acceptedActionIds = new Set(
    (activeConv?.todos || [])
      .filter((t) => t.messageId)
      .map((t) => t.messageId as string)
  );

  const isLoading = (() => {
    if (!activeConv || activeConv.messages.length === 0) return false;
    const lastMsg = activeConv.messages[activeConv.messages.length - 1];
    return lastMsg.role === "assistant" && lastMsg.content === "";
  })();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const needsPromptUpdate = !parsed.promptVersion || parsed.promptVersion < PROMPT_VERSION;
        const merged = {
          ...defaultSettings,
          ...parsed,
          promptVersion: PROMPT_VERSION,
        };
        if (needsPromptUpdate) {
          merged.systemPrompt = DEFAULT_SYSTEM_PROMPT;
        }
        setSettings(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
    } catch {
      // 忽略读取错误
    }

    try {
      const savedConvs = localStorage.getItem(CONVERSATIONS_KEY);
      let convs: Conversation[] = [];
      if (savedConvs) {
        const raw = JSON.parse(savedConvs) as any[];
        convs = raw.map((c) => ({
          ...c,
          systemPrompt: c.systemPrompt || DEFAULT_SYSTEM_PROMPT,
          promptVersion: c.promptVersion || PROMPT_VERSION,
          todos: c.todos || [],
        }));
        setConversations(convs);
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
      }

      const savedActive = localStorage.getItem(ACTIVE_CONV_KEY);
      if (savedActive && convs.some((c) => c.id === savedActive)) {
        setActiveConvId(savedActive);
      } else if (convs.length > 0) {
        setActiveConvId(convs.sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
      } else {
        const newConv: Conversation = {
          id: generateId(),
          title: "新对话",
          messages: [],
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          promptVersion: PROMPT_VERSION,
          todos: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setConversations([newConv]);
        setActiveConvId(newConv.id);
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([newConv]));
        localStorage.setItem(ACTIVE_CONV_KEY, newConv.id);
      }
    } catch {
      // 忽略读取错误
    }
  }, []);

  const saveConversations = useCallback((convs: Conversation[]) => {
    try {
      localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
    } catch {
      // 忽略保存错误
    }
  }, []);

  const newConversation = useCallback(() => {
    const newConv: Conversation = {
      id: generateId(),
      title: "新对话",
      messages: [],
      systemPrompt: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
      promptVersion: settings.promptVersion || PROMPT_VERSION,
      todos: [],
      ended: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setConversations((prev) => {
      const next = [newConv, ...prev];
      saveConversations(next);
      return next;
    });
    setActiveConvId(newConv.id);
    try {
      localStorage.setItem(ACTIVE_CONV_KEY, newConv.id);
    } catch {}
    setIsSidebarOpen(false);
    setError(null);
    setRejectedActionIds(new Set());
  }, [settings.systemPrompt, settings.promptVersion, saveConversations]);

  const switchConversation = useCallback(
    (id: string) => {
      setActiveConvId(id);
      try {
        localStorage.setItem(ACTIVE_CONV_KEY, id);
      } catch {}
      setIsSidebarOpen(false);
      setError(null);
      setRejectedActionIds(new Set());
    },
    []
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveConversations(next);
        return next;
      });
      if (activeConvId === id) {
        setActiveConvId(null);
        try {
          localStorage.removeItem(ACTIVE_CONV_KEY);
        } catch {}
      }
    },
    [activeConvId, saveConversations]
  );

  const updateActiveConv = useCallback(
    (updater: (conv: Conversation) => Conversation) => {
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === activeConvId ? updater(c) : c
        );
        saveConversations(next);
        return next;
      });
    },
    [activeConvId, saveConversations]
  );

  const handleSaveSettings = useCallback((newSettings: Settings) => {
    const toSave = { ...newSettings, promptVersion: PROMPT_VERSION };
    setSettings(toSave);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // 忽略保存错误
    }
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      setError(null);

      if (!settings.apiKey) {
        setShowApiKeyTip(true);
        setTimeout(() => setShowApiKeyTip(false), 3000);
        setIsSettingsOpen(true);
        return;
      }

      if (!settings.promptVersion || settings.promptVersion < PROMPT_VERSION) {
        const updatedSettings = {
          ...settings,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          promptVersion: PROMPT_VERSION,
        };
        setSettings(updatedSettings);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
        } catch {
          // 忽略保存错误
        }
      }

      if (!activeConvId) {
        newConversation();
        return;
      }

      const userMessage: UIChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      const assistantMessageId = `assistant-${Date.now() + 1}`;
      const assistantMessage: UIChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      };

      const currentMessages = activeConv?.messages || [];
      const currentPrompt = settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      const newMessages = [...currentMessages, userMessage, assistantMessage];
      const newTitle = currentMessages.length === 0 ? (content.length > 20 ? content.slice(0, 20) + "..." : content) : activeConv?.title || "新对话";

      updateActiveConv((conv) => ({
        ...conv,
        messages: newMessages,
        title: newTitle,
        updatedAt: Date.now(),
      }));

      const apiMessages: ApiChatMessage[] = [
        { role: "system", content: currentPrompt },
        ...currentMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content },
      ];

      try {
        let bracketBuffer = "";
        let bracketOpen = "";
        const bracketPairs: Record<string, string> = {
          "(": ")",
          "（": "）",
          "[": "]",
          "【": "】",
        };
        const closeBrackets = [")", "）", "]", "】"];

        const stepTags = ["锚定事实", "目的校准", "情绪标注", "自动思维", "认知矫正", "行为激活", "接纳训练"];

        const isInternalInstruction = (text: string, openBracket: string): boolean => {
          if (text.length <= 6) return false;

          if (openBracket === "[" || openBracket === "【") {
            if (stepTags.some((tag) => text === tag || text.startsWith(tag + "]") || text.startsWith(tag + "】"))) {
              return false;
            }
          }

          const keywords = /记住|注意|备注|说明|提示|内部|思考|分析|策略|方案|计划|步骤|流程|方法|切换|进入|下一步|第[一二三四五六七八九十\d]+步|模式|阶段|环节|立即|开始|进入到|转到|切换到|继续|追踪|观察|引导|回应|确认|保持|维持|沿着|按照|根据|取决于|接下来|以上|以下|综上所述|据此|因此|所以|决定|需要|应该|必须|要做|不要|别忘|若用户|当用户|如果用户|心里有数|不要说出来|你自己判断/;
          if (keywords.test(text)) return true;
          const punctCount = (text.match(/[，,；;。.！!？?]/g) || []).length;
          if (text.length > 30 && punctCount >= 2) return true;
          const startsWithVerb = /^(继续|观察|追踪|引导|确认|保持|维持|沿着|按照|用|先|再|然后|接着|接下来|如果|若|当|假设|比如|例如|记住|注意|根据)/;
          if (text.length > 20 && startsWithVerb.test(text)) return true;
          return false;
        };

        const processToken = (token: string): string => {
          let result = "";
          for (let i = 0; i < token.length; i++) {
            const char = token[i];
            if (bracketOpen) {
              bracketBuffer += char;
              if (char === bracketPairs[bracketOpen]) {
                const inner = bracketBuffer.slice(0, -1);
                if (!isInternalInstruction(inner, bracketOpen)) {
                  result += bracketOpen + bracketBuffer;
                }
                bracketBuffer = "";
                bracketOpen = "";
              }
            } else if (bracketPairs[char]) {
              bracketOpen = char;
              bracketBuffer = "";
            } else if (closeBrackets.includes(char)) {
              result += char;
            } else {
              result += char;
            }
          }
          return result;
        };

        await streamChat(
          settings.apiKey.trim(),
          settings.model,
          apiMessages,
          {
            onToken: (token) => {
              const filtered = processToken(token);
              if (!filtered) return;
              setConversations((prev) => {
                const next = prev.map((c) =>
                  c.id === activeConvId
                    ? {
                        ...c,
                        messages: c.messages.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: msg.content + filtered }
                            : msg
                        ),
                        updatedAt: Date.now(),
                      }
                    : c
                );
                saveConversations(next);
                return next;
              });
            },
            onComplete: () => {
              if (bracketOpen && bracketBuffer) {
                const inner = bracketBuffer;
                if (!isInternalInstruction(inner, bracketOpen)) {
                  setConversations((prev) => {
                    const next = prev.map((c) =>
                      c.id === activeConvId
                        ? {
                            ...c,
                            messages: c.messages.map((msg) =>
                              msg.id === assistantMessageId
                                ? { ...msg, content: msg.content + bracketOpen + bracketBuffer }
                                : msg
                            ),
                            updatedAt: Date.now(),
                          }
                        : c
                    );
                    saveConversations(next);
                    return next;
                  });
                }
              }
            },
            onError: (err) => {
              setError(err.message);
              setConversations((prev) => {
                const next = prev.map((c) =>
                  c.id === activeConvId
                    ? {
                        ...c,
                        messages: c.messages.map((msg) =>
                          msg.id === assistantMessageId && !msg.content
                            ? { ...msg, content: `抱歉，发生了错误：${err.message}` }
                            : msg
                        ),
                      }
                    : c
                );
                saveConversations(next);
                return next;
              });
            },
          },
          settings.apiBaseUrl || undefined,
          settings.apiType || "openai"
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
      }
    },
    [settings, activeConvId, activeConv, newConversation, updateActiveConv, saveConversations]
  );

  const extractActionSuggestion = (content: string): string | null => {
    if (content.includes("[目的校准]") || content.includes("【目的校准】")) {
      return null;
    }
    if (!content.includes("[行为激活]") && !content.includes("【行为激活】")) {
      return null;
    }
    let cleaned = content.replace(/\[[^\]]+\]/g, "").trim();
    if (/是想|还是想|你希望|你想要|你想/.test(cleaned)) {
      return null;
    }
    const choiceKeywords = /最想|选哪个|哪个.*好|哪一个|挑一个|先做哪个|环节|方面|清单|选一个|挑|优先|重点/;
    if (choiceKeywords.test(cleaned) && /[？?]/.test(cleaned)) {
      return null;
    }
    const farewellKeywords = /再见|下次见|下次聊|下次再来|随时回来|加油$|好好休息|保重|期待下次/;
    if (farewellKeywords.test(cleaned)) {
      return null;
    }
    const immediateKeywords = /现在|此刻|马上|立刻|我们来|我们试|跟着我|闭上眼睛|深呼吸|感受一下|想一想|回想一下|在脑海里|写下来|写日记|写到纸上|拿出纸|拿出笔/;
    if (immediateKeywords.test(cleaned)) {
      return null;
    }
    const patterns = [
      /要不要试试[^？?。.!！]*[？?]/,
      /要不要做[^？?。.!！]*[？?]/,
      /可以试试[^。.!！]+[。.!！]?/,
      /建议你[^。.!！]+[。.!！]?/,
      /你可以[^。.!！]+[。.!！]?/,
      /试着[^。.!！]+[。.!！]?/,
      /做个小实验[^。.!！]+[。.!！]?/,
      /要试试[^？?]*[？?]/,
      /试试看[^。.!！]*[。.!！]?/,
    ];
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) {
        let text = match[0].trim();
        text = text.replace(/[？?。.!！]$/, "").trim();
        if (text.length >= 6 && text.length <= 80) {
          return text;
        }
      }
    }
    const actionPatterns = [
      /那就从今天开始，[^。]+[。]/,
      /从现在开始，[^。]+[。]/,
      /接下来[^。]+[。]/,
    ];
    for (const pattern of actionPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        let text = match[0].trim();
        text = text.replace(/[。.!！]$/, "").trim();
        if (text.length >= 8 && text.length <= 100) {
          return text;
        }
      }
    }
    cleaned = cleaned.replace(/[，,]?可以吗[？?]?$/, "").trim();
    cleaned = cleaned.replace(/[，,]?好不好[？?]?$/, "").trim();
    cleaned = cleaned.replace(/[，,]?行吗[？?]?$/, "").trim();
    if (cleaned.length >= 10 && cleaned.length <= 120) {
      return cleaned;
    }
    return null;
  };

  const hasActionSuggestion = (content: string): boolean => {
    return extractActionSuggestion(content) !== null;
  };

  const handleAcceptAction = useCallback(
    (messageId: string, content: string) => {
      if (!activeConvId) return;
      const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        content,
        done: false,
        createdAt: Date.now(),
        messageId,
      };
      const replyMessage: UIChatMessage = {
        id: `assistant-${Date.now() + 1}`,
        role: "assistant",
        content: "好的，已经帮你加到待办里了。不用急，什么时候想做了就花几分钟试试。做完了随时回来和我说说感受~",
      };
      const followUpMessage: UIChatMessage = {
        id: `assistant-${Date.now() + 2}`,
        role: "assistant",
        content: "对了，除了这个小行动，你还有没有其他想聊的？比如还有什么困扰你的事情，或者想一起梳理的想法？",
      };
      updateActiveConv((conv) => ({
        ...conv,
        todos: [...conv.todos, newTodo],
        messages: [...conv.messages, replyMessage, followUpMessage],
        updatedAt: Date.now(),
      }));
    },
    [activeConvId, updateActiveConv]
  );

  const handleRejectAction = useCallback(
    (messageId: string) => {
      setRejectedActionIds((prev) => new Set(prev).add(messageId));
    },
    []
  );

  const handleToggleTodo = useCallback(
    (todoId: string) => {
      if (!activeConvId) return;
      updateActiveConv((conv) => ({
        ...conv,
        todos: conv.todos.map((t) =>
          t.id === todoId ? { ...t, done: !t.done } : t
        ),
        updatedAt: Date.now(),
      }));
    },
    [activeConvId, updateActiveConv]
  );

  const handleDeleteTodo = useCallback(
    (todoId: string) => {
      if (!activeConvId) return;
      updateActiveConv((conv) => ({
        ...conv,
        todos: conv.todos.filter((t) => t.id !== todoId),
        updatedAt: Date.now(),
      }));
    },
    [activeConvId, updateActiveConv]
  );

  const handleGenerateSummary = useCallback(async () => {
    if (!activeConvId || !activeConv || activeConv.messages.length < 1) return;
    setIsGeneratingSummary(true);
    updateActiveConv((conv) => ({
      ...conv,
      summary: null,
      updatedAt: Date.now(),
    }));
    try {
      const summaryPrompt = `请严格基于以下对话内容，生成一份简洁的情绪梳理总结。必须遵守以下规则：
1. 所有内容必须来自对话中明确提到的信息，绝对不能编造或添加对话中没有的内容
2. 如果某项信息在对话中没有提到，请写"暂无"
3. 行动建议必须是对话中助手明确建议过的具体行动，不能编造

请严格按照以下格式输出，不要有任何额外内容：

【负面情绪】(一句话描述用户在对话中表达的主要负面情绪)
【触发事件】(一句话描述对话中提到的引发情绪的事件)
【核心思维】(一句话描述对话中识别出的核心自动思维或认知，如果没有则写"暂无")
【调整方法】(一句话描述对话中使用的主要认知调整方法，如果没有则写"暂无")
【行动建议】(用分号分隔对话中助手建议的1-3个具体行动，如果没有则写"无")

对话内容：
${activeConv.messages
  .filter((m) => m.role === "user" || m.role === "assistant")
  .map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content.replace(/\[[^\]]+\]/g, "").trim()}`)
  .join("\n")}`;

      let fullResponse = "";
      await streamChat(
        settings.apiKey.trim(),
        settings.model,
        [{ role: "user", content: summaryPrompt }],
        {
          onToken: (token) => {
            fullResponse += token;
          },
          onComplete: () => {},
          onError: (err) => {
            setError(err.message);
          },
        },
        settings.apiBaseUrl || undefined,
        settings.apiType || "openai"
      );

      const extractField = (text: string, field: string): string => {
        const pattern = new RegExp(`【${field}】([^\\n]+)`);
        const match = text.match(pattern);
        return match ? match[1].trim() : "暂无";
      };

      const actionsText = extractField(fullResponse, "行动建议");
      const actions = actionsText === "暂无" || actionsText === "无" 
        ? [] 
        : actionsText.split(/[；;]/).map((a) => a.trim()).filter(Boolean);

      const summary: ConversationSummary = {
        emotion: extractField(fullResponse, "负面情绪"),
        trigger: extractField(fullResponse, "触发事件"),
        coreThought: extractField(fullResponse, "核心思维"),
        adjustment: extractField(fullResponse, "调整方法"),
        actions,
        generatedAt: Date.now(),
      };

      updateActiveConv((conv) => ({
        ...conv,
        summary,
        updatedAt: Date.now(),
      }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [activeConvId, activeConv, settings, updateActiveConv]);

  const handleEndConversation = useCallback(async () => {
    if (!activeConvId || !activeConv) return;
    if (activeConv.messages.length >= 1) {
      await handleGenerateSummary();
    }
    updateActiveConv((conv) => ({
      ...conv,
      ended: true,
      endedAt: Date.now(),
      updatedAt: Date.now(),
    }));
  }, [activeConvId, activeConv, handleGenerateSummary, updateActiveConv]);

  const handleClear = useCallback(() => {
    if (activeConvId) {
      deleteConversation(activeConvId);
    }
    newConversation();
  }, [activeConvId, deleteConversation, newConversation]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* 左侧边栏 - 对话列表 */}
      <aside className={`hidden md:flex flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 transition-all duration-300 ${isSidebarCollapsed ? "w-0 overflow-hidden" : "md:w-48 lg:w-56"}`}>
        <ConversationList
          conversations={conversations}
          activeId={activeConvId}
          onSelect={switchConversation}
          onNew={newConversation}
          onDelete={deleteConversation}
          onCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          collapsed={isSidebarCollapsed}
        />
      </aside>

      {/* 左侧边栏 - 移动端滑入 */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-50 border-r border-gray-200 dark:border-gray-800 md:hidden shadow-xl">
            <ConversationList
              conversations={conversations}
              activeId={activeConvId}
              onSelect={switchConversation}
              onNew={newConversation}
              onDelete={deleteConversation}
              onClose={() => setIsSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900">
        {/* 顶部导航栏 */}
        <header className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="px-4 md:px-8 lg:px-10 py-3 flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {isSidebarCollapsed && (
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="展开侧边栏"
                  title="展开对话记录"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors md:hidden"
                aria-label="对话记录"
                title="对话记录"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 leading-tight truncate">
                  {activeConv?.title || "心伴"}
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                  陪你梳理情绪，找回内心的秩序
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="设置"
                title="设置"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* API Key 提示 */}
        {showApiKeyTip && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 rounded-lg shadow-lg text-sm text-amber-800 dark:text-amber-200">
            请先在设置中填写 API Key
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg shadow-lg text-sm text-red-800 dark:text-red-200 max-w-md">
            {error}
          </div>
        )}

        {/* 对话区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
            hasActionSuggestion={hasActionSuggestion}
            extractActionSuggestion={extractActionSuggestion}
            onAcceptAction={handleAcceptAction}
            onRejectAction={handleRejectAction}
            acceptedActionIds={acceptedActionIds}
            rejectedActionIds={rejectedActionIds}
          />
        </div>

        {/* 底部输入区 */}
        <div className="flex-shrink-0">
          <InputArea
            onSend={handleSend}
            onClear={newConversation}
            disabled={activeConv?.ended || false}
            isLoading={isLoading}
            apiKey={settings.apiKey}
            apiBaseUrl={settings.apiBaseUrl}
          />
        </div>
      </div>

      {/* 右侧边栏 - 待办与总结（桌面端，lg以上显示） */}
      {activeConvId && activeConv && activeConv.messages.length > 0 && (
        <aside className="hidden lg:flex lg:w-72 xl:w-80 flex-shrink-0 flex-col min-w-0 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <TodoPanel
            todos={activeConv?.todos || []}
            onToggle={handleToggleTodo}
            onDelete={handleDeleteTodo}
            onGenerateSummary={handleGenerateSummary}
            summary={activeConv?.summary || null}
            isGeneratingSummary={isGeneratingSummary}
          />
        </aside>
      )}

      {/* 右侧边栏 - 移动端/平板端滑入 */}
      {isTodoPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setIsTodoPanelOpen(false)}
          />
          <aside className="fixed right-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-50 border-l border-gray-200 dark:border-gray-800 lg:hidden shadow-xl flex flex-col">
            <TodoPanel
              todos={activeConv?.todos || []}
              onToggle={handleToggleTodo}
              onDelete={handleDeleteTodo}
              onGenerateSummary={handleGenerateSummary}
              summary={activeConv?.summary || null}
              isGeneratingSummary={isGeneratingSummary}
              onClose={() => setIsTodoPanelOpen(false)}
            />
          </aside>
        </>
      )}

      {/* 设置弹窗 */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        currentSettings={settings}
      />
    </div>
  );
}
