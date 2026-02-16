import React from "react";

import { resolvablePromise } from "@hidewhiteboard/common";

import { Hidewhiteboard } from "../index";

import { Pointer } from "./helpers/ui";
import { act, render } from "./test-utils";

import type { hidewhiteboardImperativeAPI } from "../types";

describe("setActiveTool()", () => {
  const h = window.h;

  let hidewhiteboardAPI: hidewhiteboardImperativeAPI;

  const mouse = new Pointer("mouse");

  beforeEach(async () => {
    const hidewhiteboardAPIPromise = resolvablePromise<hidewhiteboardImperativeAPI>();
    await render(
      <Hidewhiteboard
        hidewhiteboardAPI={(api) => hidewhiteboardAPIPromise.resolve(api as any)}
      />,
    );
    hidewhiteboardAPI = await hidewhiteboardAPIPromise;
  });

  it("should expose setActiveTool on package API", () => {
    expect(hidewhiteboardAPI.setActiveTool).toBeDefined();
    expect(hidewhiteboardAPI.setActiveTool).toBe(h.app.setActiveTool);
  });

  it("should set the active tool type", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      hidewhiteboardAPI.setActiveTool({ type: "rectangle" });
    });
    expect(h.state.activeTool.type).toBe("rectangle");

    mouse.down(10, 10);
    mouse.up(20, 20);

    expect(h.state.activeTool.type).toBe("selection");
  });

  it("should support tool locking", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      hidewhiteboardAPI.setActiveTool({ type: "rectangle", locked: true });
    });
    expect(h.state.activeTool.type).toBe("rectangle");

    mouse.down(10, 10);
    mouse.up(20, 20);

    expect(h.state.activeTool.type).toBe("rectangle");
  });

  it("should set custom tool", async () => {
    expect(h.state.activeTool.type).toBe("selection");
    act(() => {
      hidewhiteboardAPI.setActiveTool({ type: "custom", customType: "comment" });
    });
    expect(h.state.activeTool.type).toBe("custom");
    expect(h.state.activeTool.customType).toBe("comment");
  });
});
