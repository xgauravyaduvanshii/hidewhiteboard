import { DefaultSidebar, Sidebar } from "@hidewhiteboard/hidewhiteboard";
import { messageCircleIcon } from "@hidewhiteboard/hidewhiteboard/components/icons";
import { usehidewhiteboardSetAppState } from "@hidewhiteboard/hidewhiteboard/components/App";
import { useUIAppState } from "@hidewhiteboard/hidewhiteboard/context/ui-appState";
import { useEffect, useRef } from "react";

import { AIAgentPanel } from "./AIAgentPanel";

import "./AppSidebar.scss";

export const AppSidebar = () => {
  const { openSidebar } = useUIAppState();
  const setAppState = usehidewhiteboardSetAppState();
  const wasSidebarOpenRef = useRef(false);

  useEffect(() => {
    const isDefaultSidebarOpen = openSidebar?.name === "default";
    const openedThisTick = isDefaultSidebarOpen && !wasSidebarOpenRef.current;

    if (
      openedThisTick &&
      (openSidebar?.tab == null || openSidebar.tab === "library")
    ) {
      setAppState({
        openSidebar: {
          name: "default",
          tab: "comments",
        },
      });
    }

    wasSidebarOpenRef.current = isDefaultSidebarOpen;
  }, [openSidebar, setAppState]);

  return (
    <DefaultSidebar>
      <DefaultSidebar.TabTriggers>
        <Sidebar.TabTrigger
          tab="comments"
          style={{
            order: -1,
            opacity: openSidebar?.tab === "comments" ? 1 : 0.4,
          }}
        >
          {messageCircleIcon}
        </Sidebar.TabTrigger>
      </DefaultSidebar.TabTriggers>
      <Sidebar.Tab tab="comments">
        <AIAgentPanel />
      </Sidebar.Tab>
      <Sidebar.Tab tab="presentation" className="px-3">
        <AIAgentPanel />
      </Sidebar.Tab>
    </DefaultSidebar>
  );
};
