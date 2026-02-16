import {
  ArrowRightIcon,
  CloseIcon,
  messageCircleIcon,
} from "@hidewhiteboard/hidewhiteboard/components/icons";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useAtomValue, useSetAtom } from "../app-jotai";
import { STORAGE_KEYS } from "../app_constants";

import {
  aiAgentQueuedPromptAtom,
  aiAgentQuickComposeStatusAtom,
} from "./aiAgentState";

import "./AIFloatingComposer.scss";

const LAUNCH_DURATION_MS = 3000;
const LAUNCH_FADE_START_MS = 2500;

const extractChunkText = (data: any) => {
  if (!data) {
    return "";
  }
  const choice = data?.choices?.[0];
  if (typeof choice?.delta?.content === "string") {
    return choice.delta.content;
  }
  if (typeof choice?.message?.content === "string") {
    return choice.message.content;
  }
  if (typeof data?.message?.content === "string") {
    return data.message.content;
  }
  if (typeof data?.content === "string") {
    return data.content;
  }
  return "";
};

const extractTextFromSSEPayload = (payload: string) => {
  const source = payload.trim();
  if (!source.includes("data:")) {
    return "";
  }

  let output = "";
  for (const line of source.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      continue;
    }
    const raw = trimmed.slice(5).trim();
    if (!raw || raw === "[DONE]") {
      continue;
    }
    try {
      output += extractChunkText(JSON.parse(raw));
    } catch {
      output += raw;
    }
  }

  return output.trim();
};

const extractTextFromAnyPayload = (rawPayload: string) => {
  const sseText = extractTextFromSSEPayload(rawPayload);
  if (sseText) {
    return sseText;
  }
  try {
    const parsed = JSON.parse(rawPayload);
    if (typeof parsed === "string") {
      const nestedSse = extractTextFromSSEPayload(parsed);
      return nestedSse || parsed;
    }
    return (
      extractChunkText(parsed) ||
      parsed?.response ||
      parsed?.output ||
      parsed?.text ||
      rawPayload
    );
  } catch {
    return rawPayload;
  }
};

export const AIFloatingComposer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLaunchFading, setIsLaunchFading] = useState(false);
  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const launchFadeTimerRef = useRef<number | null>(null);
  const launchDoneTimerRef = useRef<number | null>(null);

  const setQueuedPrompt = useSetAtom(aiAgentQueuedPromptAtom);
  const setQuickComposeStatus = useSetAtom(aiAgentQuickComposeStatusAtom);
  const quickComposeStatus = useAtomValue(aiAgentQuickComposeStatusAtom);

  const activeStatus =
    activeRequestId && quickComposeStatus.requestId === activeRequestId
      ? quickComposeStatus
      : null;
  const isProcessing = !!activeStatus?.isProcessing;
  const isComplete =
    !!activeStatus &&
    !activeStatus.isProcessing &&
    (activeStatus.stage === "done" || activeStatus.stage === "error");

  const BACKEND_URL =
    import.meta.env.VITE_APP_FDD_BACKEND_URL ||
    import.meta.env.VITE_APP_AI_BACKEND;
  const savedApiKey = localStorage.getItem(
    STORAGE_KEYS.LOCAL_STORAGE_LLM_API_KEY,
  );
  const API_KEY = savedApiKey || import.meta.env.VITE_APP_FDD_API_KEY;

  const clearTimers = useCallback(() => {
    if (launchFadeTimerRef.current != null) {
      window.clearTimeout(launchFadeTimerRef.current);
      launchFadeTimerRef.current = null;
    }
    if (launchDoneTimerRef.current != null) {
      window.clearTimeout(launchDoneTimerRef.current);
      launchDoneTimerRef.current = null;
    }
  }, []);

  const closeComposer = useCallback(() => {
    clearTimers();
    setIsOpen(false);
    setIsLaunchFading(false);
    setIsComposerVisible(false);
  }, [clearTimers]);

  const openComposer = useCallback(() => {
    clearTimers();
    setIsOpen(true);
    setIsLaunchFading(false);
    setIsComposerVisible(false);

    launchFadeTimerRef.current = window.setTimeout(() => {
      setIsLaunchFading(true);
    }, LAUNCH_FADE_START_MS);

    launchDoneTimerRef.current = window.setTimeout(() => {
      setIsComposerVisible(true);
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }, LAUNCH_DURATION_MS);
  }, [clearTimers]);

  const submitPrompt = useCallback(() => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isProcessing || isEnhancing) {
      return;
    }

    const requestId = `floating-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    setActiveRequestId(requestId);
    setSubmittedPrompt(cleanPrompt);
    setQuickComposeStatus({
      requestId,
      stage: "queued",
      message: "Queued request. Preparing generation...",
      isProcessing: true,
      updatedAt: Date.now(),
    });
    setQueuedPrompt({
      id: requestId,
      text: cleanPrompt,
    });
    setPrompt("");
  }, [
    isEnhancing,
    isProcessing,
    prompt,
    setQueuedPrompt,
    setQuickComposeStatus,
  ]);

  const enhancePrompt = useCallback(async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || isEnhancing || isProcessing) {
      return;
    }
    if (!BACKEND_URL || !API_KEY) {
      return;
    }

    try {
      setIsEnhancing(true);
      const response = await fetch(`${BACKEND_URL}/api/proxy/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
        },
        body: JSON.stringify({
          provider: "openai",
          payload: {
            model: "gpt-5-mini",
            stream: false,
            temperature: 0.3,
            messages: [
              {
                role: "system",
                content:
                  "You are a Prompt Enhancer for HideWhiteboard AI. Rewrite prompts for clear, high-quality diagram generation. Output only improved prompt text.",
              },
              {
                role: "user",
                content: `Original prompt:\n${cleanPrompt}`,
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        return;
      }

      const raw = await response.text();
      const enhancedText = extractTextFromAnyPayload(raw).trim();
      if (enhancedText) {
        setPrompt(enhancedText);
      }
    } catch {
      // Keep original prompt unchanged if enhancement fails.
    } finally {
      setIsEnhancing(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [API_KEY, BACKEND_URL, isEnhancing, isProcessing, prompt]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isAltC =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "c";

      if (isAltC) {
        event.preventDefault();
        if (isOpen) {
          if (isComposerVisible) {
            textareaRef.current?.focus();
          }
        } else {
          openComposer();
        }
        return;
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        closeComposer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeComposer, isComposerVisible, isOpen, openComposer]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="ai-quick-compose" aria-live="polite">
      <div
        className={`ai-launch ${isLaunchFading ? "animate-launchFade" : ""}`}
      />
      <div
        className={`ai-blob ${isLaunchFading ? "animate-launchFade" : ""}`}
      />

      {isComposerVisible && (
        <form
          className="ai-quick-compose__panel animate-blobFade"
          onSubmit={(event) => {
            event.preventDefault();
            submitPrompt();
          }}
        >
          <div className="ai-quick-compose__header">
            <div className="ai-quick-compose__title">
              {messageCircleIcon}
              <span>AI Compose</span>
            </div>
            <button
              type="button"
              className="ai-quick-compose__close"
              aria-label="Close AI composer"
              onClick={closeComposer}
            >
              {CloseIcon}
            </button>
          </div>

          <div className="ai-quick-compose__body">
            {isProcessing || isComplete ? (
              <div className="ai-quick-compose__status-wrap">
                <div className="ai-quick-compose__status-label">
                  Request: {submittedPrompt || "Generating"}
                </div>
                <div className="ai-quick-compose__status">
                  {isProcessing && (
                    <span className="ai-quick-compose__spinner" />
                  )}
                  <span>{activeStatus?.message || "Working..."}</span>
                </div>
                {isComplete && (
                  <button
                    type="button"
                    className="ai-quick-compose__reset"
                    onClick={() => {
                      setActiveRequestId(null);
                      setSubmittedPrompt("");
                      setQuickComposeStatus({
                        requestId: null,
                        stage: "idle",
                        message: "",
                        isProcessing: false,
                        updatedAt: Date.now(),
                      });
                      requestAnimationFrame(() => textareaRef.current?.focus());
                    }}
                  >
                    New Prompt
                  </button>
                )}
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  rows={2}
                  placeholder="Describe what you want to generate"
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitPrompt();
                    }
                  }}
                />
                <div className="ai-quick-compose__actions">
                  <button
                    type="button"
                    className="ai-quick-compose__enhance"
                    onClick={enhancePrompt}
                    disabled={!prompt.trim() || isProcessing || isEnhancing}
                  >
                    {isEnhancing ? "Enhancing..." : "Enhance"}
                  </button>
                  <button
                    type="submit"
                    className="ai-quick-compose__send"
                    disabled={!prompt.trim() || isEnhancing}
                    aria-label="Send AI request"
                  >
                    {ArrowRightIcon}
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="ai-quick-compose__hint">
            Shortcut: Alt + C
            {activeStatus?.stage ? ` | ${activeStatus.stage}` : ""}
          </div>
        </form>
      )}
    </div>
  );
};
