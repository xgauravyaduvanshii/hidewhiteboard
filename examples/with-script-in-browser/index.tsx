import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@hidewhiteboard/hidewhiteboard/index.css";

import type * as Thidewhiteboard from "@hidewhiteboard/hidewhiteboard";

import App from "./components/ExampleApp";

declare global {
  interface Window {
    hidewhiteboardLib: typeof Thidewhiteboard;
  }
}

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
const { hidewhiteboard: Hidewhiteboard } = window.hidewhiteboardLib;
root.render(
  <StrictMode>
    <App
      appTitle={"hidewhiteboard Example"}
      useCustom={(api: any, args?: any[]) => {}}
      hidewhiteboardLib={window.hidewhiteboardLib}
    >
      <Hidewhiteboard />
    </App>
  </StrictMode>,
);
