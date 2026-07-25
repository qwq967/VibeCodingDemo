"use client";

import ReactMarkdown from "react-markdown";

export type StepTag =
  | "anchoring"
  | "purpose"
  | "emotion"
  | "automatic_thought"
  | "restructuring"
  | "activation"
  | "acceptance"
  | "safety";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  messageId?: string;
  hasActionSuggestion?: boolean;
  actionSuggestionText?: string;
  onAcceptAction?: (messageId: string, content: string) => void;
  onRejectAction?: (messageId: string) => void;
  actionAccepted?: boolean;
  actionRejected?: boolean;
}

const STEP_TAG_MAP: Record<string, { key: StepTag; label: string; emoji: string }> = {
  "[锚定事实]": { key: "anchoring", label: "锚定事实", emoji: "🟢" },
  "[目的校准]": { key: "purpose", label: "目的校准", emoji: "🟤" },
  "[情绪标注]": { key: "emotion", label: "情绪标注", emoji: "🔵" },
  "[自动思维]": { key: "automatic_thought", label: "自动思维", emoji: "🟣" },
  "[认知矫正]": { key: "restructuring", label: "认知矫正", emoji: "🟠" },
  "[行为激活]": { key: "activation", label: "行为激活", emoji: "🟡" },
  "[接纳训练]": { key: "acceptance", label: "接纳训练", emoji: "⚪" },
  "[安全红线]": { key: "safety", label: "安全提示", emoji: "🔴" },
};

const STEP_TAG_COLORS: Record<StepTag, string> = {
  anchoring: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  purpose: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  emotion: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  automatic_thought: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  restructuring: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  activation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  acceptance: "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
  safety: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
};

function isLikelyInternalInstruction(text: string): boolean {
  if (text.length <= 8) return false;

  const strongKeywords = /记住|注意|备注|说明|提示|内部|思考|分析|策略|方案|计划|步骤|流程|方法|切换|进入|下一步|第[一二三四五六七八九十\d]+步|模式|阶段|环节|立即|开始|进入到|转到|切换到|继续|追踪|观察|引导|回应|确认|保持|维持|沿着|按照|根据|取决于|接下来|以上|以下|综上所述|据此|因此|所以|决定|需要|应该|必须|要做|不要|别忘|若用户|当用户|如果用户/;
  if (strongKeywords.test(text)) return true;

  const punctCount = (text.match(/[，,；;。.！!？?]/g) || []).length;
  if (text.length > 30 && punctCount >= 2) return true;

  const startsWithVerb = /^(继续|观察|追踪|引导|确认|保持|维持|沿着|按照|用|先|再|然后|接着|接下来|如果|若|当|假设|比如|例如)/;
  if (text.length > 20 && startsWithVerb.test(text)) return true;

  return false;
}

function extractStepTag(content: string, isStreaming?: boolean): {
  tag: { key: StepTag; label: string; emoji: string } | null;
  cleanedContent: string;
} {
  let cleaned = content;
  let firstTag: { key: StepTag; label: string; emoji: string } | null = null;

  for (const [marker, tag] of Object.entries(STEP_TAG_MAP)) {
    let index = cleaned.indexOf(marker);
    while (index !== -1) {
      if (!firstTag) {
        firstTag = tag;
      }
      const before = cleaned.slice(0, index);
      const after = cleaned.slice(index + marker.length);
      cleaned = (before + after).trim();
      index = cleaned.indexOf(marker);
    }
  }

  cleaned = cleaned.replace(
    /[（(][\s\S]*?[）)]/g,
    (match) => {
      const inner = match.slice(1, -1);
      return isLikelyInternalInstruction(inner) ? "" : match;
    }
  ).trim();

  if (isStreaming) {
    const lastOpenCN = cleaned.lastIndexOf("（");
    const lastOpenEN = cleaned.lastIndexOf("(");
    const lastCloseCN = cleaned.lastIndexOf("）");
    const lastCloseEN = cleaned.lastIndexOf(")");

    const lastOpen = Math.max(
      lastOpenCN > lastCloseCN ? lastOpenCN : -1,
      lastOpenEN > lastCloseEN ? lastOpenEN : -1
    );

    if (lastOpen !== -1) {
      cleaned = cleaned.slice(0, lastOpen).trim();
    }
  } else {
    const lastOpenCN = cleaned.lastIndexOf("（");
    const lastOpenEN = cleaned.lastIndexOf("(");
    const lastCloseCN = cleaned.lastIndexOf("）");
    const lastCloseEN = cleaned.lastIndexOf(")");

    const lastOpen = Math.max(
      lastOpenCN > lastCloseCN ? lastOpenCN : -1,
      lastOpenEN > lastCloseEN ? lastOpenEN : -1
    );

    if (lastOpen !== -1) {
      const tail = cleaned.slice(lastOpen + 1);
      if (isLikelyInternalInstruction(tail)) {
        cleaned = cleaned.slice(0, lastOpen).trim();
      }
    }
  }

  return { tag: firstTag, cleanedContent: cleaned };
}

export default function MessageBubble({
  role,
  content,
  isStreaming,
  messageId,
  hasActionSuggestion,
  actionSuggestionText,
  onAcceptAction,
  onRejectAction,
  actionAccepted,
  actionRejected,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const { tag, cleanedContent } = isUser ? { tag: null, cleanedContent: content } : extractStepTag(content, isStreaming);

  return (
    <div className={`flex w-full mb-4 message-animate ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? "order-2" : "order-1"}`}>
        {tag && (
          <div className="mb-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${STEP_TAG_COLORS[tag.key]}`}
            >
              <span>{tag.emoji}</span>
              <span>{tag.label}</span>
            </span>
          </div>
        )}
        <div
          className={`relative px-4 py-3 leading-relaxed rounded-bubble ${
            isUser
              ? "bg-green-100 text-gray-800 dark:bg-green-900/60 dark:text-green-50"
              : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
          }`}
          style={{
            borderTopRightRadius: isUser ? "4px" : "16px",
            borderTopLeftRadius: isUser ? "16px" : "4px",
          }}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{cleanedContent}</p>
          ) : (
            <div className="markdown-content">
              <ReactMarkdown>{cleanedContent}</ReactMarkdown>
            </div>
          )}
          {isStreaming && !isUser && (
            <span className="inline-block w-1 h-5 ml-0.5 bg-gray-400 dark:bg-gray-500 align-middle animate-pulse" />
          )}
        </div>

        {!isUser && hasActionSuggestion && !isStreaming && messageId && actionSuggestionText && (
          <div className="mt-3 flex items-center gap-2">
            {actionAccepted ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                已添加到待办
              </span>
            ) : actionRejected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full text-xs font-medium">
                已忽略
              </span>
            ) : (
              <>
                <button
                  onClick={() => onAcceptAction?.(messageId, actionSuggestionText)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full text-xs font-medium transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  接受建议
                </button>
                <button
                  onClick={() => onRejectAction?.(messageId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-xs font-medium transition-colors"
                >
                  暂不
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
