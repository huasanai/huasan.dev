// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';

/**
 * Rehype plugin: convert ```mermaid code fences into <div class="mermaid">RAW SOURCE</div>
 * so that the client-side mermaid script can render them in the user's actual browser
 * (with the user's real CJK font), avoiding the SSR font-measurement mismatch that
 * causes node-rect overflow when build-time renders use a non-CJK fallback.
 */
function rehypeMermaidToDiv() {
  return (tree) => walk(tree);
}

function walk(parent) {
  if (!parent || !Array.isArray(parent.children)) return;
  parent.children = parent.children.map((child) => {
    if (isMermaidPre(child)) {
      const source = extractText(child).trim();
      return {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid'] },
        children: [{ type: 'text', value: source }],
      };
    }
    walk(child);
    return child;
  });
}

function isMermaidPre(node) {
  if (node?.type !== 'element' || node.tagName !== 'pre') return false;
  const code = (node.children || []).find(
    (c) => c?.type === 'element' && c.tagName === 'code'
  );
  if (!code) return false;
  const classes = code.properties?.className;
  const list = Array.isArray(classes) ? classes : classes ? [classes] : [];
  return list.some((c) => c === 'language-mermaid');
}

function extractText(node) {
  if (node?.type === 'text') return node.value || '';
  if (!Array.isArray(node?.children)) return '';
  return node.children.map(extractText).join('');
}

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
    // rehypeMermaidToDiv 必须在 expressive-code 之前生效，
    // 把 mermaid 代码块改写成 div，这样 expressive-code 不会去高亮它
    rehypePlugins: [rehypeMermaidToDiv],
  },
  build: {
    format: 'directory',
  },
});
