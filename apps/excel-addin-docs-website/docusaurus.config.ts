import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Excel Platform',
  tagline: 'Angular Excel Add-in with Nx Monorepo',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // GitHub Pages deployment
  url: 'https://erikplachta.github.io',
  baseUrl: '/excel-extension/',
  organizationName: 'ErikPlachta',
  projectName: 'excel-extension',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'warn',

  markdown: {
    format: 'detect', // Use 'detect' to allow .md files to be parsed as regular markdown
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    [
      'docusaurus-plugin-typedoc',
      {
        id: 'api',
        entryPoints: [
          '../../libs/shared/types/src/index.ts',
          '../../libs/shared/ui/src/index.ts',
          '../../libs/shared/util/src/index.ts',
          '../../libs/core/auth/src/index.ts',
          '../../libs/core/telemetry/src/index.ts',
          '../../libs/core/settings/src/index.ts',
          '../../libs/core/excel/src/index.ts',
          '../../libs/office/excel/src/index.ts',
          '../../libs/office/common/src/index.ts',
          '../../libs/data/query/src/index.ts',
          '../../libs/data/api/src/index.ts',
          '../../libs/data/storage/src/index.ts',
        ],
        entryPointStrategy: 'expand',
        tsconfig: '../../tsconfig.base.json',
        out: 'docs/api',
        excludePrivate: true,
        excludeInternal: true,
        skipErrorChecking: true,
        readme: 'none', // Don't include root README
        // Use code blocks for type signatures to avoid MDX parsing issues
        useCodeBlocks: true,
        expandObjects: true,
        parametersFormat: 'table',
        tableColumnSettings: {
          hideDefaults: true,
          hideInherited: true,
          hideSources: true,
        },
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Docs at root
          editUrl: 'https://github.com/ErikPlachta/excel-extension/tree/main/apps/excel-addin-docs-website/',
        },
        blog: false, // Disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Excel Platform',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/ErikPlachta/excel-extension',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/getting-started' },
            { label: 'Architecture', to: '/architecture/STORAGE-ARCHITECTURE' },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/ErikPlachta/excel-extension',
            },
            {
              label: 'Changelog',
              to: '/category/changelog',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Excel Platform. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'typescript', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
