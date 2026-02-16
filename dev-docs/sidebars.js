/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: "category",
      label: "Introduction",
      link: {
        type: "doc",
        id: "introduction/get-started",
      },
      items: ["introduction/development", "introduction/contributing"],
    },
    {
      type: "category",
      label: "Codebase",
      items: ["codebase/json-schema", "codebase/frames"],
    },
    {
      type: "category",
      label: "@hidewhiteboard/hidewhiteboard",
      collapsed: false,
      items: [
        "@hidewhiteboard/hidewhiteboard/installation",
        "@hidewhiteboard/hidewhiteboard/integration",
        "@hidewhiteboard/hidewhiteboard/customizing-styles",
        {
          type: "category",
          label: "API",
          link: {
            type: "doc",
            id: "@hidewhiteboard/hidewhiteboard/api/api-intro",
          },
          items: [
            {
              type: "category",
              label: "Props",
              link: {
                type: "doc",
                id: "@hidewhiteboard/hidewhiteboard/api/props/props",
              },
              items: [
                "@hidewhiteboard/hidewhiteboard/api/props/initialdata",
                "@hidewhiteboard/hidewhiteboard/api/props/hidewhiteboard-api",
                "@hidewhiteboard/hidewhiteboard/api/props/render-props",
                "@hidewhiteboard/hidewhiteboard/api/props/ui-options",
              ],
            },
            {
              type: "category",
              label: "Children Components",
              link: {
                type: "doc",
                id: "@hidewhiteboard/hidewhiteboard/api/children-components/children-components-intro",
              },
              items: [
                "@hidewhiteboard/hidewhiteboard/api/children-components/main-menu",
                "@hidewhiteboard/hidewhiteboard/api/children-components/welcome-screen",
                "@hidewhiteboard/hidewhiteboard/api/children-components/sidebar",
                "@hidewhiteboard/hidewhiteboard/api/children-components/footer",
                "@hidewhiteboard/hidewhiteboard/api/children-components/live-collaboration-trigger",
              ],
            },
            {
              type: "category",
              label: "Utils",
              link: {
                type: "doc",
                id: "@hidewhiteboard/hidewhiteboard/api/utils/utils-intro",
              },
              items: [
                "@hidewhiteboard/hidewhiteboard/api/utils/export",
                "@hidewhiteboard/hidewhiteboard/api/utils/restore",
              ],
            },
            "@hidewhiteboard/hidewhiteboard/api/constants",
            "@hidewhiteboard/hidewhiteboard/api/hidewhiteboard-element-skeleton",
          ],
        },
        "@hidewhiteboard/hidewhiteboard/faq",
        "@hidewhiteboard/hidewhiteboard/development",
      ],
    },
    {
      type: "category",
      label: "@hidewhiteboard/mermaid-to-hidewhiteboard",
      link: {
        type: "doc",
        id: "@hidewhiteboard/mermaid-to-hidewhiteboard/installation",
      },
      items: [
        "@hidewhiteboard/mermaid-to-hidewhiteboard/api",
        "@hidewhiteboard/mermaid-to-hidewhiteboard/development",
        {
          type: "category",
          label: "Codebase",
          link: {
            type: "doc",
            id: "@hidewhiteboard/mermaid-to-hidewhiteboard/codebase/codebase",
          },
          items: [
            {
              type: "category",
              label: "How Parser works under the hood?",
              link: {
                type: "doc",
                id: "@hidewhiteboard/mermaid-to-hidewhiteboard/codebase/parser/parser",
              },
              items: [
                "@hidewhiteboard/mermaid-to-hidewhiteboard/codebase/parser/flowchart",
              ],
            },
            "@hidewhiteboard/mermaid-to-hidewhiteboard/codebase/new-diagram-type",
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;
