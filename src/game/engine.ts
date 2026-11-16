import * as THREE from "three";
import { COLORS, COMBO_MULT, PHYS, SCORE } from "./constants";
import { generateLevel, type LevelData, type SolidKind } from "./level";
import { buildGoomba, buildHero, buildKoopa, buildPole, buildStar, MAT } from "./models";
import { Fx } from "./fx";
import { sound } from "./audio";
import { seedToLabel } from "./rng";
import { tiledBox } from "./textures";

export type Phase = "menu" | "playing" | "paused" | "dying" | "dead" | "clearing" | "clear";
export type CamMode = "follow" | "fp";

export interface Hud {
  phase: Phase;
  camMode: CamMode;
  score: number;
  coins: number;
  coinTotal: number;
  lives: number;
  timeMs: number;
  combo: number;
  progress: number;
  starT: number;
  kills: number;
  seedLabel: string;
  message: string;
  messageT: number;
}

export interface RunResult {
  score: number;
  coins: number;
  coinTotal: number;
  kills: number;
  maxCombo: number;
  livesLeft: number;
  timeMs: number;
  cleared: boolean;
  progress: number;
  seedLabel: string;
  timeBonus: number;
  clearBonus: number;
  coinBonus: number;
}

interface Solid {
  x0: number; x1: number; y0: number; y1: number; z0: number; z1: number;
  kind: SolidKind;
  q: number;
  used: boolean;
  bump: number;
  mesh: THREE.Mesh | null;
  cap: THREE.Mesh | null;
}

type EnemyState = "walk" | "shell" | "slide" | "dead";

interface Enemy {
  kind: "goomba" | "koopa" | "flyer";
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  dir: number;
  home: number;
  range: number;
  h: number;
  state: EnemyState;
  t: number;
  flip: number;
  group: THREE.Group;
  head: THREE.Object3D | null;
  wingL: THREE.Object3D | null;
  wingR: THREE.Object3D | null;
  baseY: number;
  grounded: boolean;
  seed: number;
}

interface Coin { x: number; y: number; z: number; taken: number; base: number }

const SLAB = 6;
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private cam: THREE.PerspectiveCamera;
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D;
  private fx: Fx;
  private levelGroup = new THREE.Group();
  private raf = 0;
  private last = 0;
  private acc = 0;
  private ro?: ResizeObserver;
  private disposed = false;
  private mobile = false;
  private size = { w: 1, h: 1, dpr: 1 };

  private level: LevelData | null = null;
  private solids: Solid[] = [];
  private grid = new Map<number, Solid[]>();
  private coinGrid = new Map<number, number[]>();
  private coins: Coin[] = [];
  private coinMesh!: THREE.InstancedMesh;
  private enemies: Enemy[] = [];
  private hero = buildHero();
  private heroShadow!: THREE.Mesh;
  private flagGroup: THREE.Group | null = null;
  private flagMesh: THREE.Mesh | null = null;
  private checkpoints: { x: number; y: number; z: number; group: THREE.Group; on: boolean }[] = [];
  private keys = new Set<string>();
  private touchActive = false;
  private starPickup: { x: number; y: number; z: number; vy: number; t: number; group: THREE.Group; live: boolean } | null = null;
  private clouds!: THREE.InstancedMesh;

  // player state
  private p = {
    x: 0, y: 2, z: 0, vx: 0, vy: 0, vz: 0,
    grounded: false, coyote: 0, buffer: 0, facing: 0, spin: 0, spinCd: 0,
    star: 0, invuln: 0, combo: 0, squash: 0, runPhase: 0, spinAngle: 0, bob: 0,
  };
  private hitStop = 0;
  private slowmo = 0;
  private camPos = new THREE.Vector3(0, 5, -13);
  private camLook = new THREE.Vector3();
  private fovPulse = 0;
  private shakeVel = new THREE.Vector3();
  camMode: CamMode = "follow";
  private camYaw = Math.PI / 2; // follow camera yaw, starts looking down-course (+X)

  phase: Phase = "menu";
  private score = 0;
  private coinCount = 0;
  private lives = 3;
  private timeMs = 0;
  private kills = 0;
  private maxCombo = 0;
  private streak = 0;
  private streakT = 0;
  private checkpointIdx = -1;
  private respawn = { x: -7, y: 1.6, z: 0 };
  private seed = 1;
  private message = "";
  private messageT = 0;
  private hudT = 0;
  private clearT = 0;
  private deathT = 0;
  private lastResult: RunResult | null = null;

  input = { mx: 0, mz: 0, jump: false, jumpEdge: 0, spinEdge: 0 };

  constructor(
    private host: HTMLElement,
    private onHud: (h: Hud) => void,
    private onEnd: (r: RunResult) => void
  ) {
    this.mobile = matchMedia("(pointer: coarse)").matches || innerWidth < 820;
    const gl = document.createElement("canvas");
    gl.className = "absolute inset-0 h-full w-full";
    this.overlay = document.createElement("canvas");
    this.overlay.className = "pointer-events-none absolute inset-0 h-full w-full";
    host.append(gl, this.overlay);
    this.octx = this.overlay.getContext("2d")!;

    this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: !this.mobile, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = false;
    this.cam = new THREE.PerspectiveCamera(58, 1, 0.1, 300);
    this.cam.rotation.order = "YXZ";

    this.scene.add(this.levelGroup);
    this.scene.fog = new THREE.Fog(COLORS.fog, 60, 210);
    this.buildEnvironment();
    this.fx = new Fx(this.scene, this.cam, this.octx);

    const shadowGeo = new THREE.CircleGeometry(0.46, 14);
    shadowGeo.rotateX(-Math.PI / 2);
    this.heroShadow = new THREE.Mesh(shadowGeo, MAT.shadow);
    this.scene.add(this.heroShadow);
    this.scene.add(this.hero.root);

    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    window.addEventListener("keydown", this.onKey, { passive: false });
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.onBlur);

    this.buildLevel(Math.floor(Math.random() * 1e9));
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /* ------------------------------------------------------------- setup */

  private buildEnvironment() {
    const cv = document.createElement("canvas");
    cv.width = 4;
    cv.height = 256;
    const g = cv.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "#1f74b5");
    grad.addColorStop(0.32, "#4fb3ea");
    grad.addColorStop(0.62, "#8fdff6");
    grad.addColorStop(0.86, "#ffd9a0");
    grad.addColorStop(1, "#ffb37a");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = tex;

    const hemi = new THREE.HemisphereLight(0xd8f4ff, 0x5d7f45, 1.02);
    this.scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xfff2d6, 1.15);
    dir.position.set(-0.35, 1, 0.55);
    this.scene.add(dir);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.22));

    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(1400, 1400),
      new THREE.MeshLambertMaterial({ color: COLORS.water, transparent: true, opacity: 0.92 })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -6.4;
    this.scene.add(water);

    // drifting cloud puffs
    const cg = new THREE.BoxGeometry(1, 1, 1);
    this.clouds = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: 0xfff8ec }), 30);
    this.clouds.frustumCulled = false;
    const d = new THREE.Object3D();
    for (let i = 0; i < 30; i++) {
      d.position.set((i / 30) * 260 - 40, 12 + Math.sin(i * 2.1) * 6, -60 - ((i * 37) % 90));
      d.scale.set(9 + (i % 4) * 4, 2.4 + (i % 3) * 0.6, 6 + (i % 5) * 2);
      d.updateMatrix();
      this.clouds.setMatrixAt(i, d.matrix);
    }
    this.scene.add(this.clouds);
  }

  private matFor(kind: SolidKind) {
    switch (kind) {
      case "grass": return MAT.dirt;
      case "brick": return MAT.brick;
      case "stone": return MAT.stone;
      case "cloud": return MAT.cloud;
      case "crate": return MAT.crate;
      case "sand": return MAT.sand;
      case "spike": return MAT.spike;
      case "pipe": return MAT.pipe;
      case "qblock": return MAT.qblock;
      default: return MAT.dirt;
    }
  }

  private buildLevel(seed: number) {
    this.seed = seed;
    this.disposeLevelMeshes();
    const lvl = generateLevel(seed);
    this.level = lvl;
    this.solids = [];
    this.grid.clear();
    this.coinGrid.clear();

    const d = new THREE.Object3D();
    for (const s of lvl.solids) {
      const solid: Solid = {
        x0: s.cx - s.sx / 2, x1: s.cx + s.sx / 2,
        y0: s.cy - s.sy / 2, y1: s.cy + s.sy / 2,
        z0: s.cz - s.sz / 2, z1: s.cz + s.sz / 2,
        kind: s.kind, q: s.q ?? -1, used: false, bump: 0, mesh: null, cap: null,
      };
      const tileOf = (k: SolidKind) => (k === "brick" || k === "qblock" || k === "crate" ? 1.05 : k === "cloud" ? 1.35 : 1.8);
      if (s.kind !== "spike") {
        const mat = this.matFor(s.kind);
        const geo = tiledBox(s.sx, s.sy, s.sz, tileOf(s.kind), mat.map ?? undefined);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(s.cx, s.cy, s.cz);
        if (s.kind === "grass") {
          const capGeo = tiledBox(s.sx + 0.04, 0.42, s.sz + 0.04, 1.8, MAT.grass.map!);
          const cap = new THREE.Mesh(capGeo, MAT.grass);
          cap.position.set(s.cx, solid.y1 - 0.2, s.cz);
          this.levelGroup.add(cap);
          solid.cap = cap;
        }
        this.levelGroup.add(mesh);
        solid.mesh = mesh;
      } else {
        // spike teeth
        const n = Math.max(2, Math.round(s.sx / 0.5));
        const geo = new THREE.ConeGeometry(0.2, 0.72, 4);
        for (let i = 0; i < n; i++) {
          const m = new THREE.Mesh(geo, MAT.spike);
          m.position.set(s.cx - s.sx / 2 + (i + 0.5) * (s.sx / n), s.cy + 0.12, s.cz);
          m.rotation.y = Math.PI / 4;
          this.levelGroup.add(m);
        }
        const base = new THREE.Mesh(new THREE.BoxGeometry(s.sx, 0.24, s.sz), MAT.stone);
        base.position.set(s.cx, s.cy - 0.3, s.cz);
        this.levelGroup.add(base);
      }
      const k0 = Math.floor(solid.x0 / SLAB);
      const k1 = Math.floor(solid.x1 / SLAB);
      for (let k = k0; k <= k1; k++) {
        let arr = this.grid.get(k);
        if (!arr) this.grid.set(k, (arr = []));
        arr.push(solid);
      }
      this.solids.push(solid);
    }

    // coins
    this.coins = lvl.coins.map((c) => ({ x: c.x, y: c.y, z: c.z, taken: 0, base: c.y }));
    this.coins.forEach((c, i) => {
      const k = Math.floor(c.x / SLAB);
      let arr = this.coinGrid.get(k);
      if (!arr) this.coinGrid.set(k, (arr = []));
      arr.push(i);
    });
    const coinGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.12, 10);
    coinGeo.rotateX(Math.PI / 2);
    this.coinMesh = new THREE.InstancedMesh(coinGeo, MAT.gold, Math.max(1, this.coins.length));
    this.coinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.coinMesh.frustumCulled = false;
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      d.position.set(c.x, c.y, c.z);
      d.rotation.set(0, 0, 0);
      d.scale.setScalar(1);
      d.updateMatrix();
      this.coinMesh.setMatrixAt(i, d.matrix);
    }
    this.levelGroup.add(this.coinMesh);

    // enemies
    this.enemies = [];
    for (const e of lvl.enemies) {
      const kind = e.kind;
      let group: THREE.Group;
      let h = 0.72;
      if (kind === "goomba") group = buildGoomba();
      else if (kind === "koopa") { group = buildKoopa(); h = 0.92; }
      else { group = buildGoomba(true); h = 0.72; }
      group.position.set(e.x, e.y, e.z);
      this.levelGroup.add(group);
      this.enemies.push({
        kind, x: e.x, y: e.y, z: e.z, vx: 0, vy: 0, vz: 0,
        dir: Math.cos(e.phase) > 0 ? 1 : -1,
        home: e.x, range: Math.max(1, e.range), h,
        state: "walk", t: 0, flip: 0, group,
        head: group.getObjectByName("head") ?? null,
        wingL: group.getObjectByName("wingL") ?? null,
        wingR: group.getObjectByName("wingR") ?? null,
        baseY: e.y,
        grounded: false, seed: e.phase,
      });
    }

    // checkpoints + flag
    this.checkpoints = [];
    for (const cp of lvl.checkpoints) {
      const g = buildPole(3.6, 0x8fa9bb);
      g.position.set(cp.x, cp.y, cp.z);
      this.levelGroup.add(g);
      this.checkpoints.push({ x: cp.x, y: cp.y, z: cp.z, group: g, on: false });
    }
    this.flagGroup = buildPole(7.2, 0xff4d5e);
    this.flagGroup.position.set(lvl.flag.x, lvl.flag.y, lvl.flag.z);
    this.levelGroup.add(this.flagGroup);
    this.flagMesh = this.flagGroup.getObjectByName("flag") as THREE.Mesh;

    this.scene.add(this.levelGroup);
    void d;
  }

  private disposeLevelMeshes() {
    this.levelGroup.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const c of this.levelGroup.children) this.levelGroup.remove(c);
    this.levelGroup.clear();
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.floor(r.width));
    const h = Math.max(1, Math.floor(r.height));
    const dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.75 : 2);
    this.size = { w, h, dpr };
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.overlay.width = Math.floor(w * dpr);
    this.overlay.height = Math.floor(h * dpr);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
  }

  /* -------------------------------------------------------------- input */

  private static MOVE_KEYS = ["a", "d", "w", "s", "arrowleft", "arrowright", "arrowup", "arrowdown"];

  private onKey = (ev: KeyboardEvent) => {
    const down = ev.type === "keydown";
    const k = ev.key.toLowerCase();
    if (Game.MOVE_KEYS.includes(k) || k === " ") ev.preventDefault();
    if (Game.MOVE_KEYS.includes(k)) {
      if (down) this.keys.add(k);
      else this.keys.delete(k);
      this.recomputeMove();
      return;
    }
    if (!down || ev.repeat) return;
    switch (k) {
      case " ": case "z": case "k": case "spacebar":
        sound.unlock();
        this.input.jump = true;
        this.input.jumpEdge = performance.now();
        break;
      case "shift": case "x": case "j":
        this.input.spinEdge = performance.now();
        break;
      case "p": case "escape":
        this.togglePause();
        break;
      case "c":
        this.toggleCamera();
        break;
    }
  };

  toggleCamera() {
    this.camMode = this.camMode === "follow" ? "fp" : "follow";
    sound.play("ui");
    this.emit(true);
  }

  /** start-screen "shuffle course" — rebuilds the demo level */
  shuffleMenu() {
    if (this.phase !== "menu") return;
    this.buildLevel(Math.floor(Math.random() * 1e9));
    const l = this.level!;
    this.resetPlayer(l.spawn.x, l.spawn.y + PHYS.HH, l.spawn.z, true);
    sound.play("ui");
    this.emit(true);
  }

  private recomputeMove() {
    if (this.touchActive) return;
    const has = (k: string) => this.keys.has(k);
    let x = 0;
    let z = 0;
    if (has("a") || has("arrowleft")) x -= 1;
    if (has("d") || has("arrowright")) x += 1;
    if (has("w") || has("arrowup")) z += 1;
    if (has("s") || has("arrowdown")) z -= 1;
    this.input.mx = x;
    this.input.mz = z;
  }

  private onKeyUp = (ev: KeyboardEvent) => {
    const k = ev.key.toLowerCase();
    if (k === " " || k === "z" || k === "k" || k === "spacebar") this.input.jump = false;
    if (Game.MOVE_KEYS.includes(k)) {
      this.keys.delete(k);
      this.recomputeMove();
    }
  };

  private onBlur = () => {
    this.keys.clear();
    this.input.mx = 0;
    this.input.mz = 0;
    this.input.jump = false;
    if (this.phase === "playing") this.setPhase("paused");
  };

  setMove(x: number, z: number, touch = true) {
    this.touchActive = touch && (Math.abs(x) > 0.02 || Math.abs(z) > 0.02);
    if (this.touchActive || !touch) {
      this.input.mx = clamp(x, -1, 1);
      this.input.mz = clamp(z, -1, 1);
    } else {
      this.input.mx = 0;
      this.input.mz = 0;
    }
  }
  jumpDown() {
    sound.unlock();
    this.input.jump = true;
    this.input.jumpEdge = performance.now();
  }
  jumpUp() {
    this.input.jump = false;
  }
  spin() {
    this.input.spinEdge = performance.now();
  }

  /* -------------------------------------------------------------- flow */

  private setPhase(ph: Phase) {
    this.phase = ph;
    if (ph !== "playing") {
      this.input.mx = 0;
      this.input.mz = 0;
      this.input.jump = false;
      this.touchActive = false;
    } else this.recomputeMove();
    if (ph === "playing") sound.startMusic("play");
    else if (ph === "menu") sound.startMusic("menu");
    else sound.stopMusic();
    this.emit(true);
  }

  startRun(seed?: number) {
    sound.unlock();
    this.buildLevel(seed ?? Math.floor(Math.random() * 1e9));
    // never leak buffered inputs from a previous run/menu into the new one
    this.input.jump = false;
    this.input.jumpEdge = 0;
    this.input.spinEdge = 0;
    this.keys.clear();
    this.touchActive = false;
    this.score = 0;
    this.coinCount = 0;
    this.lives = 3;
    this.kills = 0;
    this.maxCombo = 0;
    this.timeMs = 0;
    this.streak = 0;
    this.checkpointIdx = -1;
    this.hitStop = 0;
    this.slowmo = 0;
    this.clearT = 0;
    this.deathT = 0;
    this.lastResult = null;
    const lvl = this.level!;
    this.respawn = { ...lvl.spawn };
    this.camYaw = Math.PI / 2; // face down-course at GO!
    this.resetPlayer(lvl.spawn.x, lvl.spawn.y + PHYS.HH, lvl.spawn.z, true);
    this.fx.clearAll();
    this.say("GO!");
    this.fx.burst({ x: lvl.spawn.x + 1, y: 1.6, z: 0 }, { count: 26, color: "#ffd34d", speed: 10, size: 0.3, life: 0.8 });
    this.fx.kick(0.4);
    this.setPhase("playing");
    this.resize();
  }

  restart(sameSeed: boolean) {
    this.startRun(sameSeed ? this.seed : Math.floor(Math.random() * 1e9));
  }

  toMenu() {
    this.setPhase("menu");
    const lvl = this.level!;
    this.resetPlayer(lvl.spawn.x, lvl.spawn.y + PHYS.HH, lvl.spawn.z, true);
  }

  togglePause() {
    if (this.phase === "playing") { this.setPhase("paused"); sound.play("ui"); }
    else if (this.phase === "paused") { this.setPhase("playing"); this.last = performance.now(); sound.play("select"); }
  }
  resume() { if (this.phase === "paused") this.togglePause(); }

  private say(msg: string, t = 1.3) {
    this.message = msg;
    this.messageT = t;
    this.emit(true);
  }

  private emit(force = false) {
    const now = performance.now();
    if (!force && now - this.hudT < 66) return;
    this.hudT = now;
    const lvl = this.level;
    const span = lvl ? lvl.flag.x - lvl.spawn.x : 1;
    this.onHud({
      phase: this.phase,
      camMode: this.camMode,
      score: Math.round(this.score),
      coins: this.coinCount,
      coinTotal: lvl ? lvl.coinTotal : 0,
      lives: this.lives,
      timeMs: this.timeMs,
      combo: this.p.combo,
      progress: lvl ? clamp((this.p.x - lvl.spawn.x) / span, 0, 1) : 0,
      starT: this.p.star,
      kills: this.kills,
      seedLabel: seedToLabel(this.seed),
      message: this.messageT > 0 ? this.message : "",
      messageT: this.messageT,
    });
  }

  private dummy = new THREE.Object3D();

  private resetPlayer(x: number, y: number, z: number, snap = false) {
    const p = this.p;
    p.x = x; p.y = y; p.z = z;
    p.vx = p.vy = p.vz = 0;
    p.grounded = false; p.coyote = 0; p.buffer = 0; p.spin = 0; p.spinAngle = 0;
    p.invuln = 1.2;
    p.combo = 0;
    this.hero.body.rotation.set(0, 0, 0);
    this.hero.body.scale.set(1, 1, 1);
    this.hero.legL.rotation.set(0, 0, 0);
    this.hero.legR.rotation.set(0, 0, 0);
    this.hero.armL.rotation.set(0, 0, 0);
    this.hero.armR.rotation.set(0, 0, 0);
    if (snap) {
      const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw);
      this.camPos.set(x - sy * 10.5, y + 4.6, z - cy * 10.5);
      this.camLook.set(x + sy * 1.6, y + 1.05, z + cy * 1.6);
      this.hero.root.position.set(x, y, z);
    }
  }

  /* --------------------------------------------------------- collision */

  private near(x: number, out: Solid[]) {
    out.length = 0;
    const k = Math.floor(x / SLAB);
    for (let i = k - 1; i <= k + 1; i++) {
      const arr = this.grid.get(i);
      if (arr) for (const s of arr) out.push(s);
    }
    return out;
  }

  private buf: Solid[] = [];

  private hits(x: number, y: number, z: number, hw: number, hh: number, includeHazard = false) {
    const list = this.near(x, this.buf);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      const hazard = s.kind === "spike";
      if (hazard && !includeHazard) continue;
      if (
        x + hw > s.x0 && x - hw < s.x1 &&
        y + hh > s.y0 && y - hh < s.y1 &&
        z + hw > s.z0 && z - hw < s.z1
      )
        return s;
    }
    return null;
  }

  private overlapsAny(x: number, y: number, z: number, hw: number, hh: number) {
    const list = this.near(x, this.buf);
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.kind === "spike") continue;
      if (x + hw > s.x0 && x - hw < s.x1 && y + hh > s.y0 && y - hh < s.y1 && z + hw > s.z0 && z - hw < s.z1) return true;
    }
    return false;
  }

  /** resolve horizontal penetration on a single axis against every nearby solid */
  private pushOut(axis: "x" | "z", dir: number) {
    const p = this.p;
    const list = this.near(axis === "x" ? p.x : p.x, this.buf);
    let hit = false;
    for (let i = 0; i < list.length; i++) {
      const s = list[i];
      if (s.kind === "spike") continue;
      if (
        p.y + PHYS.HH > s.y0 + 0.02 &&
        p.y - PHYS.HH < s.y1 - 0.02 &&
        p.x + PHYS.HW > s.x0 &&
        p.x - PHYS.HW < s.x1 &&
        p.z + PHYS.HW > s.z0 &&
        p.z - PHYS.HW < s.z1
      ) {
        if (axis === "x") p.x = dir > 0 ? Math.min(p.x, s.x0 - PHYS.HW - 0.004) : Math.max(p.x, s.x1 + PHYS.HW + 0.004);
        else p.z = dir > 0 ? Math.min(p.z, s.z0 - PHYS.HW - 0.004) : Math.max(p.z, s.z1 + PHYS.HW + 0.004);
        hit = true;
      }
    }
    return hit;
  }

  private groundTop(x: number, y: number, z: number, hw = 0.2) {
    let best = -999;
    const list = this.near(x, this.buf);
    for (const s of list) {
      if (s.kind === "spike") continue;
      if (x + hw > s.x0 && x - hw < s.x1 && z + hw > s.z0 && z - hw < s.z1 && s.y1 <= y + 0.06 && s.y1 > best) best = s.y1;
    }
    return best;
  }

  /* ------------------------------------------------------------ stepping */

  private step(dt: number) {
    const p = this.p;

    if (this.messageT > 0) this.messageT -= dt;

    if (this.phase === "dying") {
      this.deathT += dt;
      p.vy -= PHYS.GRAVITY * 0.55 * dt;
      p.y += p.vy * dt;
      this.hero.body.rotation.z += dt * 7;
      if (this.deathT > 1.5) this.finishRun(false);
      return;
    }
    if (this.phase === "clearing") {
      this.clearT += dt;
      // slide down the pole, then celebrate
      const lvl = this.level!;
      p.x = lerp(p.x, lvl.flag.x - 0.55, dt * 8);
      p.y = lerp(p.y, lvl.flag.y + PHYS.HH + 0.05, dt * 3.2);
      p.z = lerp(p.z, lvl.flag.z, dt * 8);
      p.vy = 0;
      if (Math.random() < 0.5)
        this.fx.burst(
          { x: lvl.flag.x + (Math.random() - 0.5) * 16, y: lvl.flag.y + 3 + Math.random() * 6, z: (Math.random() - 0.5) * 12 },
          { count: 12, color: ["#ffd34d", "#ff4d5e", "#4fc3f7", "#53c558"][(Math.random() * 4) | 0], speed: 7, life: 1, size: 0.26 }
        );
      if (this.clearT > 1.6) this.finishRun(true);
      return;
    }
    if (this.phase !== "playing") return;

    this.timeMs += dt * 1000;

    /* ---- aim (camera-relative: W pushes away from the camera) ---- */
    const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw);
    const ax = sy * this.input.mz - cy * this.input.mx;
    const az = cy * this.input.mz + sy * this.input.mx;
    let mag = Math.min(1, Math.hypot(ax, az));
    const wantMove = mag > 0.08;
    if (wantMove) {
      const dirX = ax / (Math.hypot(ax, az) || 1);
      const dirZ = az / (Math.hypot(ax, az) || 1);
      const accel = p.grounded ? PHYS.ACCEL_GROUND : PHYS.ACCEL_AIR;
      const tgt = PHYS.MOVE_SPEED * mag * (p.spin > 0 ? 0.55 : 1);
      p.vx += (dirX * tgt - p.vx) * Math.min(1, accel * dt * 0.22);
      p.vz += (dirZ * tgt - p.vz) * Math.min(1, accel * dt * 0.22);
      if (p.spin <= 0) p.facing = Math.atan2(dirX, dirZ);
    } else {
      const fr = (p.grounded ? PHYS.FRICTION_GROUND : PHYS.FRICTION_AIR) * dt;
      const s = Math.hypot(p.vx, p.vz);
      if (s > 0.001) {
        const ns = Math.max(0, s - fr);
        p.vx = (p.vx / s) * ns;
        p.vz = (p.vz / s) * ns;
      }
    }
    // clamp
    const sp = Math.hypot(p.vx, p.vz);
    const maxS = PHYS.MOVE_SPEED * 1.25;
    if (sp > maxS) { p.vx = (p.vx / sp) * maxS; p.vz = (p.vz / sp) * maxS; }

    /* ---- spin / dive ---- */
    if (performance.now() - this.input.spinEdge < 400 && p.spinCd <= 0 && p.spin <= 0) {
      p.spin = PHYS.SPIN_TIME;
      p.spinCd = PHYS.SPIN_CD + PHYS.SPIN_TIME;
      this.input.spinEdge = 0;
      sound.play("spin");
      this.fx.kick(0.16);
      this.fx.ring({ x: p.x, y: p.y - 0.4, z: p.z }, { count: 10, color: "#fff4dc", speed: 6 });
      if (!p.grounded) p.vy = Math.min(p.vy, -4);
    }
    if (p.spin > 0) {
      p.spin -= dt;
      p.spinAngle += dt * 26;
      if (!p.grounded) p.vy -= PHYS.GRAVITY * 0.75 * dt;
      this.fx.trail({ x: p.x, y: p.y, z: p.z }, "#ffe86a", 1);
    }
    p.spinCd = Math.max(0, p.spinCd - dt);

    /* ---- jump ---- */
    if (performance.now() - this.input.jumpEdge < 260) p.buffer = PHYS.BUFFER;
    else p.buffer = Math.max(0, p.buffer - dt);
    if (p.buffer > 0 && (p.grounded || p.coyote > 0)) {
      p.vy = PHYS.JUMP_V;
      p.grounded = false;
      p.coyote = 0;
      p.buffer = 0;
      this.input.jumpEdge = 0;
      p.squash = -0.42;
      sound.play("jump");
      this.fx.ring({ x: p.x, y: p.y - PHYS.HH, z: p.z }, { count: 8, color: "#fff4dc", speed: 4.6, size: 0.2 });
    }

    /* ---- gravity ---- */
    const rising = p.vy > 0 && this.input.jump;
    p.vy -= PHYS.GRAVITY * (rising ? 0.65 : 1) * dt * (p.spin > 0 ? 1.5 : 1);
    p.vy = Math.max(p.vy, -PHYS.FALL_MAX);

    /* ---- move + collide ---- */
    const wasGrounded = p.grounded;
    p.grounded = false;

    // Y
    p.y += p.vy * dt;
    {
      const list = this.near(p.x, this.buf);
      for (const s of list) {
        if (s.kind === "spike") continue;
        if (p.x + PHYS.HW > s.x0 && p.x - PHYS.HW < s.x1 && p.z + PHYS.HW > s.z0 && p.z - PHYS.HW < s.z1) {
          if (p.y - PHYS.HH < s.y1 && p.y + PHYS.HH > s.y0) {
            if (p.vy <= 0 && p.y - PHYS.HH > s.y1 - 0.62 - Math.abs(p.vy * dt) - 0.02) {
              p.y = s.y1 + PHYS.HH;
              if (!wasGrounded && p.vy < -8) this.land(s.y1);
              p.vy = 0;
              p.grounded = true;
              p.spin = 0;
              p.spinAngle = 0;
            } else if (p.vy > 0) {
              p.y = s.y0 - PHYS.HH - 0.01;
              p.vy = -1.2;
              this.bonk(s);
            } else if (p.y < s.y0) {
              p.y = s.y0 - PHYS.HH - 0.01;
              p.vy = -1;
            }
          }
        }
      }
    }

    // X (with step-up assist so small ledges feel forgiving)
    const stepY = p.y + PHYS.STEP_UP;
    const prevX = p.x;
    p.x += p.vx * dt;
    if (this.overlapsAny(p.x, p.y, p.z, PHYS.HW, PHYS.HH)) {
      if (wasGrounded && !this.overlapsAny(p.x, stepY, p.z, PHYS.HW, PHYS.HH)) {
        p.y = stepY;
        this.fx.burst({ x: p.x, y: p.y - PHYS.HH, z: p.z }, { count: 4, color: "#cbe8ff", speed: 2.6, life: 0.3, size: 0.14 });
      } else {
        this.pushOut("x", p.vx);
        p.vx *= 0.06;
      }
    }
    void prevX;

    // Z
    const prevZ = p.z;
    p.z += p.vz * dt;
    if (this.overlapsAny(p.x, p.y, p.z, PHYS.HW, PHYS.HH)) {
      this.pushOut("z", p.vz);
      p.vz *= 0.06;
    }
    void prevZ;

    // gentle rail: keep the hero from wandering too far off the lane
    p.z = clamp(p.z, -14, 14);

    if (p.grounded) p.coyote = PHYS.COYOTE;
    else p.coyote = Math.max(0, p.coyote - dt);

    /* ---- hazards ---- */
    const spike = this.hits(p.x, p.y, p.z, PHYS.HW, PHYS.HH, true);
    if (spike && spike.kind === "spike" && p.invuln <= 0) this.hurt(true);
    if (p.invuln > 0) p.invuln -= dt;

    /* ---- coins ---- */
    this.coinCheck();
    this.enemyCheck(dt);
    this.pickupCheck(dt);
    this.progressChecks();

    /* ---- fall out of the world ---- */
    if (p.y - PHYS.HH < -5.6) {
      this.lives--;
      this.fx.flash("#ff4d5e", 0.5);
      this.fx.kick(0.6);
      sound.play("hurt");
      if (this.lives <= 0) this.beginDeath();
      else this.respawnAtCheckpoint();
    }

    /* ---- star ---- */
    if (p.star > 0) {
      p.star -= dt;
      if (Math.random() < 0.7) this.fx.trail({ x: p.x, y: p.y - 0.2, z: p.z }, ["#ffd34d", "#ff4d5e", "#4fc3f7", "#a06bff"][(Math.random() * 4) | 0], 1);
      if (p.star <= 0) { this.hero.aura.visible = false; this.say("STAR OVER"); }
    }
    if (this.streakT > 0) {
      this.streakT -= dt;
      if (this.streakT <= 0) this.streak = 0;
    }
  }

  private land(surfaceY: number) {
    const p = this.p;
    const impact = Math.min(1, Math.abs(p.vy) / 26 + 0.25);
    p.squash = 0.5 * impact;
    this.fx.ring({ x: p.x, y: surfaceY + 0.03, z: p.z }, { count: 7 + Math.round(impact * 7), color: "#fff4dc", speed: 4 + impact * 4, size: 0.18 });
    this.fx.kick(0.08 + impact * 0.12);
    this.fovPulse = Math.max(this.fovPulse, impact * 1.6);
    if (p.combo > 0) p.combo = 0;
    // slam
    if (p.spin > 0) this.doSlam(surfaceY);
  }

  private doSlam(surfaceY: number) {
    const p = this.p;
    const r = PHYS.SLAM_RADIUS;
    let hitsN = 0;
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      if (Math.hypot(e.x - p.x, (e.y + e.h * 0.5) - (p.y - PHYS.HH)) < r + 0.6 && Math.abs(e.z - p.z) < r) {
        this.killEnemy(e, 6, true);
        hitsN++;
      }
    }
    this.fx.ring({ x: p.x, y: surfaceY + 0.05, z: p.z }, { count: 26, color: "#ffd34d", speed: 15, size: 0.34 });
    this.fx.burst({ x: p.x, y: surfaceY + 0.3, z: p.z }, { count: 16, color: "#cbe8ff", speed: 10, life: 0.5, size: 0.22 });
    this.fx.kick(0.62);
    this.fx.flash("#fff4dc", 0.18);
    this.hitStop = 0.07;
    sound.play("slam");
    if (hitsN > 0) {
      this.addScore(SCORE.KILL * hitsN, { x: p.x, y: p.y + 1.1, z: p.z }, `SLAM x${hitsN}`);
      this.say("SHOCKWAVE!");
    }
  }

  private bonk(s: Solid) {
    const p = this.p;
    if (s.kind === "qblock" && !s.used) {
      s.used = true;
      s.bump = 0.28;
      if (s.mesh) s.mesh.material = MAT.qused;
      if (s.cap) s.cap.visible = false;
      const q = this.level!.qblocks[s.q];
      const top = { x: s.x0 + (s.x1 - s.x0) / 2, y: s.y1 + 0.35, z: s.z0 + (s.z1 - s.z0) / 2 };
      switch (q?.content ?? "coin") {
        case "coin":
          this.addScore(SCORE.BLOCK, top, "+100");
          this.coinCount++;
          sound.play("coin");
          this.fx.burst(top, { count: 12, color: "#ffd34d", speed: 6, up: 1.4, size: 0.2 });
          break;
        case "coins":
          for (let i = 0; i < 5; i++) {
            this.addScore(SCORE.COIN, { x: top.x + (i - 2) * 0.25, y: top.y + 0.2, z: top.z }, i === 2 ? "+500" : "");
            this.coinCount++;
          }
          sound.play("coin");
          setTimeout(() => sound.play("combo"), 90);
          this.fx.burst(top, { count: 26, color: "#ffd34d", speed: 8, up: 1.8, size: 0.22 });
          this.say("COIN FOUNTAIN!");
          break;
        case "points":
          this.addScore(500, top, "+500");
          break;
        case "star":
          this.spawnStar(top);
          break;
        case "oneup":
          this.lives++;
          sound.play("oneup");
          this.fx.burst(top, { count: 18, color: "#53c558", speed: 7, up: 1.5 });
          this.fx.text(top, "1-UP!", "#8effab", 34);
          this.say("EXTRA LIFE");
          break;
      }
      this.addScore(0, top, "");
      this.fx.kick(0.22);
      this.hitStop = 0.05;
      // knock enemies standing on the block
      for (const e of this.enemies) {
        if (e.state !== "walk") continue;
        if (Math.abs(e.y - s.y1) < 0.5 && e.x > s.x0 - 0.4 && e.x < s.x1 + 0.4 && e.z > s.z0 - 0.4 && e.z < s.z1 + 0.4) {
          e.flip = 1;
          e.vy = 9;
          this.killEnemy(e, 0, true);
        }
      }
    } else if (s.kind === "brick" || s.kind === "crate") {
      s.bump = 0.18;
      sound.play("bump");
      this.fx.burst({ x: p.x, y: s.y1 + 0.15, z: p.z }, { count: 7, color: "#d9b48a", speed: 4.5, size: 0.17, life: 0.42 });
      this.fx.kick(0.1);
    }
  }

  private spawnStar(at: { x: number; y: number; z: number }) {
    const g = buildStar();
    g.position.set(at.x, at.y + 0.4, at.z);
    this.levelGroup.add(g);
    this.starPickup = { x: at.x, y: at.y + 0.4, z: at.z, vy: 5.4, t: 0, group: g, live: true };
    sound.play("powerup");
    this.fx.burst(at, { count: 22, color: "#ffe86a", speed: 9, up: 1.4 });
    this.say("STAR BLOCK!");
  }

  private pickupCheck(dt: number) {
    const sp = this.starPickup;
    if (!sp || !sp.live) return;
    sp.t += dt;
    sp.vy -= 26 * dt;
    sp.y += sp.vy * dt;
    const gy = this.groundTop(sp.x, sp.y, sp.z, 0.3);
    if (sp.y < gy + 0.4) {
      sp.y = gy + 0.4;
      sp.vy = Math.abs(sp.vy) > 1.5 ? -sp.vy * 0.6 : 4.6;
    }
    sp.group.position.set(sp.x, sp.y, sp.z);
    sp.group.rotation.y += dt * 4;
    if (Math.random() < 0.4) this.fx.trail(sp, "#ffe86a", 1);
    const p = this.p;
    if (Math.hypot(p.x - sp.x, p.z - sp.z) < 1.1 && Math.abs(p.y - sp.y) < 1.3) {
      sp.live = false;
      sp.group.visible = false;
      p.star = PHYS.STAR_TIME;
      this.hero.aura.visible = true;
      this.addScore(SCORE.STAR, sp, "INVINCIBLE!");
      this.fx.flash("#ffe86a", 0.32);
      this.fx.kick(0.4);
      this.fx.burst(sp, { count: 34, color: "#ffd34d", speed: 13, life: 0.9 });
      sound.play("star");
      this.say("STAR POWER!");
    }
    if (sp.t > 14) { sp.live = false; sp.group.visible = false; }
  }

  private coinCheck() {
    const p = this.p;
    const k = Math.floor(p.x / SLAB);
    for (let i = k - 1; i <= k + 1; i++) {
      const arr = this.coinGrid.get(i);
      if (!arr) continue;
      for (const idx of arr) {
        const c = this.coins[idx];
        if (c.taken) continue;
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const dz = p.z - c.z;
        if (dx * dx + dz * dz < 1.05 && Math.abs(dy) < 1.15) {
          c.taken = 0.001;
          this.coinCount++;
          this.streak++;
          this.streakT = 1.5;
          const mult = this.p.star > 0 ? 2 : 1;
          const gain = SCORE.COIN * mult + Math.min(120, (this.streak - 1) * 10);
          this.score += gain;
          sound.play("coin");
          this.fx.burst(c, { count: 6, color: "#ffe86a", speed: 3.6, life: 0.36, size: 0.15, up: 1.1 });
          if (this.coinCount % 10 === 0) {
            this.fx.text(c, `${this.coinCount} COINS`, "#ffd34d", 28);
            this.fx.kick(0.14);
          }
          this.emit();
        }
      }
    }
  }


  private enemyCheck(dt: number) {
    void dt;
    const p = this.p;
    for (const e of this.enemies) {
      if (e.state === "dead") continue;
      const dx = Math.abs(p.x - e.x);
      const dz = Math.abs(p.z - e.z);
      if (dx > 1.1 || dz > 1.1) continue;
      const feet = p.y - PHYS.HH;
      const eTop = e.y + e.h;
      const overlapY = feet < eTop + 0.12 && p.y - PHYS.HH > e.y - 0.3;
      if (e.state === "slide") {
        if (p.star > 0) { this.killEnemy(e, 0, true); continue; }
        if (overlapY && p.invuln <= 0) this.hurt(true);
        continue;
      }
      if (e.state === "shell") {
        // any touch kicks the shell; stomping from above adds a small hop so
        // the player can never bounce on the same parked shell forever
        this.stompShell(e);
        if (p.vy < -1 && overlapY) p.vy = 4.5;
        continue;
      }
      const canStomp = p.vy < -0.6 && feet > eTop - 0.5 && feet < eTop + 0.45;
      if (canStomp) {
        this.stompOn(e);
      } else if (overlapY) {
        if (p.star > 0) this.killEnemy(e, 0, true);
        else if (p.spin > 0) this.killEnemy(e, 3, true);
        else if (p.invuln <= 0) this.hurt(false);
      }
    }
  }

  private stompOn(e: Enemy) {
    const p = this.p;
    e.flip = 1;
    p.combo = Math.min(p.combo + 1, COMBO_MULT.length - 1);
    this.maxCombo = Math.max(this.maxCombo, p.combo);
    const mult = COMBO_MULT[p.combo];
    this.killEnemy(e, mult, false);
    p.vy = this.input.jump ? PHYS.BOUNCE_HELD : PHYS.BOUNCE;
    p.squash = 0.36;
    this.hitStop = 0.055;
    this.fx.kick(0.34);
    this.fx.flash("#fff4dc", 0.1);
    sound.play("stomp");
    if (p.combo >= 2) {
      sound.play("combo");
      this.say(`COMBO x${mult}`);
    }
  }

  private stompShell(e: Enemy) {
    const p = this.p;
    // any touch kicks the shell away — never a passive trampoline
    e.state = "slide";
    e.vx = (p.x <= e.x ? 1 : -1) * 9.5;
    e.t = 0;
    sound.play("block");
    this.fx.burst(e, { count: 10, color: "#2fbf6d", speed: 6 });
    this.addScore(120, { x: e.x, y: e.y + 1, z: e.z }, "KICK!");
    e.flip = 0.4;
  }

  private killEnemy(e: Enemy, mult: number, splash: boolean) {
    if (e.state === "dead") return;
    e.state = "dead";
    e.flip = 1;
    this.kills++;
    const base = SCORE.KILL * Math.max(1, mult);
    this.addScore(base, { x: e.x, y: e.y + 1.1, z: e.z }, mult > 1 ? `+${base}` : `+${base}`);
    const col = e.kind === "koopa" ? "#2fbf6d" : "#a5682f";
    this.fx.burst({ x: e.x, y: e.y + 0.4, z: e.z }, { count: splash ? 18 : 12, color: col, speed: 8, size: 0.24, life: 0.6 });
    this.fx.ring({ x: e.x, y: e.y + 0.1, z: e.z }, { count: 8, color: "#fff4dc", speed: 7, size: 0.18 });
  }

  private addScore(n: number, at: { x: number; y: number; z: number }, text: string) {
    this.score += n;
    if (text) this.fx.text(at, text, "#fff4dc", 30);
    this.emit(true);
  }

  private hurt(strong: boolean) {
    const p = this.p;
    if (p.invuln > 0 || p.star > 0) return;
    this.lives--;
    p.invuln = PHYS.INVULN;
    p.vy = strong ? 11 : 8;
    p.vx *= -0.35;
    p.vz = -p.vz * 0.3;
    this.slowmo = 0.42;
    this.fx.kick(0.7);
    this.fx.flash("#ff4d5e", 0.5);
    this.fx.burst({ x: p.x, y: p.y, z: p.z }, { count: 20, color: "#ff4d5e", speed: 9, life: 0.6 });
    sound.play("hurt");
    p.combo = 0;
    if (this.lives <= 0) {
      this.beginDeath();
      return;
    }
    this.say("OUCH! " + this.lives + " LEFT");
    if (strong) this.respawnAtCheckpoint();
  }

  private respawnAtCheckpoint() {
    const cp = this.checkpoints[this.checkpointIdx];
    const at = cp ? { x: cp.x + 1.6, y: cp.y + PHYS.HH + 1.2, z: cp.z } : { ...this.respawn, y: this.respawn.y + 1.2 };
    this.resetPlayer(at.x, at.y, at.z, true);
    this.fx.burst(at, { count: 22, color: "#4fc3f7", speed: 8, life: 0.7 });
    this.fx.flash("#4fc3f7", 0.3);
    this.p.invuln = 1.8;
  }

  private beginDeath() {
    const p = this.p;
    p.vy = 14;
    p.vx = 0;
    p.vz = 0;
    this.deathT = 0;
    this.slowmo = 0;
    this.lives = 0;
    this.setPhase("dying");
    this.fx.kick(0.9);
    this.fx.flash("#ff4d5e", 0.55);
    sound.play("gameover");
  }

  private progressChecks() {
    const p = this.p;
    const lvl = this.level!;
    // checkpoints
    for (let i = 0; i < this.checkpoints.length; i++) {
      const c = this.checkpoints[i];
      if (c.on) continue;
      if (Math.abs(p.x - c.x) < 1.5 && Math.abs(p.y - c.y) < 2.2) {
        c.on = true;
        this.checkpointIdx = i;
        this.respawn = { x: c.x, y: c.y, z: c.z };
        this.addScore(SCORE.CHECKPOINT, { x: c.x, y: c.y + 2.4, z: c.z }, "CHECKPOINT!");
        sound.play("checkpoint");
        this.say("CHECKPOINT");
        const flag = c.group.getObjectByName("flag") as THREE.Mesh | undefined;
        if (flag) (flag.material as THREE.MeshLambertMaterial).color.set(0x33e07a);
        this.fx.ring({ x: c.x, y: c.y + 0.4, z: c.z }, { count: 20, color: "#33e07a", speed: 10 });
        this.fx.kick(0.25);
      }
    }
    // flag
    if (p.x > lvl.flag.x - 1.15 && p.x < lvl.flag.x + 1.6 && Math.abs(p.z - lvl.flag.z) < 3.4) {
      this.beginClear();
    }
  }

  private beginClear() {
    const p = this.p;
    this.setPhase("clearing");
    this.clearT = 0;
    p.vx = p.vy = p.vz = 0;
    p.spin = 0;
    sound.play("flag");
    this.fx.kick(0.5);
    this.fx.flash("#fff4dc", 0.4);
    this.say("FLAG!");
  }

  private finishRun(cleared: boolean) {
    const par = (this.level?.length ?? 300) / 5.4;
    const secs = this.timeMs / 1000;
    const timeBonus = cleared ? Math.round(Math.max(0, par - secs) * 30) : 0;
    const lifeBonus = cleared ? this.lives * SCORE.LIFE_BONUS : 0;
    const coinBonus = cleared ? this.coinCount * 25 : 0;
    if (cleared) this.score += SCORE.CLEAR + timeBonus + lifeBonus + coinBonus;
    this.lastResult = {
      score: Math.round(this.score),
      coins: this.coinCount,
      coinTotal: this.level?.coinTotal ?? 0,
      kills: this.kills,
      maxCombo: this.maxCombo,
      livesLeft: Math.max(0, this.lives),
      timeMs: this.timeMs,
      cleared,
      progress: this.level ? clamp((this.p.x - this.level.spawn.x) / (this.level.flag.x - this.level.spawn.x), 0, 1) : 0,
      seedLabel: seedToLabel(this.seed),
      timeBonus,
      clearBonus: cleared ? SCORE.CLEAR + lifeBonus : 0,
      coinBonus,
    };
    this.setPhase(cleared ? "clear" : "dead");
    this.onEnd(this.lastResult);
    if (cleared) this.fx.burst({ x: this.p.x, y: this.p.y + 1.4, z: this.p.z }, { count: 60, color: "#ffd34d", speed: 14, life: 1.4, size: 0.3 });
    this.emit(true);
  }

  getResult() {
    return this.lastResult;
  }

  /* -------------------------------------------------------- world step */

  private updateEnemies(dt: number) {
    const px = this.p.x;
    for (const e of this.enemies) {
      if (Math.abs(e.x - px) > 46) {
        // far away: skip sim but keep visual parked
        continue;
      }
      e.t += dt;
      if (e.state === "dead") {
        e.flip += dt;
        e.vy -= PHYS.GRAVITY * 0.62 * dt;
        e.y += e.vy * dt;
        e.x += e.vx * dt;
        e.group.position.set(e.x, e.y, e.z);
        e.group.rotation.z += dt * 5.5;
        if (e.flip < 0.16) e.group.scale.set(1.55, 0.3, 1.55);
        else {
          const k = clamp(1.35 - (e.flip - 0.16) * 2.1, 0.02, 1.2);
          e.group.scale.set(k, k * 0.55, k);
        }
        if (e.y < -8 || e.flip > 0.8) e.group.visible = false;
        continue;
      }
      if (e.state === "walk") {
        const speed = e.kind === "flyer" ? 1.5 : e.kind === "koopa" ? 2.1 : 1.7;
        e.vx = e.dir * speed;
        e.vz = 0;
      } else if (e.state === "slide") {
        e.t += dt;
      }

      if (e.kind !== "flyer") {
        e.vy -= PHYS.GRAVITY * dt;
        e.vy = Math.max(e.vy, -26);
      } else {
        e.vy = Math.sin(e.t * 2.2 + e.seed) * 2.4;
      }

      const nx = e.x + e.vx * dt;
      const ny = e.y + e.vy * dt;

      // ground
      const gy = this.groundTop(e.x, e.y + 0.1, e.z, 0.3);
      e.grounded = e.kind === "flyer" ? false : ny <= gy + 0.04 && Math.abs(e.y - gy) < 1.6;

      // edge + wall detection for walkers
      if (e.state === "walk") {
        const ahead = this.groundTop(nx + e.dir * 0.55, e.y + 0.2, e.z, 0.28);
        const wall = this.hits(nx + e.dir * 0.34, e.y + e.h * 0.5, e.z, 0.3, e.h * 0.42);
        if (e.kind === "flyer") {
          if (Math.abs(nx - e.home) > e.range + 1.6) e.dir *= -1;
        } else if ((e.grounded && ahead < e.y - 0.4) || wall) e.dir *= -1;
        else if (Math.abs(nx - e.home) > e.range) e.dir = nx > e.home ? -1 : 1;
      } else if (e.state === "slide") {
        const wall = this.hits(nx + Math.sign(e.vx) * 0.36, e.y + 0.2, e.z, 0.34, 0.3);
        if (wall) {
          e.vx = -e.vx * 0.86;
          this.fx.burst({ x: e.x, y: e.y + 0.3, z: e.z }, { count: 8, color: "#fff4dc", speed: 5 });
          this.fx.kick(0.12);
        }
        // sliding shells wipe out other enemies -> combo chains
        for (const o of this.enemies) {
          if (o === e || o.state === "dead") continue;
          if (Math.abs(o.x - e.x) < 0.85 && Math.abs(o.z - e.z) < 0.9 && Math.abs(o.y - e.y) < 1) {
            o.vx = e.vx * 0.7;
            this.killEnemy(o, 2, true);
            this.fx.kick(0.24);
          }
        }
        if (Math.abs(e.vx) < 3 && e.t > 0.6) e.state = "shell";
        e.vx *= 1 - 0.35 * dt;
      }

      e.x = nx;
      if (e.kind !== "flyer") {
        e.y = ny;
        const gy2 = this.groundTop(e.x, e.y + 0.4, e.z, 0.3);
        if (e.y < gy2 && e.vy <= 0) {
          e.y = gy2;
          e.vy = 0;
        }
      } else {
        e.y = e.baseY + Math.sin(e.t * 2.2 + e.seed) * 0.85;
        if (Math.abs(e.x - e.home) > e.range) e.dir = e.x > e.home ? -1 : 1;
      }
      e.z += e.vz * dt;
      if (e.y < -9) { e.state = "dead"; e.flip = 3; }

      // visuals
      const g = e.group;
      g.position.set(e.x, e.y, e.z);
      if (e.state === "slide" || (e.state === "shell" && e.kind === "koopa")) {
        g.rotation.y += dt * (e.state === "slide" ? 22 : 3);
        g.scale.set(1.05, 0.72 + Math.sin(e.t * 20) * 0.06, 1.05);
      } else {
        g.rotation.y = e.vx >= 0 ? Math.PI / 2 : -Math.PI / 2;
        const wob = Math.sin(e.t * 11) * 0.12;
        g.scale.set(1 + wob * 0.5, 1 - wob * 0.5, 1);
      }
      if (e.head) e.head.visible = e.state === "walk";
      if (e.wingL) {
        const f = Math.sin(e.t * 22) * 0.8;
        e.wingL.rotation.z = 0.5 + f;
        e.wingR!.rotation.z = -0.5 - f;
      }
    }
  }

  /* ------------------------------------------------------------ render */

  private updateHeroVisual(dt: number) {
    const p = this.p;
    const h = this.hero;
    const now = performance.now() / 1000;
    h.root.position.set(p.x, p.y, p.z);
    if (this.phase === "menu") p.facing = Math.PI + Math.sin(now * 0.55) * 0.55;
    const speed = Math.hypot(p.vx, p.vz);
    const target = p.spin > 0 ? p.spinAngle : p.facing;
    const cur = h.root.rotation.y;
    h.root.rotation.y = cur + ((Math.atan2(Math.sin(target - cur), Math.cos(target - cur))) * Math.min(1, dt * (p.spin > 0 ? 40 : 18)));

    if (p.spin > 0) {
      h.body.rotation.z = 0.12;
      h.legL.position.y = 0.3;
      h.legR.position.y = 0.3;
    } else if (!p.grounded) {
      const t = clamp(p.vy / 14, -1, 1);
      h.legL.rotation.x = -0.5 - t * 0.2;
      h.legR.rotation.x = 0.35;
      h.armL.rotation.x = -1.5;
      h.armR.rotation.x = -1.2;
      h.body.rotation.z *= 1 - dt * 8;
    } else {
      p.runPhase += dt * (4 + speed * 1.8);
      const s = Math.sin(p.runPhase) * Math.min(1, speed / 6) * 0.85;
      h.legL.rotation.x = s;
      h.legR.rotation.x = -s;
      h.armL.rotation.x = -s * 0.8;
      h.armR.rotation.x = s * 0.8;
      h.legL.position.y = h.legR.position.y = 0.42;
      h.body.position.y = -0.68 + Math.abs(Math.sin(p.runPhase)) * 0.05 * Math.min(1, speed / 6);
      h.body.rotation.z *= 1 - dt * 10;
      h.head.rotation.z = Math.sin(p.runPhase * 0.5) * 0.04;
    }

    // squash & stretch
    p.squash = lerp(p.squash, 0, dt * 9);
    const sq = p.squash;
    h.body.scale.set(1 - sq * 0.34, 1 + sq * 0.42, 1 - sq * 0.34);

    // blink while invulnerable; hide the body entirely in first person
    const fp = this.camMode === "fp" && (this.phase === "playing" || this.phase === "paused");
    const vis = p.invuln > 0 && this.phase === "playing" ? (Math.floor(p.invuln * 14) % 2 === 0 ? 0.35 : 1) : 1;
    h.root.visible = !fp && (vis > 0.5 || this.phase !== "playing");
    (h.body.children[0] as THREE.Mesh).visible = true;
    if (vis < 1) h.body.scale.multiplyScalar(0.999);

    // star aura
    if (p.star > 0) {
      h.aura.visible = true;
      h.aura.rotation.z += dt * 6;
      h.aura.position.y = -0.2 + Math.sin(p.star * 8) * 0.08;
      const m = h.aura.material as THREE.MeshBasicMaterial;
      m.color.setHSL((performance.now() / 500) % 1, 0.9, 0.62);
      m.opacity = 0.5 + 0.4 * Math.sin(p.star * 12);
    }

    // blob shadow (meaningless from inside the head)
    if (this.camMode === "fp" && (this.phase === "playing" || this.phase === "paused")) {
      this.heroShadow.visible = false;
      return;
    }
    const gy = this.groundTop(p.x, p.y, p.z, PHYS.HW);
    const dist = p.y - PHYS.HH - gy;
    if (gy > -900 && dist < 9) {
      this.heroShadow.visible = true;
      const k = clamp(1 - dist / 9, 0.15, 1);
      this.heroShadow.position.set(p.x, gy + 0.03, p.z);
      this.heroShadow.scale.setScalar(k);
      (this.heroShadow.material as THREE.MeshBasicMaterial).opacity = 0.34 * k;
    } else this.heroShadow.visible = false;
  }

  private updateCoins(dt: number) {
    const d = this.dummy;
    const t = performance.now() / 1000;
    const px = this.p.x;
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      const active = Math.abs(c.x - px) < 44;
      if (!active && !c.taken) continue;
      if (c.taken > 0) {
        c.taken += dt;
        const k = c.taken / 0.26;
        if (k >= 1) {
          d.scale.setScalar(0);
          d.position.set(c.x, c.y, c.z);
          d.rotation.set(0, 0, 0);
        } else {
          d.position.set(c.x, c.y + k * 1.15, c.z);
          d.rotation.set(0, k * 9, k * 2);
          d.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.55);
        }
      } else {
        d.position.set(c.x, c.base + Math.sin(t * 2.4 + c.x * 0.7) * 0.14, c.z);
        d.rotation.set(0, t * 2.6 + c.x, 0);
        d.scale.setScalar(1);
      }
      d.updateMatrix();
      this.coinMesh.setMatrixAt(i, d.matrix);
    }
    this.coinMesh.instanceMatrix.needsUpdate = true;
  }

  private updateCamera(dt: number, time: number) {
    const p = this.p;
    const lvl = this.level;
    if (!lvl) return;
    let tx: number, ty: number, tz: number, lx: number, ly: number, lz: number;

    if (this.phase === "menu") {
      const a = time * 0.16;
      const cx = lvl.spawn.x + 4 + Math.cos(a) * 15;
      const cz = 2 + Math.sin(a) * 13;
      tx = cx; ty = 5.2 + Math.sin(a * 1.3) * 1.4; tz = cz;
      lx = lvl.spawn.x + 4; ly = 1.4; lz = 0;
    } else {
      // ease camera yaw behind the hero's motion
      const sp = Math.hypot(p.vx, p.vz);
      if (sp > 1.2 && this.phase === "playing") {
        const target = Math.atan2(p.vx, p.vz);
        let d = target - this.camYaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.camYaw += d * Math.min(1, dt * 3.2);
      }
      const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw);
      const fpView = this.camMode === "fp" && (this.phase === "playing" || this.phase === "paused");
      if (fpView) {
        // first person: eyes at head height, look along camera yaw
        const eye = p.y + 1.12;
        tx = p.x; ty = eye; tz = p.z;
        lx = p.x + sy * 6; ly = eye - 0.12; lz = p.z + cy * 6;
      } else {
        // third person: hover behind the hero along camera yaw
        const dist = 10.5 + Math.min(2.5, sp * 0.22);
        tx = p.x - sy * dist;
        ty = Math.max(p.y + 4.3, 3.4);
        tz = p.z - cy * dist;
        lx = p.x + sy * 1.6;
        ly = p.y + 1.05;
        lz = p.z + cy * 1.6;
      }
    }
    const k = this.phase === "menu" ? dt * 1.4 : dt * (this.camMode === "fp" ? 14 : this.phase === "clearing" ? 3.2 : 6.4);
    this.camPos.x = lerp(this.camPos.x, tx, k);
    this.camPos.y = lerp(this.camPos.y, ty, k * 1.25);
    this.camPos.z = lerp(this.camPos.z, tz, k);
    this.camLook.x = lerp(this.camLook.x, lx, k * 1.6);
    this.camLook.y = lerp(this.camLook.y, ly, k * 1.5);
    this.camLook.z = lerp(this.camLook.z, lz, k * 1.6);

    this.fx.shakeOffset(this.shakeVel);
    this.cam.position.copy(this.camPos).add(this.shakeVel);
    this.cam.lookAt(this.camLook);
    if (this.phase !== "menu") this.cam.rotation.z += this.shakeVel.x * 0.06;

    const targetFov = (this.camMode === "fp" ? 68 : 58) + this.fovPulse + (this.p.star > 0 ? 3 : 0);
    if (Math.abs(this.cam.fov - targetFov) > 0.02) {
      this.cam.fov = lerp(this.cam.fov, targetFov, dt * 8);
      this.cam.updateProjectionMatrix();
    }
    this.fovPulse = lerp(this.fovPulse, 0, dt * 6);

    // clouds drift with the player for an "endless sky" feel
    if (this.phase !== "menu") {
      const cd = this.dummy;
      for (let i = 0; i < 30; i++) {
        const bx = p.x + ((i * 17.3) % 150) - 40;
        cd.position.set(bx, 13 + Math.sin(i * 2.1) * 7, -34 - ((i * 29) % 110));
        cd.scale.set(9 + (i % 4) * 4, 2.4 + (i % 3) * 0.6, 6 + (i % 5) * 2);
        cd.rotation.set(0, 0, 0);
        cd.updateMatrix();
        this.clouds.setMatrixAt(i, cd.matrix);
      }
      this.clouds.instanceMatrix.needsUpdate = true;
    }

    // block bump animation + flag wave
    for (const s of this.solids) {
      if (s.bump > 0) {
        s.bump = Math.max(0, s.bump - dt * 1.6);
        const o = Math.sin((1 - s.bump / 0.28) * Math.PI) * 0.3;
        if (s.mesh) s.mesh.position.y = (s.y0 + s.y1) / 2 + o;
        if (s.cap) s.cap.position.y = s.y1 - 0.2 + o;
      }
    }
    if (this.flagMesh) {
      const pos = this.flagMesh.geometry.attributes.position as THREE.BufferAttribute;
      if (!this.flagMesh.userData.base) this.flagMesh.userData.base = pos.array.slice(0);
      const base = this.flagMesh.userData.base as Float32Array;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        pos.array[i * 3 + 2] = Math.sin(x * 3 + time * 7) * 0.16 * (x + 0.75);
      }
      pos.needsUpdate = true;
    }
  }

  /* --------------------------------------------------------------- loop */

  private tick = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.tick);
    const now = performance.now();
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.1) dt = 0.1;
    const time = now / 1000;

    let sim = dt;
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      sim = 0;
    }
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      sim *= 0.32;
    }
    if (this.phase !== "paused") {
      this.acc += sim;
      const fixed = 1 / 120;
      let guard = 0;
      while (this.acc >= fixed && guard++ < 5) {
        this.step(fixed);
        if (this.phase === "playing" || this.phase === "menu") this.updateEnemies(fixed);
        this.acc -= fixed;
      }
      if (guard >= 5) this.acc = 0;
    }

      this.updateHeroVisual(sim);
    if (this.coinMesh) this.updateCoins(sim);
    this.updateCamera(dt, time);
    this.fx.update(dt, this.size.w, this.size.h, this.size.dpr, this.hitStop > 0);
    this.emit();
    this.renderer.render(this.scene, this.cam);
  };

  /* ------------------------------------------------------------- cleanup */

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.onBlur);
    sound.stopMusic();
    this.disposeLevelMeshes();
    this.renderer.dispose();
  }
}

/** solid material + shared geometry cache for level props */
