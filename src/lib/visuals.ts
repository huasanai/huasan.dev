// 可视化 / 信息图页的清单。
// 每个 slug 对应 src/pages/visuals/<slug>.astro。
// 新增一张图时，在这里加一条（huasan-visual skill 会自动维护）。

export interface VisualMeta {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
}

export const VISUALS: VisualMeta[] = [
  {
    slug: 'civilization-map',
    title: '欧洲与亚洲文明发展脉络及关键转折点',
    description: '两条并列的文明线：欧洲从三条源流到一体化，亚洲以中华文明为主线从多元起源到 2001。含 24 个关键转折点、对照观察、最少书单与核校说明。',
    date: '2026-09-03',
  },
  {
    slug: 'one-person-ai-startup',
    title: '一人公司 AI 创业：需求判断力与杠杆解',
    description: '主矛盾不是全栈技术，而是需求判断力。6 个学习层级、杠杆解、真需求评分表与 7 天验证行动指南。',
    date: '2026-06-08',
  },
];
