import type {
  hidewhiteboardElement,
  OrderedhidewhiteboardElement,
} from "@hidewhiteboard/element/types";

import type { CaptureUpdateActionType } from "@hidewhiteboard/element";

import type {
  AppClassProperties,
  AppState,
  hidewhiteboardProps,
  BinaryFiles,
  UIAppState,
} from "../types";
import type React from "react";

export type ActionSource =
  | "ui"
  | "keyboard"
  | "contextMenu"
  | "api"
  | "commandPalette";

/** if false, the action should be prevented */
export type ActionResult =
  | {
      elements?: readonly hidewhiteboardElement[] | null;
      appState?: Partial<AppState> | null;
      files?: BinaryFiles | null;
      captureUpdate: CaptureUpdateActionType;
      replaceFiles?: boolean;
    }
  | false;

type ActionFn<TData = any> = (
  elements: readonly OrderedhidewhiteboardElement[],
  appState: Readonly<AppState>,
  formData: TData | undefined,
  app: AppClassProperties,
) => ActionResult | Promise<ActionResult>;

export type UpdaterFn = (res: ActionResult) => void;
export type ActionFilterFn = (action: Action) => void;

export type ActionName =
  | "copy"
  | "cut"
  | "paste"
  | "copyAsPng"
  | "copyAsSvg"
  | "copyText"
  | "sendBackward"
  | "bringForward"
  | "sendToBack"
  | "bringToFront"
  | "copyStyles"
  | "selectAll"
  | "pasteStyles"
  | "gridMode"
  | "zenMode"
  | "objectsSnapMode"
  | "stats"
  | "changeStrokeColor"
  | "changeBackgroundColor"
  | "changeFillStyle"
  | "changeStrokeWidth"
  | "changeStrokeShape"
  | "changeSloppiness"
  | "changeStrokeStyle"
  | "changeArrowhead"
  | "changeArrowType"
  | "changeArrowProperties"
  | "changeOpacity"
  | "changeFontSize"
  | "undo"
  | "redo"
  | "finalize"
  | "changeProjectName"
  | "changeExportBackground"
  | "changeExportEmbedScene"
  | "changeExportScale"
  | "saveToActiveFile"
  | "saveFileToDisk"
  | "loadScene"
  | "duplicateSelection"
  | "deleteSelectedElements"
  | "changeViewBackgroundColor"
  | "clearCanvas"
  | "zoomIn"
  | "zoomOut"
  | "resetZoom"
  | "zoomToFit"
  | "zoomToFitSelection"
  | "zoomToFitSelectionInViewport"
  | "changeFontFamily"
  | "changeTextAlign"
  | "changeVerticalAlign"
  | "toggleFullScreen"
  | "toggleShortcuts"
  | "group"
  | "ungroup"
  | "goToCollaborator"
  | "addToLibrary"
  | "changeRoundness"
  | "alignTop"
  | "alignBottom"
  | "alignLeft"
  | "alignRight"
  | "alignVerticallyCentered"
  | "alignHorizontallyCentered"
  | "distributeHorizontally"
  | "distributeVertically"
  | "flipHorizontal"
  | "flipVertical"
  | "viewMode"
  | "exportWithDarkMode"
  | "toggleTheme"
  | "increaseFontSize"
  | "decreaseFontSize"
  | "unbindText"
  | "hyperlink"
  | "bindText"
  | "unlockAllElements"
  | "toggleElementLock"
  | "toggleLinearEditor"
  | "toggleEraserTool"
  | "toggleHandTool"
  | "selectAllElementsInFrame"
  | "removeAllElementsFromFrame"
  | "updateFrameRendering"
  | "setFrameAsActiveTool"
  | "setEmbeddableAsActiveTool"
  | "createContainerFromText"
  | "wrapTextInContainer"
  | "commandPalette"
  | "autoResize"
  | "elementStats"
  | "searchMenu"
  | "copyElementLink"
  | "linkToElement"
  | "cropEditor"
  | "wrapSelectionInFrame"
  | "toggleLassoTool"
  | "toggleShapeSwitch"
  | "togglePolygon";

export type PanelComponentProps = {
  elements: readonly hidewhiteboardElement[];
  appState: AppState;
  updateData: <T = any>(formData?: T) => void;
  appProps: hidewhiteboardProps;
  data?: Record<string, any>;
  app: AppClassProperties;
  renderAction: (
    name: ActionName,
    data?: PanelComponentProps["data"],
  ) => React.JSX.Element | null;
};

export interface Action<TData = any> {
  name: ActionName;
  label:
    | string
    | ((
        elements: readonly hidewhiteboardElement[],
        appState: Readonly<AppState>,
        app: AppClassProperties,
      ) => string);
  keywords?: string[];
  icon?:
    | React.ReactNode
    | ((
        appState: UIAppState,
        elements: readonly hidewhiteboardElement[],
      ) => React.ReactNode);
  PanelComponent?: React.FC<PanelComponentProps>;
  perform: ActionFn<TData>;
  keyPriority?: number;
  keyTest?: (
    event: React.KeyboardEvent | KeyboardEvent,
    appState: AppState,
    elements: readonly hidewhiteboardElement[],
    app: AppClassProperties,
  ) => boolean;
  predicate?: (
    elements: readonly hidewhiteboardElement[],
    appState: AppState,
    appProps: hidewhiteboardProps,
    app: AppClassProperties,
  ) => boolean;
  checked?: (appState: Readonly<AppState>) => boolean;
  trackEvent:
    | false
    | {
        category:
          | "toolbar"
          | "element"
          | "canvas"
          | "export"
          | "history"
          | "menu"
          | "collab"
          | "hyperlink"
          | "search_menu"
          | "shape_switch";
        action?: string;
        predicate?: (
          appState: Readonly<AppState>,
          elements: readonly hidewhiteboardElement[],
          value: any,
        ) => boolean;
      };
  /** if set to `true`, allow action to be performed in viewMode.
   *  Defaults to `false` */
  viewMode?: boolean;
}
