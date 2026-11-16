import { generateLevel } from "../src/game/level";
type Top = { x0: number; x1: number; y: number; kind: string };
const report: any[] = [];
for (let seed = 1; seed <= 300; seed++) {
  const s = seed * 7919 + 13;
  const lvl = generateLevel(s);
  const tops: Top[] = lvl.solids.filter((x) => x.kind !== "spike").map((x) => ({ x0: x.cx - x.sx / 2, x1: x.cx + x.sx / 2, y: x.cy + x.sy / 2, kind: x.kind }));
  let x = lvl.spawn.x, gap = 0, gstart = 0;
  const covered = (xx: number) => tops.some((t) => xx >= t.x0 && xx <= t.x1 && t.y > -2 && t.y < 14);
  for (; x < lvl.flag.x + 2; x += 0.4) {
    if (covered(x)) { if (gap > 4.4) report.push({ s, from: +gstart.toFixed(1), to: +(x - 0.4).toFixed(1), w: +gap.toFixed(1) }); gap = 0; }
    else { if (gap === 0) gstart = x; gap += 0.4; }
  }
}
report.sort((a, b) => b.w - a.w);
console.log("count>4.4:", report.length, "max:", report[0]?.w);
console.log(report.slice(0, 10));
