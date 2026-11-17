/**
 * Tiny zero-asset audio engine: chiptune-ish SFX + a two-mode loop, all synthesized.
 * Created lazily on the first user gesture so autoplay policies never break it.
 */

type Ctx = AudioContext & { _unlocked?: boolean };

const N: Record<string, number> = {};
for (const [i, name] of ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].entries()) {
  for (let o = 0; o < 6; o++) N[`${name}${o}`] = 440 * Math.pow(2, (i - 9) / 12 + (o - 4));
}

export class Sound {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private mode: "off" | "menu" | "play" = "off";
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.02);
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC() as Ctx;
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.9;
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 5;
        this.master.connect(comp).connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.3;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.85;
        this.sfxGain.connect(this.master);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume().catch(() => {});
    } catch {
      /* audio unavailable — keep the game silent instead of throwing */
      this.ctx = null;
    }
  }

  /* ------------------------------- SFX ------------------------------- */
  private tone(
    freq: number,
    dur: number,
    opts: {
      type?: OscillatorType;
      gain?: number;
      slideTo?: number;
      delay?: number;
      dest?: AudioNode | null;
      attack?: number;
    } = {}
  ) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slideTo), t0 + dur);
    const peak = opts.gain ?? 0.25;
    const atk = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(opts.dest ?? this.sfxGain!);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private noise(dur: number, opts: { gain?: number; freq?: number; q?: number; delay?: number; dest?: AudioNode | null } = {}) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    if (!this.noiseBuf || this.noiseBuf.length < len) {
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = opts.freq ?? 900;
    filt.Q.value = opts.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt).connect(g).connect(opts.dest ?? this.sfxGain!);
    src.start(t0, 0, dur);
  }

  play(name: SfxName) {
    if (!this.ctx) return;
    switch (name) {
      case "jump":
        this.tone(N.E4, 0.16, { type: "square", gain: 0.16, slideTo: N.B5 });
        this.tone(N.E5, 0.12, { type: "triangle", gain: 0.1, slideTo: N.E6 });
        break;
      case "double":
        this.tone(N.A5, 0.14, { gain: 0.14, slideTo: N.E7 });
        break;
      case "coin":
        this.tone(N.B5, 0.06, { type: "square", gain: 0.16 });
        this.tone(N.E6, 0.16, { type: "square", gain: 0.15, delay: 0.055 });
        break;
      case "block":
        this.tone(N.G3, 0.09, { type: "square", gain: 0.2, slideTo: N.C4 });
        this.noise(0.09, { gain: 0.12, freq: 1800 });
        break;
      case "bump":
        this.tone(N.D3, 0.11, { type: "square", gain: 0.18, slideTo: N.A2 });
        break;
      case "stomp":
        this.noise(0.16, { gain: 0.3, freq: 420, q: 0.6 });
        this.tone(N.C4, 0.13, { type: "sine", gain: 0.2, slideTo: N.G2 });
        break;
      case "spin":
        this.noise(0.3, { gain: 0.16, freq: 2400, q: 0.5 });
        this.tone(N.A5, 0.22, { type: "triangle", gain: 0.12, slideTo: N.D7 });
        break;
      case "slam":
        this.noise(0.4, { gain: 0.35, freq: 190, q: 0.4 });
        this.tone(N.C2, 0.35, { type: "sine", gain: 0.28, slideTo: N.E1 });
        break;
      case "hurt":
        this.tone(N.D4, 0.3, { type: "sawtooth", gain: 0.2, slideTo: N.A2 });
        this.noise(0.2, { gain: 0.14, freq: 700 });
        break;
      case "powerup":
        [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6].forEach((f, i) =>
          this.tone(f, 0.14, { type: "square", gain: 0.16, delay: i * 0.055 })
        );
        break;
      case "star":
        [N.G5, N.C6, N.E6, N.G6, N.C7, N.E7].forEach((f, i) =>
          this.tone(f, 0.16, { type: "triangle", gain: 0.17, delay: i * 0.06 })
        );
        break;
      case "oneup":
        [N.E5, N.E6, N.G6, N.C7, N.B6, N.G6].forEach((f, i) =>
          this.tone(f, 0.2, { type: "sine", gain: 0.2, delay: i * 0.09 })
        );
        break;
      case "checkpoint":
        [N.G4, N.C5, N.E5].forEach((f, i) => this.tone(f, 0.2, { gain: 0.16, delay: i * 0.07 }));
        break;
      case "flag":
        [N.C5, N.E5, N.G5, N.C6, N.G6, N.C7].forEach((f, i) =>
          this.tone(f, 0.34, { type: "square", gain: 0.17, delay: i * 0.1 })
        );
        this.noise(1.2, { gain: 0.1, freq: 3200, delay: 0.2 });
        break;
      case "gameover":
        [N.C5, N.G4, N.E4, N.C4, N.A3, N.F3, N.C3].forEach((f, i) =>
          this.tone(f, 0.32, { type: "triangle", gain: 0.2, delay: i * 0.16 })
        );
        break;
      case "ui":
        this.tone(N.E5, 0.06, { type: "square", gain: 0.11 });
        break;
      case "select":
        this.tone(N.C6, 0.09, { type: "square", gain: 0.14 });
        this.tone(N.G6, 0.12, { type: "square", gain: 0.12, delay: 0.06 });
        break;
      case "combo":
        this.tone(N.C6, 0.1, { type: "square", gain: 0.12 });
        this.tone(N.G6, 0.12, { type: "square", gain: 0.12, delay: 0.05 });
        this.tone(N.C7, 0.16, { type: "triangle", gain: 0.13, delay: 0.1 });
        break;
    }
  }

  /* ------------------------------ MUSIC ------------------------------ */
  private patterns: Record<"menu" | "play", { bass: (number | 0)[]; lead: (number | 0)[]; bpm: number }> = {
    menu: {
      bpm: 96,
      bass: [N.C3, 0, N.G3, 0, N.C3, 0, N.A2, 0, N.F3, 0, N.C3, 0, N.G2, 0, N.D3, 0],
      lead: [N.E5, 0, N.G5, 0, N.C6, 0, N.B5, N.G5, 0, N.A5, N.B5, 0, N.G5, 0, 0, 0],
    },
    play: {
      bpm: 148,
      bass: [N.C3, N.C3, N.G2, N.C3, N.F2, N.F2, N.C3, N.F3, N.G2, N.G2, N.D3, N.G3, N.A2, N.A2, N.E3, N.A2],
      lead: [N.C6, N.E6, N.G6, N.E6, N.A6, N.G6, N.E6, N.C6, N.D6, N.G6, N.B6, N.G6, N.E6, N.C6, N.B5, N.D6],
    },
  };

  startMusic(mode: "menu" | "play") {
    if (!this.ctx) return;
    if (this.mode === mode && this.timer !== null) return;
    this.mode = mode;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.05);
    if (this.timer !== null) clearInterval(this.timer);
    const pat = this.patterns[mode];
    const spb = 60 / pat.bpm / 2;
    this.timer = window.setInterval(() => {
      const ctx = this.ctx!;
      // background-tab timer throttling can leave nextTime far behind; skip the
      // missed notes instead of scheduling them all at once (burst)
      if (this.nextTime < ctx.currentTime - 0.5) this.nextTime = ctx.currentTime + 0.06;
      while (this.nextTime < ctx.currentTime + 0.22) {
        const i = this.step % 16;
        const t = this.nextTime;
        const b = pat.bass[i];
        if (b)
          this.tone(b, spb * 0.9, {
            type: "triangle",
            gain: 0.2,
            dest: this.musicGain,
            delay: t - ctx.currentTime,
          });
        const l = pat.lead[i];
        if (l)
          this.tone(l, mode === "play" ? spb * 0.62 : spb * 1.3, {
            type: "square",
            gain: 0.09,
            dest: this.musicGain,
            delay: t - ctx.currentTime,
          });
        if (i % 4 === 0 && mode === "play")
          this.noise(0.05, { gain: 0.05, freq: 6500, delay: t - ctx.currentTime, dest: this.musicGain });
        this.step++;
        this.nextTime += spb;
      }
    }, 90);
  }

  stopMusic() {
    this.mode = "off";
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // silence any notes already scheduled against the music bus
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
  }

  dispose() {
    this.stopMusic();
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
      this.master = null;
      this.musicGain = null;
      this.sfxGain = null;
      this.noiseBuf = null;
    }
  }
}

export type SfxName =
  | "jump"
  | "double"
  | "coin"
  | "block"
  | "bump"
  | "stomp"
  | "spin"
  | "slam"
  | "hurt"
  | "powerup"
  | "star"
  | "oneup"
  | "checkpoint"
  | "flag"
  | "gameover"
  | "ui"
  | "select"
  | "combo";

export const sound = new Sound();
