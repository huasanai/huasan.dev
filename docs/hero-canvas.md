# Hero Canvas — 青山绿水 spotlight + 烟花 sparks

> 一个横幅 hero canvas：默认是暗夜中的青山轮廓，鼠标移过的地方点亮一圈山色，同时迸射出白色烟花。隐喻是「探索」——build in public 路上的一份氛围。

这是 huasan.dev 站点 hero 区域的最终方案（[实际效果](https://huasan.dev/about) — 移动到顶部 banner 上看 hover 效果）。本文记录设计决策、技术原理和完整可移植代码。如果你想给自己的网站做一个类似的 hero canvas，把这个文件发给你的 AI agent 就够了。

---

## 1. 设计目标

Hero canvas 不是页面主体，使命是：

- **0.5 秒传达品牌氛围**——访客一眼能感到"这站点有质感"
- **不抢戏**——不挡阅读、不诱发持续注意力，不和下方内容争夺
- **值得 2-3 秒探索**——hover 时有惊喜，让人停留一下再往下读

按这个标准评估几个常见 hero canvas 方向：

| 方向 | 视觉冲击 | 喧宾夺主风险 | 实现成本 |
|---|---|---|---|
| 纯静态背景图 | 中 | 低 | 极低 |
| 鼠标墨痕 / 涂鸦轨迹 | 中 | 低 | 中 |
| 粒子喷射 (tw93.fun 风) | 高 | 中 | 低 |
| 真实地球 / 地图 reveal | 高 | 高 (容易抢戏) | 高 (需地图数据) |
| 山水画 + 鼠标 spotlight | 中-高 | 低 (默认很 dim) | 中 |

最后选了**山水画 + spotlight reveal**，三个理由：

1. **跟整站气质一致**——hero quote 用《周易》古文 + 楷体，山水画是中国文化最 own 的视觉，连为一体
2. **"探索" 隐喻贴合**——光圈点亮黑暗，正好对应 "build in public 探索 AI-native" 这条主线
3. **天然 dim 状态自洽**——默认 94% 暗罩遮盖山水，本身就是 "夜晚 hero"，不会因为太亮抢走下方内容的注意

## 2. 视觉规格

### 颜色 palette

| 用途 | 颜色 | 备注 |
|---|---|---|
| Hero bg 兜底 | `#0F0E14` | 几乎纯黑，带一点蓝调 |
| Overlay (暗罩) | `rgba(15, 14, 20, x)` | 默认 alpha 0.94 |
| 远山 (浅青蓝雾色) | `rgb(120, 152, 172)` | 最远，最浅 |
| 中山 (青绿) | `rgb(74, 134, 108)` | 中间层 |
| 近山 (深墨绿) | `rgb(40, 78, 60)` | 最近，最深 |
| 蓝天 gradient | `rgba(155, 188, 210, 0.55)` → 0 | hero 顶部到 55% 高度淡出 |
| Sparks | `rgba(255, 255, 255, alpha)` | 纯白色，2.6-3.2px 半径 |

### 行为

- **Default**：整体 ~94% dim，山水只有 ~6% 可见，蓝天微微透出
- **Hover**：鼠标位置形成 200px 半径的 spotlight，soft radial falloff，光圈内 reveal 完整色彩
- **Sparks**：spotlight strength > 0.3 时，每帧从鼠标位置向各方向迸射 1-3 个白色粒子，700-1600ms 寿命，带 drag (`* 0.985 per frame`) 和微重力 (`vy += 0.025`)
- **离开**：spotlight strength 用线性插值平滑收回（factor 0.08/frame）

## 3. 三个核心技术

### 3.1 程序生成山脊 (1D hash noise)

不依赖 GeoJSON / SVG path / 第三方资源，纯用 hash 函数生成 deterministic 山脊。每条山脊是一个填充多边形，X 方向采样 noise 函数当 Y 偏移。

```ts
// 单值 hash：给定整数 n 返回 0-1 之间的 deterministic 伪随机数
function hashRand(n: number): number {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// 1D smooth noise：对相邻整数的 hashRand 做 smoothstep 插值
function noise1D(x: number, seed: number): number {
  const xi = Math.floor(x);
  const xf = x - xi;
  const a = hashRand(xi + seed * 1000);
  const b = hashRand(xi + 1 + seed * 1000);
  const t = xf * xf * (3 - 2 * xf);  // smoothstep
  return a * (1 - t) + b * t;
}

// Multi-octave 合成：3 个频率叠加，制造"自然"的山脊起伏
function ridgeNoise(x: number, layer: RidgeLayer): number {
  let n = noise1D(x * layer.frequency, layer.seed) * 1.0;
  n += noise1D(x * layer.frequency * 2.7, layer.seed + 5) * 0.5;
  n += noise1D(x * layer.frequency * 5.3, layer.seed + 13) * 0.25;
  return n / 1.75;  // 归一化到约 0-1
}
```

3 层山脊用不同的 `baseYRatio` / `amplitude` / `frequency` / `seed`：

```ts
const RIDGES = [
  { baseYRatio: 0.46, amplitude: 22, frequency: 0.006, colorRgb: '120, 152, 172', seed: 1 },   // 远山
  { baseYRatio: 0.64, amplitude: 32, frequency: 0.010, colorRgb: '74, 134, 108',  seed: 42 },  // 中山
  { baseYRatio: 0.84, amplitude: 42, frequency: 0.015, colorRgb: '40, 78, 60',    seed: 137 }, // 近山
];
```

绘制每层就是 `moveTo(0, h) → 沿 x 采样 noise → lineTo(w, h) → closePath → fill`。

### 3.2 Spotlight reveal (radial gradient overlay)

关键 trick：**不要逐像素计算 spotlight alpha**。用一个 radial gradient 填充的 overlay 一次性盖住整个 canvas，gradient 中心更透明、边缘更不透明。这样 GPU 一次合成完成，性能极好。

```ts
// 默认 dim 0.94，spotlight 全开时中心 0.05
const centerAlpha = OVERLAY_BASE_ALPHA - spotlightStrength * (OVERLAY_BASE_ALPHA - OVERLAY_CENTER_MIN);

const gradient = ctx.createRadialGradient(
  mouseX, mouseY, 0,
  mouseX, mouseY, SPOTLIGHT_RADIUS
);
gradient.addColorStop(0,    `rgba(15, 14, 20, ${centerAlpha})`);
gradient.addColorStop(0.55, `rgba(15, 14, 20, ${midAlpha})`);
gradient.addColorStop(1,    `rgba(15, 14, 20, ${OVERLAY_BASE_ALPHA})`);
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, w, h);
```

Spotlight 平滑收发用线性插值，每帧把 `spotlightStrength` 朝目标 (0 或 1) 拉近 8%：

```ts
const target = isInside ? 1 : 0;
spotlightStrength += (target - spotlightStrength) * 0.08;
```

### 3.3 烟花 sparks (粒子系统)

参考 tw93.fun 的 firework 思路，但改了几处：

- **向各方向迸射**（tw93 是向下飘）——用 `angle = random * 2π` + `vx/vy = cos/sin(angle) * speed`，每个粒子有随机方向初速度
- **drag + 微重力**——`vx *= 0.985`、`vy *= 0.985`、`vy += 0.025`，让粒子初速快、逐渐慢下来 + 微微下落
- **大颗粒纯白**——2.6 + (1-t) * 0.6 px 半径，alpha = (1-t) * 0.85，t 是寿命比例
- **只在 spotlight 强度 > 0.3 时 spawn**——保证默认无 hover 状态完全静止

```ts
function spawnSparks() {
  if (spotlightStrength < 0.3) return;
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.6 + Math.random() * 1.5;
    sparks.push({
      x: mouseX + (Math.random() - 0.5) * 12,
      y: mouseY + (Math.random() - 0.5) * 12,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.3,  // 初始略向上
      born: performance.now(),
      life: 700 + Math.random() * 900,
    });
  }
}
```

## 4. 性能优化

- **DPR clamp 到 2**——`Math.min(window.devicePixelRatio || 1, 2)`，避免高分屏 4x canvas 浪费
- **IntersectionObserver 暂停**——canvas 不可见时跳过 frame loop
- **`prefers-reduced-motion` 检测**——开了 reduce motion 的用户只看到静态山脊，无 sparks
- **MAX_SPARKS = 250 ceiling**——超出从队列前面 splice 掉
- **ResizeObserver**——父元素 resize 时重设 canvas 尺寸 + DPR transform

## 5. 可调参数 cheat sheet

```ts
const HERO_BG = '#0F0E14';                  // canvas bg 兜底色
const OVERLAY_RGB = '15, 14, 20';           // 暗罩颜色
const OVERLAY_BASE_ALPHA = 0.94;            // 默认 dim 程度 (越大越暗)
const OVERLAY_CENTER_MIN = 0.05;            // spotlight 中心最大 reveal alpha
const SPOTLIGHT_RADIUS = 200;               // 光圈半径 (px)
const SKY_RGB = '155, 188, 210';            // 蓝天颜色 (浅蓝灰)
const SKY_TOP_ALPHA = 0.55;                 // 蓝天顶部 alpha (0 = 关闭蓝天)
const MAX_SPARKS = 250;                     // sparks 数量上限

// RIDGES 数组每层：
// - baseYRatio: 山脊基线 (0-1 of canvas height)
// - amplitude:  山脊高度 (px)
// - frequency:  山脊横向密度 (越大山越细碎)
// - colorRgb:   山脊填充色
// - seed:       noise 种子 (改 seed 换山形)
```

## 6. 移植步骤

1. 复制 `src/components/InkCanvas.astro` 到你的 Astro 项目（其他框架同理，把 `<script>` 部分抽出来）
2. 在 hero 区域的 parent 容器（`position: relative`）内放 `<InkCanvas />`
3. parent 高度自定，建议横向 banner (e.g., 1440x260 类似 5.5:1 比例)
4. 配置常量改你想要的色彩 / 半径 / 山脊层数

## 7. 完整源码

完整 self-contained 单文件 (Astro 组件)：

```astro
---
// hero canvas: 程序生成青山绿水 + spotlight reveal + 烟花 sparks
// - 默认状态：山水几乎被深色 overlay 完全遮盖 (dim ~6% 可见)；hero 顶部有浅蓝天 gradient hint
// - 鼠标作为 spotlight (radius 200px, soft radial falloff)：半径内 reveal 出青绿山脊
// - 烟花 sparks：从光圈中心向各方向迸射白色大颗粒 (2.6-3.2px)，700-1600ms 寿命，drag + 微重力
// - 山脊用 hash-based 1D noise 程序生成，多 octave 合成，seed 固定 (刷新一致)
// - 深色 hero bg 兜底 (无论主题)
---

<canvas class="ink-canvas" data-ink-canvas></canvas>

<style>
  .ink-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }
</style>

<script>
  // ======== 配置 ========
  const HERO_BG = '#0F0E14';
  const OVERLAY_RGB = '15, 14, 20';
  const OVERLAY_BASE_ALPHA = 0.94;
  const OVERLAY_CENTER_MIN = 0.05;
  const SPOTLIGHT_RADIUS = 200;
  const SKY_RGB = '155, 188, 210';
  const SKY_TOP_ALPHA = 0.55;

  type RidgeLayer = {
    baseYRatio: number;
    amplitude: number;
    frequency: number;
    colorRgb: string;
    seed: number;
  };

  const RIDGES: RidgeLayer[] = [
    { baseYRatio: 0.46, amplitude: 22, frequency: 0.006, colorRgb: '120, 152, 172', seed: 1 },
    { baseYRatio: 0.64, amplitude: 32, frequency: 0.010, colorRgb: '74, 134, 108', seed: 42 },
    { baseYRatio: 0.84, amplitude: 42, frequency: 0.015, colorRgb: '40, 78, 60', seed: 137 },
  ];

  function hashRand(n: number): number {
    const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function noise1D(x: number, seed: number): number {
    const xi = Math.floor(x);
    const xf = x - xi;
    const a = hashRand(xi + seed * 1000);
    const b = hashRand(xi + 1 + seed * 1000);
    const t = xf * xf * (3 - 2 * xf);
    return a * (1 - t) + b * t;
  }

  function ridgeNoise(x: number, layer: RidgeLayer): number {
    let n = noise1D(x * layer.frequency, layer.seed) * 1.0;
    n += noise1D(x * layer.frequency * 2.7, layer.seed + 5) * 0.5;
    n += noise1D(x * layer.frequency * 5.3, layer.seed + 13) * 0.25;
    return n / 1.75;
  }

  type Spark = {
    x: number; y: number;
    vx: number; vy: number;
    born: number; life: number;
  };

  function initOne(canvas: HTMLCanvasElement) {
    const parent = canvas.parentElement;
    if (!parent) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;

    function resize() {
      const rect = parent!.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    new ResizeObserver(resize).observe(parent);

    let mouseX = -9999, mouseY = -9999;
    let isInside = false;
    let spotlightStrength = 0;

    parent.addEventListener('pointerenter', (e) => {
      isInside = true;
      const rect = parent!.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    parent.addEventListener('pointermove', (e) => {
      const rect = parent!.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    parent.addEventListener('pointerleave', () => {
      isInside = false;
    });

    const sparks: Spark[] = [];
    const MAX_SPARKS = 250;

    function spawnSparks() {
      if (spotlightStrength < 0.3) return;
      const count = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.6 + Math.random() * 1.5;
        sparks.push({
          x: mouseX + (Math.random() - 0.5) * 12,
          y: mouseY + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.3,
          born: performance.now(),
          life: 700 + Math.random() * 900,
        });
      }
      if (sparks.length > MAX_SPARKS) {
        sparks.splice(0, sparks.length - MAX_SPARKS);
      }
    }

    function drawSparks() {
      const now = performance.now();
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        const age = now - s.born;
        if (age > s.life) { sparks.splice(i, 1); continue; }
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.025;
        s.vx *= 0.985;
        s.vy *= 0.985;
        const t = age / s.life;
        const alpha = (1 - t) * 0.85;
        if (alpha < 0.02) continue;
        ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, 2.6 + (1 - t) * 0.6, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawRidges() {
      for (const layer of RIDGES) {
        const baseY = h * layer.baseYRatio;
        ctx!.fillStyle = `rgb(${layer.colorRgb})`;
        ctx!.beginPath();
        ctx!.moveTo(0, h + 2);
        for (let x = 0; x <= w; x += 3) {
          const n = ridgeNoise(x, layer);
          const y = baseY - n * layer.amplitude;
          ctx!.lineTo(x, y);
        }
        ctx!.lineTo(w, h + 2);
        ctx!.closePath();
        ctx!.fill();
      }
    }

    function drawOverlay() {
      const centerAlpha =
        OVERLAY_BASE_ALPHA - spotlightStrength * (OVERLAY_BASE_ALPHA - OVERLAY_CENTER_MIN);
      const midAlpha =
        OVERLAY_BASE_ALPHA - spotlightStrength * (OVERLAY_BASE_ALPHA - OVERLAY_CENTER_MIN) * 0.45;

      const gradient = ctx!.createRadialGradient(
        mouseX, mouseY, 0,
        mouseX, mouseY, SPOTLIGHT_RADIUS
      );
      gradient.addColorStop(0, `rgba(${OVERLAY_RGB}, ${centerAlpha})`);
      gradient.addColorStop(0.55, `rgba(${OVERLAY_RGB}, ${midAlpha})`);
      gradient.addColorStop(1, `rgba(${OVERLAY_RGB}, ${OVERLAY_BASE_ALPHA})`);
      ctx!.fillStyle = gradient;
      ctx!.fillRect(0, 0, w, h);
    }

    let isVisible = true;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        for (const e of entries) isVisible = e.isIntersecting;
      }, { threshold: 0 });
      observer.observe(canvas);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function frame() {
      requestAnimationFrame(frame);
      if (!isVisible) return;

      const target = isInside ? 1 : 0;
      spotlightStrength += (target - spotlightStrength) * 0.08;
      if (Math.abs(spotlightStrength - target) < 0.005) spotlightStrength = target;

      ctx!.clearRect(0, 0, w, h);

      // 1. Bg
      ctx!.fillStyle = HERO_BG;
      ctx!.fillRect(0, 0, w, h);

      // 2. 蓝天渐变
      const sky = ctx!.createLinearGradient(0, 0, 0, h * 0.55);
      sky.addColorStop(0, `rgba(${SKY_RGB}, ${SKY_TOP_ALPHA})`);
      sky.addColorStop(1, `rgba(${SKY_RGB}, 0)`);
      ctx!.fillStyle = sky;
      ctx!.fillRect(0, 0, w, h * 0.55);

      // 3. 山脊 (会被 overlay 几乎完全遮盖，spotlight 内 reveal)
      drawRidges();

      // 4. Overlay with radial spotlight cutout
      drawOverlay();

      // 5. Sparks (on top)
      if (!reducedMotion) {
        spawnSparks();
        drawSparks();
      }
    }
    frame();
  }

  function init() {
    document.querySelectorAll<HTMLCanvasElement>('canvas[data-ink-canvas]').forEach(initOne);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
</script>
```

## 8. 设计决策路径（迭代史）

第一版尝试是**深色地球 + 大湾区城市点 + 青绿连线**——还原参考图的"科技感地球"。问题暴露很快：

- Dark mode 下原 hero ribbon 翻转为浅色 "宣纸"，跟深色 canvas 完全冲突
- hero 高度 260px、大湾区地理范围窄，城市全挤一块、两侧空荡
- 没有地形纹理，只剩孤立的网格和连线，"地图感"不到位

诊断出根因：**为了 mirror 参考图，掉进了"还原"陷阱**。Hero canvas 的最高使命不是精确地图，是氛围 hint。

第二版换山水画方向，理由：
- 跟 hero quote 的《周易》+ 楷体气质同源
- 程序生成山脊不需要外部地图数据，文件零负担
- 默认大面积暗罩天然 dim，不抢戏
- spotlight 圆光对应"探索"叙事，比城市点的"信息密度"更克制

第三版（最终）：在 v2 上加大 sparks、改纯白、缩 spotlight、加蓝天 gradient。改完后视觉记忆点和品牌一致性都到位。

## License

整个项目 MIT。文档和代码可自由复制、修改、商用。
