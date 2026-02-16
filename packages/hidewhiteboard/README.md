# hidewhiteboard

**hidewhiteboard** is exported as a component to be directly embedded in your project.

## Installation

Use `npm` or `yarn` to install the package.

```bash
npm install react react-dom @hidewhiteboard/hidewhiteboard
# or
yarn add react react-dom @hidewhiteboard/hidewhiteboard
```

> **Note**: If you don't want to wait for the next stable release and try out the unreleased changes, use `@hidewhiteboard/hidewhiteboard@next`.

#### Self-hosting fonts

By default, hidewhiteboard will try to download all the used fonts from the [CDN](https://esm.run/@hidewhiteboard/hidewhiteboard/dist/prod).

For self-hosting purposes, you'll have to copy the content of the folder `node_modules/@hidewhiteboard/hidewhiteboard/dist/prod/fonts` to the path where your assets should be served from (i.e. `public/` directory in your project). In that case, you should also set `window.HIDEWHITEBOARD_ASSET_PATH` to the very same path, i.e. `/` in case it's in the root:

```js
<script>window.HIDEWHITEBOARD_ASSET_PATH = "/";</script>
```

### Dimensions of hidewhiteboard

hidewhiteboard takes _100%_ of `width` and `height` of the containing block so make sure the container in which you render hidewhiteboard has non zero dimensions.

## Demo

Go to [CodeSandbox](https://codesandbox.io/p/sandbox/github/hidewhiteboard/hidewhiteboard/tree/master/examples/with-script-in-browser) example.

## Integration

Head over to the [docs](https://github.com/xgauravyaduvanshii/hidewhiteboard/docs/@hidewhiteboard/hidewhiteboard/integration).

## API

Head over to the [docs](https://github.com/xgauravyaduvanshii/hidewhiteboard/docs/@hidewhiteboard/hidewhiteboard/api).

## Contributing

Head over to the [docs](https://github.com/xgauravyaduvanshii/hidewhiteboard/docs/@hidewhiteboard/hidewhiteboard/contributing).
