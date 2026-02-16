<a href="https://github.com/xgauravyaduvanshii/hidewhiteboard" target="_blank" rel="noopener">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="https://hidewhiteboard.nyc3.cdn.digitaloceanspaces.com/github/hidewhiteboard_github_cover_2_dark.png"
    />
    <img
      alt="HideWhiteboard"
      src="https://hidewhiteboard.nyc3.cdn.digitaloceanspaces.com/github/hidewhiteboard_github_cover_2.png"
    />
  </picture>
</a>

<h1 align="center">HideWhiteboard</h1>

<p align="center">
  Open-source whiteboard monorepo for collaborative, hand-drawn style diagramming.<br />
  Built around the <code>@hidewhiteboard/hidewhiteboard</code> editor package.
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-2563eb.svg" /></a>
  <a href="https://www.npmjs.com/package/@hidewhiteboard/hidewhiteboard"><img alt="npm" src="https://img.shields.io/npm/v/@hidewhiteboard/hidewhiteboard" /></a>
  <img alt="Node >= 18" src="https://img.shields.io/badge/node-%3E%3D18-16a34a" />
  <img alt="Yarn 1.x" src="https://img.shields.io/badge/yarn-1.x-0ea5e9" />
  <a href="https://github.com/xgauravyaduvanshii/hidewhiteboard/issues"><img alt="PRs welcome" src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" /></a>
</p>

## Excalidraw Showcase

This project follows the same hand-drawn canvas philosophy and interaction model popularized by Excalidraw.

<p align="center">
  <img
    src="https://hidewhiteboard.nyc3.cdn.digitaloceanspaces.com/github%2Fproduct_showcase.png"
    alt="HideWhiteboard scene created in Excalidraw style"
  />
</p>

## Why HideWhiteboard

- Infinite whiteboard canvas with a hand-drawn visual style.
- Real-time collaboration architecture in `hidewhiteboard-app/`.
- Reusable packages for editor, elements, math, and utilities.
- Import/export flows for images, JSON scenes, and library content.
- Developer docs powered by Docusaurus in `dev-docs/`.

## Open Source First

- License: **MIT**.
- Contributions are welcome from the community.
- Issues, feature requests, and PRs are encouraged.

## Quick Links

- App: `hidewhiteboard-app/`
- Main package: `packages/hidewhiteboard/`
- Monorepo docs: `dev-docs/README.md`
- Docs content map: `dev-docs/docs/README.md`
- Examples: `examples/`

## Monorepo Structure

```text
hidewhiteboardfork/
├── hidewhiteboard-app/        # Web app (collab + product shell)
├── packages/
│   ├── common/                # Shared helpers/constants
│   ├── element/               # Element models and scene logic
│   ├── hidewhiteboard/        # Core React editor package
│   ├── math/                  # Geometry/math utilities
│   └── utils/                 # Export and utility helpers
├── dev-docs/                  # Docusaurus documentation site
└── examples/                  # Integration examples
```

## Getting Started

### Prerequisites

- Node.js `>=18`
- Yarn `1.22.x`

### Install and Run

```bash
yarn install
yarn start
```

Starts the app from `hidewhiteboard-app` in development mode.

## Developer Workflow

```bash
# Build app
yarn build

# Build all internal packages
yarn build:packages

# Full validation
yarn test:all

# Individual checks
yarn test:typecheck
yarn test:code
yarn test:app

# Auto-fix style/lint
yarn fix
```

## Use as an npm Package

```bash
npm install react react-dom @hidewhiteboard/hidewhiteboard
# or
yarn add react react-dom @hidewhiteboard/hidewhiteboard
```

## Contributing

1. Fork and create a feature branch.
2. Add code changes with tests/docs updates.
3. Run `yarn test:all`.
4. Open a PR with a clear summary.

## License

MIT
