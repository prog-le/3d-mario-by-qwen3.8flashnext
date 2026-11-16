# Super Mushroom Sprint · 3D 平台跳跃

一个可直接在现代浏览器里玩的 3D 马里奥风格平台跳跃游戏：程序化生成的浮空赛道、金币与 `?` 方块、踩踏连击、星星无敌、检查点与终点旗，外加开始/暂停/结算界面和本地排行榜。**零外部素材**——贴图、模型、音效、BGM 全部由代码生成，构建结果是单个 HTML 文件。

> **项目由来**：本项目最初由 [arena.ai](https://arena.ai) 用**一句话提示词**一次性生成（原始提示词见下），随后在本地针对实际游玩中暴露的问题做了多轮修复与增强。本仓库收录的是**本地优化后的当前版本**，而非 arena.ai 的初始产物。

## 原始提示词（arena.ai）

```text
Build a polished, playable browser game: 3d mario . Make the core loop fun within the first ten seconds, with tight controls for both keyboard and touch, and juicy feedback — screen shake, particle effects, and satisfying animations. Include a start screen, a score system, pause and game-over states with instant restart, and a local high-score table. Style it with a cohesive visual theme and make sure it runs smoothly at 60fps on desktop and mobile.
```

一句话生成版已经具备：核心跑跳循环、键盘与触屏双套操控、屏幕震动/粒子/挤压拉伸动画、开始界面、计分、暂停与失败/通关结算、即时重开、本地高分榜，以及统一的街机视觉主题。

## 本地做过的优化

| 类别 | 内容 |
| --- | --- |
| 修复自动连跳 | 踩到缩进壳里的库巴会触发无限「蹦床」（龟壳原地不动，落下再弹，永不停止），改为任何接触都把壳踢滑出去、从上方踩只给小跳；并清理开局残留的跳跃缓冲、把受伤的垂直击飞改为以横向击退为主 |
| 第三人称镜头 | 原为固定朝向的轨道机位：只按 x 速度做少量提前量、z 向仅跟随 40%，横移/转向时容易把主角甩到画面边缘。改为**平滑跟随玩家移动方向的旋转镜头**，操控同步改为相对镜头（W 永远朝屏幕前方） |
| 新增第一视角 | 按 `C` 键、点 HUD 眼睛按钮或触屏相机按钮切换；相机置于头部高度、自动隐藏主角模型与地面投影、FOV 加宽 |
| 工程化 | 补齐 `vite-env.d.ts`（Vite 类型）、`.gitignore`、dev 专用调试句柄 `window.__game`（仅 `import.meta.env.DEV` 下存在，正式构建不含） |
| 验证 | `tsc --noEmit` + `vite build` 全绿；用 headless Chrome 探针实测：静止零自动起跳、单次跳跃严格一个弧线、镜头始终在身后、第一视角切换与隐藏主角正常 |

## 核心特性

- **每局一条新赛道**：xorshift32 种子化随机，串联 15–18 个主题段（草地、跳台断档、水管花园、砖块阵、石阶、云台、尖刺桥、山脊、弹簧塔），终点是经典阶梯 + 城堡旗杆；失败/结算可「重试同一种子」。
- **手感**：120 Hz 固定步长物理、土狼时间（coyote time）与跳跃缓冲、长按跳更高、旋转俯冲落地触发震波 SLAM、命中停顿（hit-stop）与慢动作、FOV 脉冲与镜头震动。
- **打击感**：InstancedMesh 粒子池、环形冲击波、飘字、金币抛物线、飘动的旗帜与云层，全部由代码绘制。
- **音频**：WebAudio 合成芯片音效 + 两首不同 BPM 的循环 BGM（菜单 / 游戏中），首次交互后才解锁，可一键静音。
- **进度系统**：金币、`?` 方块（金币 / 星 / 1UP）、检查点、星星无敌、踩踏连击倍率 ×2 ×3 ×5 ×8 ×12、通关的时间/剩余生命/金币奖励。
- **完整流程**：开始界面（冠军榜 + 操作说明 + 洗牌赛道）、HUD（分数/金币/进度/生命/计时/连击）、暂停、死亡与通关结算、成绩登榜。
- **移动端**：虚拟摇杆 + JUMP / SPIN / 相机按钮、`visualViewport` 适配、DPR 上限与实例化渲染控制开销。
- **零素材、单文件交付**：`vite-plugin-singlefile` 把 JS/CSS 内联进 `dist/index.html`，可直接双击打开或静态托管。

## 快速开始

**环境**：Node.js 20.19+ 或 22.12+（Vite 7 的要求；Node 22+ 更稳妥）、任意现代包管理器。

```bash
pnpm install        # 或 npm install
pnpm dev            # 开发服务器，默认 http://localhost:5173
```

浏览器打开终端给出的地址即可游玩。首次点击/按键后音频才会启动（浏览器自动播放策略）。

### 构建与预览

```bash
pnpm build          # 输出单个 dist/index.html（约 940 kB，gzip 约 253 kB）
pnpm preview        # 本地预览构建产物
```

`dist/index.html` 自包含，可直接用浏览器打开或部署到任意静态托管；字体走 Google Fonts CDN，离线时自动回退到系统字体。

## 操作

| 键盘 | 触屏 | 作用 |
| --- | --- | --- |
| `W A S D` / 方向键 | 左侧虚拟摇杆 | 相对镜头移动（W 朝屏幕前方） |
| `Space` / `Z` / `K` | **JUMP** | 跳跃，长按跳更高 |
| `Shift` / `X` / `J` | **SPIN** | 旋转攻击；空中下砸触发震波 SLAM |
| `C` | 右上角相机按钮 / HUD 眼睛按钮 | 切换第一 / 第三人称 |
| `P` / `Esc` | HUD 暂停按钮 | 暂停 |
| `M` | HUD 喇叭按钮 | 静音切换 |
| `Enter` | 界面按钮 | 开始 / 再来一局 / 继续 |
| `R` | 界面「Retry seed」/「Retry course」 | 重开同一条赛道（同一种子） |
| `Shift + R` | 界面「Run it again」/「New course」 | 换一条新赛道（新种子） |

> 结算界面会先要求把成绩记入本地排行榜；`Enter` / `R` 等快捷操作会自动完成登榜，避免漏记。

## 计分

| 事件 | 分数 |
| --- | --- |
| 金币 | 100 + 连拾递增加成（最多 +120），星星状态下 ×2 |
| 踩踏敌人 | 200 × 连击倍率（×2 ×3 ×5 ×8 ×12） |
| 顶 `?` 方块（金币） | 150；另可开出金币喷泉、星星、1UP（生命 +1） |
| 拾取星星 | 500 |
| 检查点 | 300 |
| 通关 | 3000 + 时间奖励 + 剩余生命 ×800 + 金币 ×25 |

排行榜保存在浏览器 `localStorage` 中（Top 8，仅本机可见），不上传服务器。

## 项目结构

```
.
├── README.md
├── index.html                 # 入口 HTML（字体预连接、meta）
├── package.json               # 依赖与 dev / build / preview 脚本
├── vite.config.ts             # React + Tailwind + 单文件打包，@ → src 别名
├── tsconfig.json              # strict TS，noEmit
├── src/
│   ├── vite-env.d.ts          # Vite 客户端类型声明
│   ├── main.tsx               # React 挂载
│   ├── App.tsx                # 界面编排、HUD 状态桥接、成绩登榜、全局快捷键
│   ├── index.css              # Tailwind 主题、面板/按钮/动画
│   ├── ui/                    # StartScreen / Hud（含触屏控制）/ Overlays / bits
│   ├── utils/cn.ts
│   └── game/
│       ├── engine.ts          # Game 类：渲染循环、物理、碰撞、敌人、相机、流程状态机
│       ├── level.ts           # 种子化关卡生成器（11 个关卡段变体 + 终点区）
│       ├── constants.ts       # 物理调参、配色、分值
│       ├── rng.ts             # xorshift32 + seed 标签
│       ├── models.ts          # 方块拼的低模角色/敌人/旗杆/星星
│       ├── textures.ts        # Canvas 生成的像素贴图 + 世界级 UV 平铺
│       ├── fx.ts              # 粒子池、飘字、震动、闪屏
│       ├── audio.ts           # WebAudio 合成音效与 BGM
│       └── storage.ts         # 本地排行榜、名字、计时格式化
└── tools/                     # 关卡 QA 脚本（用 bun/tsx 直接跑 .ts）
    ├── levelcheck.ts          # 250 个 seed：NaN、断档、敌人落地、规模统计
    ├── gapcheck.ts            # 300 个 seed：超过 4.4 的不可跳断档
    ├── enemycheck.ts          # 300 个 seed：敌人是否悬浮
    └── dump.ts                # 打印指定 X 区间内的方块/敌人/金币布局
```

QA 脚本示例（需安装依赖后，用 `bun` 或 `npx tsx` 运行 TypeScript）：

```bash
bun tools/levelcheck.ts
bun tools/dump.ts 12345 0 30
```

## 技术实现要点

- **渲染**：Three.js `WebGLRenderer` + `PerspectiveCamera`，`InstancedMesh` 批量绘制金币/云/粒子；`BoxGeometry` UV 按世界尺寸平铺以保持贴图清晰；无阴影贴图，靠 blob shadow 与光照营造层次。
- **物理**：AABB 碰撞 + SLAB=6 的空间哈希网格，逐轴推出与台阶辅助（step-up），尖刺单独作为 hazard 处理；敌人含 walk / shell / slide / dead 状态机，滑行龟壳可连锁击杀。
- **循环**：`requestAnimationFrame` 驱动，物理以 `1/120` 固定步长追帧（单帧最多补 5 步），渲染与 HUD 独立节流；hit-stop / 慢动作只缩放模拟时间，不阻塞渲染。
- **状态机**：`menu → playing →（paused / dying / dead / clearing）→ clear`，React 侧按 `phase` 切换界面，游戏逻辑与 UI 通过 `onHud` / `onEnd` 回调单向通信。
- **技术栈**：React 19、Three.js 0.187、TypeScript 5.9、Vite 7、Tailwind CSS 4、lucide-react、`vite-plugin-singlefile`。

## 许可

尚未声明开源许可证；如需复用请先联系仓库所有者。

---

仓库：<https://github.com/prog-le/3d-mario-by-qwen3.8flashnext>
