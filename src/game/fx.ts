import * as THREE from "three";
import { tiledBox } from "./textures";

const MAX_P = 900;

interface P {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number; size: number; grav: number;
  r: number; g: number; b: number;
  spin: number; rot: number; fade: boolean;
}

interface T3 {
  x: number; y: number; z: number;
  text: string; color: string; life: number; max: number; size: number; vy: number;
}

const dummy = new THREE.Object3D();
const c = new THREE.Color();

export class Fx {
  private mesh: THREE.InstancedMesh;
  private pool: P[] = [];
  private texts: T3[] = [];
  private alive = 0;
  shake = 0;
  private shakeMax = 1;
  flashA = 0;
  flashColor = "#ffffff";
  private cam: THREE.Camera;
  private ctx: CanvasRenderingContext2D;
  private v = new THREE.Vector3();

  constructor(scene: THREE.Scene, cam: THREE.Camera, ctx: CanvasRenderingContext2D) {
    this.cam = cam;
    this.ctx = ctx;
    const geo = tiledBox(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: false, transparent: true, opacity: 1 });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX_P);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < MAX_P; i++) {
      this.pool.push({
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, grav: 1,
        r: 1, g: 1, b: 1, spin: 0, rot: 0, fade: true,
      });
    }
    scene.add(this.mesh);
  }

  spawn(n: number, fn: (p: P, i: number) => void) {
    for (let k = 0; k < n; k++) {
      if (this.alive >= MAX_P) return;
      const p = this.pool[this.alive++];
      p.life = 0;
      p.grav = 1;
      p.size = 0.24;
      p.spin = 0;
      p.rot = 0;
      p.fade = true;
      p.vx = p.vy = p.vz = 0;
      p.r = p.g = p.b = 1;
      fn(p, k);
    }
  }

  burst(
    pos: THREE.Vector3 | { x: number; y: number; z: number },
    opts: { count?: number; color?: string | number; speed?: number; life?: number; size?: number; grav?: number; up?: number; spread?: number } = {}
  ) {
    const count = opts.count ?? 14;
    const col = typeof opts.color === "number" ? new THREE.Color(opts.color) : new THREE.Color(opts.color ?? "#ffd34d");
    const speed = opts.speed ?? 7;
    const life = opts.life ?? 0.65;
    const size = opts.size ?? 0.24;
    const grav = opts.grav ?? 1;
    const up = opts.up ?? 0.5;
    const spread = opts.spread ?? 1;
    this.spawn(count, (p, i) => {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.7;
      const s = speed * (0.55 + Math.random() * 0.7);
      p.x = pos.x + Math.cos(a) * 0.22 * spread;
      p.y = pos.y + Math.sin(a) * 0.18 * spread;
      p.z = pos.z + Math.sin(a * 2.1) * 0.22 * spread;
      p.vx = Math.cos(a) * s * spread;
      p.vz = Math.sin(a) * s * 0.7 * spread;
      p.vy = s * up + Math.random() * 2.6;
      p.max = life * (0.7 + Math.random() * 0.6);
      p.grav = grav;
      p.size = size * (0.6 + Math.random() * 0.8);
      p.spin = (Math.random() - 0.5) * 16;
      c.copy(col);
      const j = 0.9 + Math.random() * 0.2;
      p.r = c.r * j;
      p.g = c.g * j;
      p.b = c.b * j;
    });
  }

  /** flat expanding disc of sparks, used for slams and landings */
  ring(pos: { x: number; y: number; z: number }, opts: { count?: number; color?: string | number; speed?: number; size?: number } = {}) {
    const count = opts.count ?? 18;
    const col = new THREE.Color(opts.color ?? "#fff4dc");
    const speed = opts.speed ?? 9;
    const size = opts.size ?? 0.3;
    this.spawn(count, (p, i) => {
      const a = (i / count) * Math.PI * 2;
      p.x = pos.x;
      p.y = pos.y + 0.08;
      p.z = pos.z;
      p.vx = Math.cos(a) * speed;
      p.vz = Math.sin(a) * speed;
      p.vy = 1.6 + Math.random() * 2.4;
      p.max = 0.45 + Math.random() * 0.25;
      p.grav = 0.7;
      p.size = size * (0.7 + Math.random() * 0.6);
      p.spin = (Math.random() - 0.5) * 10;
      p.r = col.r;
      p.g = col.g;
      p.b = col.b;
    });
  }

  trail(pos: { x: number; y: number; z: number }, color: string | number, n = 2) {
    const col = new THREE.Color(color);
    this.spawn(n, (p) => {
      p.x = pos.x + (Math.random() - 0.5) * 0.5;
      p.y = pos.y + (Math.random() - 0.5) * 0.6;
      p.z = pos.z + (Math.random() - 0.5) * 0.5;
      p.vx = (Math.random() - 0.5) * 1.5;
      p.vy = 1.4 + Math.random();
      p.vz = (Math.random() - 0.5) * 1.5;
      p.max = 0.34 + Math.random() * 0.2;
      p.grav = 0.1;
      p.size = 0.16 + Math.random() * 0.14;
      p.r = col.r;
      p.g = col.g;
      p.b = col.b;
    });
  }

  text(pos: { x: number; y: number; z: number }, text: string, color = "#fff4dc", size = 30, life = 0.95) {
    if (this.texts.length > 26) this.texts.shift();
    this.texts.push({ x: pos.x, y: pos.y, z: pos.z, text, color, life: 0, max: life, size, vy: 1.5 });
  }

  kick(amount: number) {
    this.shake = Math.min(this.shakeMax, this.shake + amount);
  }

  flash(color: string, a = 0.5) {
    this.flashColor = color;
    this.flashA = Math.max(this.flashA, a);
  }

  /** returns camera offset for the current shake */
  shakeOffset(out: THREE.Vector3) {
    const s = this.shake * this.shake * 0.55;
    out.set((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s * 0.6);
  }

  update(dt: number, w: number, h: number, dpr: number, frozen: boolean) {
    const step = frozen ? 0 : dt;
    // ---- particles
    let n = this.alive;
    for (let i = 0; i < n; i++) {
      const p = this.pool[i];
      p.life += step;
      if (p.life >= p.max) {
        const last = this.pool[--n];
        this.pool[n] = p;
        this.pool[i] = last;
        i--;
        continue;
      }
      p.vy -= 26 * p.grav * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.z += p.vz * step;
      p.rot += p.spin * step;
      const t = p.life / p.max;
      const sc = p.size * (1 - t * t * 0.85);
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.rot, p.rot * 0.7, p.rot * 0.4);
      dummy.scale.setScalar(Math.max(0.001, sc));
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
      this.mesh.setColorAt(i, c.setRGB(p.r, p.g, p.b));
    }
    this.alive = n;
    this.mesh.count = Math.max(n, 1);
    if (n === 0) {
      dummy.scale.setScalar(0);
      dummy.position.set(0, -999, 0);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(0, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    // ---- shake / flash decay
    this.shake = Math.max(0, this.shake - dt * (this.shake > 0.55 ? 2.6 : 1.9));
    this.flashA = Math.max(0, this.flashA - dt * 2.2);

    // ---- 2D overlay
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (this.flashA > 0.002) {
      ctx.globalAlpha = Math.min(0.85, this.flashA);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life += dt;
      t.y += t.vy * dt;
      t.vy *= 0.94;
      if (t.life >= t.max) {
        this.texts.splice(i, 1);
        continue;
      }
      this.v.set(t.x, t.y, t.z).project(this.cam);
      if (this.v.z > 1) continue;
      const sx = (this.v.x * 0.5 + 0.5) * w;
      const sy = (-this.v.y * 0.5 + 0.5) * h;
      const k = t.life / t.max;
      const pop = k < 0.18 ? 0.6 + (k / 0.18) * 0.55 : 1.15 - (k - 0.18) * 0.2;
      const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      const size = t.size * pop * THREE.MathUtils.clamp(46 / Math.max(12, this.cam.position.distanceTo(this.v.set(t.x, t.y, t.z))) * 1.1, 0.62, 1.5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `${size}px "Titan One", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = Math.max(3, size * 0.24);
      ctx.strokeStyle = "rgba(9,32,46,.92)";
      ctx.lineJoin = "round";
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
      ctx.restore();
    }
  }

  clearAll() {
    this.alive = 0;
    this.mesh.count = 0;
    this.texts.length = 0;
    this.shake = 0;
    this.flashA = 0;
  }
}
