import React from "react";

import { Hidewhiteboard, MainMenu } from "../../index";
import { render, queryAllByTestId } from "../../tests/test-utils";

describe("Test internal component fallback rendering", () => {
  it("should render only one menu per hidewhiteboard instance (custom menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Hidewhiteboard>
          <MainMenu>test</MainMenu>
        </Hidewhiteboard>
        <Hidewhiteboard />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".hidewhiteboard-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per hidewhiteboard instance (default menu first scenario)", async () => {
    const { container } = await render(
      <div>
        <Hidewhiteboard />
        <Hidewhiteboard>
          <MainMenu>test</MainMenu>
        </Hidewhiteboard>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".hidewhiteboard-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per hidewhiteboard instance (two custom menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Hidewhiteboard>
          <MainMenu>test</MainMenu>
        </Hidewhiteboard>
        <Hidewhiteboard>
          <MainMenu>test</MainMenu>
        </Hidewhiteboard>
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".hidewhiteboard-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });

  it("should render only one menu per hidewhiteboard instance (two default menus scenario)", async () => {
    const { container } = await render(
      <div>
        <Hidewhiteboard />
        <Hidewhiteboard />
      </div>,
    );

    expect(queryAllByTestId(container, "main-menu-trigger")?.length).toBe(2);

    const excalContainers = container.querySelectorAll<HTMLDivElement>(
      ".hidewhiteboard-container",
    );

    expect(
      queryAllByTestId(excalContainers[0], "main-menu-trigger")?.length,
    ).toBe(1);
    expect(
      queryAllByTestId(excalContainers[1], "main-menu-trigger")?.length,
    ).toBe(1);
  });
});
