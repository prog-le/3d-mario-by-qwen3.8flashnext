import { generateLevel } from "../src/game/level";
const lvl = generateLevel(Number(process.argv[2]));
const [a, b] = [Number(process.argv[3]), Number(process.argv[4])];
for (const s of lvl.solids) {
  if (s.cx + s.sx / 2 < a || s.cx - s.sx / 2 > b) continue;
  console.log(s.kind.padEnd(8), "x", (s.cx - s.sx / 2).toFixed(1).padStart(7), "→", (s.cx + s.sx / 2).toFixed(1).padStart(7), "ytop", (s.cy + s.sy / 2).toFixed(2).padStart(6), "z", (s.cz - s.sz / 2).toFixed(1).padStart(6), "→", (s.cz + s.sz / 2).toFixed(1));
}
console.log("enemies:", lvl.enemies.filter(e=>e.x>a&&e.x<b).map(e=>`${e.kind}@${e.x.toFixed(1)},${e.y.toFixed(1)}`));
console.log("coins in range:", lvl.coins.filter(c=>c.x>a&&c.x<b).length);
