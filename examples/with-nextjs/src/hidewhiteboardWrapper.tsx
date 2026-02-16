"use client";
import * as hidewhiteboardLib from "@hidewhiteboard/hidewhiteboard";
import { Hidewhiteboard } from "@hidewhiteboard/hidewhiteboard";

import "@hidewhiteboard/hidewhiteboard/index.css";

import App from "../../with-script-in-browser/components/ExampleApp";

const hidewhiteboardWrapper: React.FC = () => {
  return (
    <>
      <App
        appTitle={"hidewhiteboard with Nextjs Example"}
        useCustom={(api: any, args?: any[]) => {}}
        hidewhiteboardLib={hidewhiteboardLib}
      >
        <Hidewhiteboard />
      </App>
    </>
  );
};

export default hidewhiteboardWrapper;
