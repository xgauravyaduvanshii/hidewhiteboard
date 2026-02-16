import type { hidewhiteboardImperativeAPI } from "@hidewhiteboard/hidewhiteboard/types";

import { atom } from "../app-jotai";

export const aiAgenthidewhiteboardAPIAtom = atom<hidewhiteboardImperativeAPI | null>(
  null,
);

export type AIAgentQueuedPrompt = {
  id: string;
  text: string;
};

export const aiAgentQueuedPromptAtom = atom<AIAgentQueuedPrompt | null>(null);

export type AIAgentQuickComposeStage =
  | "idle"
  | "queued"
  | "loading"
  | "generating"
  | "refining"
  | "rendering"
  | "done"
  | "error";

export type AIAgentQuickComposeStatus = {
  requestId: string | null;
  stage: AIAgentQuickComposeStage;
  message: string;
  isProcessing: boolean;
  updatedAt: number;
};

export const aiAgentQuickComposeStatusAtom = atom<AIAgentQuickComposeStatus>({
  requestId: null,
  stage: "idle",
  message: "",
  isProcessing: false,
  updatedAt: Date.now(),
});

export const aiAgentRuntimeSyncTickAtom = atom(0);
