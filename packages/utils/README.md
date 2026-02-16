# @hidewhiteboard/utils

## Install

```bash
npm install @hidewhiteboard/utils
```

If you prefer Yarn over npm, use this command to install the hidewhiteboard utils package:

```bash
yarn add @hidewhiteboard/utils
```

## API

### `serializeAsJSON`

See [`serializeAsJSON`](https://github.com/xgauravyaduvanshii/hidewhiteboard/blob/master/src/packages/hidewhiteboard/README.md#serializeAsJSON) for API and description.

### `exportToBlob` (async)

Export an hidewhiteboard diagram to a [Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob).

### `exportToSvg`

Export an hidewhiteboard diagram to a [SVGElement](https://developer.mozilla.org/en-US/docs/Web/API/SVGElement).

## Usage

hidewhiteboard utils is published as a UMD (Universal Module Definition). If you are using a module bundler (for instance, Webpack), you can import it as an ES6 module:

```js
import { exportToSvg, exportToBlob } from "@hidewhiteboard/utils";
```

To use it in a browser directly:

```html
<script src="https://unpkg.com/@hidewhiteboard/utils@0.1.0/dist/hidewhiteboard-utils.min.js"></script>
<script>
  // hidewhiteboardUtils is a global variable defined by hidewhiteboard.min.js
  const { exportToSvg, exportToBlob } = hidewhiteboardUtils;
</script>
```

Here's the `exportToBlob` and `exportToSvg` functions in action:

```js
const hidewhiteboardDiagram = {
  type: "hidewhiteboard",
  version: 2,
  source: "https://github.com/xgauravyaduvanshii/hidewhiteboard",
  elements: [
    {
      id: "vWrqOAfkind2qcm7LDAGZ",
      type: "ellipse",
      x: 414,
      y: 237,
      width: 214,
      height: 214,
      angle: 0,
      strokeColor: "#000000",
      backgroundColor: "#15aabf",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      roundness: null,
      seed: 1041657908,
      version: 120,
      versionNonce: 1188004276,
      isDeleted: false,
      boundElementIds: null,
    },
  ],
  appState: {
    viewBackgroundColor: "#ffffff",
    gridSize: null,
  },
};

// Export the hidewhiteboard diagram as SVG string
const svg = exportToSvg(hidewhiteboardDiagram);
console.log(svg.outerHTML);

// Export the hidewhiteboard diagram as PNG Blob URL
(async () => {
  const blob = await exportToBlob({
    ...hidewhiteboardDiagram,
    mimeType: "image/png",
  });

  const urlCreator = window.URL || window.webkitURL;
  console.log(urlCreator.createObjectURL(blob));
})();
```
