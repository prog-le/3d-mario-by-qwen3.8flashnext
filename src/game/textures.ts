import * as THREE from "three";

type Cfg = { draw: (c: CanvasRenderingContext2D, s: number) => void; repeat?: boolean };
const cache = new Map<string, THREE.Texture>();

function build(key: string, cfg: Cfg) {
  const hit = cache.get(key);
  if (hit) return hit;
  const s = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const c = cv.getContext("2d")!;
  cfg.draw(c, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

const outline = (c: CanvasRenderingContext2D, s: number, col: string) => {
  c.strokeStyle = col;
  c.lineWidth = Math.max(3, s * 0.09);
  c.strokeRect(0, 0, s, s);
};

export const TEX = {
  grass: () =>
    build("grass", {
      draw: (c, s) => {
        c.fillStyle = "#4fbd54";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "#5ccd61";
        for (let i = 0; i < 2; i++)
          for (let j = 0; j < 2; j++) if ((i + j) % 2 === 0) c.fillRect((i * s) / 2, (j * s) / 2, s / 2, s / 2);
        c.fillStyle = "rgba(255,255,255,.20)";
        for (let i = 0; i < 16; i++) c.fillRect((i * 37) % s, (i * 53) % s, 3, 3);
        outline(c, s, "rgba(19,86,44,.55)");
      },
    }),
  dirt: () =>
    build("dirt", {
      draw: (c, s) => {
        c.fillStyle = "#a8683a";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "#8d542c";
        for (let y = 0; y < 4; y++)
          for (let x = 0; x < 4; x++) if ((x + y) % 2) c.fillRect((x * s) / 4, (y * s) / 4, s / 4, s / 4);
        c.fillStyle = "rgba(0,0,0,.16)";
        for (let i = 0; i < 10; i++) c.fillRect((i * 23) % s, (i * 41) % s, 4, 3);
        outline(c, s, "rgba(70,38,16,.6)");
      },
    }),
  brick: () =>
    build("brick", {
      draw: (c, s) => {
        c.fillStyle = "#c9603f";
        c.fillRect(0, 0, s, s);
        c.strokeStyle = "rgba(74,28,16,.75)";
        c.lineWidth = 3;
        for (let y = 0; y < 4; y++) {
          c.beginPath();
          c.moveTo(0, (y * s) / 4);
          c.lineTo(s, (y * s) / 4);
          c.stroke();
          const off = y % 2 ? s / 4 : 0;
          for (let x = 0; x < 4; x++) {
            c.beginPath();
            c.moveTo(off + (x * s) / 2, (y * s) / 4);
            c.lineTo(off + (x * s) / 2, ((y + 1) * s) / 4);
            c.stroke();
          }
        }
        c.fillStyle = "rgba(255,255,255,.13)";
        c.fillRect(0, 0, s, 4);
        outline(c, s, "rgba(60,22,12,.7)");
      },
    }),
  stone: () =>
    build("stone", {
      draw: (c, s) => {
        c.fillStyle = "#9db0bf";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "#b6c6d2";
        c.fillRect(4, 4, s - 8, s - 8);
        c.fillStyle = "rgba(60,80,96,.35)";
        for (let i = 0; i < 12; i++) c.fillRect((i * 29) % s, (i * 47) % s, 3, 3);
        outline(c, s, "rgba(58,78,94,.7)");
      },
    }),
  cloud: () =>
    build("cloud", {
      draw: (c, s) => {
        c.fillStyle = "#fff8ec";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "rgba(255,224,190,.85)";
        for (let i = 0; i < 4; i++) c.fillRect((i * 23) % s, (i * 31) % s, 12, 8);
        outline(c, s, "rgba(224,190,150,.8)");
      },
    }),
  crate: () =>
    build("crate", {
      draw: (c, s) => {
        c.fillStyle = "#c88b41";
        c.fillRect(0, 0, s, s);
        c.strokeStyle = "rgba(92,54,18,.85)";
        c.lineWidth = 5;
        c.strokeRect(2, 2, s - 4, s - 4);
        c.beginPath();
        c.moveTo(4, 4);
        c.lineTo(s - 4, s - 4);
        c.moveTo(s - 4, 4);
        c.lineTo(4, s - 4);
        c.stroke();
      },
    }),
  qblock: () =>
    build("qblock", {
      draw: (c, s) => {
        c.fillStyle = "#f5a623";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "#ffc95c";
        c.fillRect(4, 4, s - 8, s - 8);
        c.fillStyle = "#8a4b06";
        for (const [x, y] of [
          [6, 6],
          [s - 10, 6],
          [6, s - 10],
          [s - 10, s - 10],
        ])
          c.fillRect(x, y, 4, 4);
        c.font = "bold 40px 'Titan One', sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "rgba(120,60,0,.35)";
        c.fillText("?", s / 2 + 2, s / 2 + 4);
        c.fillStyle = "#ffffff";
        c.fillText("?", s / 2, s / 2);
        outline(c, s, "rgba(120,62,4,.9)");
      },
    }),
  qused: () =>
    build("qused", {
      draw: (c, s) => {
        c.fillStyle = "#8d6a4b";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "#9c7a59";
        c.fillRect(5, 5, s - 10, s - 10);
        c.fillStyle = "rgba(60,40,26,.5)";
        for (let i = 0; i < 8; i++) c.fillRect((i * 27) % s, (i * 19) % s, 4, 4);
        outline(c, s, "rgba(52,34,20,.8)");
      },
    }),
  pipe: () =>
    build("pipe", {
      draw: (c, s) => {
        const g = c.createLinearGradient(0, 0, s, 0);
        g.addColorStop(0, "#0f8a52");
        g.addColorStop(0.28, "#2ad084");
        g.addColorStop(0.55, "#17a765");
        g.addColorStop(1, "#0a6b40");
        c.fillStyle = g;
        c.fillRect(0, 0, s, s);
        outline(c, s, "rgba(4,52,30,.8)");
      },
    }),
  sand: () =>
    build("sand", {
      draw: (c, s) => {
        c.fillStyle = "#f0d78c";
        c.fillRect(0, 0, s, s);
        c.fillStyle = "rgba(196,155,79,.5)";
        for (let i = 0; i < 24; i++) c.fillRect((i * 31) % s, (i * 43) % s, 3, 3);
        outline(c, s, "rgba(160,120,50,.45)");
      },
    }),
};

/** BoxGeometry whose UVs are tiled to world size so shared textures look crisp. */
export function tiledBox(sx: number, sy: number, sz: number, tile = 1, tex?: THREE.Texture) {
  const geo = new THREE.BoxGeometry(sx, sy, sz);
  if (tex) {
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    // face order: +x, -x, +y, -y, +z, -z  (4 verts each)
    const dims: [number, number][] = [
      [sz, sy],
      [sz, sy],
      [sx, sz],
      [sx, sz],
      [sx, sy],
      [sx, sy],
    ];
    for (let f = 0; f < 6; f++) {
      const [a, b] = dims[f];
      for (let i = 0; i < 4; i++) {
        const idx = f * 4 + i;
        uv.setXY(idx, (uv.getX(idx) * a) / tile, uv.getY(idx) * b / tile);
      }
    }
    uv.needsUpdate = true;
  }
  return geo;
}
