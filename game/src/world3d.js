// Sizzle & Serve 3D — the warung in three.js. One file owns the whole 3D
// scene: the tiled floor, the walls and menu poster, the crate wall, the
// north counter run (chopping board, two woks, plating counter, trash),
// the serve window, the prep island and dining tables, the chef, and the
// steam, labels and progress rings that make the kitchen read at a glance.
// It never owns game rules — main.js feeds it the cook and the order board
// and it mirrors that state into meshes every frame.

import * as THREE from 'three';
import { STATIONS, DECOR } from './kitchen.js';
import { INGREDIENTS, recipeName } from './recipes.js';

const WOOD = 0x8a5a33;
const WOOD_DARK = 0x6b4226;
const COUNTER_TOP = 0xd9c1a3;
const WALL_CREAM = 0xffe9c9;
const WALL_GREEN = 0x2e7d5b;

function mat(color, rough = 0.85) {
  return new THREE.MeshLambertMaterial({ color, roughness: rough });
}

function box(w, h, d, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

function cyl(rt, rb, h, color, x, y, z, parent, seg = 20) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/** A canvas texture with centred text, for station labels and the poster. */
function textTexture(lines, opts = {}) {
  const w = opts.w || 512;
  const h = opts.h || 128;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  c.fillStyle = opts.bg || 'rgba(20,16,12,0.82)';
  c.beginPath();
  c.roundRect(4, 4, w - 8, h - 8, 22);
  c.fill();
  c.strokeStyle = opts.border || '#ffd166';
  c.lineWidth = 6;
  c.stroke();
  c.fillStyle = opts.fg || '#fff8e7';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  lines.forEach((line, i) => {
    c.font = `bold ${line.size || 56}px system-ui, sans-serif`;
    c.fillStyle = line.color || opts.fg || '#fff8e7';
    c.fillText(line.text, w / 2, h / 2 + (i - (lines.length - 1) / 2) * (line.size || 56) * 1.15);
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return tex;
}

function labelSprite(text, sub, scale = 1) {
  const lines = sub
    ? [{ text, size: 52 }, { text: sub, size: 34, color: '#ffd166' }]
    : [{ text, size: 56 }];
  const tex = textTexture(lines, { h: sub ? 150 : 110 });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(1.7 * scale, (sub ? 0.5 : 0.36) * scale, 1);
  return sp;
}

/** Terracotta-and-cream checker tiles for the warung floor. */
function floorTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d');
  const cols = ['#d97b4f', '#f2e3c6'];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      c.fillStyle = cols[(x + y) % 2];
      c.fillRect(x * 64, y * 64, 64, 64);
      c.fillStyle = 'rgba(0,0,0,0.06)';
      c.fillRect(x * 64, y * 64, 64, 4);
      c.fillRect(x * 64, y * 64, 4, 64);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 5);
  return tex;
}

export class World3D {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1d130c);
    this.scene.fog = new THREE.Fog(0x1d130c, 22, 34);
    this.camera = new THREE.PerspectiveCamera(50, 1280 / 800, 0.1, 100);
    this.camera.position.set(0, 10, 9);
    this.camera.lookAt(0, 0, -1);

    this.scene.add(new THREE.HemisphereLight(0xfff2d9, 0x5a3a22, 1.05));
    const sun = new THREE.DirectionalLight(0xffe0a3, 1.4);
    sun.position.set(6, 12, 4);
    this.scene.add(sun);
    const warm = new THREE.PointLight(0xffb347, 24, 12, 1.6);
    warm.position.set(0, 4.5, -3.5);
    this.scene.add(warm);

    this.steam = [];
    this.wokFood = {};
    this.wokRings = {};
    this.plateFood = null;
    this.carryMeshes = [];
    this.chopBits = [];
    this.buildRoom();
    this.buildStations();
    this.buildChef();
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildRoom() {
    const g = this.scene;
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16.6, 10.6),
      new THREE.MeshLambertMaterial({ map: floorTexture() }),
    );
    floor.rotation.x = -Math.PI / 2;
    g.add(floor);

    // Walls: cream with a green dado, north wall carries the menu poster.
    const wallMat = mat(WALL_CREAM);
    const dadoMat = mat(WALL_GREEN);
    const mkWall = (w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), wallMat);
      m.position.set(x, y, z); m.rotation.y = ry; g.add(m);
      const d = new THREE.Mesh(new THREE.BoxGeometry(w, 1.1, 0.34), dadoMat);
      d.position.set(x, 0.55, z); d.rotation.y = ry; g.add(d);
    };
    mkWall(16.6, 3.4, 0, 1.7, -5.15, 0);
    mkWall(16.6, 3.4, 0, 1.7, 5.15, 0);
    mkWall(10.6, 3.4, -8.15, 1.7, 0, Math.PI / 2);
    mkWall(10.6, 3.4, 8.15, 1.7, 0, Math.PI / 2);

    // Menu poster on the north wall: the warung's own sign.
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 1.3),
      new THREE.MeshBasicMaterial({
        map: textTexture([
          { text: 'WARUNG MBAK SARI', size: 60, color: '#ffd166' },
          { text: 'NASI • MIE • AYAM GEPREK • SOTO', size: 34 },
        ], { w: 1024, h: 360, bg: '#7a2e1d', border: '#ffd166' }),
      }),
    );
    poster.position.set(-1.5, 2.78, -4.98);
    g.add(poster);

    // Hanging lamps over the counter run.
    for (const x of [-4, -1, 2]) {
      cyl(0.02, 0.02, 1.1, 0x33241a, x, 2.9, -3.6, g, 6);
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 0.4, 16, 1, true),
        new THREE.MeshLambertMaterial({ color: 0xc0392b, side: THREE.DoubleSide }),
      );
      shade.position.set(x, 2.3, -3.6);
      g.add(shade);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
      );
      bulb.position.set(x, 2.12, -3.6);
      g.add(bulb);
    }
  }

  buildStations() {
    const g = this.scene;
    // North counter run: one long wooden counter with a pale top.
    box(13.4, 0.9, 1.2, WOOD, 0, 0.45, -4.2, g);
    box(13.4, 0.08, 1.3, COUNTER_TOP, 0, 0.94, -4.2, g);
    // West crate shelf + east serve counter.
    box(1.2, 0.9, 8.4, WOOD, -7.3, 0.45, 0, g);
    box(1.3, 0.08, 8.5, COUNTER_TOP, -7.3, 0.94, 0, g);
    box(1.2, 0.95, 2.6, WOOD_DARK, 7.3, 0.48, -1, g);
    box(1.3, 0.08, 2.7, COUNTER_TOP, 7.3, 0.99, -1, g);

    for (const s of STATIONS) this.buildStation(s);
    for (const d of DECOR) this.buildDecor(d);
  }

  buildStation(s) {
    const g = this.scene;
    const y = 1.0; // counter top height
    if (s.kind === 'crate') {
      // Open crate: wooden box rim with a heap of the ingredient inside.
      const ing = INGREDIENTS[s.gives];
      box(1.1, 0.28, 1.1, WOOD_DARK, s.x, y + 0.14, s.z, g);
      // Each ingredient heaps in its own shape, so food reads as food:
      // rice mounds, noodle nests, eggs, chicken pieces, veg cubes, chilies.
      const heap = new THREE.Group();
      const heapMat = mat(new THREE.Color(ing.color));
      const shapeFor = (id) => {
        if (id === 'rice') return new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 10), heapMat);
        if (id === 'noodle') return new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.06, 8, 14), heapMat);
        if (id === 'egg') return new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), heapMat);
        if (id === 'chicken') return new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.16), heapMat);
        if (id === 'veg') return new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), heapMat);
        return new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), heapMat); // chili
      };
      for (let i = 0; i < 7; i++) {
        const piece = shapeFor(s.gives);
        piece.position.set(
          s.x + (Math.random() - 0.5) * 0.7,
          y + 0.32 + Math.random() * 0.08,
          s.z + (Math.random() - 0.5) * 0.7,
        );
        piece.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
        if (s.gives === 'egg') piece.scale.y = 1.3;
        if (s.gives === 'noodle') piece.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        if (s.gives === 'chili') piece.rotation.z = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        heap.add(piece);
      }
      g.add(heap);
      const lab = labelSprite(s.label, s.gives === 'chicken' || s.gives === 'veg' ? 'chop first' : 'grab & go', 0.85);
      lab.position.set(s.x, 1.85, s.z);
      g.add(lab);
    } else if (s.kind === 'board') {
      box(1.5, 0.07, 0.9, 0xe8c98a, s.x, y + 0.04, s.z, g);
      // Knife resting on the board.
      const knife = box(0.55, 0.02, 0.09, 0xdfe6e9, s.x + 0.35, y + 0.1, s.z + 0.2, g);
      knife.rotation.y = 0.5;
      box(0.22, 0.03, 0.07, 0x3d2b1f, s.x + 0.62, y + 0.1, s.z + 0.32, g).rotation.y = 0.5;
      const lab = labelSprite('CHOP', 'board — E to chop', 0.9);
      lab.position.set(s.x, 1.85, s.z);
      g.add(lab);
    } else if (s.kind === 'wok') {
      // Stove ring, wok bowl, and a flame glow under it.
      cyl(0.55, 0.6, 0.16, 0x2b2b2b, s.x, y + 0.08, s.z, g);
      const wok = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x1f1f24, side: THREE.DoubleSide }),
      );
      wok.rotation.x = Math.PI;
      wok.position.set(s.x, y + 0.42, s.z);
      g.add(wok);
      const flame = new THREE.Mesh(
        new THREE.CircleGeometry(0.42, 16),
        new THREE.MeshBasicMaterial({ color: 0xff7b24, transparent: true, opacity: 0.55 }),
      );
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(s.x, y + 0.17, s.z);
      g.add(flame);
      // Food disc appears when the wok is loaded; steam rises while cooking.
      const food = cyl(0.4, 0.4, 0.1, 0x8a5a33, s.x, y + 0.32, s.z, g);
      food.visible = false;
      this.wokFood[s.id] = food;
      const ring = this.makeProgressRing(s.x, 1.32, s.z);
      this.wokRings[s.id] = ring;
      const steamGroup = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }),
        );
        puff.userData.phase = i / 6;
        steamGroup.add(puff);
      }
      steamGroup.visible = false;
      steamGroup.position.set(s.x, y + 0.5, s.z);
      g.add(steamGroup);
      this.steam.push(steamGroup);
      const lab = labelSprite(s.label, 'wok — E to cook', 0.9);
      lab.position.set(s.x, 1.85, s.z);
      g.add(lab);
    } else if (s.kind === 'plate') {
      const plate = cyl(0.52, 0.4, 0.06, 0xffffff, s.x, y + 0.05, s.z, g, 24);
      plate.visible = true;
      const food = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.16, 10, 8),
          mat(0xffcf4d),
        );
        ball.position.set(s.x + (Math.random() - 0.5) * 0.4, y + 0.14, s.z + (Math.random() - 0.5) * 0.4);
        ball.scale.y = 0.7;
        food.add(ball);
      }
      food.visible = false;
      g.add(food);
      this.plateFood = food;
      // A floating callout appears the moment a dish is plated.
      const ready = labelSprite('READY TO SERVE', 'take it to the window — E', 1.0);
      ready.position.set(s.x, 2.5, s.z);
      ready.visible = false;
      g.add(ready);
      this.plateReady = ready;
      const lab = labelSprite('PLATE', 'E to plate the dish', 0.9);
      lab.position.set(s.x, 1.85, s.z);
      g.add(lab);
    } else if (s.kind === 'trash') {
      cyl(0.34, 0.28, 0.75, 0x37474f, s.x, y + 0.38, s.z, g, 14);
      const lab = labelSprite('TRASH', 'burnt? bin it', 0.8);
      lab.position.set(s.x, 1.85, s.z);
      g.add(lab);
    } else if (s.kind === 'serve') {
      // Serve hatch: warm glow, a brass bell, and a ready-dish shelf.
      box(0.5, 1.6, 2.4, WOOD_DARK, 7.9, 1.6, -1, g);
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 2.0),
        new THREE.MeshBasicMaterial({ color: 0xffd98a }),
      );
      glow.rotation.y = -Math.PI / 2;
      glow.position.set(7.62, 1.7, -1);
      g.add(glow);
      const bell = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0xd4af37, roughness: 0.3 }),
      );
      bell.position.set(7.3, 1.2, -1.9);
      g.add(bell);
      const lab = labelSprite('SERVE', 'ring the bell — E', 1.0);
      lab.position.set(7.0, 2.6, -1);
      g.add(lab);
    }
  }

  /** A floating ring sprite above a wok; redrawn as the cook progresses. */
  makeProgressRing(x, y, z) {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sp.scale.set(0.7, 0.7, 1);
    sp.position.set(x, y, z);
    this.scene.add(sp);
    return { canvas: cv, tex, sprite: sp, last: '' };
  }

  drawRing(ring, frac, state) {
    const key = `${state}:${Math.round(frac * 20)}`;
    if (key === ring.last) return;
    ring.last = key;
    const c = ring.canvas.getContext('2d');
    c.clearRect(0, 0, 128, 128);
    if (state === 'idle') { ring.tex.needsUpdate = true; ring.sprite.visible = false; return; }
    ring.sprite.visible = true;
    c.lineWidth = 14;
    c.strokeStyle = 'rgba(0,0,0,0.55)';
    c.beginPath(); c.arc(64, 64, 48, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = state === 'burnt' ? '#e53935' : state === 'ready' ? '#66bb6a' : '#ffd166';
    c.beginPath(); c.arc(64, 64, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac); c.stroke();
    c.fillStyle = '#fff';
    c.font = 'bold 26px system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(state === 'ready' ? 'READY!' : state === 'burnt' ? 'BURNT!' : `${Math.round(frac * 100)}%`, 64, 64);
    ring.tex.needsUpdate = true;
  }

  buildDecor(d) {
    const g = this.scene;
    if (d.kind === 'island') {
      box(d.w, 0.85, d.d, WOOD, d.x, 0.43, d.z, g);
      box(d.w + 0.1, 0.07, d.d + 0.1, COUNTER_TOP, d.x, 0.9, d.z, g);
      // Bowls and a basket on the prep island.
      for (let i = -1; i <= 1; i++) {
        cyl(0.22, 0.16, 0.14, [0xc0392b, 0x2e7d5b, 0xef6c00][i + 1], d.x + i * 0.9, 1.0, d.z, g, 12);
      }
      const lab = labelSprite('PREP ISLAND', '', 0.8);
      lab.position.set(d.x, 1.9, d.z);
      g.add(lab);
    } else if (d.kind === 'table') {
      box(d.w, 0.08, d.d, 0x9c6b4f, d.x, 0.75, d.z, g);
      for (const [ox, oz] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) {
        box(0.08, 0.75, 0.08, 0x6b4226, d.x + ox, 0.38, d.z + oz, g);
      }
      cyl(0.3, 0.24, 0.05, 0xffffff, d.x - 0.4, 0.82, d.z, g, 16);
      cyl(0.3, 0.24, 0.05, 0xffffff, d.x + 0.5, 0.82, d.z + 0.2, g, 16);
      // Two stools.
      cyl(0.28, 0.28, 0.1, 0xc0392b, d.x - 0.4, 0.45, d.z + 0.95, g, 12);
      cyl(0.28, 0.28, 0.1, 0xc0392b, d.x + 0.5, 0.45, d.z - 0.95, g, 12);
    } else if (d.kind === 'plant') {
      cyl(0.26, 0.2, 0.4, 0xb85c38, d.x, 0.2, d.z, g, 12);
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 10, 8),
        mat(0x2e7d32),
      );
      bush.position.set(d.x, 0.75, d.z);
      bush.scale.y = 1.25;
      g.add(bush);
    }
  }

  buildChef() {
    const g = new THREE.Group();
    // Apron body, shirt arms, head, and the tall white chef hat.
    const body = cyl(0.34, 0.42, 0.85, 0xf5f5f5, 0, 0.95, 0, g, 14);
    body.name = 'body';
    const apron = box(0.5, 0.6, 0.06, 0xc0392b, 0, 0.85, 0.38, g);
    apron.name = 'apron';
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), mat(0xf2c89b));
    head.position.set(0, 1.62, 0);
    head.name = 'head';
    g.add(head);
    cyl(0.24, 0.26, 0.22, 0xffffff, 0, 1.86, 0, g, 12);
    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), mat(0xffffff));
    puff.position.set(0, 2.0, 0);
    puff.scale.y = 0.75;
    g.add(puff);
    // Eyes face the heading direction (+z of the group).
    for (const sx of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat(0x1a1a1a));
      eye.position.set(sx, 1.66, 0.25);
      g.add(eye);
    }
    // Arms swing while walking; a tray of carried items floats in front.
    const armL = cyl(0.09, 0.09, 0.55, 0xf5f5f5, -0.42, 1.05, 0.1, g, 8);
    const armR = cyl(0.09, 0.09, 0.55, 0xf5f5f5, 0.42, 1.05, 0.1, g, 8);
    armL.name = 'armL'; armR.name = 'armR';
    const tray = cyl(0.34, 0.34, 0.04, 0xd4af37, 0, 1.02, 0.48, g, 16);
    tray.name = 'tray';
    this.chef = g;
    this.chefParts = { armL, armR, body };
    this.scene.add(g);
    this.trayAnchor = new THREE.Group();
    this.trayAnchor.position.set(0, 1.14, 0.48);
    g.add(this.trayAnchor);
  }

  /** Mirror the live game state into the 3D scene. Called every frame. */
  sync(game, time) {
    const { cook } = game;
    // Chef position, heading and walk bob.
    this.chef.position.set(cook.x, 0, cook.z);
    this.chef.rotation.y = cook.heading;
    const bob = cook.moving ? Math.sin(time * 11) * 0.06 : 0;
    this.chef.position.y = Math.abs(bob);
    this.chefParts.armL.rotation.x = cook.moving ? Math.sin(time * 11) * 0.7 : 0.15;
    this.chefParts.armR.rotation.x = cook.moving ? -Math.sin(time * 11) * 0.7 : 0.15;

    // Carried items ride on the tray, coloured by ingredient.
    while (this.carryMeshes.length < cook.carrying.length) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xffffff }),
      );
      this.trayAnchor.add(ball);
      this.carryMeshes.push(ball);
    }
    this.carryMeshes.forEach((ball, i) => {
      const item = cook.carrying[i];
      ball.visible = !!item;
      if (!item) return;
      const id = item.id.startsWith('dish:') ? 'egg' : item.id;
      ball.material.color.set(INGREDIENTS[id]?.color || '#ffffff');
      ball.position.set((i - (cook.carrying.length - 1) / 2) * 0.3, 0.06, 0);
      ball.scale.y = item.prepped === false ? 1.25 : 0.8;
    });

    // Woks: food, steam and the progress ring above each one.
    for (const [id, wok] of [['wok1', cook.wok], ['wok2', cook.wok2]]) {
      const food = this.wokFood[id];
      food.visible = wok.items.length > 0;
      if (food.visible) {
        food.material.color.set(wok.burnt ? 0x2b2b2b : wok.ready ? 0xffb347 : 0xcf8a4b);
      }
      const steamGroup = this.steam[id === 'wok1' ? 0 : 1];
      steamGroup.visible = wok.cooking > 0 && !wok.burnt;
      if (steamGroup.visible) {
        steamGroup.children.forEach((puff) => {
          const p = (puff.userData.phase + time * 0.35) % 1;
          puff.position.set(Math.sin(p * 9 + puff.userData.phase * 20) * 0.12, p * 1.1, Math.cos(p * 7) * 0.1);
          puff.material.opacity = 0.35 * (1 - p);
          puff.scale.setScalar(0.6 + p * 1.4);
        });
      }
      const state = wok.burnt ? 'burnt' : wok.ready ? 'ready' : wok.cooking > 0 ? 'cooking' : 'idle';
      const frac = wok.cookTime > 0 ? Math.min(1, wok.cooking / wok.cookTime) : 0;
      this.drawRing(this.wokRings[id], frac, state);
    }

    // Plated dish on the plate counter, with its READY callout.
    this.plateFood.visible = cook.plate !== null;
    if (this.plateReady) this.plateReady.visible = cook.plate !== null;
    if (cook.plate) {
      const dishColor = { 'nasi-goreng': 0xffcf4d, 'mie-goreng': 0xffb347, 'ayam-geprek': 0xe08a52, 'soto-ayam': 0xffd98a, 'gado-gado': 0x9ccc65 }[cook.plate] || 0xffcf4d;
      this.plateFood.children.forEach((ball) => ball.material.color.set(dishColor));
    }

    // Chopping: knife bits dance on the board while a chop runs.
    const board = { x: -4.9, z: -4.2 };
    if (cook.chopping) {
      while (this.chopBits.length < 4) {
        const bit = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.05, 0.12),
          mat(INGREDIENTS[cook.chopping.item.id]?.color || '#66bb6a'),
        );
        this.scene.add(bit);
        this.chopBits.push(bit);
      }
      this.chopBits.forEach((bit, i) => {
        bit.visible = true;
        const a = time * 6 + i * 1.7;
        bit.position.set(board.x + Math.sin(a) * 0.3, 1.12 + Math.abs(Math.sin(a * 2)) * 0.15, board.z + Math.cos(a) * 0.2);
      });
    } else {
      this.chopBits.forEach((bit) => { bit.visible = false; });
    }
  }

  /** Chase camera: high behind the chef, looking north into the kitchen. */
  followCamera(cook, shot) {
    const shots = {
      cover: { off: [0, 11.5, 9.5], look: [0, 0, -1.5] },
      orders: { off: [-3, 8.5, 7.5], look: [-3.5, 0, -1] },
      cooking: { off: [-1.5, 6.0, 3.5], look: [-1.5, 0.9, -4.2] },
      plating: { off: [3.5, 7, 5.5], look: [4.5, 0.8, -3.5] },
    };
    if (shot && shots[shot]) {
      const s = shots[shot];
      this.camera.position.set(s.off[0], s.off[1], s.off[2]);
      this.camera.lookAt(s.look[0], s.look[1], s.look[2]);
      return;
    }
    const tx = cook.x * 0.55;
    const tz = cook.z * 0.45 - 1.2;
    this.camera.position.set(tx, 10.5, 8.5);
    this.camera.lookAt(tx * 0.9, 0, tz - 0.6);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
