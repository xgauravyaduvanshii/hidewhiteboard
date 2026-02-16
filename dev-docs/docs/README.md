# Documentation Map

This folder contains product, API, and codebase documentation for HideWhiteboard.

## Top-Level Sections

- `introduction/`
  - onboarding, contribution workflow, local development.
- `codebase/`
  - internal architecture docs and deep-dives.
- `@hidewhiteboard/hidewhiteboard/`
  - main editor package docs:
    - installation
    - integration
    - API (props, utilities, constants, child components)
    - customization and FAQ
- `@hidewhiteboard/mermaid-to-hidewhiteboard/`
  - converter package docs:
    - installation and API
    - parser internals and development notes
- `assets/`
  - screenshots/images used in docs.

## Authoring Conventions

- Use `.mdx` for interactive examples/components.
- Use `.md` for simple static pages.
- Keep page names descriptive and kebab-case.
- Prefer relative links within docs.
- Keep code samples minimal and runnable.

## Adding a New Doc Page

1. Create the page in the relevant section directory.
2. Add frontmatter/title if needed.
3. Add it to `../sidebars.js` so it appears in navigation.
4. Run docs locally (`yarn start` from `dev-docs/`) and verify links.
