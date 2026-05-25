// @ts-check
import { defineConfig } from 'astro/config';
import expressiveCode from 'astro-expressive-code';
import rehypeMermaid from 'rehype-mermaid';

const MERMAID_VIEWBOX_PADDING = 32;

function rehypeMermaidScroll() {
  return (tree) => {
    wrapMermaidSvgChildren(tree);
  };
}

function wrapMermaidSvgChildren(parent) {
  if (!parent || !Array.isArray(parent.children)) return;

  parent.children = parent.children.map((child) => {
    if (isMermaidSvg(child)) {
      usePaddedIntrinsicSvgSize(child);
      allowForeignObjectOverflow(child);
      child.properties.className = [
        ...toClassList(child.properties.className),
        'mermaid-svg',
      ];

      return {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid-scroll'] },
        children: [child],
      };
    }

    wrapMermaidSvgChildren(child);
    return child;
  });
}

function isMermaidSvg(node) {
  const id = node?.properties?.id;
  return node?.type === 'element' && node.tagName === 'svg' && typeof id === 'string' && id.startsWith('mermaid-');
}

function usePaddedIntrinsicSvgSize(svg) {
  // 关键：保留 mermaid 自己设的 max-width 行为，只加 viewBox padding。
  // 不要再硬写 width/height 像素属性 —— 那会让 SVG 失去响应式，溢出容器。
  // 用 max-width(自然尺寸) + width:100% + height:auto：
  //   narrow 图（单列）维持自然尺寸（CSS 再用 margin auto 居中）
  //   wide 图自动缩到容器宽度
  const viewBox = String(svg.properties.viewBox || svg.properties.viewbox || '');
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);

  let naturalWidth = null;

  if (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 0 &&
    height > 0
  ) {
    const paddedWidth = width + MERMAID_VIEWBOX_PADDING * 2;
    const paddedHeight = height + MERMAID_VIEWBOX_PADDING * 2;
    const paddedViewBox = [
      x - MERMAID_VIEWBOX_PADDING,
      y - MERMAID_VIEWBOX_PADDING,
      paddedWidth,
      paddedHeight,
    ].join(' ');
    svg.properties.viewBox = paddedViewBox;
    svg.properties.viewbox = paddedViewBox;
    naturalWidth = Math.ceil(paddedWidth);
  }

  // 删除任何旧的像素 width/height 属性（mermaid + rehype-mermaid 都可能写）
  delete svg.properties.width;
  delete svg.properties.height;

  // SVG 自适应：naturalWidth 上限，超窄不拉伸，超宽缩到容器
  svg.properties.style = naturalWidth
    ? `max-width: ${naturalWidth}px; width: 100%; height: auto; overflow: visible;`
    : 'max-width: 100%; height: auto; overflow: visible;';
}

function toClassList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/\s+/).filter(Boolean);
  return [];
}

function allowForeignObjectOverflow(node) {
  if (!node || node.type !== 'element') return;

  if (String(node.tagName).toLowerCase() === 'foreignobject') {
    node.properties = node.properties || {};
    node.properties.style = appendStyle(node.properties.style, 'overflow: visible');
  }

  if (Array.isArray(node.children)) {
    node.children.forEach(allowForeignObjectOverflow);
  }
}

function appendStyle(value, declaration) {
  const style = typeof value === 'string' ? value.trim() : '';
  const property = declaration.split(':')[0].trim();
  if (style.split(';').some((part) => part.trim().startsWith(`${property}:`))) return style;
  return `${style ? `${style.replace(/;$/, '')}; ` : ''}${declaration};`;
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
    rehypePlugins: [
      [
        rehypeMermaid,
        {
          strategy: 'inline-svg',
          colorScheme: 'light',
          mermaidConfig: {
            theme: 'base',
            flowchart: {
              htmlLabels: true,
              useMaxWidth: true,
              wrappingWidth: 220,
              padding: 12,
              nodeSpacing: 50,
              rankSpacing: 60,
              curve: 'basis',
            },
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
      rehypeMermaidScroll,
    ],
  },
  build: {
    format: 'directory',
  },
});
