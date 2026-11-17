export interface ScoreEntry {
  name: string;
  score: number;
  coins: number;
  timeMs: number;
  cleared: boolean;
  seedLabel: string;
  date: number;
}

const KEY = "sms.print.scores.v2";
const MAX = 8;

export function loadScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e === "object" && typeof e.score === "number" && Number.isFinite(e.score))
      .map((e) => ({
        name: typeof e.name === "string" ? e.name : "???",
        score: e.score,
        coins: typeof e.coins === "number" ? e.coins : 0,
        timeMs: typeof e.timeMs === "number" && Number.isFinite(e.timeMs) ? e.timeMs : 0,
        cleared: !!e.cleared,
        seedLabel: typeof e.seedLabel === "string" ? e.seedLabel : "----",
        date: typeof e.date === "number" ? e.date : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function saveScore(entry: ScoreEntry): { scores: ScoreEntry[]; rank: number } {
  const all = [...loadScores(), entry].sort((a, b) => b.score - a.score).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* private mode — keep it in memory only */
  }
  const rank = all.findIndex((e) => e === entry || (e.date === entry.date && e.score === entry.score));
  return { scores: all, rank: rank + 1 };
}

export function clearScores() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function loadName(): string {
  try {
    return localStorage.getItem("sms.name") || "PLUMBER";
  } catch {
    return "PLUMBER";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem("sms.name", name);
  } catch {
    /* noop */
  }
}

export function fmtTime(ms: number) {
  const t = Math.max(0, ms);
  const m = Math.floor(t / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const cs = Math.floor((t % 1000) / 10);
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}
