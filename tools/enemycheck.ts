import { generateLevel } from "../src/game/level";
let bad = 0, tot = 0;
const examples: any[] = [];
for (let seed = 1; seed <= 300; seed++) {
  const s = seed * 104729 + 7;
  const lvl = generateLevel(s);
  for (const e of lvl.enemies) {
    tot++;
    if (e.kind === "flyer") continue;
    // a solid surface directly under the spawn point?
    const top = lvl.solids
      .filter((x) => x.kind !== "spike")
      .filter((x) => e.x >= x.cx - x.sx / 2 && e.x <= x.cx + x.sx / 2 && e.z >= x.cz - x.sz / 2 && e.z <= x.cz + x.sz / 2)
      .map((x) => x.cy + x.sy / 2)
      .filter((y) => y <= e.y + 0.35)
      .reduce((a, b) => Math.max(a, b), -999);
    if (Math.abs(top - e.y) > 0.7) {
      bad++;
      if (examples.length < 6) examples.push({ s, kind: e.kind, ey: +e.y.toFixed(2), top: +top.toFixed(2) });
    }
  }
}
console.log({ enemies: tot, floating: bad, pct: ((bad / tot) * 100).toFixed(1) + "%", examples });
