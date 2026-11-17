import { makeRng, type Rng } from "./rng";

export type SolidKind = "grass" | "dirtblock" | "brick" | "stone" | "pipe" | "cloud" | "crate" | "qblock" | "sand" | "spike" | "goal";

export interface SolidDef {
  cx: number;
  cy: number;
  cz: number;
  sx: number;
  sy: number;
  sz: number;
  kind: SolidKind;
  q?: number; // index into qblocks
  tile?: number;
}

export interface CoinDef {
  x: number;
  y: number;
  z: number;
}

export interface EnemyDef {
  x: number;
  y: number;
  z: number;
  kind: "goomba" | "koopa" | "flyer";
  range: number;
  phase: number;
}

export type QContent = "coin" | "coins" | "star" | "oneup" | "points";

export interface QBlockDef {
  content: QContent;
}

export interface LevelData {
  solids: SolidDef[];
  coins: CoinDef[];
  enemies: EnemyDef[];
  qblocks: QBlockDef[];
  checkpoints: { x: number; y: number; z: number }[];
  spawn: { x: number; y: number; z: number };
  flag: { x: number; y: number; z: number };
  endX: number;
  coinTotal: number;
  length: number;
}

/* ---------------------------------------------------------------- helpers */

const GROUND_T = 1.8;

function clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

class Builder {
  solids: SolidDef[] = [];
  coins: CoinDef[] = [];
  enemies: EnemyDef[] = [];
  qblocks: QBlockDef[] = [];
  checkpoints: { x: number; y: number; z: number }[] = [];

  constructor(public rng: Rng) {}

  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, kind: SolidKind, q?: number) {
    this.solids.push({ cx, cy, cz, sx, sy, sz, kind, q, tile: kind === "qblock" || kind === "brick" || kind === "crate" ? 1 : 1.6 });
  }

  /** Ground platform whose TOP surface sits at `top`. */
  plat(x0: number, x1: number, top: number, z0: number, z1: number, kind: SolidKind = "grass", thick = GROUND_T) {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    this.box(cx, top - thick / 2, cz, x1 - x0, thick, z1 - z0, kind);
  }

  block(cx: number, bottom: number, cz: number, size: number, kind: SolidKind, q?: number) {
    this.box(cx, bottom + size / 2, cz, size, size, size, kind, q);
  }

  coin(x: number, y: number, z: number) {
    this.coins.push({ x, y, z });
  }

  coinRow(x0: number, x1: number, y: number, z: number, n: number) {
    for (let i = 0; i < n; i++) this.coin(x0 + ((x1 - x0) * i) / Math.max(1, n - 1), y, z);
  }

  coinArc(x0: number, x1: number, y0: number, y1: number, z: number, n = 5, peak = 1.5) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      const x = x0 + (x1 - x0) * t;
      const base = y0 + (y1 - y0) * t;
      this.coin(x, base + 0.85 + Math.sin(Math.PI * t) * peak, z);
    }
  }

  coinRing(cx: number, y: number, cz: number, r: number, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.coin(cx + Math.cos(a) * r, y + Math.sin(a * 2) * 0.25, cz + Math.sin(a) * r);
    }
  }

  goomba(x: number, y: number, z: number, range: number) {
    this.enemies.push({ x, y, z, kind: "goomba", range, phase: this.rng.range(0, 6.28) });
  }
  koopa(x: number, y: number, z: number, range: number) {
    this.enemies.push({ x, y, z, kind: "koopa", range, phase: this.rng.range(0, 6.28) });
  }
  flyer(x: number, y: number, z: number, range: number) {
    this.enemies.push({ x, y, z, kind: "flyer", range, phase: this.rng.range(0, 6.28) });
  }

  /** question block with loot */
  qblock(cx: number, bottom: number, cz: number, content: QContent) {
    const id = this.qblocks.length;
    this.qblocks.push({ content });
    this.block(cx, bottom, cz, 1.05, "qblock", id);
  }
}

/* --------------------------------------------------------------- chunks */

type Ctx = { b: Builder; x: number; y: number; z: number; d: number; W: number };

function difficulty(i: number, total: number) {
  return clamp(i / total, 0, 1);
}

function meadow({ b, x, y, z, d, W }: Ctx, len: number, coinHeavy = false) {
  b.plat(x, x + len, y, z - W / 2, z + W / 2, "grass");
  const n = coinHeavy ? 6 : b.rng.int(2, 4);
  b.coinRow(x + 2, x + len - 2, y + 0.95, z, n);
  if (coinHeavy && b.rng.chance(0.7)) b.coinRow(x + 2.6, x + len - 2.6, y + 0.95, z + 1.7, Math.max(2, n - 2));
  if (b.rng.chance(0.55)) {
    const bx = x + len * b.rng.range(0.35, 0.6);
    const kind: QContent = b.rng.chance(0.12 * (1 + d)) ? "star" : b.rng.chance(0.15) ? "oneup" : b.rng.chance(0.4) ? "coins" : "coin";
    b.qblock(bx, y + 2.25, z + (b.rng.chance(0.5) ? 1.5 : -1.4), kind);
    if (b.rng.chance(0.6)) b.block(bx + 1.1, y + 2.25, z + (kind === "coin" ? 1.5 : -1.4), 1.02, "brick");
    if (b.rng.chance(0.4)) b.block(bx - 1.1, y + 2.25, z + (kind === "coin" ? 1.5 : -1.4), 1.02, "brick");
  }
  const enemies = b.rng.int(0, d > 0.55 ? 3 : 2);
  for (let i = 0; i < enemies; i++) {
    const ex = x + 3 + (len - 5) * ((i + 0.5) / enemies);
    b.rng.chance(0.3 + d * 0.2) ? b.koopa(ex, y + 0.6, z + b.rng.range(-1.6, 1.6), 2.2) : b.goomba(ex, y + 0.5, z + b.rng.range(-1.6, 1.6), 2.2);
  }
  return { x: x + len, y, z };
}

function hopGaps({ b, x, y, z, d, W }: Ctx) {
  let cx = x;
  let cy = y;
  let cz = z;
  const n = b.rng.int(3, 5);
  for (let i = 0; i < n; i++) {
    const len = b.rng.range(2.9, 3.9);
    const w = clamp(W - i * 0.7, 4.8, 7.6);
    b.plat(cx, cx + len, cy, cz - w / 2, cz + w / 2, "grass");
    b.coin(cx + len / 2, cy + 1, cz);
    if (b.rng.chance(0.3 + d * 0.4) && len > 3.2) b.goomba(cx + len / 2, cy + 0.5, cz, Math.max(0.7, len / 2 - 1.3));
    const g = clamp(b.rng.range(2.3, 3.0) + d * 1.5, 2.2, 4.3);
    b.coinArc(cx + len, cx + len + g, cy, cy, cz, 3, 1.05);
    cx += len + g;
    cy = clamp(cy + b.rng.range(-0.9, 0.95), 0, 4.2);
    cz = clamp(cz + b.rng.range(-1.1, 1.1), -3.2, 3.2);
  }
  b.plat(cx, cx + 5.5, cy, cz - W / 2 - 0.6, cz + W / 2 + 0.6, "grass");
  return { x: cx + 5.5, y: cy, z: cz };
}

function staircase({ b, x, y, z, W }: Ctx, up = true) {
  // a symmetrical stone hill: always starts AND ends at the incoming height
  const n = b.rng.int(3, 4);
  const rise = 0.85;
  const stepLen = 1.7;
  const top = y + n * rise;
  b.plat(x, x + 2, y, z - W / 2, z + W / 2, "grass");
  let cx = x + 2;
  for (let i = 0; i < n; i++) {
    const sy = y + (i + 1) * rise;
    b.box(cx + stepLen / 2, sy - 2.2, z, stepLen, 4.4, W * 0.8, "stone");
    b.coin(cx + stepLen / 2, sy + 0.95, z + W * 0.26);
    cx += stepLen;
  }
  b.plat(cx, cx + 3.6, top, z - W / 2 + 0.6, z + W / 2 - 0.6, "stone", 4.4);
  b.coinRow(cx + 0.5, cx + 3.1, top + 1, z, 3);
  if (b.rng.chance(0.65)) b.goomba(cx + 1.8, top + 0.5, z - 1.2, 1.2);
  if (!up && b.rng.chance(0.5)) b.koopa(cx + 1.8, top + 0.6, z + 1.2, 1.1);
  cx += 3.6;
  for (let i = 0; i < n; i++) {
    const sy = top - (i + 1) * rise;
    b.box(cx + stepLen / 2, sy - 2.2, z, stepLen, 4.4, W * 0.8, "stone");
    if (!up) b.coin(cx + stepLen / 2, sy + 0.95, z - W * 0.26);
    cx += stepLen;
  }
  b.plat(cx, cx + 4, y, z - W / 2, z + W / 2, "grass");
  return { x: cx + 4, y, z };
}

function pipeGarden({ b, x, y, z, d, W }: Ctx) {
  const len = b.rng.range(10, 12.5);
  b.plat(x, x + len, y, z - W / 2, z + W / 2, "grass");
  const count = b.rng.int(2, 3);
  for (let i = 0; i < count; i++) {
    const h = [1.5, 2.4, 3.2][b.rng.int(0, 2)];
    const px = x + 2.2 + i * (len - 4) / Math.max(1, count - 1);
    const pz = z + (i % 2 === 0 ? -1.9 : 1.9);
    b.box(px, y + h / 2, pz, 1.95, h, 1.95, "pipe");
    if (b.rng.chance(0.8)) b.coin(px, y + h + 1.05, pz);
    if (i > 0 && b.rng.chance(0.5)) b.coinArc(px - (len - 4) / Math.max(1, count - 1), px, y, y + h, pz, 3, 0.8);
  }
  const enemies = b.rng.int(1, d > 0.5 ? 3 : 2);
  // keep goombas in the clear center corridor (pipes sit at z ±1.9) so none spawn inside a pipe
  for (let i = 0; i < enemies; i++) b.goomba(x + 3 + i * 2.6, y + 0.5, z + b.rng.range(-0.9, 0.9), 1.9);
  // center z keeps the block clear of the pipes and their floating coins
  if (b.rng.chance(0.5)) b.qblock(x + len - 1.6, y + 2.25, z, "coins");
  return { x: x + len, y, z };
}

function blockLine({ b, x, y, z, d, W }: Ctx) {
  const len = b.rng.range(9, 11.5);
  b.plat(x, x + len, y, z - W / 2, z + W / 2, "grass");
  const n = b.rng.int(4, 6);
  const startX = x + len / 2 - (n * 1.05) / 2 + 0.5;
  const upper = y + 2.35;
  for (let i = 0; i < n; i++) {
    const bx = startX + i * 1.05;
    const r = b.rng.next();
    if (r < 0.16 + d * 0.05) b.qblock(bx, upper, z, "star");
    else if (r < 0.3) b.qblock(bx, upper, z, "coins");
    else if (r < 0.42) b.qblock(bx, upper, z, "oneup");
    else if (r < 0.66) b.qblock(bx, upper, z, "coin");
    else b.block(bx, upper, z, 1.02, b.rng.chance(0.25) ? "crate" : "brick");
  }
  b.goomba(x + len / 2 - 1, y + 0.5, z + 1.4, 2.6);
  if (d > 0.4) b.koopa(x + len / 2 + 2, y + 0.6, z - 1.4, 2.6);
  b.coinRow(startX - 1.2, startX + (n - 1) * 1.05 + 1.2, upper + 1.35, z, Math.min(4, n));
  return { x: x + len, y, z };
}

function cloudFloat({ b, x, y, z, W }: Ctx) {
  const n = b.rng.int(4, 5);
  let cx = x;
  let cy = y;
  let cz = z;
  for (let i = 0; i < n; i++) {
    const w = b.rng.range(2.4, 3.2);
    b.box(cx + w / 2, cy + 0.35 - 0.35, cz, w, 0.72, w * 1.15, "cloud");
    b.coin(cx + w / 2, cy + 1.15, cz);
    if (i === n - 2 && b.rng.chance(0.5)) b.flyer(cx + w / 2, cy + 2.2, cz + 2.4, 1.8);
    const g = b.rng.range(2.5, 3.4);
    cx += w + g;
    cy = clamp(cy + b.rng.range(-0.6, 1.15), 0.2, 4.6);
    cz = clamp(cz + b.rng.range(-1.6, 1.6), -3.4, 3.4);
  }
  const landY = clamp(y + b.rng.range(-0.5, 0.5), 0, 4);
  b.plat(cx, cx + 6, landY, z - W / 2, z + W / 2, "grass");
  b.coinArc(cx - 3.4, cx + 1.5, cy, landY, z, 4, 1.2);
  return { x: cx + 6, y: landY, z };
}

function spikeBridge({ b, x, y, z, d, W }: Ctx) {
  b.plat(x, x + 2.6, y, z - W / 2, z + W / 2, "grass");
  const s0 = x + 2.6;
  const s1 = s0 + 8.6;
  b.box((s0 + s1) / 2, y - 0.35, z, s1 - s0, 0.7, 3.3, "stone");
  const nSpikes = b.rng.int(2, 3 + Math.round(d * 2));
  for (let i = 0; i < nSpikes; i++) {
    const t = (i + 0.5) / nSpikes;
    const sxp = s0 + 1.4 + t * (s1 - s0 - 2.8);
    const w = b.rng.range(1.0, 1.7);
    b.box(sxp, y + 0.3, z, w, 0.6, 3.1, "spike");
  }
  b.coinRow(s0 + 1.2, s1 - 1.2, y + 2.05, z, 4);
  const x2 = s1 + 2.7;
  b.box((s1 + x2) / 2, y - GROUND_T / 2, z, x2 - s1, GROUND_T, W * 0.9, "sand");
  b.goomba(x2 - 1.3, y + 0.5, z + 1, 1.3);
  if (d > 0.35) b.koopa(x2 - 1.3, y + 0.6, z - 1, 1.3);
  b.plat(x2, x2 + 4.2, y, z - W / 2, z + W / 2, "grass");
  return { x: x2 + 4.2, y, z };
}

function springTower({ b, x, y, z, W }: Ctx) {
  const steps = b.rng.int(3, 4);
  b.plat(x, x + 2.4, y, z - W / 2, z + W / 2, "grass");
  let cx = x + 2.4;
  let cy = y;
  for (let i = 0; i < steps; i++) {
    cy = Math.min(y + (i + 1) * 1.15, 4.9);
    b.plat(cx, cx + 2.6, cy, z - 2.5, z + 2.5, "brick", 2.6);
    b.coin(cx + 1.3, cy + 1, z + 1.3);
    b.qblock(cx + 1.3, cy + 2.3, z - 1.3, i === steps - 1 ? "star" : b.rng.chance(0.4) ? "coins" : "coin");
    cx += 2.6;
  }
  const top = cy;
  b.plat(cx, cx + 3.4, top, z - W / 2 + 0.4, z + W / 2 - 0.4, "grass", 2.4);
  b.coinRing(cx + 1.7, top + 1.7, z, 2.2, 7);
  if (b.rng.chance(0.7)) b.goomba(cx + 1.7, top + 0.5, z + 0.8, 1);
  return { x: cx + 5.6, y: top, z };
}

function ridgeRun({ b, x, y, z, d, W }: Ctx) {
  const top = Math.min(y + 1.7, 4.6);
  const len = b.rng.range(12, 15);
  b.plat(x, x + 2.4, y, z - W / 2, z + W / 2, "grass");
  const rise = (top - y) / 2;
  b.block(x + 2.9, y + rise - 1.05, z, 1.05, "stone");
  b.block(x + 3.95, top - 1.05, z, 1.05, "stone");
  const g = clamp(2.1 + d * 1.4, 2.1, 3.5);
  const endX = x + len;
  const span = endX - (x + 4.5);
  const n = Math.max(2, Math.round((span + g) / (3.4 + g)));
  const seg = Math.max(2.3, (span - (n - 1) * g) / n);
  let cx = x + 4.5;
  for (let i = 0; i < n; i++) {
    b.plat(cx, cx + seg, top, z - 2.35, z + 2.35, "dirtblock", 1.6);
    b.coinRow(cx + 0.5, cx + seg - 0.5, top + 1, z, Math.max(2, Math.round(seg / 2)));
    if (b.rng.chance(0.45 + d * 0.3) && seg > 2.6)
      b.koopa(cx + seg / 2, top + 0.6, z + (b.rng.chance(0.5) ? 1 : -1), seg / 2 - 0.7);
    if (i < n - 1) b.coinArc(cx + seg, cx + seg + g, top, top, z, 3, 1);
    cx += seg + (i < n - 1 ? g : 0);
  }
  b.plat(cx, cx + 4.5, top, z - W / 2, z + W / 2, "grass");
  b.coinRow(cx + 0.6, cx + 4, top + 1, z, 3);
  return { x: cx + 4.5, y: top, z };
}

function goalSection({ b, x, y, z, W }: Ctx) {
  const plateauStart = x + 14.2;
  const plateauEnd = x + 30;
  const plateauTop = y + 3.4;
  const flagX = x + 18.6;

  b.plat(x, plateauStart, y, z - W / 2 - 1.6, z + W / 2 + 1.6, "grass");
  // stop before the ascending stone steps so coins never end up buried in a step block
  b.coinRow(x + 2.5, x + 6.5, y + 0.95, z, 4);
  b.goomba(x + 5, y + 0.5, z + 1.4, 1.8);

  // classic ascending steps
  for (let i = 0; i < 4; i++) {
    const top = y + 0.85 * (i + 1);
    b.box(x + 7.6 + i * 1.6 + 0.8, top - 2.2, z, 1.6, 4.4, W * 0.86, "stone");
    b.coin(x + 7.6 + i * 1.6 + 0.8, top + 0.95, z + W * 0.3);
  }

  b.plat(plateauStart, plateauEnd, plateauTop, z - W / 2 - 1.6, z + W / 2 + 1.6, "stone", 4.4 + GROUND_T);
  b.coinRow(plateauStart + 0.8, flagX - 1.6, plateauTop + 1, z, 3);

  // little keep at the end of the run
  b.box(plateauEnd - 3.4, plateauTop + 2.6, z, 5.2, 5.2, 5.2, "brick");
  b.box(plateauEnd - 3.4, plateauTop + 6.1, z, 2.4, 2.2, 2.4, "brick");
  b.coinRing(plateauEnd - 3.4, plateauTop + 1.3, z, 3.9, 7);
  b.block(plateauEnd - 3.4, plateauTop + 5.2, z + 3.2, 1.05, "qblock", (() => { const id = b.qblocks.length; b.qblocks.push({ content: "oneup" }); return id; })());

  return { x: plateauEnd + 2, y: plateauTop, z, flagX };
}

/* ------------------------------------------------------------ generator */

export function generateLevel(seed: number): LevelData {
  const rng = makeRng(seed);
  const b = new Builder(rng);
  const W = 8.2;
  const TOTAL = rng.int(15, 18);

  /* -- safe opening: run, coins, one goomba, one ? block -- */
  b.plat(-11, 6, 0, -W / 2 - 1.4, W / 2 + 1.4, "grass");
  b.coinRow(-6.5, -1, 0.95, 0, 5);
  b.qblock(1.2, 2.3, -1.5, "coin");
  b.qblock(2.4, 2.3, -1.5, "coins");
  b.block(0.0, 2.3, -1.5, 1.02, "brick");
  b.goomba(4.2, 0.5, 0.4, 1.6);
  b.coin(3.4, 0.95, -2.1);

  const chunkFns: ((c: Ctx, ...args: any[]) => { x: number; y: number; z: number })[] = [
    (c) => meadow(c, 11),
    (c) => hopGaps(c),
    (c) => pipeGarden(c),
    (c) => blockLine(c),
    (c) => staircase(c, true),
    (c) => meadow(c, 9, true),
    (c) => cloudFloat(c),
    (c) => spikeBridge(c),
    (c) => ridgeRun(c),
    (c) => staircase(c, false),
    (c) => springTower(c),
  ];

  let cursor = 6;
  let y = 0;
  let z = 0;
  for (let i = 0; i < TOTAL; i++) {
    const d = difficulty(i, TOTAL);
    const fn = chunkFns[i < 2 ? 0 : rng.int(0, chunkFns.length - 1)];
    const res = fn({ b, x: cursor, y, z, d, W });
    cursor = res.x;
    y = clamp(res.y, 0, 5.2);
    z = clamp(res.z, -3, 3);
    if (i === 4 || i === Math.floor(TOTAL / 2) || i === TOTAL - 5) {
      // checkpoint plaza
      b.plat(cursor, cursor + 6.5, y, z - W / 2 - 1, z + W / 2 + 1, "grass");
      b.checkpoints.push({ x: cursor + 3.2, y: y + 0.2, z });
      b.coinRing(cursor + 3.2, y + 1.15, z, 2.1, 7);
      b.qblock(cursor + 5.4, y + 2.3, z + 2, "oneup");
      cursor += 6.5;
    }
    if (cursor > 0 && i > 3 && rng.chance(0.5)) {
      // short breather strip between hard chunks
      b.plat(cursor, cursor + 3.5, y, z - W / 2, z + W / 2, "grass");
      b.coinRow(cursor + 0.5, cursor + 3, y + 0.95, z, 2);
      cursor += 3.5;
    }
  }

  const g = goalSection({ b, x: cursor, y, z, d: 0, W });

  // ? blocks can also drop coins ("coin" = 1, "coins" = 5); count them so the
  // HUD's `coins / coinTotal` never lets the numerator exceed the total.
  const blockCoins = b.qblocks.reduce((n, q) => n + (q.content === "coin" ? 1 : q.content === "coins" ? 5 : 0), 0);

  return {
    solids: b.solids,
    coins: b.coins,
    enemies: b.enemies,
    qblocks: b.qblocks,
    checkpoints: b.checkpoints,
    spawn: { x: -7, y: 1.2, z: 0 },
    flag: { x: g.flagX, y: g.y, z: g.z },
    endX: g.x,
    coinTotal: b.coins.length + blockCoins,
    length: g.x + 10,
  };
}
