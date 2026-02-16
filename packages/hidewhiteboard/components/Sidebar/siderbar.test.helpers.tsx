import React from "react";

import { Hidewhiteboard } from "../../index";
import {
  GlobalTestState,
  queryByTestId,
  render,
  withhidewhiteboardDimensions,
} from "../../tests/test-utils";

export const assertSidebarDockButton = async <T extends boolean>(
  hasDockButton: T,
): Promise<
  T extends false
    ? { dockButton: null; sidebar: HTMLElement }
    : { dockButton: HTMLElement; sidebar: HTMLElement }
> => {
  const sidebar =
    GlobalTestState.renderResult.container.querySelector<HTMLElement>(
      ".sidebar",
    );
  expect(sidebar).not.toBe(null);
  const dockButton = queryByTestId(sidebar!, "sidebar-dock");
  if (hasDockButton) {
    expect(dockButton).not.toBe(null);
    return { dockButton: dockButton!, sidebar: sidebar! } as any;
  }
  expect(dockButton).toBe(null);
  return { dockButton: null, sidebar: sidebar! } as any;
};

export const asserthidewhiteboardWithSidebar = async (
  sidebar: React.ReactNode,
  name: string,
  test: () => void,
) => {
  await render(
    <Hidewhiteboard initialData={{ appState: { openSidebar: { name } } }}>
      {sidebar}
    </Hidewhiteboard>,
  );
  await withhidewhiteboardDimensions({ width: 1920, height: 1080 }, test);
};
