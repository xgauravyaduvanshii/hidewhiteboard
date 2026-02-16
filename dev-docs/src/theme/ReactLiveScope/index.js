import React from "react";
import ExecutionEnvironment from "@docusaurus/ExecutionEnvironment";
import initialData from "@site/src/initialData";
import { useColorMode } from "@docusaurus/theme-common";

import "@hidewhiteboard/hidewhiteboard/index.css";

let hidewhiteboardComp = {};
if (ExecutionEnvironment.canUseDOM) {
  hidewhiteboardComp = require("@hidewhiteboard/hidewhiteboard");
}
const hidewhiteboard = React.forwardRef((props, ref) => {
  if (!window.HIDEWHITEBOARD_ASSET_PATH) {
    window.HIDEWHITEBOARD_ASSET_PATH =
      "https://esm.sh/@hidewhiteboard/hidewhiteboard@0.18.0/dist/prod/";
  }

  const { colorMode } = useColorMode();
  return <hidewhiteboardComp.hidewhiteboard theme={colorMode} {...props} ref={ref} />;
});
// Add react-live imports you need here
const hidewhiteboardScope = {
  React,
  ...React,
  hidewhiteboard,
  Footer: hidewhiteboardComp.Footer,
  useDevice: hidewhiteboardComp.useDevice,
  MainMenu: hidewhiteboardComp.MainMenu,
  WelcomeScreen: hidewhiteboardComp.WelcomeScreen,
  LiveCollaborationTrigger: hidewhiteboardComp.LiveCollaborationTrigger,
  Sidebar: hidewhiteboardComp.Sidebar,
  exportToCanvas: hidewhiteboardComp.exportToCanvas,
  initialData,
  useI18n: hidewhiteboardComp.useI18n,
  convertTohidewhiteboardElements: hidewhiteboardComp.convertTohidewhiteboardElements,
  CaptureUpdateAction: hidewhiteboardComp.CaptureUpdateAction,
};

export default hidewhiteboardScope;
