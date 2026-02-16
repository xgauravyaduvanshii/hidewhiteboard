import * as MermaidTohidewhiteboard from "@hidewhiteboard/mermaid-to-hidewhiteboard";
import React from "react";
import { vi } from "vitest";

import type { parseMermaidToExcalidraw as parseMermaidTohidewhiteboard } from "@hidewhiteboard/mermaid-to-hidewhiteboard";

export const mockMermaidTohidewhiteboard = (opts: {
  parseMermaidTohidewhiteboard: typeof parseMermaidTohidewhiteboard;
  mockRef?: boolean;
}) => {
  vi.mock("@hidewhiteboard/mermaid-to-hidewhiteboard", async (importActual) => {
    const module = (await importActual()) as any;

    return {
      __esModule: true,
      ...module,
    };
  });
  const parseMermaidTohidewhiteboardSpy = vi.spyOn(
    MermaidTohidewhiteboard,
    "parseMermaidToExcalidraw",
  );

  parseMermaidTohidewhiteboardSpy.mockImplementation(opts.parseMermaidTohidewhiteboard);

  if (opts.mockRef) {
    vi.spyOn(React, "useRef").mockReturnValue({
      current: {
        parseMermaidTohidewhiteboard: parseMermaidTohidewhiteboardSpy,
      },
    });
  }
};

// Mock for HTMLImageElement (use with `vi.unstubAllGlobals()`)
// as jsdom.resources: "usable" throws an error on image load
export const mockHTMLImageElement = (
  naturalWidth: number,
  naturalHeight: number,
) => {
  vi.stubGlobal(
    "Image",
    class extends Image {
      constructor() {
        super();

        Object.defineProperty(this, "naturalWidth", {
          value: naturalWidth,
        });
        Object.defineProperty(this, "naturalHeight", {
          value: naturalHeight,
        });

        queueMicrotask(() => {
          this.onload?.({} as Event);
        });
      }
    },
  );
};

// Mocks for multiple HTMLImageElements (dimensions are assigned in the order of image initialization)
export const mockMultipleHTMLImageElements = (
  sizes: (readonly [number, number])[],
) => {
  const _sizes = [...sizes];

  vi.stubGlobal(
    "Image",
    class extends Image {
      constructor() {
        super();

        const size = _sizes.shift();
        if (!size) {
          throw new Error("Insufficient sizes");
        }

        Object.defineProperty(this, "naturalWidth", {
          value: size[0],
        });
        Object.defineProperty(this, "naturalHeight", {
          value: size[1],
        });

        queueMicrotask(() => {
          this.onload?.({} as Event);
        });
      }
    },
  );
};
