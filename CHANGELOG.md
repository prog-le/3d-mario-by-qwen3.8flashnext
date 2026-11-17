# 更新日志

本项目的重要变更都会记录在此文件中。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的精神，并按「重要变更优先」排序。

## [0.2.0] - 2026-11-17

### 修复

- **关卡生成：金币不再埋进方块/石阶**。终点区的金币行原先结束在上升石阶处，导致部分金币生成在石阶方块内部；改为在石阶前收尾，并减少一粒。（`level.ts`）
- **关卡生成：Goomba 不再生成在管道里**。水管花园的敌人原先 z 轴散布 ±2.4，与管道（z ±1.9）重叠；收窄到中央走廊 ±0.9。（`level.ts`）
- **关卡生成：`?` 块不再与金币互相冲突**。原先 `?` 块会在 z 轴偏移 ±1.6，可能与管道上方的金币弧线重叠；改为固定居中的 z。（`level.ts`）
- **计分：HUD 金币总数计入 `?` 块内的金币**。`coinTotal` 现在把「coin = 1」「coins = 5」一并计入，避免收集数超过总数。（`level.ts`）
- **手感：同一步内踩敌后不再被第二个敌人扣血**。踩踏判定加了 `stomped` 守卫，避免落地瞬间被同屏另一个敌人重复伤害。（`engine.ts`）
- **手感：暂停/切屏后不再触发幽灵跳跃或旋转**。`setPhase` 现在两路都会清空 `jumpEdge`/`spinEdge` 缓冲。（`engine.ts`）
- **状态：重开/重建关卡时重置星星无敌与 FOV 脉冲**。`startRun` 清空 `star`、隐藏无敌光环、归零 `fovPulse`，`buildLevel` 清空 `starPickup`，避免带无敌/光环残留进入下一局。（`engine.ts`）
- **音频：停止 BGM 时淡出音乐总线**。`stopMusic` 用 `setTargetAtTime` 把 `musicGain` 淡出到 0 以静音已排程的尾音，启动时恢复；鼓点噪声改由音乐总线输出而非音效总线。（`audio.ts`）
- **输入：文本框内按键不再误触游戏**。`onKey` 与 App 快捷键都会跳过 `INPUT`/`TEXTAREA`，输入姓名时不会再触发跳跃/重开。（`engine.ts` / `App.tsx`）
- **结算：`Enter` 在姓名输入框内直接提交**。`App.tsx` 现在会在输入框内按 `Enter` 时调用 `submit()`，不会漏记成绩。（`App.tsx`）
- **显示：顶 `?` 块得分显示与实得一致**。`bonk` 飘字从 `+100` 改为 `+150`（与 `SCORE.BLOCK` 一致）。（`engine.ts`）
- **显示：击杀飘字移除无意义分支**。连击倍数 >1 与 =1 的飘字逻辑合并为统一的 `+分数`。（`engine.ts`）
- **移动端：虚拟摇杆改用区域局部坐标**。指针捕获后仍以摇杆区原点计算位移，长按拖拽方向更精准。（`Hud.tsx`）
- **移动端：结算界面不再在触屏设备弹虚拟键盘**。自动聚焦姓名输入框前先判断 `pointer: coarse`。（`Overlays.tsx`）
- **结算：TOP 徽章判定修正**。`newRecord` 增加 `rank > 0`，未入榜时不再误显「TOP」。（`Overlays.tsx`）
- **结算：提交按钮移除重复的 `onClick`**。按钮现在仅靠 `type="submit"` 触发表单提交，避免与 `onClick` 叠加导致成绩被重复登记。（`Overlays.tsx`）
- **数据：排行榜读取做全字段校验**。`loadScores()` 对每条记录的类型/有限性做兜底，脏数据不再导致渲染异常。（`storage.ts`）

### 新增

- **渲染健壮性：WebGL 上下文丢失可恢复**。构造函数包 try/catch，并监听 `webglcontextlost`（自动暂停并提示）与 `webglcontextrestored`（恢复后重设尺寸）。（`engine.ts`）
- **渲染细节：尖刺牙齿按 2D 网格铺满足迹**。尖刺视觉原先只沿 X 轴单排摆放，现在按整个 hazard 足迹的 `nx × nz` 网格铺满并加石头底座，使视觉与既有的完整伤害判定一致（碰撞箱本身未变）。（`engine.ts`）
- **音频健壮性：全流程容错**。`unlock()` 包 try/catch、`resume()` 捕获 reject；音频不可用时静默降级而非抛错。（`audio.ts`）
- **音频资源：新增 `dispose()`**。关闭 AudioContext、置空增益/噪声缓冲，随游戏卸载彻底释放。（`audio.ts`）
- **工程：新增 `CLAUDE.md`**。记录命令、架构与开发指引，供 AI 协作使用。
- **工程：新增本更新日志 `CHANGELOG.md`**。

### 性能

- **静态方块几何合并**。`buildLevel` 把除 `qblock`/`brick`/`crate`/`spike` 外的静态实体按材质合并为单个 `BufferGeometry`：每关约 75 个静态 draw call 降到约 6 个（实测 300 种子平均 5.8），显著降低渲染提交次数。（`engine.ts`）
- **HUD 状态去重**。`emit()` 用 `sameHud` 比较上次快照，无变化时跳过 `onHud`，减少每帧无谓的 React 重渲染。（`engine.ts`）
- **FX 覆盖层空闲跳过清屏**。没有飘字/闪屏时不再每帧 `clearRect`，只在脏时清一次。（`fx.ts`）
- **FX 复用颜色实例**。`burst`/`ring`/`trail` 共用模块级 `THREE.Color`，消除频繁 `new`。（`fx.ts`）
- **音频：噪声缓冲复用**。`noise()` 复用同一个 `AudioBuffer`，不再每次创建。（`audio.ts`）
- **音频：后台标签页恢复不爆发补奏**。BGM 定时器被节流后跳过错过的音符，而非一次性补奏。（`audio.ts`）
- **加载：Google Fonts 非阻塞**。字体样式表改为 `media="print"` + `onload` 切换，附 `<noscript>` 回退，不再阻塞首屏渲染。（`index.html`）

### 工程化

- **锁定包管理器**：`package.json` 增加 `"packageManager": "pnpm@9"`，与 `pnpm-lock.yaml`（lockfileVersion 9）对齐。
- **类型检查纳入 QA 脚本**：`tsconfig.json` 的 `include` 增加 `tools`，让 QA 脚本也受严格类型检查覆盖。
- **QA 脚本增强**：`levelcheck.ts` 修正敌人落地误报（改用 X 区间重叠判定），并新增「金币嵌块」「敌人嵌块」检测。
- **资源释放更彻底**：`dispose()` 现在会 `sound.dispose()`、移除 canvas 与覆盖层节点、`forceContextLoss()`；`disposeLevelMeshes()` 额外释放 `InstancedMesh`。（`engine.ts`）
- **调试句柄清理**：`App.tsx` 在卸载时于 DEV 模式下删除 `window.__game`。

## [0.1.0] - 2026-11-16

由 [arena.ai](https://arena.ai) 用一句话提示词生成的可玩版本，随后在本地完成第一轮修复与增强。

### 新增

- 完整的 3D 马里奥风格平台跳跃：程序化赛道、金币、`?` 方块、踩踏连击、星星无敌、检查点、终点旗。
- 开始/暂停/死亡/通关结算界面、本地 Top-8 排行榜。
- 键盘 + 触屏双套操控，屏幕震动/粒子/挤压拉伸动画等打击感反馈。
- 第三人称平滑跟随镜头，以及第一视角（隐藏主角模型与地面投影）。

### 修复

- **自动连跳**：踩到缩进壳里的龟会触发无限「蹦床」，改为任何接触都踢滑出去、上方踩只给小跳；清理开局残留跳跃缓冲；受伤击飞改为以横向击退为主。
- 第一轮工程化：补齐 `vite-env.d.ts`、`.gitignore`、DEV 专用调试句柄 `window.__game`。

### 变更

- 第三人称镜头从固定朝向改为平滑跟随玩家移动方向的旋转镜头，操控同步改为相对镜头。

---

完整历史见仓库提交记录：<https://github.com/prog-le/3d-mario-by-qwen3.8flashnext>
