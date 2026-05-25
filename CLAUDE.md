# huasan.dev — AI 协作必读

> 这是画伞的个人站。任何 AI（Claude Code、Codex CLI 等）在这个仓库工作前**必须读完这份文档**。
> 历史踩坑记录在 vault 里：`~/Documents/HuaSan-LifeOS/03-Projects/huasan-blog/`。

## 站点定位

- 个人写作 + 项目展览
- Astro + GitHub Pages 静态部署（main 分支推送自动部署）
- 域名：huasan.dev / www.huasan.dev
- 文章：`src/content/writing/*.md`，项目：`src/content/projects/*.md`
- 维护手册（人读）：`~/Documents/HuaSan-LifeOS/03-Projects/huasan-blog/huasan.dev-更新维护手册.md`

## 🔥 铁律：含中文的 mermaid 必须客户端渲染

**永远不要在这个仓库装 `rehype-mermaid` / `playwright` / `astro-mermaid` 这类 SSR mermaid 方案。**

### Why（2026-05-25 已踩 5 轮坑才修好）

- CI（GitHub Actions ubuntu-latest）没有 CJK 字体
- `rehype-mermaid` 用 playwright SSR 时 `measureText()` 对中文返回 fallback 宽度（远窄于真实）
- mermaid 把这个**错误的 width** 烙死在 SVG `<rect width="...">` 属性里
- 用户浏览器用 PingFang SC 渲染时，真实字宽 >> 烙的 rect 宽 → **文字溢出框**
- 这是 **SSR 测量环境 ≠ 用户渲染环境** 的死结
- **任何 CSS 都修不了** —— 数据已经写死

### 决定性 commit

`63ce1fb refactor(mermaid): switch from SSR to client-side render (obsidian style)`

### 当前正确架构

- `astro.config.mjs` 里有 `rehypeMermaidToDiv` 插件，把 ` ```mermaid ` 代码块改写成 `<div class="mermaid">源码</div>`
- `src/layouts/Layout.astro` 底部有客户端脚本，lazy import mermaid，初始化主题，wrap 进 `.mermaid-scroll`，run() 渲染
- 字体 inherit 仓耳今楷 → PingFang SC 系统栈
- `useMaxWidth: false` 保自然尺寸，容器 `overflow-x: auto` 横向滚

### 看到 mermaid 文字溢出框？

**第一反应不是改 CSS。** 检查顺序：

1. devtools 选中 `<rect>`，看 width 是死像素值还是 CSS 控制 —— 如果是死像素值，说明哪里又在 SSR，**停下来查 build pipeline**
2. 不要试图用 `word-break: break-word` / `overflow-wrap: anywhere` —— 中文里这等于每字成断点，会把单列窄图压成 1 字/行
3. 不要试图用 `width: 100%` 把宽图缩到容器 —— 会把字压小到看不清
4. 不要装任何 SSR mermaid 包"重新试一次" —— 已经踩过了

## 上传新文章流程

文章放 `src/content/writing/<slug>.md`，frontmatter schema 在 `src/content.config.ts`。

可用字段：
- 必填：`title`, `pubDate`
- 常用：`description`, `tags`, `cover`, `heroQuote`, `heroQuoteSrc`
- 文章 hero 默认用 `heroQuote` + `heroQuoteSrc`（古诗词 + 出处），未填则 fallback 到 `src/lib/quotes.ts` 的 `CURRENT_QUOTE`
- `cover` 路径如 `/images/writing/<slug>/cover.png`，图片放 `public/images/writing/<slug>/`

文章里可以放 ` ```mermaid ` 代码块，会被客户端 mermaid 自动渲染。**不需要任何额外配置。**

## 视觉/主题约束

- 暖色调（米黄底 + 暖灰文字 + 橙色 accent）
- 中文字体：仓耳今楷 W04（仓库自带 `/jinkai.css`）
- 英文字体：JetBrains Mono（Google Fonts）
- mermaid 主题色已在 Layout.astro `themeVariables` 配好，**不要随意改**

## CI / 部署

- `.github/workflows/deploy.yml` 跑 `npm ci` + `npm run build` + 推 GitHub Pages
- **不要再加 "Install Playwright Chromium" 步骤**（之前为 SSR mermaid 加的，已删，再加 = 退回死路）
- build 时间应在 1 分钟内，超过说明有问题

## 关于真名

公开发布内容（文章、frontmatter、commit message、网站文案）**只用"画伞"**，不写真名。
私有文件（这个 CLAUDE.md 包含）不受限。

## 维护手册和踩坑记录

- 维护手册（怎么上传文章/项目/RSS/API）：`~/Documents/HuaSan-LifeOS/03-Projects/huasan-blog/huasan.dev-更新维护手册.md`
- mermaid 踩坑全过程：`~/Documents/HuaSan-LifeOS/03-Projects/huasan-blog/mermaid-踩坑记录.md`
- 当前会话进度（如有）：`~/Documents/HuaSan-LifeOS/03-Projects/huasan-blog/runbook.md`
