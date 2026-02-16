import { useState, useLayoutEffect } from "react";

import { THEME } from "@hidewhiteboard/common";

import { useEditorInterface, usehidewhiteboardContainer } from "../components/App";
import { useUIAppState } from "../context/ui-appState";

export const useCreatePortalContainer = (opts?: {
  className?: string;
  parentSelector?: string;
}) => {
  const [div, setDiv] = useState<HTMLDivElement | null>(null);

  const editorInterface = useEditorInterface();
  const { theme } = useUIAppState();

  const { container: hidewhiteboardContainer } = usehidewhiteboardContainer();

  useLayoutEffect(() => {
    if (div) {
      div.className = "";
      div.classList.add("hidewhiteboard", ...(opts?.className?.split(/\s+/) || []));
      div.classList.toggle(
        "hidewhiteboard--mobile",
        editorInterface.formFactor === "phone",
      );
      div.classList.toggle("theme--dark", theme === THEME.DARK);
    }
  }, [div, theme, editorInterface.formFactor, opts?.className]);

  useLayoutEffect(() => {
    const container = opts?.parentSelector
      ? hidewhiteboardContainer?.querySelector(opts.parentSelector)
      : document.body;

    if (!container) {
      return;
    }

    const div = document.createElement("div");

    container.appendChild(div);

    setDiv(div);

    return () => {
      container.removeChild(div);
    };
  }, [hidewhiteboardContainer, opts?.parentSelector]);

  return div;
};
