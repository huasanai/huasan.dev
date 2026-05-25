// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import rehypeMermaid from 'rehype-mermaid';

export default defineConfig({
  site: 'https://huasan.dev',
  trailingSlash: 'never',
  integrations: [
    expressiveCode({
      themes: ['solarized-light'],
      customizeTheme(theme) {
        theme.colors['editor.background'] = '#FBF8F1';
        theme.colors['editor.foreground'] = '#3F3A32';
        theme.colors['editor.lineHighlightBackground'] = '#F4EAD9';
        theme.colors['editor.selectionBackground'] = '#E8D9BD';
        theme.colors['editorLineNumber.foreground'] = '#B6A58C';
        theme.colors['editorLineNumber.activeForeground'] = '#8F7D63';
        theme.colors['editorGroupHeader.tabsBackground'] = '#F2E9DA';
        theme.colors['tab.activeBackground'] = '#FBF8F1';
        theme.colors['tab.activeForeground'] = '#3F3A32';
        theme.colors['tab.activeBorderTop'] = '#E07B3D';
        theme.colors['titleBar.activeBackground'] = '#F2E9DA';
        theme.colors['titleBar.activeForeground'] = '#5E5549';
      },
      defaultProps: {
        wrap: false,
      },
      frames: {
        showCopyToClipboardButton: true,
      },
      styleOverrides: {
        borderRadius: '8px',
        borderColor: '#E8E0CA',
        codeFontFamily: "'JetBrains Mono', 'SF Mono', Menlo, monospace",
        codeFontSize: '0.875rem',
        codeLineHeight: '1.7',
        frames: {
          shadowColor: 'rgba(31, 30, 27, 0.08)',
        },
      },
    }),
  ],
  markdown: {
    rehypePlugins: [
      [
        rehypeMermaid,
        {
          strategy: 'inline-svg',
          colorScheme: 'light',
          mermaidConfig: {
            theme: 'base',
            themeVariables: {
              background: '#FBF8F1',
              primaryColor: '#F5EFE3',
              primaryTextColor: '#2F2C27',
              primaryBorderColor: '#D8C7AA',
              lineColor: '#A9A095',
              secondaryColor: '#FFF8EC',
              tertiaryColor: '#F4E4D4',
              fontFamily: 'Arial, sans-serif',
            },
          },
        },
      ],
    ],
  },
  build: {
    format: 'directory',
  },
});
