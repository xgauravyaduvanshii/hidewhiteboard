# HideWhiteboard Docs (Docusaurus)

Developer and API documentation site for the HideWhiteboard monorepo.

## Structure

- `docs/`: markdown/mdx documentation content.
- `src/`: docs site pages/components/theme overrides.
- `static/`: static assets.
- `docusaurus.config.js`: site config.
- `sidebars.js`: docs navigation model.

For the docs content map, see `docs/README.md`.

## Prerequisites

- Node.js `>=16.14` (project root uses Node `>=18`, which also works)
- Yarn

## Install

```bash
yarn
```

## Local Development

```bash
yarn start
```

Default port is `3003`.

## Build and Serve

```bash
yarn build
yarn serve
```

## Useful Commands

```bash
yarn typecheck
yarn clear
yarn write-heading-ids
yarn write-translations
```

## Editing Docs

1. Add/update files under `docs/`.
2. Keep pages scoped by package/topic (`@hidewhiteboard/...`, `introduction/...`, `codebase/...`).
3. Update `sidebars.js` when adding new top-level pages.
4. Run `yarn start` and verify navigation + links.

## Deployment

```bash
USE_SSH=true yarn deploy
# or
GIT_USER=<your-github-user> yarn deploy
```
