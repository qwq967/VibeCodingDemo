"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { transcribeAudio } from "../lib/api";

interface InputAreaProps {
  onSend: (message: string) => void;
  onClear: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  apiKey?: string;
  apiBaseUrl?: string;
}

interface PendingSegment {
  index: number;
  text: string | null;
}

export default function InputArea({ onSend, onClear, disabled, isLoading, apiKey, apiBaseUrl }: InputAreaProps) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mimeTypeRef = useRef<string>("audio/webm");
  const isRecordingRef = useRef(false);
  const segmentIndexRef = useRef(0);
  const pendingSegmentsRef = useRef<PendingSegment[]>([]);
  const finalizedCountRef = useRef(0);
  const fullTextRef = useRef("");

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const processSegments = useCallback(() => {
    const segments = pendingSegmentsRef.current;
    let newFinalized = 0;
    let newText = "";

    for (let i = finalizedCountRef.current; i < segments.length; i++) {
      if (segments[i].text !== null) {
        newText += segments[i].text;
        newFinalized++;
      } else {
        break;
      }
    }

    if (newFinalized > 0) {
      finalizedCountRef.current += newFinalized;
      fullTextRef.current += newText;
      setInput(fullTextRef.current);
    }
  }, []);

  const transcribeSegment = useCallback(
    async (audioBlob: Blob, index: number) => {
      if (!apiKey) return;

      try {
        const text = await transcribeAudio(apiKey, audioBlob, apiBaseUrl);
        const segment = pendingSegmentsRef.current.find((s) => s.index === index);
        if (segment) {
          segment.text = text;
          processSegments();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setRecordError(msg);
        const segment = pendingSegmentsRef.current.find((s) => s.index === index);
        if (segment) {
          segment.text = "";
          processSegments();
        }
      }
    },
    [apiKey, apiBaseUrl, processSegments]
  );

  const startRecording = async () => {
    setRecordError(null);
    if (!apiKey) {
      setRecordError("请先在设置中填写 API Key");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      }
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      segmentIndexRef.current = 0;
      pendingSegmentsRef.current = [];
      finalizedCountRef.current = 0;
      fullTextRef.current = "";
      setInput("");

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          const index = segmentIndexRef.current++;
          pendingSegmentsRef.current.push({ index, text: null });
          setIsTranscribing(true);
          transcribeSegment(e.data, index).finally(() => {
            const allDone = pendingSegmentsRef.current.every((s) => s.text !== null);
            if (allDone && !isRecordingRef.current) {
              setIsTranscribing(false);
            }
          });
        }
      };

      recorder.onstop = () => {
        isRecordingRef.current = false;
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;

        const allDone = pendingSegmentsRef.current.every((s) => s.text !== null);
        if (allDone) {
          setIsTranscribing(false);
        }
      };

      recorder.start(1500);
      mediaRecorderRef.current = recorder;
      isRecordingRef.current = true;
      setIsRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRecordError(`无法访问麦克风：${msg}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (disabled || isLoading) return;

    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled || isLoading) return;
    if (isRecording) {
      stopRecording();
    }
    onSend(trimmed);
    setInput("");
    setRecordError(null);
    fullTextRef.current = "";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-warm-50 dark:bg-gray-900 px-4 py-3 md:px-8 lg:px-10">
      <div className="w-full">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说出你的感受..."
              rows={1}
              disabled={disabled || isLoading}
              className={`w-full px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors resize-none leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ maxHeight: "160px" }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled || isLoading}
            className="flex items-center justify-center w-11 h-11 text-white bg-green-600 rounded-full hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            aria-label="发送"
          >
            {isLoading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          本工具不替代专业心理咨询。如遇紧急情况，请寻求专业帮助。
        </p>
      </div>
    </div>
  );
}
