/** Deterministic, tiny PRNG so every run can share a seed. */
export function makeRng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => {
    // xorshift32
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
  return {
    next,
    /** float in [a,b) */
    range: (a: number, b: number) => a + next() * (b - a),
    /** int in [a,b] */
    int: (a: number, b: number) => a + Math.floor(next() * (b - a + 1)),
    pick: <T>(arr: readonly T[]) => arr[Math.floor(next() * arr.length) % arr.length],
    chance: (p: number) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

export type Rng = ReturnType<typeof makeRng>;

export function seedToLabel(seed: number) {
  return (seed >>> 0).toString(36).toUpperCase().slice(0, 6).padStart(4, "0");
}
