export type Quote = { text: string; src: string };

// 当前展示在 hero 的句子。改这里 = 永久更换访客看到的句子。
export const CURRENT_QUOTE: Quote = {
  text: '路漫漫其修遠兮，吾將上下而求索',
  src: '屈原《離騷》',
};

// 候选库：owner 在浏览器按 S 键可在本地循环预览，挑好后把那句替换 CURRENT_QUOTE 即可。
export const QUOTES_POOL: Quote[] = [
  { text: '路漫漫其修遠兮，吾將上下而求索', src: '屈原《離騷》' },
  { text: '工欲善其事，必先利其器', src: '《論語·衛靈公》' },
  { text: '千里之行，始於足下', src: '老子《道德經》' },
  { text: '學而時習之，不亦說乎', src: '《論語·學而》' },
  { text: '君子和而不同', src: '《論語·子路》' },
  { text: '知己知彼，百戰不殆', src: '《孫子兵法·謀攻》' },
  { text: '兵者，國之大事', src: '《孫子兵法·始計》' },
  { text: '致廣大而盡精微', src: '《中庸》' },
  { text: '格物致知，知行合一', src: '王陽明' },
  { text: '獨善其身，兼濟天下', src: '《孟子·盡心上》' },
  { text: '不畏浮雲遮望眼，自緣身在最高層', src: '王安石《登飛來峰》' },
];
