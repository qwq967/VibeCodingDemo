"use client";

import { useState, useEffect, useMemo } from "react";
import { DEFAULT_SYSTEM_PROMPT } from "@/app/lib/prompt";
import { MODEL_PROVIDERS, ModelProvider } from "@/app/lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    apiBaseUrl: string;
    apiType: "openai" | "anthropic";
  }) => void;
  currentSettings: {
    apiKey: string;
    model: string;
    systemPrompt: string;
    apiBaseUrl: string;
    apiType: "openai" | "anthropic";
  };
}

function detectProvider(model: string, apiBaseUrl: string): string {
  if (!apiBaseUrl) return "siliconflow";
  for (const provider of MODEL_PROVIDERS) {
    if (provider.id === "custom") continue;
    if (provider.baseUrl && apiBaseUrl === provider.baseUrl) {
      return provider.id;
    }
  }
  for (const provider of MODEL_PROVIDERS) {
    if (provider.id === "custom") continue;
    const hasModel = provider.models.some((m) => m.id === model);
    if (hasModel) {
      return provider.id;
    }
  }
  return "custom";
}

export default function SettingsModal({ isOpen, onClose, onSave, currentSettings }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiType, setApiType] = useState<"openai" | "anthropic">("openai");
  const [providerId, setProviderId] = useState("siliconflow");

  const currentProvider = useMemo(() => {
    return MODEL_PROVIDERS.find((p) => p.id === providerId);
  }, [providerId]);

  const availableModels = useMemo(() => {
    if (currentProvider?.id === "custom") {
      return [];
    }
    return currentProvider?.models || [];
  }, [currentProvider]);

  useEffect(() => {
    if (isOpen) {
      setApiKey(currentSettings.apiKey || "");
      setModel(currentSettings.model || "");
      setSystemPrompt(currentSettings.systemPrompt || DEFAULT_SYSTEM_PROMPT);
      setApiBaseUrl(currentSettings.apiBaseUrl || "");
      setApiType(currentSettings.apiType || "openai");
      const detected = detectProvider(currentSettings.model || "", currentSettings.apiBaseUrl || "");
      setProviderId(detected);
    }
  }, [isOpen, currentSettings]);

  useEffect(() => {
    if (currentProvider && currentProvider.id !== "custom") {
      setApiBaseUrl(currentProvider.baseUrl);
      setApiType(currentProvider.apiType);
      if (currentProvider.models.length > 0 && !currentProvider.models.some((m) => m.id === model)) {
        setModel(currentProvider.models[0].id);
      }
    }
  }, [providerId, currentProvider]);

  const handleSave = () => {
    let finalBaseUrl = apiBaseUrl.trim();
    let finalApiType = apiType;
    let finalModel = model.trim();

    if (currentProvider && currentProvider.id !== "custom") {
      finalBaseUrl = currentProvider.baseUrl;
      finalApiType = currentProvider.apiType;
      if (currentProvider.models.length > 0 && !currentProvider.models.some((m) => m.id === finalModel)) {
        finalModel = currentProvider.models[0].id;
      }
    }

    onSave({
      apiKey: apiKey.trim(),
      model: finalModel,
      systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
      apiBaseUrl: finalBaseUrl,
      apiType: finalApiType,
    });
    onClose();
  };

  const handleResetPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl modal-animate">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">设置</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(85vh-140px)]">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              API 服务商
            </label>
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
            >
              {MODEL_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="请输入您的 API Key"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              仅保存在您的浏览器 localStorage 中，不会发送到任何第三方服务器
            </p>
          </div>

          {providerId === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                API 基础地址
              </label>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                OpenAI 兼容格式的 API 端点地址
              </p>
            </div>
          )}

          {providerId === "custom" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                API 协议类型
              </label>
              <select
                value={apiType}
                onChange={(e) => setApiType(e.target.value as "openai" | "anthropic")}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
              >
                <option value="openai">OpenAI 兼容格式</option>
                <option value="anthropic">Anthropic 格式</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              模型选择
            </label>
            {providerId === "custom" ? (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="请输入模型 ID"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
              />
            ) : (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                自定义 System Prompt
              </label>
              <button
                onClick={handleResetPrompt}
                className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
              >
                恢复默认
              </button>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={16}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500 transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
