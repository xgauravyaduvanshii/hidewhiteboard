import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

import "../hidewhiteboard-app/sentry";

import HidewhiteboardApp from "./App";

window.__HIDEWHITEBOARD_SHA__ = import.meta.env.VITE_APP_GIT_SHA;
const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);
registerSW();
root.render(
  <StrictMode>
    <HidewhiteboardApp />
  </StrictMode>,
);
