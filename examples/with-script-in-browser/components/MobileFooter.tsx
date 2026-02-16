import React from "react";

import type * as Thidewhiteboard from "@hidewhiteboard/hidewhiteboard";
import type { hidewhiteboardImperativeAPI } from "@hidewhiteboard/hidewhiteboard/types";

import CustomFooter from "./CustomFooter";

const MobileFooter = ({
  hidewhiteboardAPI,
  hidewhiteboardLib,
}: {
  hidewhiteboardAPI: hidewhiteboardImperativeAPI;
  hidewhiteboardLib: typeof Thidewhiteboard;
}) => {
  const { useEditorInterface, Footer } = hidewhiteboardLib;

  const editorInterface = useEditorInterface();
  if (editorInterface.formFactor === "phone") {
    return (
      <Footer>
        <CustomFooter
          hidewhiteboardAPI={hidewhiteboardAPI}
          hidewhiteboardLib={hidewhiteboardLib}
        />
      </Footer>
    );
  }
  return null;
};
export default MobileFooter;
