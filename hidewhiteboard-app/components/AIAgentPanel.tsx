import {
  convertTohidewhiteboardElements,
  exportToCanvas,
} from "@hidewhiteboard/hidewhiteboard";
import {
  ArrowRightIcon,
  historyIcon,
  messageCircleIcon,
  PlusIcon,
  stop,
  TrashIcon,
} from "@hidewhiteboard/hidewhiteboard/components/icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAtom, useAtomValue, useSetAtom } from "../app-jotai";
import { STORAGE_KEYS } from "../app_constants";

import {
  aiAgenthidewhiteboardAPIAtom,
  aiAgentQuickComposeStatusAtom,
  aiAgentQueuedPromptAtom,
  aiAgentRuntimeSyncTickAtom,
} from "./aiAgentState";

type Message = {
  id: string;
  role: "assistant" | "user";
  content: string;
  attachments?: string[];
};

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  activeCheckpointId: string | null;
  previewMessageId: string | null;
};

type MCPToolResult = {
  content?: Array<{ type?: string; text?: string }>;
  structuredContent?: Record<string, any>;
  [key: string]: any;
};

type StoredChatState = {
  sessions: ChatSession[];
  activeSessionId: string | null;
};

type DiagramNarrative = {
  summary: string;
  details: string;
};

const MODEL_OPTIONS = [
  {
    id: "openai-gpt-4",
    label: "OpenAI GPT-4",
    provider: "openai",
    model: "gpt-4",
  },
  {
    id: "openai-gpt-5-mini",
    label: "OpenAI GPT-5 Mini",
    provider: "openai",
    model: "gpt-5-mini",
  },
  {
    id: "openai-chatgpt-4o",
    label: "OpenAI ChatGPT-4o",
    provider: "openai",
    model: "chatgpt-4o-latest",
  },
  {
    id: "github-gpt-4",
    label: "GitHub GPT-4",
    provider: "github_copilot",
    model: "gpt-4",
  },
  {
    id: "github-gpt-5-mini",
    label: "GitHub GPT-5 Mini",
    provider: "github_copilot",
    model: "gpt-5-mini",
  },
] as const;

type ModelId = typeof MODEL_OPTIONS[number]["id"];

const MODE_OPTIONS = ["Diagram", "Workflow", "Presentation", "Auto"];
const MAX_CHAT_SESSIONS = 40;

const MCP_PSEUDO_TYPES = new Set([
  "cameraUpdate",
  "delete",
  "restoreCheckpoint",
]);

const SUPPORTED_ELEMENT_TYPES = [
  "cameraUpdate",
  "rectangle",
  "ellipse",
  "diamond",
  "arrow",
  "text",
  "line",
  "delete",
  "restoreCheckpoint",
] as const;

const MCP_ACCEPT_HEADER = "application/json, text/event-stream";

const createSessionId = () =>
  `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sparklesIcon = (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2zM6 15.5l.6 1.7 1.7.6-1.7.6L6 20.1l-.6-1.7-1.7-.6 1.7-.6.6-1.7z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const createChatSession = (title = "New chat"): ChatSession => {
  const now = Date.now();
  return {
    id: createSessionId(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: [],
    activeCheckpointId: null,
    previewMessageId: null,
  };
};

const getInitialChatState = (): StoredChatState => {
  const fallbackSession = createChatSession();

  try {
    const raw = localStorage.getItem(
      STORAGE_KEYS.LOCAL_STORAGE_AI_CHAT_SESSIONS,
    );
    if (!raw) {
      return {
        sessions: [fallbackSession],
        activeSessionId: fallbackSession.id,
      };
    }

    const parsed = JSON.parse(raw) as StoredChatState;
    const parsedSessions = Array.isArray(parsed?.sessions)
      ? parsed.sessions
          .filter((session) => session && session.id)
          .map((session) => ({
            ...session,
            messages: Array.isArray(session.messages) ? session.messages : [],
            activeCheckpointId: session.activeCheckpointId ?? null,
            previewMessageId: session.previewMessageId ?? null,
          }))
      : [];

    if (!parsedSessions.length) {
      return {
        sessions: [fallbackSession],
        activeSessionId: fallbackSession.id,
      };
    }

    const activeSessionId =
      parsed.activeSessionId &&
      parsedSessions.some((session) => session.id === parsed.activeSessionId)
        ? parsed.activeSessionId
        : parsedSessions[0].id;

    return {
      sessions: parsedSessions.slice(0, MAX_CHAT_SESSIONS),
      activeSessionId,
    };
  } catch {
    return {
      sessions: [fallbackSession],
      activeSessionId: fallbackSession.id,
    };
  }
};

const getModeInstruction = (mode: string) => {
  switch (mode.toLowerCase()) {
    case "workflow":
      return "Build a clean workflow/process diagram with clear directional arrows and stage labels.";
    case "presentation":
      return "Build a presentation-style layout (title + grouped sections) optimized for storytelling.";
    case "auto":
      return "Choose the best layout automatically (diagram or workflow or presentation) based on user intent.";
    default:
      return "Build a technical diagram with clear architecture blocks and readable labels.";
  }
};

const getDeepReasoningInstruction = () =>
  [
    "Before producing output, deeply analyze the user request and infer missing-but-critical context.",
    "Internally plan the response end-to-end before generating any elements.",
    "Design clear flows with explicit cause/effect and directional sequencing.",
    "For architecture/workflow requests, capture full request lifecycle, key actors, and data movement.",
    "Prefer complete, professional diagrams over minimal sketches.",
  ].join("\n");

const shouldResetCheckpoint = (prompt: string) => {
  return /\b(new|from scratch|start over|reset|clear all|fresh)\b/i.test(
    prompt,
  );
};

const extractJSONObject = (raw: string): Record<string, any> | null => {
  const text = raw.trim();

  const tryParseObject = (candidate: string) => {
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : null;
    } catch {
      return null;
    }
  };

  const direct = tryParseObject(text);
  if (direct) {
    return direct;
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const fromFence = tryParseObject(fenced[1].trim());
    if (fromFence) {
      return fromFence;
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const fromSlice = tryParseObject(text.slice(firstBrace, lastBrace + 1));
    if (fromSlice) {
      return fromSlice;
    }
  }

  return null;
};

const stripMarkdownArtifacts = (input: string) =>
  input
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`/g, "")
    .replace(/\r/g, "")
    .trim();

const toShortSummary = (text: string, maxLength = 220) => {
  const clean = stripMarkdownArtifacts(text).replace(/\s+/g, " ").trim();
  if (!clean) {
    return "Generated successfully.";
  }
  if (clean.length <= maxLength) {
    return clean;
  }

  const sliced = clean.slice(0, maxLength);
  const boundary = Math.max(
    sliced.lastIndexOf(". "),
    sliced.lastIndexOf("; "),
    sliced.lastIndexOf(", "),
    sliced.lastIndexOf(" "),
  );

  const output = (boundary > 80 ? sliced.slice(0, boundary) : sliced).trim();
  return `${output}...`;
};

const wrapTextForCanvas = (text: string, maxLineLength = 62, maxLines = 28) => {
  const lines: string[] = [];
  const paragraphs = stripMarkdownArtifacts(text)
    .split("\n")
    .map((line) => line.trim());

  for (const paragraph of paragraphs) {
    if (!paragraph) {
      if (lines.length && lines[lines.length - 1] !== "") {
        lines.push("");
      }
      continue;
    }

    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length <= maxLineLength) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
        }
        current = word;
      }
      if (lines.length >= maxLines) {
        break;
      }
    }

    if (lines.length >= maxLines) {
      break;
    }

    if (current) {
      lines.push(current);
    }
  }

  if (lines.length > maxLines) {
    lines.length = maxLines;
  }

  if (!lines.length) {
    return "";
  }

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = `${last.replace(/\.\.\.$/, "")}...`;
  }

  return lines.join("\n");
};

const extractJSONArray = (raw: string): any[] | null => {
  const text = raw.trim();

  const tryParseArray = (candidate: string) => {
    try {
      const parsed = JSON.parse(candidate);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const direct = tryParseArray(text);
  if (direct) {
    return direct;
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const fromFence = tryParseArray(fenced[1].trim());
    if (fromFence) {
      return fromFence;
    }
  }

  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const fromSlice = tryParseArray(text.slice(firstBracket, lastBracket + 1));
    if (fromSlice) {
      return fromSlice;
    }
  }

  return null;
};

const normalizeGeneratedElements = (elements: any[]) => {
  const now = Date.now();

  return elements
    .map((item: any, index: number) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      let next = item;
      if (!next.type) {
        for (const type of SUPPORTED_ELEMENT_TYPES) {
          if (next[type] && typeof next[type] === "object") {
            next = { type, ...next[type] };
            break;
          }
        }
      }

      if (typeof next.type !== "string") {
        return null;
      }

      if (next.type === "cameraUpdate") {
        const width = Number(next.width) || 800;
        const height = Number(next.height) || 600;
        const centerX = Number(next.center?.x);
        const centerY = Number(next.center?.y);

        return {
          type: "cameraUpdate",
          width,
          height,
          x:
            Number.isFinite(centerX) && centerX !== 0
              ? centerX - width / 2
              : Number(next.x) || 0,
          y:
            Number.isFinite(centerY) && centerY !== 0
              ? centerY - height / 2
              : Number(next.y) || 0,
        };
      }

      if (next.type === "delete") {
        return {
          type: "delete",
          ids: String(next.ids ?? next.id ?? ""),
        };
      }

      if (next.type === "restoreCheckpoint") {
        if (!next.id) {
          return null;
        }

        return {
          type: "restoreCheckpoint",
          id: String(next.id),
        };
      }

      const base = {
        ...next,
        id: String(next.id || `ai-${now}-${index}`),
        x: Number(next.x) || 0,
        y: Number(next.y) || 0,
      } as any;

      if (base.type !== "text") {
        base.width = Number(base.width) || 180;
        base.height = Number(base.height) || 90;
      }

      if (base.type === "text" && typeof base.text !== "string") {
        base.text = String(base.label?.text || "Text");
      }

      return base;
    })
    .filter(Boolean);
};

const getElementLabel = (element: any) => {
  if (!element || typeof element !== "object") {
    return "";
  }
  if (typeof element.text === "string" && element.text.trim()) {
    return element.text.trim();
  }
  if (typeof element.label?.text === "string" && element.label.text.trim()) {
    return element.label.text.trim();
  }
  return "";
};

const getElementBounds = (elements: any[]) => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const element of elements) {
    if (!element || typeof element !== "object") {
      continue;
    }
    if (MCP_PSEUDO_TYPES.has(element.type)) {
      continue;
    }

    const x = Number(element.x) || 0;
    const y = Number(element.y) || 0;
    const width =
      Number(element.width) ||
      (element.type === "text" ? 320 : element.type === "arrow" ? 140 : 180);
    const height =
      Number(element.height) ||
      (element.type === "text" ? 120 : element.type === "arrow" ? 50 : 90);

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  if (!Number.isFinite(minX)) {
    return {
      minX: 0,
      minY: 0,
      maxX: 1400,
      maxY: 900,
    };
  }

  return { minX, minY, maxX, maxY };
};

const dedupeNearbyShapes = (elements: any[]) => {
  const result: any[] = [];

  for (const element of elements) {
    if (!element || typeof element !== "object") {
      continue;
    }

    if (
      element.type !== "rectangle" &&
      element.type !== "ellipse" &&
      element.type !== "diamond"
    ) {
      result.push(element);
      continue;
    }

    const label = getElementLabel(element).toLowerCase();
    if (!label) {
      result.push(element);
      continue;
    }

    const centerX =
      (Number(element.x) || 0) + (Number(element.width) || 180) / 2;
    const centerY =
      (Number(element.y) || 0) + (Number(element.height) || 90) / 2;

    const duplicate = result.find((candidate) => {
      if (
        candidate.type !== "rectangle" &&
        candidate.type !== "ellipse" &&
        candidate.type !== "diamond"
      ) {
        return false;
      }

      const candidateLabel = getElementLabel(candidate).toLowerCase();
      if (!candidateLabel || candidateLabel !== label) {
        return false;
      }

      const candidateCenterX =
        (Number(candidate.x) || 0) + (Number(candidate.width) || 180) / 2;
      const candidateCenterY =
        (Number(candidate.y) || 0) + (Number(candidate.height) || 90) / 2;

      return (
        Math.abs(candidateCenterX - centerX) < 180 &&
        Math.abs(candidateCenterY - centerY) < 120
      );
    });

    if (!duplicate) {
      result.push(element);
    }
  }

  return result;
};

const applyProfessionalStyling = (elements: any[]) => {
  const palette = [
    { backgroundColor: "#1b4d77", strokeColor: "#9dc7f0" },
    { backgroundColor: "#215f88", strokeColor: "#abd3ff" },
    { backgroundColor: "#195a43", strokeColor: "#8cd9b8" },
    { backgroundColor: "#5d4720", strokeColor: "#f2d89c" },
    { backgroundColor: "#4f2d6b", strokeColor: "#d6b7f0" },
  ];
  let paletteIndex = 0;

  const cleanedElements = dedupeNearbyShapes(elements);
  return cleanedElements.map((element) => {
    if (!element || typeof element !== "object") {
      return element;
    }

    if (MCP_PSEUDO_TYPES.has(element.type)) {
      return element;
    }

    if (element.type === "arrow" || element.type === "line") {
      return {
        ...element,
        strokeColor: "#d7dfec",
        strokeWidth: Math.max(2, Number(element.strokeWidth) || 0),
        roughness: 0,
      };
    }

    if (element.type === "text") {
      const text = getElementLabel(element);
      const shortLine = text.split("\n")[0] || "";
      const isHeading =
        shortLine.length > 0 &&
        shortLine.length < 56 &&
        /(architecture|workflow|diagram|overview|flow)/i.test(shortLine);

      return {
        ...element,
        strokeColor: "#e8edf7",
        fontSize: isHeading
          ? Math.max(24, Number(element.fontSize) || 0)
          : Math.max(18, Number(element.fontSize) || 0),
      };
    }

    if (
      element.type === "rectangle" ||
      element.type === "ellipse" ||
      element.type === "diamond"
    ) {
      const style = palette[paletteIndex % palette.length];
      paletteIndex += 1;

      return {
        ...element,
        width: Math.max(190, Number(element.width) || 0),
        height: Math.max(88, Number(element.height) || 0),
        strokeColor: style.strokeColor,
        backgroundColor: style.backgroundColor,
        fillStyle: "solid",
        strokeWidth: 2,
        roughness: 0,
      };
    }

    return element;
  });
};

const buildCanvasNarrativeElements = (params: {
  details: string;
  mode: string;
  sourceElements: any[];
  sessionId: string;
}) => {
  const { details, mode, sourceElements, sessionId } = params;
  const wrappedDetails = wrapTextForCanvas(details, 62, 30);
  if (!wrappedDetails) {
    return [];
  }

  const bounds = getElementBounds(sourceElements);
  const noteWidth = 560;
  const titleText = `${mode} Details`;
  const titleLines = wrapTextForCanvas(titleText, 56, 2);
  const detailsLines = wrappedDetails.split("\n").length;
  const titleLineCount = titleLines.split("\n").length;
  const noteHeight = Math.max(
    280,
    68 + detailsLines * 22 + titleLineCount * 24,
  );

  const x = bounds.maxX + 140;
  const y = Math.max(64, bounds.minY);
  const prefix = `ai-note-${sessionId}`;

  return [
    {
      type: "rectangle",
      id: `${prefix}-bg`,
      x,
      y,
      width: noteWidth,
      height: noteHeight,
      backgroundColor: "#0f1729",
      strokeColor: "#8ea7cc",
      fillStyle: "solid",
      strokeWidth: 2,
      roughness: 0,
    },
    {
      type: "text",
      id: `${prefix}-title`,
      x: x + 20,
      y: y + 16,
      width: noteWidth - 40,
      height: Math.max(40, titleLineCount * 28),
      text: titleLines,
      fontSize: 26,
      strokeColor: "#e8eeff",
      textAlign: "left",
      verticalAlign: "middle",
    },
    {
      type: "text",
      id: `${prefix}-body`,
      x: x + 20,
      y: y + 62,
      width: noteWidth - 40,
      height: noteHeight - 86,
      text: wrappedDetails,
      fontSize: 17,
      strokeColor: "#d3def5",
      textAlign: "left",
      verticalAlign: "top",
    },
  ];
};

const parseMcpResponse = (raw: string) => {
  const dataFrames: string[] = [];
  const lines = raw.split(/\r?\n/);
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("data:")) {
      current.push(line.slice(5).trim());
      continue;
    }

    if (!line.trim() && current.length) {
      dataFrames.push(current.join("\n"));
      current = [];
    }
  }

  if (current.length) {
    dataFrames.push(current.join("\n"));
  }

  const candidates = dataFrames.length ? dataFrames : [raw.trim()];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const candidate = candidates[i];
    if (!candidate) {
      continue;
    }

    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.jsonrpc || parsed?.result || parsed?.error) {
        return parsed;
      }
    } catch {
      // Ignore parsing errors and keep checking.
    }
  }

  return null;
};

const extractMcpText = (result: MCPToolResult | undefined) => {
  if (!result?.content) {
    return "";
  }

  return result.content
    .filter((item) => typeof item?.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
};

const normalizeToCanvasElements = (rawElements: any[]) => {
  const realElements = rawElements.filter(
    (el) => !MCP_PSEUDO_TYPES.has(el?.type),
  );

  const withLabelDefaults = realElements.map((el) =>
    el?.label
      ? {
          ...el,
          label: {
            textAlign: "center",
            verticalAlign: "middle",
            ...el.label,
          },
        }
      : el,
  );

  return convertTohidewhiteboardElements(withLabelDefaults, {
    regenerateIds: false,
  }) as any[];
};

const toSessionTitle = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "New chat";
  }

  return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean;
};

const getSessionDisplayTitle = (session: ChatSession | null) => {
  if (!session) {
    return "New chat";
  }

  if (session.title && session.title !== "New chat") {
    return session.title;
  }

  const firstUserMessage = session.messages.find(
    (message) => message.role === "user" && message.content.trim(),
  );
  if (firstUserMessage) {
    return toSessionTitle(firstUserMessage.content);
  }

  return "New chat";
};

type AIAgentPanelProps = {
  runtimeOnly?: boolean;
};

export const AIAgentPanel = ({ runtimeOnly = false }: AIAgentPanelProps) => {
  const initialStateRef = useRef<StoredChatState | null>(null);
  if (!initialStateRef.current) {
    initialStateRef.current = getInitialChatState();
  }

  const [sessions, setSessions] = useState<ChatSession[]>(
    initialStateRef.current.sessions,
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialStateRef.current.activeSessionId,
  );

  const [modelId, setModelId] = useState<ModelId>(MODEL_OPTIONS[0].id);
  const [mode, setMode] = useState("Diagram");
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<"model" | "mode" | null>(
    null,
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isPreviewRendering, setIsPreviewRendering] = useState(false);

  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mcpRecallRef = useRef<string>("");
  const previewRenderingRef = useRef(false);
  const previewPendingRef = useRef(false);
  const handledQueuedPromptRef = useRef<string | null>(null);

  const hidewhiteboardAPI = useAtomValue(aiAgenthidewhiteboardAPIAtom);
  const [queuedPrompt, setQueuedPrompt] = useAtom(aiAgentQueuedPromptAtom);
  const runtimeSyncTick = useAtomValue(aiAgentRuntimeSyncTickAtom);
  const bumpRuntimeSyncTick = useSetAtom(aiAgentRuntimeSyncTickAtom);
  const setQuickComposeStatus = useSetAtom(aiAgentQuickComposeStatusAtom);

  const BACKEND_URL =
    import.meta.env.VITE_APP_FDD_BACKEND_URL ||
    import.meta.env.VITE_APP_AI_BACKEND;
  const MCP_URL =
    import.meta.env.VITE_APP_MCP_SERVER_URL || "http://localhost:3101/mcp";
  const savedApiKey = localStorage.getItem(
    STORAGE_KEYS.LOCAL_STORAGE_LLM_API_KEY,
  );
  const API_KEY = savedApiKey || import.meta.env.VITE_APP_FDD_API_KEY;

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId],
  );

  const messages = activeSession?.messages ?? [];
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  useEffect(() => {
    if (sessions.length === 0) {
      const newSession = createChatSession();
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
      return;
    }

    if (
      !activeSessionId ||
      !sessions.some((session) => session.id === activeSessionId)
    ) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.LOCAL_STORAGE_AI_CHAT_SESSIONS,
      JSON.stringify({
        sessions,
        activeSessionId,
      }),
    );
    if (runtimeOnly) {
      bumpRuntimeSyncTick((prev) => prev + 1);
    }
  }, [activeSessionId, bumpRuntimeSyncTick, runtimeOnly, sessions]);

  useEffect(() => {
    if (runtimeOnly || isStreaming || runtimeSyncTick === 0) {
      return;
    }

    const next = getInitialChatState();
    setSessions(next.sessions);
    setActiveSessionId(next.activeSessionId);
  }, [isStreaming, runtimeOnly, runtimeSyncTick]);

  useEffect(() => {
    if (runtimeOnly) {
      return;
    }

    const handleOutside = (event: MouseEvent) => {
      if (
        composerRef.current &&
        !composerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
      if (
        historyRef.current &&
        !historyRef.current.contains(event.target as Node)
      ) {
        setIsHistoryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [runtimeOnly]);

  const resizeComposerInput = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 52), 128);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 128 ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeComposerInput();
  }, [input, resizeComposerInput]);

  const updateSessionById = (
    sessionId: string,
    updater: (session: ChatSession) => ChatSession,
  ) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...updater(session),
              updatedAt: Date.now(),
            }
          : session,
      ),
    );
  };

  const updateAssistantContent = (
    sessionId: string,
    assistantMessageId: string,
    content: string,
  ) => {
    updateSessionById(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((message) =>
        message.id === assistantMessageId ? { ...message, content } : message,
      ),
    }));
  };

  const startNewChat = () => {
    const next = createChatSession();
    setSessions((prev) => [next, ...prev].slice(0, MAX_CHAT_SESSIONS));
    setActiveSessionId(next.id);
    setIsHistoryOpen(false);
    setInput("");
    setAttachedFiles([]);
    setOpenDropdown(null);
  };

  const deleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const filtered = prev.filter((session) => session.id !== sessionId);
      const nextSessions = filtered.length ? filtered : [createChatSession()];
      setActiveSessionId((current) =>
        current && nextSessions.some((session) => session.id === current)
          ? current
          : nextSessions[0].id,
      );
      return nextSessions.slice(0, MAX_CHAT_SESSIONS);
    });
  };

  const renderPreview = useCallback(async () => {
    if (runtimeOnly) {
      return;
    }

    if (!hidewhiteboardAPI) {
      setPreviewDataUrl(null);
      return;
    }

    if (previewRenderingRef.current) {
      previewPendingRef.current = true;
      return;
    }

    previewRenderingRef.current = true;
    setIsPreviewRendering(true);

    try {
      const elements = hidewhiteboardAPI.getSceneElements();
      if (!elements.length) {
        setPreviewDataUrl(null);
        return;
      }

      const appState = hidewhiteboardAPI.getAppState();
      const files = hidewhiteboardAPI.getFiles();

      const canvas = await exportToCanvas({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: appState.theme === "dark",
          viewBackgroundColor: appState.viewBackgroundColor,
        },
        files,
        exportPadding: 20,
      });

      setPreviewDataUrl(canvas.toDataURL("image/png"));
    } catch {
      setPreviewDataUrl(null);
    } finally {
      previewRenderingRef.current = false;
      setIsPreviewRendering(false);

      if (previewPendingRef.current) {
        previewPendingRef.current = false;
        void renderPreview();
      }
    }
  }, [hidewhiteboardAPI, runtimeOnly]);

  useEffect(() => {
    if (runtimeOnly) {
      setPreviewDataUrl(null);
      return;
    }

    if (!hidewhiteboardAPI) {
      setPreviewDataUrl(null);
      return;
    }

    void renderPreview();
    const unsubscribe = hidewhiteboardAPI.onChange(() => {
      void renderPreview();
    });

    return () => {
      unsubscribe?.();
    };
  }, [hidewhiteboardAPI, renderPreview, runtimeOnly]);

  const callMcpTool = async (
    name: string,
    args: Record<string, any>,
    signal?: AbortSignal,
  ): Promise<MCPToolResult> => {
    const response = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: MCP_ACCEPT_HEADER,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        method: "tools/call",
        params: {
          name,
          arguments: args,
        },
      }),
      signal,
    });

    const raw = await response.text();
    if (!response.ok) {
      throw new Error(raw || `MCP request failed: ${response.status}`);
    }

    const parsed = parseMcpResponse(raw);
    if (!parsed) {
      throw new Error("Unable to parse MCP response.");
    }

    if (parsed.error) {
      throw new Error(parsed.error.message || "MCP tool call failed.");
    }

    return (parsed.result || {}) as MCPToolResult;
  };

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

    if (Array.isArray(data?.content)) {
      return data.content
        .map((item: any) =>
          typeof item?.text === "string" ? item.text : String(item ?? ""),
        )
        .join("");
    }

    return "";
  };

  const extractTextFromSSEPayload = (payload: string) => {
    let source = payload.trim();
    if (!source) {
      return "";
    }

    try {
      const decoded = JSON.parse(source);
      if (typeof decoded === "string" && decoded.includes("data:")) {
        source = decoded;
      }
    } catch {
      // Keep original payload.
    }

    if (!source.includes("data:")) {
      return "";
    }

    let output = "";
    const lines = source.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) {
        continue;
      }

      const raw = trimmed.slice(5).trim();
      if (!raw || raw === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(raw);
        const chunkText = extractChunkText(parsed);
        if (chunkText) {
          output += chunkText;
        }
      } catch {
        output += raw;
      }
    }

    return output;
  };

  const extractTextFromAnyPayload = (rawPayload: string) => {
    if (!rawPayload) {
      return "";
    }

    const sseText = extractTextFromSSEPayload(rawPayload);
    if (sseText) {
      return sseText;
    }

    try {
      const parsed = JSON.parse(rawPayload);
      if (typeof parsed === "string") {
        const nestedSseText = extractTextFromSSEPayload(parsed);
        if (nestedSseText) {
          return nestedSseText;
        }
        return parsed;
      }

      return (
        extractChunkText(parsed) ||
        parsed?.response ||
        parsed?.output ||
        parsed?.text ||
        ""
      );
    } catch {
      return rawPayload;
    }
  };

  const callChatProxyText = async (params: {
    provider: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
    signal: AbortSignal;
    temperature?: number;
  }) => {
    const {
      provider,
      model,
      systemPrompt,
      userPrompt,
      signal,
      temperature = 0.2,
    } = params;

    const response = await fetch(`${BACKEND_URL}/api/proxy/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
      },
      signal,
      body: JSON.stringify({
        provider,
        payload: {
          model,
          stream: false,
          temperature,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `AI generation failed: ${response.status}`);
    }

    const rawText = await response.text();
    return extractTextFromAnyPayload(rawText).trim();
  };

  const generateElementsWithLLM = async (params: {
    prompt: string;
    mode: string;
    provider: string;
    model: string;
    attachmentNames: string[];
    contextMessages: Message[];
    signal: AbortSignal;
  }) => {
    const {
      prompt,
      mode: requestMode,
      provider,
      model,
      attachmentNames,
      contextMessages,
      signal,
    } = params;

    const contextText = contextMessages
      .slice(-8)
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

    const systemPrompt = [
      "You are a HideWhiteboard diagram generation engine.",
      "Return ONLY a valid JSON array of elements. No markdown. No explanation.",
      "Element types allowed: rectangle, ellipse, diamond, arrow, text, line, cameraUpdate, delete.",
      "Always include a cameraUpdate as the first element for new diagrams.",
      "Use readable font sizes (16+), consistent spacing, and concise unique ids.",
      "Use labels on shapes when suitable.",
      "Think deeply and reason internally before writing output; do not expose your chain-of-thought.",
      "Build complete end-to-end structures, not partial fragments.",
      "If user asks how a system works, represent request/response flow, processing pipeline, and output delivery in sequence.",
      "Example style for search flow: User -> Browser -> DNS -> Entry Service -> Processing/Index -> Ranking -> Results -> User.",
      getDeepReasoningInstruction(),
      getModeInstruction(requestMode),
      mcpRecallRef.current
        ? `Reference:\n${mcpRecallRef.current}`
        : "Reference: Use standard HideWhiteboard/hidewhiteboard JSON shape format.",
    ].join("\n");

    const userPrompt = [
      `User request: ${prompt}`,
      attachmentNames.length
        ? `Attached files:\n${attachmentNames
            .map((name) => `- ${name}`)
            .join("\n")}`
        : "",
      contextText ? `Recent context:\n${contextText}` : "",
      "Output must be ONLY JSON array.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const modelOutput = await callChatProxyText({
      provider,
      model,
      systemPrompt,
      userPrompt,
      signal,
      temperature: 0.2,
    });
    const parsedElements = extractJSONArray(modelOutput);

    if (!parsedElements) {
      throw new Error("Model returned invalid elements JSON.");
    }

    const normalizedElements = normalizeGeneratedElements(parsedElements);
    if (!normalizedElements.length) {
      throw new Error("Model output did not contain supported elements.");
    }

    return normalizedElements;
  };

  const refineGeneratedElementsWithLLM = async (params: {
    prompt: string;
    mode: string;
    provider: string;
    model: string;
    generatedElements: any[];
    signal: AbortSignal;
  }) => {
    const {
      prompt,
      mode: requestMode,
      provider,
      model,
      generatedElements,
      signal,
    } = params;

    const systemPrompt = [
      "You are HideWhiteboard diagram quality optimizer.",
      "Input is a JSON array of elements. Improve it for professional output quality.",
      "Output ONLY a valid JSON array. No markdown, no explanation.",
      "Keep semantic intent unchanged while improving structure and polish.",
      "Fix these quality issues if present:",
      "- remove accidental duplicate nodes",
      "- align primary flow left-to-right",
      "- avoid overlapping elements",
      "- avoid disconnected/unlabeled shapes",
      "- ensure arrows clearly represent directional flow",
      "Keep element types within: rectangle, ellipse, diamond, arrow, text, line, cameraUpdate, delete.",
      getModeInstruction(requestMode),
      getDeepReasoningInstruction(),
    ].join("\n");

    const userPrompt = [
      `User request: ${prompt}`,
      `Current mode: ${requestMode}`,
      "Current elements JSON:",
      JSON.stringify(generatedElements),
      "Return improved elements JSON only.",
    ].join("\n\n");

    const modelOutput = await callChatProxyText({
      provider,
      model,
      systemPrompt,
      userPrompt,
      signal,
      temperature: 0.1,
    });

    const parsedElements = extractJSONArray(modelOutput);
    if (!parsedElements) {
      throw new Error("Failed to parse refined diagram JSON.");
    }

    const normalizedElements = normalizeGeneratedElements(parsedElements);
    if (!normalizedElements.length) {
      throw new Error("Refined output did not contain supported elements.");
    }

    return normalizedElements;
  };

  const generateDiagramNarrative = async (params: {
    prompt: string;
    mode: string;
    provider: string;
    model: string;
    generatedElements: any[];
    attachmentNames: string[];
    contextMessages: Message[];
    signal: AbortSignal;
  }): Promise<DiagramNarrative> => {
    const {
      prompt,
      mode: requestMode,
      provider,
      model,
      generatedElements,
      attachmentNames,
      contextMessages,
      signal,
    } = params;

    const contextText = contextMessages
      .slice(-8)
      .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
      .join("\n");

    const summarizedElements = generatedElements
      .filter((el) => !MCP_PSEUDO_TYPES.has(el?.type))
      .slice(0, 36)
      .map((el, index) => {
        const label =
          typeof el?.text === "string" && el.text.trim()
            ? el.text.trim().slice(0, 48)
            : typeof el?.label?.text === "string" && el.label.text.trim()
            ? el.label.text.trim().slice(0, 48)
            : "";
        return `${index + 1}. ${el.type}${label ? ` - ${label}` : ""}`;
      })
      .join("\n");

    const systemPrompt = [
      "You are HideWhiteboard AI technical explainer.",
      "Analyze the generated diagram/workflow deeply and produce professional narrative output.",
      "Respond ONLY as JSON object with keys: summary, details.",
      "summary must be concise (max 2 short sentences).",
      "details must be comprehensive, step-by-step, and implementation-oriented.",
      "No markdown fences, no extra keys.",
      getModeInstruction(requestMode),
      getDeepReasoningInstruction(),
    ].join("\n");

    const userPrompt = [
      `Original user request: ${prompt}`,
      `Mode used: ${requestMode}`,
      attachmentNames.length
        ? `Attached files:\n${attachmentNames
            .map((name) => `- ${name}`)
            .join("\n")}`
        : "",
      summarizedElements
        ? `Generated element summary:\n${summarizedElements}`
        : "",
      contextText ? `Recent context:\n${contextText}` : "",
      "details must include:",
      "1) End-to-end flow from start to finish",
      "2) Component-level responsibilities",
      "3) Data/request movement",
      "4) Operational considerations and improvements",
    ]
      .filter(Boolean)
      .join("\n\n");

    const narrativeRaw = await callChatProxyText({
      provider,
      model,
      systemPrompt,
      userPrompt,
      signal,
      temperature: 0.25,
    });

    const parsed = extractJSONObject(narrativeRaw);
    const summaryCandidate =
      typeof parsed?.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : "";
    const detailsCandidate =
      typeof parsed?.details === "string" && parsed.details.trim()
        ? parsed.details.trim()
        : stripMarkdownArtifacts(narrativeRaw);

    return {
      summary: toShortSummary(summaryCandidate || detailsCandidate),
      details: detailsCandidate,
    };
  };

  const enhanceUserPrompt = async () => {
    const rawInput = input.trim();
    if (!rawInput || isEnhancing || isStreaming) {
      return;
    }

    if (!BACKEND_URL || !API_KEY) {
      return;
    }

    const selectedModel =
      MODEL_OPTIONS.find((option) => option.id === modelId) || MODEL_OPTIONS[0];
    const controller = new AbortController();

    try {
      setIsEnhancing(true);
      const contextText = messages
        .slice(-6)
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n");

      const systemPrompt = [
        "You are a Prompt Enhancer for HideWhiteboard AI.",
        "Rewrite user prompts so the model can generate high-quality diagrams, workflows, and presentations.",
        "Preserve user intent exactly while adding clarity, structure, and missing implementation context.",
        "The rewritten prompt must be direct, actionable, and concise.",
        "Output only the enhanced prompt text. No markdown, no labels.",
      ].join("\n");

      const userPrompt = [
        `Current mode: ${mode}`,
        `Original prompt:\n${rawInput}`,
        contextText ? `Recent chat context:\n${contextText}` : "",
        "Enhance this prompt so AI can analyze first, then plan, then generate complete output end-to-end.",
      ]
        .filter(Boolean)
        .join("\n\n");

      const enhancedText = await callChatProxyText({
        provider: selectedModel.provider,
        model: selectedModel.model,
        systemPrompt,
        userPrompt,
        signal: controller.signal,
        temperature: 0.3,
      });

      if (enhancedText) {
        setInput(enhancedText);
      }
    } catch {
      // Keep original prompt unchanged if enhancement fails.
    } finally {
      setIsEnhancing(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const updateQuickStatus = (
    requestId: string | null,
    stage:
      | "queued"
      | "loading"
      | "generating"
      | "refining"
      | "rendering"
      | "done"
      | "error",
    message: string,
    isProcessing: boolean,
  ) => {
    if (!requestId) {
      return;
    }

    setQuickComposeStatus({
      requestId,
      stage,
      message,
      isProcessing,
      updatedAt: Date.now(),
    });
  };

  const sendMessage = async (
    text: string,
    options?: {
      source?: "panel" | "floating";
      requestId?: string | null;
    },
  ) => {
    const fromFloatingComposer = options?.source === "floating";
    const requestId = options?.requestId ?? null;
    let workingSessions = sessions;
    let sessionId = activeSessionId;

    if (fromFloatingComposer && runtimeOnly) {
      const latestState = getInitialChatState();
      workingSessions = latestState.sessions;
      sessionId = latestState.activeSessionId;

      if (!sessionId) {
        const fallback = createChatSession();
        workingSessions = [fallback, ...workingSessions].slice(
          0,
          MAX_CHAT_SESSIONS,
        );
        sessionId = fallback.id;
      }

      setSessions(workingSessions);
      setActiveSessionId(sessionId);
    }

    if (!sessionId) {
      if (fromFloatingComposer) {
        updateQuickStatus(requestId, "error", "No active chat session.", false);
      }
      return;
    }

    const cleanText = text.trim();
    const attachmentNames = attachedFiles.map((file) => file.name);
    if (!cleanText && attachmentNames.length === 0) {
      if (fromFloatingComposer) {
        updateQuickStatus(
          requestId,
          "error",
          "Prompt is empty. Enter a request and try again.",
          false,
        );
      }
      return;
    }

    const sessionSnapshot = workingSessions.find(
      (session) => session.id === sessionId,
    );
    if (!sessionSnapshot) {
      if (fromFloatingComposer) {
        updateQuickStatus(
          requestId,
          "error",
          "Chat session was not found.",
          false,
        );
      }
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: cleanText || "Attached files",
      attachments: attachmentNames.length ? attachmentNames : undefined,
    };

    const assistantMessageId = `assistant-${Date.now()}`;

    updateSessionById(sessionId, (session) => ({
      ...session,
      title:
        session.title === "New chat"
          ? toSessionTitle(cleanText || attachmentNames[0] || `${mode} request`)
          : session.title,
      messages: [
        ...session.messages,
        userMessage,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "Starting MCP agent...",
        },
      ],
    }));

    setInput("");
    setAttachedFiles([]);

    if (!BACKEND_URL || !API_KEY) {
      updateAssistantContent(
        sessionId,
        assistantMessageId,
        "Missing AI config. Set VITE_APP_FDD_BACKEND_URL and VITE_APP_FDD_API_KEY in .env.development.",
      );
      if (fromFloatingComposer) {
        updateQuickStatus(
          requestId,
          "error",
          "Missing AI config. Set backend URL/API key first.",
          false,
        );
      }
      return;
    }

    try {
      const selectedModel =
        MODEL_OPTIONS.find((option) => option.id === modelId) ||
        MODEL_OPTIONS[0];

      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsStreaming(true);

      updateAssistantContent(
        sessionId,
        assistantMessageId,
        "Loading MCP context...",
      );
      if (fromFloatingComposer) {
        updateQuickStatus(requestId, "loading", "Loading MCP context...", true);
      }

      if (!mcpRecallRef.current) {
        try {
          const readMeResult = await callMcpTool(
            "read_me",
            {},
            abortController.signal,
          );
          const readMeText = extractMcpText(readMeResult);
          mcpRecallRef.current = readMeText.slice(0, 3500);
        } catch {
          mcpRecallRef.current = "";
        }
      }

      updateAssistantContent(
        sessionId,
        assistantMessageId,
        `Generating ${mode.toLowerCase()} plan with ${selectedModel.label}...`,
      );
      if (fromFloatingComposer) {
        updateQuickStatus(
          requestId,
          "generating",
          `Generating ${mode.toLowerCase()} with ${selectedModel.label}...`,
          true,
        );
      }

      const generatedElements = await generateElementsWithLLM({
        prompt: cleanText || "Process attached files and create a visual.",
        mode,
        provider: selectedModel.provider,
        model: selectedModel.model,
        attachmentNames,
        contextMessages: sessionSnapshot.messages,
        signal: abortController.signal,
      });

      updateAssistantContent(
        sessionId,
        assistantMessageId,
        "Refining layout quality...",
      );
      if (fromFloatingComposer) {
        updateQuickStatus(
          requestId,
          "refining",
          "Refining layout quality...",
          true,
        );
      }

      let refinedElements = generatedElements;
      try {
        refinedElements = await refineGeneratedElementsWithLLM({
          prompt: cleanText || "Process attached files and create a visual.",
          mode,
          provider: selectedModel.provider,
          model: selectedModel.model,
          generatedElements,
          signal: abortController.signal,
        });
      } catch {
        refinedElements = generatedElements;
      }

      const styledElements = applyProfessionalStyling(refinedElements);

      updateAssistantContent(
        sessionId,
        assistantMessageId,
        "Preparing professional explanation...",
      );

      let narrative: DiagramNarrative = {
        summary: "Diagram generated successfully.",
        details: "",
      };
      try {
        narrative = await generateDiagramNarrative({
          prompt: cleanText || "Process attached files and create a visual.",
          mode,
          provider: selectedModel.provider,
          model: selectedModel.model,
          generatedElements: styledElements,
          attachmentNames,
          contextMessages: sessionSnapshot.messages,
          signal: abortController.signal,
        });
      } catch {
        narrative = {
          summary: "Diagram generated successfully.",
          details: "",
        };
      }

      const narrativeElements = narrative.details
        ? buildCanvasNarrativeElements({
            details: narrative.details,
            mode,
            sourceElements: styledElements,
            sessionId,
          })
        : [];
      const renderElements = [...styledElements, ...narrativeElements];

      const currentCheckpoint = sessionSnapshot.activeCheckpointId || null;

      const needsFreshStart = shouldResetCheckpoint(cleanText);
      const hasRestoreElement = renderElements.some(
        (el: any) => el?.type === "restoreCheckpoint",
      );

      const finalElements =
        currentCheckpoint && !needsFreshStart && !hasRestoreElement
          ? [
              { type: "restoreCheckpoint", id: currentCheckpoint },
              ...renderElements,
            ]
          : renderElements;

      updateAssistantContent(
        sessionId,
        assistantMessageId,
        "Rendering via MCP create_view...",
      );
      if (fromFloatingComposer) {
        updateQuickStatus(requestId, "rendering", "Rendering via MCP...", true);
      }

      const createResult = await callMcpTool(
        "create_view",
        {
          elements: JSON.stringify(finalElements),
        },
        abortController.signal,
      );

      const createText = extractMcpText(createResult);
      const checkpointId =
        createResult.structuredContent?.checkpointId ||
        createText.match(/Checkpoint id:\s*"([^"]+)"/i)?.[1] ||
        null;

      if (!checkpointId) {
        throw new Error("MCP create_view did not return checkpoint id.");
      }

      updateSessionById(sessionId, (session) => ({
        ...session,
        activeCheckpointId: checkpointId,
        previewMessageId: assistantMessageId,
      }));

      updateAssistantContent(
        sessionId,
        assistantMessageId,
        "Applying diagram to canvas...",
      );

      const checkpointResult = await callMcpTool(
        "read_checkpoint",
        { id: checkpointId },
        abortController.signal,
      );
      const checkpointText = extractMcpText(checkpointResult);
      const checkpointData = checkpointText ? JSON.parse(checkpointText) : null;
      const rawCheckpointElements = Array.isArray(checkpointData?.elements)
        ? checkpointData.elements
        : [];

      const canvasElements = normalizeToCanvasElements(rawCheckpointElements);

      if (hidewhiteboardAPI) {
        hidewhiteboardAPI.updateScene({ elements: canvasElements });
      }

      const completionPrefix = hidewhiteboardAPI
        ? `Done. ${mode} created on canvas with MCP (checkpoint: ${checkpointId}).`
        : `Diagram generated with MCP (checkpoint: ${checkpointId}), but canvas API is not ready yet.`;

      updateAssistantContent(
        sessionId,
        assistantMessageId,
        `${completionPrefix}\n\nSummary: ${toShortSummary(narrative.summary)}`,
      );
      if (fromFloatingComposer) {
        updateQuickStatus(
          requestId,
          "done",
          toShortSummary(narrative.summary),
          false,
        );
      }
    } catch (error: any) {
      const errorMessage =
        error?.name === "AbortError"
          ? "Generation stopped."
          : error?.message?.includes("Failed to fetch")
          ? `MCP server is unreachable at ${MCP_URL}. Start it and retry.`
          : error?.message || "MCP generation failed.";

      updateAssistantContent(sessionId, assistantMessageId, errorMessage);
      if (fromFloatingComposer) {
        updateQuickStatus(requestId, "error", errorMessage, false);
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (!runtimeOnly || !queuedPrompt || isStreaming) {
      return;
    }

    if (queuedPrompt.id === handledQueuedPromptRef.current) {
      return;
    }

    handledQueuedPromptRef.current = queuedPrompt.id;
    setQueuedPrompt(null);
    void sendMessage(queuedPrompt.text, {
      source: "floating",
      requestId: queuedPrompt.id,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming, queuedPrompt, runtimeOnly, setQueuedPrompt]);

  if (runtimeOnly) {
    return null;
  }

  return (
    <div className="ai-agent-panel">
      <div className="ai-agent-panel__header" ref={historyRef}>
        <div className="ai-agent-panel__heading">
          <div className="ai-agent-panel__heading-icon">
            {messageCircleIcon}
          </div>
          <div className="ai-agent-panel__heading-copy">
            <div className="ai-agent-panel__heading-title">
              {getSessionDisplayTitle(activeSession)}
            </div>
            <div className="ai-agent-panel__heading-meta">
              {messages.length} messages
            </div>
          </div>
        </div>
        <div className="ai-agent-panel__header-actions">
          <button
            type="button"
            className={`ai-agent-panel__header-action ${
              isHistoryOpen ? "ai-agent-panel__header-action--active" : ""
            }`}
            aria-label="History"
            onClick={() => setIsHistoryOpen((prev) => !prev)}
          >
            {historyIcon}
          </button>
          <button
            type="button"
            className="ai-agent-panel__header-action"
            aria-label="New chat"
            onClick={startNewChat}
          >
            {PlusIcon}
          </button>
        </div>
        {isHistoryOpen && (
          <div className="ai-agent-panel__history-dropdown">
            {sortedSessions.map((session) => (
              <div key={session.id} className="ai-agent-panel__history-row">
                <button
                  type="button"
                  className={`ai-agent-panel__history-item ${
                    session.id === activeSessionId
                      ? "ai-agent-panel__history-item--active"
                      : ""
                  }`}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setIsHistoryOpen(false);
                  }}
                >
                  <span className="ai-agent-panel__history-title">
                    {getSessionDisplayTitle(session)}
                  </span>
                  <span className="ai-agent-panel__history-meta">
                    {session.messages.length} msgs
                  </span>
                </button>
                <button
                  type="button"
                  className="ai-agent-panel__history-delete"
                  aria-label={`Delete ${session.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteSession(session.id);
                  }}
                >
                  {TrashIcon}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ai-agent-panel__content">
        <div className="ai-agent-panel__messages">
          {messages.length === 0 && (
            <div className="ai-agent-panel__messages-empty">
              Start a new request to generate diagram, workflow, or
              presentation.
            </div>
          )}
          {messages.map((message) => (
            <React.Fragment key={message.id}>
              <div
                className={`ai-agent-panel__message ai-agent-panel__message--${message.role}`}
              >
                {message.content}
                {message.attachments?.length ? (
                  <div className="ai-agent-panel__message-attachments">
                    {message.attachments.map((name) => (
                      <div
                        key={`${message.id}-${name}`}
                        className="ai-agent-panel__message-attachment-chip"
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              {message.id === activeSession?.previewMessageId &&
              previewDataUrl ? (
                <div className="ai-agent-panel__message-preview">
                  <div className="ai-agent-panel__preview ai-agent-panel__preview--inline">
                    <div className="ai-agent-panel__preview-head">
                      <span>Realtime Canvas Preview</span>
                      <div className="ai-agent-panel__preview-zoom">
                        <button
                          type="button"
                          aria-label="Zoom out preview"
                          onClick={() =>
                            setPreviewZoom((prev) => Math.max(0.6, prev - 0.1))
                          }
                        >
                          -
                        </button>
                        <span>{Math.round(previewZoom * 100)}%</span>
                        <button
                          type="button"
                          aria-label="Zoom in preview"
                          onClick={() =>
                            setPreviewZoom((prev) => Math.min(2, prev + 0.1))
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="ai-agent-panel__preview-stage">
                      <img
                        src={previewDataUrl}
                        alt="Canvas preview"
                        style={{
                          transform: `scale(${previewZoom})`,
                        }}
                      />
                      {isPreviewRendering && (
                        <div className="ai-agent-panel__preview-status">
                          Updating...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      <form
        className="ai-agent-panel__composer"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}
      >
        <div className="ai-agent-panel__composer-input-wrap">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              resizeComposerInput();
            }}
            placeholder="Ask for follow-up changes"
            rows={3}
          />
          <button
            type="button"
            className={`ai-agent-panel__composer-enhance ${
              isEnhancing ? "ai-agent-panel__composer-enhance--active" : ""
            }`}
            aria-label="Enhance prompt"
            title="Enhance prompt"
            onClick={enhanceUserPrompt}
            disabled={!input.trim() || isEnhancing || isStreaming}
          >
            {sparklesIcon}
          </button>
        </div>

        {attachedFiles.length > 0 && (
          <div className="ai-agent-panel__attachments">
            {attachedFiles.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}-${index}`}
                className="ai-agent-panel__attachment-chip"
              >
                <span>{file.name}</span>
                <button
                  type="button"
                  className="ai-agent-panel__attachment-remove"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setAttachedFiles((prev) =>
                      prev.filter((_, prevIndex) => prevIndex !== index),
                    )
                  }
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="ai-agent-panel__composer-footer" ref={composerRef}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="ai-agent-panel__hidden-file-input"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.csv,.json,.zip,.rar,.svg"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length > 0) {
                setAttachedFiles((prev) => [...prev, ...files]);
              }
              event.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            className="ai-agent-panel__composer-plus"
            aria-label="Add context"
            onClick={() => fileInputRef.current?.click()}
          >
            {PlusIcon}
          </button>

          <div className="ai-agent-panel__dropdown">
            <button
              type="button"
              className="ai-agent-panel__composer-select ai-agent-panel__composer-select--mode"
              aria-label="Mode selector"
              onClick={() =>
                setOpenDropdown((prev) => (prev === "mode" ? null : "mode"))
              }
            >
              {mode}
            </button>
            {openDropdown === "mode" && (
              <div className="ai-agent-panel__dropdown-menu">
                {MODE_OPTIONS.map((item) => (
                  <button
                    type="button"
                    key={item}
                    className={`ai-agent-panel__dropdown-item ${
                      item === mode
                        ? "ai-agent-panel__dropdown-item--active"
                        : ""
                    }`}
                    onClick={() => {
                      setMode(item);
                      setOpenDropdown(null);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ai-agent-panel__dropdown">
            <button
              type="button"
              className="ai-agent-panel__composer-select ai-agent-panel__composer-select--model"
              aria-label="Model selector"
              onClick={() =>
                setOpenDropdown((prev) => (prev === "model" ? null : "model"))
              }
            >
              {MODEL_OPTIONS.find((item) => item.id === modelId)?.label ||
                MODEL_OPTIONS[0].label}
            </button>
            {openDropdown === "model" && (
              <div className="ai-agent-panel__dropdown-menu">
                {MODEL_OPTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`ai-agent-panel__dropdown-item ${
                      item.id === modelId
                        ? "ai-agent-panel__dropdown-item--active"
                        : ""
                    }`}
                    onClick={() => {
                      setModelId(item.id);
                      setOpenDropdown(null);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type={isStreaming ? "button" : "submit"}
            className="ai-agent-panel__composer-send"
            aria-label={isStreaming ? "Stop generation" : "Send message"}
            onClick={() => {
              if (isStreaming) {
                abortControllerRef.current?.abort();
              }
            }}
          >
            {isStreaming ? stop : ArrowRightIcon}
          </button>
        </div>
      </form>
    </div>
  );
};
