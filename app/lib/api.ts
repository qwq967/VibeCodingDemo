export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  models: { id: string; name: string }[];
  apiType: "openai" | "anthropic";
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: "siliconflow",
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1/chat/completions",
    apiType: "openai",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek-V3" },
      { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek-R1" },
      { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5-72B" },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen2.5-Coder-32B" },
      { id: "meta-llama/Llama-3.3-70B-Instruct", name: "Llama-3.3-70B" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek 官方",
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    apiType: "openai",
    models: [
      { id: "deepseek-chat", name: "DeepSeek-V3" },
      { id: "deepseek-reasoner", name: "DeepSeek-R1" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    apiType: "openai",
    models: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1/messages",
    apiType: "anthropic",
    models: [
      { id: "claude-sonnet-4-20240229", name: "Claude Sonnet 4" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    ],
  },
  {
    id: "custom",
    name: "自定义",
    baseUrl: "",
    apiType: "openai",
    models: [],
  },
];

export const AVAILABLE_MODELS = MODEL_PROVIDERS.flatMap((p) => p.models);

export async function transcribeAudio(
  apiKey: string,
  audioBlob: Blob,
  baseUrl?: string
): Promise<string> {
  const chatEndpoint = baseUrl || "https://api.siliconflow.cn/v1/chat/completions";
  const audioEndpoint = chatEndpoint.replace("/chat/completions", "/audio/transcriptions");

  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  formData.append("model", "FunAudioLLM/SenseVoiceSmall");

  const response = await fetch(audioEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`语音识别失败: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.text || "";
}

export async function streamChat(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  baseUrl?: string,
  apiType: "openai" | "anthropic" = "openai"
) {
  const endpoint = baseUrl || "https://api.openai.com/v1/chat/completions";

  try {
    let response: Response;

    if (apiType === "anthropic") {
      const systemMessage = messages.find((m) => m.role === "system")?.content || "";
      const conversationMessages = messages.filter((m) => m.role !== "system");

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model,
          system: systemMessage,
          messages: conversationMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          max_tokens: 2048,
          stream: true,
        }),
      });
    } else {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法读取响应流");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (apiType === "anthropic") {
          if (trimmedLine.startsWith("data:")) {
            const dataStr = trimmedLine.slice(5).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
                callbacks.onToken(data.delta.text);
              }
            } catch {
              // 忽略解析错误
            }
          }
        } else {
          if (trimmedLine.startsWith("data:")) {
            const dataStr = trimmedLine.slice(5).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              const delta = data.choices?.[0]?.delta?.content;
              if (delta) {
                callbacks.onToken(delta);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }
    }

    callbacks.onComplete();
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
