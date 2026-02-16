import {
  HelpIcon,
  eyeIcon,
  share,
  settingsIcon,
} from "@hidewhiteboard/hidewhiteboard/components/icons";
import { MainMenu } from "@hidewhiteboard/hidewhiteboard/index";
import React from "react";

import { isDevEnv } from "@hidewhiteboard/common";

import type { Theme } from "@hidewhiteboard/element/types";

import { LanguageList } from "../app-language/LanguageList";

import { saveDebugState } from "./DebugCanvas";

type ToolbarSide = "top" | "bottom" | "left" | "right";

const sideIcon = (side: ToolbarSide) => {
  if (side === "top") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect x="5" y="6" width="14" height="3" rx="1" fill="currentColor" />
      </svg>
    );
  }
  if (side === "bottom") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect x="5" y="15" width="14" height="3" rx="1" fill="currentColor" />
      </svg>
    );
  }
  if (side === "left") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <rect x="5" y="6" width="3" height="12" rx="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <rect x="16" y="6" width="3" height="12" rx="1" fill="currentColor" />
    </svg>
  );
};

export const AppMainMenu: React.FC<{
  onShareDialogOpen: () => void;
  onHelpDialogOpen: () => void;
  onLLMSettingsOpen: () => void;
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  toolbarSide: ToolbarSide;
  setToolbarSide: (side: ToolbarSide) => void;
  refresh: () => void;
}> = React.memo((props) => {
  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.Item
        icon={share}
        onSelect={props.onShareDialogOpen}
        shortcut="Alt+S"
      >
        Share
      </MainMenu.Item>
      <MainMenu.Item
        icon={HelpIcon}
        onSelect={props.onHelpDialogOpen}
        shortcut="?"
      >
        Help
      </MainMenu.Item>
      <MainMenu.DefaultItems.ClearCanvas />
      <MainMenu.Separator />
      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onSelect={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.Sub>
        <MainMenu.Sub.Trigger icon={settingsIcon}>
          Settings
        </MainMenu.Sub.Trigger>
        <MainMenu.Sub.Content className="app-settings-submenu">
          <MainMenu.DefaultItems.Preferences />
          <MainMenu.DefaultItems.ToggleTheme
            allowSystemTheme
            theme={props.theme}
            onSelect={props.setTheme}
          />
          <MainMenu.ItemCustom>
            <LanguageList style={{ width: "100%" }} />
          </MainMenu.ItemCustom>
          <MainMenu.DefaultItems.ChangeCanvasBackground />
          <MainMenu.Item onSelect={props.onLLMSettingsOpen}>
            LLM Settings
          </MainMenu.Item>
          <MainMenu.ItemCustom>
            <div className="app-settings-toolbar-side">
              <label className="app-settings-toolbar-side__label">
                Toolbar side
              </label>
              <div className="app-settings-toolbar-side__choices">
                {(["top", "bottom", "left", "right"] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    className={`app-settings-toolbar-side__button ${
                      props.toolbarSide === side
                        ? "app-settings-toolbar-side__button--active"
                        : ""
                    }`}
                    onClick={() => props.setToolbarSide(side)}
                    title={side}
                    aria-label={side}
                  >
                    {sideIcon(side)}
                  </button>
                ))}
              </div>
            </div>
          </MainMenu.ItemCustom>
        </MainMenu.Sub.Content>
      </MainMenu.Sub>
    </MainMenu>
  );
});
