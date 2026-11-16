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
      .filter((e) => e && typeof e.score === "number")
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
