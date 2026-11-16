import * as THREE from "three";
import { COLORS } from "./constants";
import { TEX } from "./textures";

const lambert = (color: number, extra: Partial<THREE.MeshLambertMaterialParameters> = {}) =>
  new THREE.MeshLambertMaterial({ color, ...extra });

export const MAT = {
  grass: lambert(0xffffff, { map: TEX.grass() }),
  dirt: lambert(0xffffff, { map: TEX.dirt() }),
  dirtblock: lambert(0xffffff, { map: TEX.dirt() }),
  brick: lambert(0xffffff, { map: TEX.brick() }),
  stone: lambert(0xffffff, { map: TEX.stone() }),
  cloud: lambert(0xffffff, { map: TEX.cloud() }),
  crate: lambert(0xffffff, { map: TEX.crate() }),
  sand: lambert(0xffffff, { map: TEX.sand() }),
  qblock: lambert(0xfff0c0, { map: TEX.qblock(), emissive: 0x422a00 }),
  qused: lambert(0xffffff, { map: TEX.qused() }),
  pipe: lambert(0xffffff, { map: TEX.pipe() }),
  spike: lambert(0xdfe8ef, { emissive: 0x101820 }),
  gold: lambert(COLORS.coin, { emissive: 0x6a4400 }),
  red: lambert(COLORS.capRed),
  blue: lambert(COLORS.overall),
  skin: lambert(COLORS.skin),
  shoe: lambert(COLORS.shoe),
  dark: lambert(0x2b2118),
  white: lambert(0xfffaf0),
  eye: lambert(0x14181f),
  goomba: lambert(COLORS.goomba),
  goombaDark: lambert(0x7c4a1e),
  koopa: lambert(COLORS.koopa),
  koopaBody: lambert(0xffe1a8),
  star: lambert(0xffdf4f, { emissive: 0x9c7a00 }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x06202e, transparent: true, opacity: 0.3 }),
};

const box = (w: number, h: number, d: number, m: THREE.Material) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = false;
  return mesh;
}

function put(mesh: THREE.Mesh, x: number, y: number, z: number) {
  mesh.position.set(x, y, z);
  return mesh;
}

/* ------------------------------------------------------------------ hero */

export interface HeroParts {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  cap: THREE.Object3D;
  head: THREE.Object3D;
  aura: THREE.Mesh;
}

export function buildHero(): HeroParts {
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = -0.68; // model origin = feet
  root.add(body);

  const legL = new THREE.Group();
  legL.add(put(box(0.26, 0.36, 0.3, MAT.blue), 0, -0.18, 0));
  legL.add(put(box(0.32, 0.16, 0.44, MAT.shoe), 0, -0.36, 0.05));
  legL.position.set(-0.16, 0.42, 0);
  const legR = legL.clone();
  legR.position.x = 0.16;

  const armL = new THREE.Group();
  armL.add(put(box(0.17, 0.34, 0.2, MAT.red), 0, -0.15, 0));
  armL.add(put(box(0.2, 0.18, 0.22, MAT.white), 0, -0.34, 0.02));
  armL.position.set(-0.36, 0.9, 0);
  const armR = armL.clone();
  armR.position.x = 0.36;

  const torso = box(0.62, 0.46, 0.46, MAT.blue);
  put(torso, 0, 0.66, 0);
  const chest = box(0.66, 0.3, 0.5, MAT.red);
  put(chest, 0, 0.9, 0);
  const straps = box(0.5, 0.1, 0.06, MAT.blue);
  put(straps, 0, 1.0, 0.26);

  const head = new THREE.Group();
  head.add(put(box(0.46, 0.38, 0.42, MAT.skin), 0, 0, 0));
  head.add(put(box(0.12, 0.12, 0.14, MAT.skin), 0, -0.04, 0.25));
  head.add(put(box(0.3, 0.08, 0.06, MAT.dark), 0, -0.13, 0.22));
  head.add(put(box(0.09, 0.11, 0.05, MAT.white), -0.1, 0.05, 0.21));
  head.add(put(box(0.09, 0.11, 0.05, MAT.white), 0.1, 0.05, 0.21));
  head.add(put(box(0.045, 0.07, 0.04, MAT.eye), -0.09, 0.045, 0.24));
  head.add(put(box(0.045, 0.07, 0.04, MAT.eye), 0.09, 0.045, 0.24));
  head.position.set(0, 1.16, 0);

  const cap = new THREE.Group();
  cap.add(put(box(0.52, 0.16, 0.48, MAT.red), 0, 0, 0));
  cap.add(put(box(0.34, 0.07, 0.3, MAT.white), 0, -0.02, 0.31));
  cap.add(put(box(0.16, 0.09, 0.16, MAT.white), 0, 0.1, 0.02));
  cap.position.set(0, 1.4, -0.01);

  body.add(torso, chest, straps, legL, legR, armL, armR, head, cap);

  const aura = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.1, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xffe86a, transparent: true, opacity: 0.85 })
  );
  aura.rotation.x = Math.PI / 2;
  aura.visible = false;
  root.add(aura);

  return { root, body, legL, legR, armL, armR, cap, head, aura };
}

/* ---------------------------------------------------------------- enemies */

export function buildGoomba(wings = false) {
  const g = new THREE.Group();
  g.add(put(box(0.74, 0.5, 0.62, MAT.goomba), 0, 0.44, 0));
  g.add(put(box(0.6, 0.22, 0.52, MAT.goombaDark), 0, 0.2, 0));
  g.add(put(box(0.24, 0.12, 0.3, MAT.goombaDark), -0.19, 0.06, 0.02));
  g.add(put(box(0.24, 0.12, 0.3, MAT.goombaDark), 0.19, 0.06, 0.02));
  g.add(put(box(0.14, 0.16, 0.06, MAT.white), -0.15, 0.5, 0.31));
  g.add(put(box(0.14, 0.16, 0.06, MAT.white), 0.15, 0.5, 0.31));
  g.add(put(box(0.07, 0.09, 0.05, MAT.eye), -0.14, 0.48, 0.34));
  g.add(put(box(0.07, 0.09, 0.05, MAT.eye), 0.14, 0.48, 0.34));
  g.add(put(box(0.14, 0.06, 0.08, MAT.dark), -0.2, 0.63, 0.3));
  g.add(put(box(0.14, 0.06, 0.08, MAT.dark), 0.2, 0.63, 0.3));
  if (wings) {
    const wl = put(box(0.34, 0.09, 0.5, MAT.white), -0.5, 0.62, -0.05);
    const wr = put(box(0.34, 0.09, 0.5, MAT.white), 0.5, 0.62, -0.05);
    wl.name = "wingL";
    wr.name = "wingR";
    g.add(wl, wr);
  }
  return g;
}

export function buildKoopa() {
  const g = new THREE.Group();
  const shell = new THREE.Group();
  shell.add(put(box(0.66, 0.42, 0.56, MAT.koopa), 0, 0, 0));
  shell.add(put(box(0.76, 0.14, 0.64, MAT.koopaBody), 0, -0.19, 0));
  shell.add(put(box(0.4, 0.1, 0.36, MAT.dark), 0, 0.23, 0));
  shell.position.y = 0.42;
  shell.name = "shell";
  const head = new THREE.Group();
  head.add(put(box(0.3, 0.3, 0.3, MAT.koopaBody), 0, 0, 0));
  head.add(put(box(0.16, 0.1, 0.1, MAT.koopaBody), 0, -0.05, 0.18));
  head.add(put(box(0.08, 0.1, 0.05, MAT.white), -0.08, 0.07, 0.16));
  head.add(put(box(0.08, 0.1, 0.05, MAT.white), 0.08, 0.07, 0.16));
  head.add(put(box(0.04, 0.05, 0.04, MAT.eye), -0.07, 0.06, 0.18));
  head.add(put(box(0.04, 0.05, 0.04, MAT.eye), 0.07, 0.06, 0.18));
  head.position.set(0, 0.72, 0.18);
  head.name = "head";
  g.add(shell, head);
  g.add(put(box(0.2, 0.12, 0.26, MAT.koopaBody), -0.2, 0.1, 0.02));
  g.add(put(box(0.2, 0.12, 0.26, MAT.koopaBody), 0.2, 0.1, 0.02));
  return g;
}

export function buildShell() {
  const g = new THREE.Group();
  g.add(put(box(0.7, 0.34, 0.6, MAT.koopa), 0, 0.19, 0));
  g.add(put(box(0.8, 0.12, 0.7, MAT.koopaBody), 0, 0.05, 0));
  return g;
}

export function buildStar() {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 0.5 : 0.21;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.04, bevelSegments: 1 });
  geo.center();
  const m = new THREE.Mesh(geo, MAT.star);
  const g = new THREE.Group();
  g.add(m);
  g.add(put(box(0.14, 0.14, 0.06, MAT.eye), -0.11, 0.02, 0.13));
  g.add(put(box(0.14, 0.14, 0.06, MAT.eye), 0.11, 0.02, 0.13));
  return g;
}

export function buildPole(h = 6.4, flagColor = 0xff4d5e) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, h, 8), lambert(0xf2f7fa));
  pole.position.y = h / 2;
  g.add(pole);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), MAT.gold);
  ball.position.y = h + 0.14;
  g.add(ball);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.95, 4, 3), lambert(flagColor, { side: THREE.DoubleSide }));
  flag.position.set(0.8, h - 0.85, 0);
  flag.name = "flag";
  g.add(flag, new THREE.Object3D());
  const base = box(1.5, 0.5, 1.5, MAT.stone);
  base.position.y = 0.25;
  g.add(base);
  return g;
}
