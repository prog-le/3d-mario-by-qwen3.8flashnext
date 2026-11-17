import { generateLevel } from "../src/game/level";

let worstGap = 0;
let totalSolids = 0;
let maxSolids = 0;
let totalCoins = 0;
let minCoins = 1e9;
let badY = 0;
let nan = 0;
let embeddedCoins = 0;
let embeddedEnemies = 0;
let lengths: number[] = [];

for (let seed = 1; seed <= 250; seed++) {
  const lvl = generateLevel(seed * 7919 + 13);
  totalSolids += lvl.solids.length;
  maxSolids = Math.max(maxSolids, lvl.solids.length);
  totalCoins += lvl.coins.length;
  minCoins = Math.min(minCoins, lvl.coins.length);
  lengths.push(lvl.endX - lvl.spawn.x);

  // NaN sweep
  for (const s of lvl.solids) {
    for (const v of [s.cx, s.cy, s.cz, s.sx, s.sy, s.sz]) if (!Number.isFinite(v)) nan++;
  }
  for (const c of lvl.coins) if (!Number.isFinite(c.x + c.y + c.z)) nan++;
  for (const e of lvl.enemies) if (!Number.isFinite(e.x + e.y + e.z)) nan++;

  // gap analysis along X using ground-ish solids
  const startX = lvl.spawn.x;
  const endX = lvl.flag.x + 2;
  const tops: { x0: number; x1: number; y: number }[] = [];
  for (const s of lvl.solids) {
    if (s.kind === "spike") continue;
    if (s.sz < 2) continue; // thin floating blocks don't count as a floor
    tops.push({ x0: s.cx - s.sx / 2, x1: s.cx + s.sx / 2, y: s.cy + s.sy / 2 });
  }
  const covered = (x: number) => tops.some((t) => x >= t.x0 && x <= t.x1);
  let gap = 0;
  for (let x = startX; x < endX; x += 0.4) {
    if (covered(x)) {
      if (gap > worstGap) worstGap = gap;
      gap = 0;
    } else gap += 0.4;
  }
  if (gap > worstGap) worstGap = gap;

  // enemies must start near a solid top (or be flyers)
  for (const e of lvl.enemies) {
    if (e.kind === "flyer") continue;
    // test "standing on a platform" by X-overlap, not distance-to-center (long platforms false-positived)
    const near = tops.some((t) => e.x >= t.x0 && e.x <= t.x1 && Math.abs(t.y - e.y) < 1.6);
    if (!near) badY++;
  }

  // coins / enemies must never be embedded inside a solid AABB
  const solids = lvl.solids.filter((s) => s.kind !== "spike");
  for (const c of lvl.coins) {
    for (const s of solids) {
      if (
        c.x > s.cx - s.sx / 2 && c.x < s.cx + s.sx / 2 &&
        c.z > s.cz - s.sz / 2 && c.z < s.cz + s.sz / 2 &&
        c.y > s.cy - s.sy / 2 && c.y < s.cy + s.sy / 2 - 0.25
      ) { embeddedCoins++; break; }
    }
  }
  for (const e of lvl.enemies) {
    if (e.kind === "flyer") continue;
    for (const s of solids) {
      if (
        e.x > s.cx - s.sx / 2 && e.x < s.cx + s.sx / 2 &&
        e.z > s.cz - s.sz / 2 && e.z < s.cz + s.sz / 2 &&
        e.y > s.cy - s.sy / 2 && e.y < s.cy + s.sy / 2
      ) { embeddedEnemies++; break; }
    }
  }
}

console.log({
  nan,
  badY,
  embeddedCoins,
  embeddedEnemies,
  worstGap: +worstGap.toFixed(2),
  avgSolids: Math.round(totalSolids / 250),
  maxSolids,
  avgCoins: Math.round(totalCoins / 250),
  minCoins,
  avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
  maxLength: Math.round(Math.max(...lengths)),
  minLength: Math.round(Math.min(...lengths)),
});
