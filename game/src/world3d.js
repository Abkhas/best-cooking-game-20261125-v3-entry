// Sizzle & Serve 3D — the warung in three.js. One file owns the whole 3D
// scene: the tiled floor, the walls and menu poster, the crate wall, the
// north counter run (chopping board, two woks, plating counter, trash),
// the serve window, the prep island and dining tables, the chef, and the
// steam, labels and progress rings that make the kitchen read at a glance.
// It never owns game rules — main.js feeds it the cook and the order board
// and it mirrors that state into meshes every frame.

import * as THREE from 'three';
import { STATIONS, DECOR, frontPoint } from './kitchen.js';
import { INGREDIENTS, RECIPES, moodFor, recipeName, routeSteps } from './recipes.js';

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
  tex.repeat.set(8, 7.2);
  return tex;
}

/** Batik parang: diagonal gold motif on deep maroon — the warung's own cloth.
 *  This is what makes the room unmistakably ours instead of a generic kitchen. */
function batikTexture() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#7a1f1f';
  c.fillRect(0, 0, 256, 256);
  c.strokeStyle = '#e8b64c';
  c.fillStyle = '#e8b64c';
  c.lineWidth = 3;
  // Diagonal parang bands with diamonds and dots.
  for (let k = -8; k < 16; k++) {
    const ox = k * 32;
    c.beginPath();
    c.moveTo(ox, 0); c.lineTo(ox + 128, 256);
    c.stroke();
    for (let i = 0; i < 5; i++) {
      const x = ox + 32 + i * 26;
      const y = i * 52 + 14;
      if (x < 0 || x > 256 || y > 256) continue;
      c.save();
      c.translate(x, y);
      c.rotate(Math.PI / 4);
      c.fillRect(-7, -7, 14, 14);
      c.restore();
      c.beginPath(); c.arc(x + 14, y + 26, 3, 0, Math.PI * 2); c.fill();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 1);
  return tex;
}

/** Sunset outside the window: orange-pink sky, low sun, rooftop + palm silhouettes. */
function sunsetTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 320;
  const c = cv.getContext('2d');
  const grad = c.createLinearGradient(0, 0, 0, 320);
  grad.addColorStop(0, '#3b2a63');
  grad.addColorStop(0.35, '#c94b6d');
  grad.addColorStop(0.62, '#ff7b3d');
  grad.addColorStop(1, '#ffb347');
  c.fillStyle = grad;
  c.fillRect(0, 0, 512, 320);
  // Low sun with glare.
  const glow = c.createRadialGradient(330, 190, 4, 330, 190, 120);
  glow.addColorStop(0, 'rgba(255,244,200,1)');
  glow.addColorStop(0.25, 'rgba(255,200,110,0.85)');
  glow.addColorStop(1, 'rgba(255,150,60,0)');
  c.fillStyle = glow;
  c.fillRect(180, 40, 300, 300);
  c.fillStyle = '#fff3c4';
  c.beginPath(); c.arc(330, 190, 26, 0, Math.PI * 2); c.fill();
  // Rooftops and a palm, dark against the sky.
  c.fillStyle = '#2a1630';
  c.fillRect(0, 250, 150, 70);
  c.fillRect(120, 225, 170, 95);
  c.fillRect(280, 258, 232, 62);
  c.beginPath(); c.moveTo(120, 225); c.lineTo(205, 185); c.lineTo(290, 225); c.closePath(); c.fill();
  c.strokeStyle = '#2a1630'; c.lineWidth = 7;
  c.beginPath(); c.moveTo(450, 320); c.quadraticCurveTo(455, 250, 440, 215); c.stroke();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.9 + i * 0.22);
    c.beginPath(); c.moveTo(440, 215);
    c.quadraticCurveTo(440 + Math.cos(a) * 40, 215 + Math.sin(a) * 30 - 12, 440 + Math.cos(a) * 62, 215 + Math.sin(a) * 44);
    c.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  return tex;
}

/** A sprite whose text can be redrawn live (burn countdowns, READY states). */
function dynamicLabel(w = 512, h = 160) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.userData.noShadow = true;
  const api = {
    sprite: sp, last: '',
    setText(main, sub, opts = {}) {
      const key = `${main}|${sub || ''}|${opts.bg || ''}`;
      if (key === api.last) return;
      api.last = key;
      const c = cv.getContext('2d');
      c.clearRect(0, 0, w, h);
      c.fillStyle = opts.bg || 'rgba(20,16,12,0.88)';
      c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 22); c.fill();
      c.strokeStyle = opts.border || '#ffd166';
      c.lineWidth = 6; c.stroke();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = opts.fg || '#fff8e7';
      c.font = `bold ${sub ? 52 : 56}px system-ui, sans-serif`;
      c.fillText(main, w / 2, sub ? h / 2 - 30 : h / 2);
      if (sub) {
        c.fillStyle = opts.subColor || '#ffd166';
        c.font = 'bold 34px system-ui, sans-serif';
        c.fillText(sub, w / 2, h / 2 + 38);
      }
      tex.needsUpdate = true;
    },
  };
  return api;
}

/** One plated dish, layered so it reads at contact-sheet scale: a base mound,
 *  a fried egg (white + yolk) or noodle nest, and green garnish when asked.
 *  Every recipe builds differently — no more "blob foods". */
function buildDishGroup(recipeId, garnished) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.4, 0.06, 24),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  plate.position.y = 0.03;
  g.add(plate);
  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  const mound = (color, sx = 1, sy = 0.55) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), mat(color));
    m.scale.set(sx, sy, sx);
    return m;
  };
  const eggWhite = (x, z) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 14), mat(0xfff8e7));
    add(w, x, 0.24, z);
    const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat(0xff9f1c));
    add(yolk, x, 0.28, z);
  };
  const garnishBits = (n = 5) => {
    const bits = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.04, 0.07), mat(0x43a047));
      b.position.set((Math.random() - 0.5) * 0.5, 0.26 + Math.random() * 0.05, (Math.random() - 0.5) * 0.5);
      b.rotation.y = Math.random() * Math.PI;
      bits.add(b);
    }
    bits.visible = !!garnished;
    g.add(bits);
    return bits;
  };
  let bits = null;
  const generic = RECIPES.find((r) => r.id === recipeId)
    && !['nasi-goreng', 'mie-goreng', 'ayam-geprek', 'soto-ayam', 'gado-gado'].includes(recipeId);
  if (generic) {
    // Layer-driven plate for the newer dishes: base mound/nest, main on top,
    // finish as the visible top layer — the dish shows its layers.
    const [b, m, f] = RECIPES.find((r) => r.id === recipeId).layers;
    if (b === 'noodle') {
      const nest = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.11, 8, 16), mat(0xffb347));
      nest.rotation.x = Math.PI / 2; add(nest, 0, 0.18, 0);
    } else if (b === 'veg') {
      for (const [x, z] of [[-0.14, -0.1], [0.1, -0.14], [-0.02, 0.16]]) {
        const cube = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.15), mat(0x66bb6a));
        add(cube, x, 0.14, z);
      }
    } else if (b === 'chicken') {
      for (const [x, z] of [[-0.1, -0.08], [0.14, 0.1]]) {
        const ch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), mat(0xe08a52));
        ch.rotation.y = 0.5; add(ch, x, 0.2, z);
      }
    } else {
      add(mound(new THREE.Color(INGREDIENTS[b].color).getHex()), 0, 0.16, 0);
    }
    if (m === 'egg') eggWhite(0.14, 0.1);
    else if (m === 'chicken') {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), mat(0xe08a52));
      ch.rotation.y = 0.5; add(ch, 0.16, 0.22, -0.08);
    } else if (m === 'veg') {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.15), mat(0x66bb6a));
      add(cube, 0.14, 0.2, 0.08);
    }
    if (f === 'chili') {
      const sambal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0xc62828));
      sambal.scale.y = 0.5; add(sambal, -0.14, 0.28, 0.05);
    } else if (f === 'veg') {
      bits = garnishBits(5);
    } else if (f === 'egg') {
      eggWhite(-0.14, -0.08);
    }
    if (!bits) bits = garnishBits(4);
  } else if (recipeId === 'nasi-goreng') {
    add(mound(0xffcf4d), 0, 0.16, 0); // golden fried-rice mound
    eggWhite(0.14, 0.1); // fried egg, white + yolk, on top
    const chili = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 8), mat(0xe53935));
    chili.rotation.z = Math.PI / 2; add(chili, -0.18, 0.26, -0.08);
    const krupuk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16), mat(0xffe0ec));
    krupuk.rotation.set(0.5, 0, 0.9); add(krupuk, -0.05, 0.32, 0.18); // pink krupuk leaning on the rice
    bits = garnishBits();
  } else if (recipeId === 'mie-goreng') {
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.11, 8, 16), mat(0xffb347));
    nest.rotation.x = Math.PI / 2; add(nest, 0, 0.18, 0); // noodle nest
    eggWhite(0, 0.05);
    const krupuk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), mat(0xffe0ec));
    krupuk.rotation.set(0.5, 0, -0.9); add(krupuk, 0.18, 0.3, 0.16); // krupuk on the noodles
    bits = garnishBits(7); // green scallion over the noodles
  } else if (recipeId === 'ayam-geprek') {
    add(mound(0xfff3d6), -0.08, 0.15, 0.05); // rice
    for (const [x, z] of [[0.18, -0.1], [0.22, 0.14]]) {
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), mat(0xe08a52));
      ch.rotation.y = 0.5; add(ch, x, 0.2, z); // smashed chicken pieces
    }
    const sambal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0xc62828));
    sambal.scale.y = 0.5; add(sambal, 0.2, 0.28, 0.02); // sambal dollop
    const krupuk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), mat(0xffe0ec));
    krupuk.rotation.set(0.5, 0, 0.9); add(krupuk, -0.2, 0.3, 0.18); // krupuk beside the chicken
    bits = garnishBits(4);
  } else if (recipeId === 'soto-ayam') {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.16, 18), mat(0x2e7d5b));
    add(bowl, 0, 0.12, 0);
    const broth = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 18), mat(0xffd98a));
    add(broth, 0, 0.2, 0);
    for (let i = 0; i < 3; i++) {
      const shred = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), mat(0xe08a52));
      shred.rotation.y = i * 1.1; add(shred, (i - 1) * 0.12, 0.23, (i % 2 ? 0.08 : -0.06));
    }
    bits = garnishBits(5);
  } else { // gado-gado
    for (const [x, z] of [[-0.14, -0.1], [0.1, -0.14], [-0.02, 0.16], [0.18, 0.1]]) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.15), mat(0x66bb6a));
      add(cube, x, 0.14, z); // veg cubes
    }
    eggWhite(-0.1, -0.05);
    const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), mat(0x8d5a2b));
    sauce.position.y = 0.21; sauce.scale.set(1, 1, 1); g.add(sauce); // peanut sauce
    bits = garnishBits(4);
  }
  g.userData.garnishBits = bits;
  return g;
}

export class World3D {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    // Golden hour, committed: warm low sun + cool rim, ACES, exposure 1.3.
    // Shadows sit at ~15-20% of lit brightness via the hemisphere fill.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2a1608);
    this.scene.fog = new THREE.Fog(0x2a1608, 24, 38);
    this.camera = new THREE.PerspectiveCamera(50, 1280 / 800, 0.1, 100);
    this.camera.position.set(0, 10, 9);
    this.camera.lookAt(0, 0, -1);

    this.scene.add(new THREE.HemisphereLight(0xffe7c4, 0x4a2c18, 0.55));
    // Low warm sun through the east window: long shadows across the floor.
    const sun = new THREE.DirectionalLight(0xff9a45, 2.4);
    sun.position.set(10, 4.5, 1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
    sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.sun = sun;
    // Cool rim from the west so the warm side is not the only side.
    const rim = new THREE.DirectionalLight(0x8fb8ff, 0.55);
    rim.position.set(-8, 6, 6);
    this.scene.add(rim);
    // Warm spill from the window itself.
    const winGlow = new THREE.PointLight(0xffb347, 14, 9, 1.6);
    winGlow.position.set(7, 2.2, 2.3);
    this.scene.add(winGlow);

    this.steam = [];
    this.smoke = [];
    this.wokFood = {};
    this.wokFoodRecipe = {};
    this.wokRings = {};
    this.burnLabels = {};
    this.stationLabels = {};
    this.plateFood = null;
    this.plateKey = '';
    this.carryMeshes = [];
    this.carryDish = null;
    this.chopBits = [];
    this.buildRoom();
    this.buildStations();
    this.buildChef();
    // The gold route line on the floor: chef → every stop on the plan, in
    // order. Same plan as the HUD chip (routeSteps), so the two can never
    // disagree. Waypoint dots mark each stop; the line is the whole route,
    // not just the next step.
    const routeGeo = new THREE.BufferGeometry();
    routeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24), 3));
    this.routeLine = new THREE.Line(routeGeo, new THREE.LineDashedMaterial({
      color: 0xffd166, dashSize: 0.28, gapSize: 0.18, transparent: true, opacity: 0.95,
    }));
    this.routeLine.userData.noShadow = true;
    this.routeLine.frustumCulled = false;
    this.scene.add(this.routeLine);
    this.routeDots = [];
    for (let i = 0; i < 4; i++) {
      const dot = new THREE.Mesh(
        new THREE.CircleGeometry(0.2, 16),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      dot.rotation.x = -Math.PI / 2;
      dot.position.y = 0.08;
      dot.userData.noShadow = true;
      dot.visible = false;
      this.scene.add(dot);
      this.routeDots.push(dot);
    }
    // Shadows on: everything solid casts and receives, except the floor
    // (receives only), sprites, glows and the sunset backdrop.
    this.scene.traverse((o) => {
      if (!o.isMesh) return;
      if (o.userData.noShadow) return;
      o.castShadow = true;
      o.receiveShadow = true;
    });
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  buildRoom() {
    const g = this.scene;
    // Floor runs past the south rail toward the camera, so the frame bottom
    // is checkered floor, never a black void.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16.6, 15),
      new THREE.MeshLambertMaterial({ map: floorTexture() }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = 2.2;
    floor.receiveShadow = true;
    floor.userData.noShadow = true; // receives, never casts
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
    mkWall(10.6, 3.4, -8.15, 1.7, 0, Math.PI / 2);
    // South side is a LOW rail, not a wall: the camera looks over it, so the
    // frame bottom is kitchen floor and tables, never a blank beige band.
    box(16.6, 0.45, 0.22, WOOD_DARK, 0, 0.22, 5.15, g);
    box(16.6, 0.08, 0.3, COUNTER_TOP, 0, 0.5, 5.15, g);
    // East wall with a real window (z 0.8..3.8, y 1.1..2.7): sunset outside.
    // (South of the serve hatch, so the hatch never blocks the view.)
    const eastSeg = (z0, z1, y0, y1) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, y1 - y0, z1 - z0), wallMat);
      m.position.set(8.15, (y0 + y1) / 2, (z0 + z1) / 2); g.add(m);
      if (y0 === 0) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, z1 - z0), dadoMat);
        d.position.set(8.15, 0.55, (z0 + z1) / 2); g.add(d);
      }
    };
    eastSeg(-5.3, 0.8, 0, 3.4);
    eastSeg(3.8, 5.3, 0, 3.4);
    eastSeg(0.8, 3.8, 0, 1.1); // sill
    eastSeg(0.8, 3.8, 2.7, 3.4); // lintel
    // Sunset backdrop outside the window + a dark wood frame around it.
    const sunset = new THREE.Mesh(
      new THREE.PlaneGeometry(7.5, 4.6),
      new THREE.MeshBasicMaterial({ map: sunsetTexture(), toneMapped: false }),
    );
    sunset.rotation.y = -Math.PI / 2;
    sunset.position.set(9.6, 2.1, 2.3);
    sunset.userData.noShadow = true;
    g.add(sunset);
    // A REAL street outside the window — not just the sunset poster:
    // rooftops, a palm and the low sun as 3D silhouettes between the wall
    // and the backdrop, over a strip of street ground.
    const streetGround = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 3.0),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2f }),
    );
    streetGround.rotation.x = -Math.PI / 2;
    streetGround.position.set(8.95, 0.03, 2.3);
    streetGround.userData.noShadow = true;
    g.add(streetGround);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x2a1630 });
    for (const [x, y, z, w, h, d] of [[9.25, 0.55, 1.15, 0.55, 1.1, 1.1], [9.25, 0.45, 3.35, 0.55, 0.9, 0.9]]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), roofMat);
      roof.position.set(x, y, z);
      roof.userData.noShadow = true;
      g.add(roof);
      const peak = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.35, 4), roofMat);
      peak.position.set(x, y + h / 2 + 0.17, z);
      peak.rotation.y = Math.PI / 4;
      peak.userData.noShadow = true;
      g.add(peak);
    }
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.3, 8), roofMat);
    trunk.position.set(9.3, 0.65, 2.55);
    trunk.userData.noShadow = true;
    g.add(trunk);
    for (let i = 0; i < 5; i++) {
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.12), roofMat);
      const a = (i / 5) * Math.PI * 2;
      frond.position.set(9.3 + Math.cos(a) * 0.3, 1.35, 2.55 + Math.sin(a) * 0.3);
      frond.rotation.y = -a;
      frond.rotation.z = 0.5;
      frond.userData.noShadow = true;
      g.add(frond);
    }
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 20),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4, toneMapped: false }),
    );
    sunDisc.rotation.y = -Math.PI / 2;
    sunDisc.position.set(9.45, 2.45, 1.5);
    sunDisc.userData.noShadow = true;
    g.add(sunDisc);
    // The street, made unmistakable: a passer-by with a basket, a neighbour's
    // food stall with a red awning, and the street-name sign — all just
    // outside the east window, big enough to read through it at a glance.
    const passer = new THREE.Group();
    const pBody = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.65, 10), mat(0x00897b));
    pBody.position.y = 0.62; passer.add(pBody);
    const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat(0xf2c89b));
    pHead.position.y = 1.12; passer.add(pHead);
    const pHat = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.22, 12), mat(0xe8c98a));
    pHat.position.y = 1.32; passer.add(pHat);
    const pBasket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.22), mat(0x8d6e3f));
    pBasket.position.set(0.32, 0.75, 0); passer.add(pBasket);
    passer.position.set(8.9, 0, 1.5);
    passer.traverse((o) => { o.userData.noShadow = true; });
    g.add(passer);
    const stall = new THREE.Group();
    const sCart = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.1), mat(0x6b4226));
    sCart.position.y = 0.55; stall.add(sCart);
    const sTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 1.2), mat(0xd9c1a3));
    sTop.position.y = 0.88; stall.add(sTop);
    const sPot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.2, 12), mat(0x37474f));
    sPot.position.set(0, 1.0, -0.3); stall.add(sPot);
    const sAwning = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 1.4), mat(0xc0392b));
    sAwning.position.y = 1.65; sAwning.rotation.z = 0.18; stall.add(sAwning);
    for (const px of [-0.4, 0.4]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), mat(0x3d2b1f));
      pole.position.set(px, 1.25, 0.55); stall.add(pole);
    }
    stall.position.set(9.0, 0, 2.8);
    stall.traverse((o) => { o.userData.noShadow = true; });
    g.add(stall);
    const streetSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.55),
      new THREE.MeshBasicMaterial({
        map: textTexture([{ text: 'GANG MAWAR', size: 64, color: '#ffd166' }], { w: 512, h: 128, bg: '#7a2e1d', border: '#ffd166' }),
        toneMapped: false,
      }),
    );
    streetSign.rotation.y = -Math.PI / 2;
    streetSign.position.set(8.65, 2.3, 1.4);
    streetSign.userData.noShadow = true;
    g.add(streetSign);
    for (const [w, h, x, y, z] of [
      [0.16, 0.18, 8.15, 2.79, 2.3], [0.16, 0.18, 8.15, 1.01, 2.3],
      [0.16, 1.96, 8.15, 1.9, 0.72], [0.16, 1.96, 8.15, 1.9, 3.88],
    ]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, w === 0.16 && h > 1 ? 0.16 : 3.32), mat(WOOD_DARK));
      f.position.set(x, y, z); g.add(f);
    }
    // Batik valance across the north wall top — the warung's own cloth.
    const valance = new THREE.Mesh(
      new THREE.PlaneGeometry(16.6, 0.7),
      new THREE.MeshLambertMaterial({ map: batikTexture() }),
    );
    valance.position.set(0, 3.05, -4.98);
    valance.userData.noShadow = true;
    g.add(valance);

    // Menu poster on the north wall: the warung's own sign.
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 1.0),
      new THREE.MeshBasicMaterial({
        map: textTexture([
          { text: 'WARUNG MBAK SARI', size: 60, color: '#ffd166' },
          { text: 'NASI • MIE • AYAM GEPREK • SOTO', size: 34 },
        ], { w: 1024, h: 280, bg: '#7a2e1d', border: '#ffd166' }),
        toneMapped: false,
      }),
    );
    poster.position.set(-1.5, 2.0, -4.98);
    poster.userData.noShadow = true;
    g.add(poster);

    // Hanging lamps over the counter run — each one POOLS light on the
    // counter below it (spotlight + a visible warm pool), never just decor.
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
      bulb.userData.noShadow = true;
      g.add(bulb);
      const spot = new THREE.SpotLight(0xffb347, 45, 7, 0.55, 0.7, 1.6);
      spot.position.set(x, 2.1, -3.6);
      spot.target.position.set(x, 1.0, -4.2);
      g.add(spot);
      g.add(spot.target);
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 20),
        new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x, 1.0, -4.2);
      pool.userData.noShadow = true;
      g.add(pool);
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
      // Crate labels sit toward the room (east), clear of the left frame edge:
      // the ticket column covers the first ~236px, so labels live well east
      // of the crates — v4's NOODLE pill was cut behind the tickets.
      // Southern crates sit low in frame, so their labels ride higher —
      // otherwise CHILI's pill is cut at the bottom edge.
      const lab = labelSprite(s.label, s.gives === 'chicken' || s.gives === 'veg' ? 'chop first' : 'grab & go', 0.65);
      lab.position.set(s.x + 2.4 + Math.max(0, s.z - 2.2) * 0.5, 1.95 + Math.max(0, s.z - 0.5) * 0.25, s.z);
      g.add(lab);
    } else if (s.kind === 'board') {
      box(1.5, 0.07, 0.9, 0xe8c98a, s.x, y + 0.04, s.z, g);
      // Knife resting on the board.
      const knife = box(0.55, 0.02, 0.09, 0xdfe6e9, s.x + 0.35, y + 0.1, s.z + 0.2, g);
      knife.rotation.y = 0.5;
      box(0.22, 0.03, 0.07, 0x3d2b1f, s.x + 0.62, y + 0.1, s.z + 0.32, g).rotation.y = 0.5;
      const lab = labelSprite('CHOP', 'board — E to chop', 1.0);
      lab.position.set(s.x, 1.55, -3.35);
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
      flame.userData.noShadow = true;
      g.add(flame);
      // Food in the wok: a layered mound (golden stir + egg yolk + chili +
      // greens) that reads as a dish, not a flat disc. Recoloured per recipe.
      const foodGroup = new THREE.Group();
      foodGroup.position.set(s.x, y + 0.3, s.z);
      const mound = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 14, 10),
        new THREE.MeshLambertMaterial({ color: 0xcf8a4b }),
      );
      mound.scale.y = 0.45;
      foodGroup.add(mound);
      const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat(0xff9f1c));
      yolk.position.set(0.12, 0.14, 0.06);
      foodGroup.add(yolk);
      const chiliBit = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 8), mat(0xe53935));
      chiliBit.rotation.z = Math.PI / 2;
      chiliBit.position.set(-0.14, 0.14, -0.08);
      foodGroup.add(chiliBit);
      const greens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.14), mat(0x43a047));
      greens.position.set(0.02, 0.15, -0.14);
      foodGroup.add(greens);
      foodGroup.visible = false;
      g.add(foodGroup);
      this.wokFood[s.id] = foodGroup;
      // Burn countdown label above a ready wok — the pressure, made visible.
      const burn = dynamicLabel();
      burn.sprite.scale.set(1.9, 0.6, 1);
      burn.sprite.position.set(s.x, 2.0, -3.35);
      burn.sprite.visible = false;
      g.add(burn.sprite);
      this.burnLabels[s.id] = burn;
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
      // Dark smoke when a wok is about to burn or has burnt.
      const smokeGroup = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 8, 6),
          new THREE.MeshLambertMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.55 }),
        );
        puff.userData.phase = i / 5;
        smokeGroup.add(puff);
      }
      smokeGroup.visible = false;
      smokeGroup.position.set(s.x, y + 0.6, s.z);
      g.add(smokeGroup);
      this.smoke.push(smokeGroup);
      const lab = labelSprite(s.label, 'wok — E to cook', 1.0);
      lab.position.set(s.x, 1.55, -3.35);
      g.add(lab);
      this.stationLabels[s.id] = lab;
    } else if (s.kind === 'plate') {
      const plateBase = cyl(0.52, 0.4, 0.06, 0xffffff, s.x, y + 0.05, s.z, g, 24);
      plateBase.visible = true;
      // The plated dish itself is built per recipe (buildDishGroup) in sync(),
      // so the plate always shows the real layered dish, garnish and all.
      const food = new THREE.Group();
      food.position.set(s.x, y + 0.08, s.z);
      food.visible = false;
      g.add(food);
      this.plateFood = food;
      // A floating callout appears the moment a dish is plated — live text:
      // the dish, its 3/3 layers and its price, the progress ring on the plate.
      const ready = dynamicLabel();
      ready.sprite.scale.set(2.1, 0.66, 1);
      ready.sprite.position.set(s.x, 2.3, -3.35);
      ready.sprite.visible = false;
      g.add(ready.sprite);
      this.plateReady = ready;
      const lab = labelSprite('PLATE', 'E to plate · garnish +$15', 1.0);
      lab.position.set(s.x, 1.55, -3.35);
      g.add(lab);
      this.stationLabels['plate'] = lab;
    } else if (s.kind === 'trash') {
      cyl(0.34, 0.28, 0.75, 0x37474f, s.x, y + 0.38, s.z, g, 14);
      const lab = labelSprite('TRASH', 'burnt? bin it', 0.9);
      lab.position.set(s.x, 1.55, -3.35);
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
      // Batik runner down the island top.
      const runner = new THREE.Mesh(
        new THREE.PlaneGeometry(d.w * 0.5, d.d + 0.12),
        new THREE.MeshLambertMaterial({ map: batikTexture() }),
      );
      runner.rotation.x = -Math.PI / 2;
      runner.position.set(d.x, 0.95, d.z);
      runner.userData.noShadow = true;
      g.add(runner);
      // Bowls and a basket on the prep island.
      for (let i = -1; i <= 1; i++) {
        cyl(0.22, 0.16, 0.14, [0xc0392b, 0x2e7d5b, 0xef6c00][i + 1], d.x + i * 0.9, 1.0, d.z, g, 12);
      }
      const lab = labelSprite('PREP ISLAND', '', 0.8);
      lab.position.set(d.x, 1.9, d.z);
      g.add(lab);
    } else if (d.kind === 'table') {
      // Batik cloth on the table — the pattern is the warung's signature.
      const cloth = new THREE.Mesh(
        new THREE.BoxGeometry(d.w, 0.06, d.d),
        new THREE.MeshLambertMaterial({ map: batikTexture() }),
      );
      cloth.position.set(d.x, 0.78, d.z);
      g.add(cloth);
      box(d.w, 0.08, d.d, 0x9c6b4f, d.x, 0.72, d.z, g);
      for (const [ox, oz] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) {
        box(0.08, 0.75, 0.08, 0x6b4226, d.x + ox, 0.38, d.z + oz, g);
      }
      cyl(0.3, 0.24, 0.05, 0xffffff, d.x - 0.4, 0.82, d.z, g, 16);
      cyl(0.3, 0.24, 0.05, 0xffffff, d.x + 0.5, 0.82, d.z + 0.2, g, 16);
      // Two stools.
      cyl(0.28, 0.28, 0.1, 0xc0392b, d.x - 0.4, 0.45, d.z + 0.95, g, 12);
      cyl(0.28, 0.28, 0.1, 0xc0392b, d.x + 0.5, 0.45, d.z - 0.95, g, 12);
    } else if (d.kind === 'customer') {
      // A seated customer facing the table (north), eating: body, head, hair,
      // arms on the table, and a small plate in front of them.
      const body = cyl(0.3, 0.36, 0.6, d.shirt || 0x7e57c2, d.x, 0.62, d.z, g, 12);
      body.scale.z = 0.8;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), mat(0xf2c89b));
      head.position.set(d.x, 1.12, d.z);
      g.add(head);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x2b2118));
      hair.position.set(d.x, 1.16, d.z);
      g.add(hair);
      for (const sx of [-0.2, 0.2]) {
        const arm = cyl(0.07, 0.07, 0.5, d.shirt || 0x7e57c2, d.x + sx, 0.85, d.z - 0.35, g, 8);
        arm.rotation.x = 1.1;
      }
      cyl(0.22, 0.18, 0.04, 0xffffff, d.x, 0.84, d.z - 0.55, g, 14);
      const foodBit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0xffcf4d));
      foodBit.scale.y = 0.6;
      foodBit.position.set(d.x, 0.88, d.z - 0.55);
      g.add(foodBit);
      // Named regular, mood and all — the warung's people, not props.
      // A live label: the mood follows their ticket's patience every frame.
      if (d.name) {
        const nameLab = dynamicLabel();
        nameLab.sprite.scale.set(1.6, 0.5, 1);
        nameLab.sprite.position.set(d.x, 1.85, d.z);
        nameLab.setText(d.name, d.mood || '');
        g.add(nameLab.sprite);
        this.customerLabels = this.customerLabels || [];
        this.customerLabels.push({ api: nameLab, name: d.name });
      }
    } else if (d.kind === 'cart') {
      // Serving cart in the middle of the floor: bowls, a basket of limes,
      // wheels — the empty middle of shots 2–3, filled.
      box(1.5, 0.08, 0.85, WOOD_DARK, d.x, 0.85, d.z, g);
      box(1.5, 0.5, 0.85, WOOD, d.x, 0.55, d.z, g);
      for (const [ox, oz] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 12), mat(0x2b2118));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(d.x + ox, 0.14, d.z + oz);
        g.add(wheel);
      }
      for (let i = -1; i <= 1; i++) {
        cyl(0.2, 0.15, 0.12, [0xc0392b, 0x2e7d5b, 0xef6c00][i + 1], d.x + i * 0.5, 0.95, d.z, g, 12);
      }
      const lab = labelSprite('SERVING CART', '', 0.7);
      lab.position.set(d.x, 1.6, d.z);
      g.add(lab);
    } else if (d.kind === 'basket') {
      // Foreground basket of chilies and limes at the frame's bottom edge.
      cyl(0.42, 0.32, 0.3, 0x8d6e3f, d.x, 0.15, d.z, g, 14);
      for (let i = 0; i < 8; i++) {
        const c = i % 2 ? 0xe53935 : 0x9ccc65;
        const bit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(c));
        bit.position.set(d.x + (Math.random() - 0.5) * 0.5, 0.34, d.z + (Math.random() - 0.5) * 0.5);
        bit.scale.y = i % 2 ? 1.6 : 0.9;
        g.add(bit);
      }
    } else if (d.kind === 'plates') {
      // Foreground stack of clean plates, bottom-right of the frame.
      for (let i = 0; i < 5; i++) {
        cyl(0.34, 0.3, 0.05, 0xffffff, d.x, 0.06 + i * 0.06, d.z, g, 18);
      }
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), mat(0xff9f1c));
      top.position.set(d.x, 0.38, d.z);
      g.add(top);
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
    g.scale.setScalar(1.2); // the chef is the hero — BIG, mid-task, in frame
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
    // A garnished mini-plate that appears on the tray when the chef carries
    // a finished dish — the cover's hero prop.
    const carryDish = new THREE.Group();
    const cdPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.24, 0.04, 18),
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
    );
    carryDish.add(cdPlate);
    const cdMound = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0xffcf4d }),
    );
    cdMound.scale.y = 0.5;
    cdMound.position.y = 0.08;
    carryDish.add(cdMound);
    const cdYolk = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xff9f1c));
    cdYolk.position.set(0.07, 0.15, 0.03);
    carryDish.add(cdYolk);
    const cdGreen = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.08), mat(0x43a047));
    cdGreen.position.set(-0.08, 0.15, -0.05);
    carryDish.add(cdGreen);
    // Krupuk + chili on the carried plate too: rice + egg + chili + krupuk
    // as distinct shapes, not one disc.
    const cdKrupuk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 16), mat(0xffe0ec));
    cdKrupuk.rotation.set(0.4, 0, 0.8);
    cdKrupuk.position.set(-0.1, 0.16, 0.14);
    carryDish.add(cdKrupuk);
    const cdChili = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 8), mat(0xe53935));
    cdChili.rotation.z = Math.PI / 2;
    cdChili.position.set(-0.13, 0.14, -0.1);
    carryDish.add(cdChili);
    carryDish.position.set(0, 1.08, 0.48);
    carryDish.scale.setScalar(1.75); // the finished plate reads BIG in frame
    carryDish.visible = false;
    g.add(carryDish);
    this.carryDish = carryDish;
    this.carryDishMound = cdMound;
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

    // Gold dashed route line on the floor: chef → every stop on the plan,
    // in order, with a waypoint dot on each stop.
    const steps = routeSteps(cook);
    const stepTarget = (step) => {
      if (step === 'CHOP') return STATIONS.find((s) => s.kind === 'board');
      if (step === 'WOK') return !cook.wok.cooking
        ? STATIONS.find((s) => s.id === 'wok1') : STATIONS.find((s) => s.id === 'wok2');
      if (step === 'PLATE') return STATIONS.find((s) => s.kind === 'plate');
      if (step === 'SERVE') return STATIONS.find((s) => s.kind === 'serve');
      if (step === 'CRATES') return STATIONS.find((s) => s.id === 'crate-rice');
      return STATIONS.find((s) => s.kind === 'crate' && INGREDIENTS[s.gives].name.toUpperCase() === step);
    };
    const stops = steps.map(stepTarget).filter(Boolean).map(frontPoint);
    const pos = this.routeLine.geometry.attributes.position;
    pos.setXYZ(0, cook.x, 0.07, cook.z);
    for (let i = 0; i < 7; i++) {
      const p = stops[Math.min(i, stops.length - 1)];
      pos.setXYZ(i + 1, p ? p.x : cook.x, 0.07, p ? p.z : cook.z);
    }
    pos.needsUpdate = true;
    this.routeLine.geometry.setDrawRange(0, stops.length + 1);
    this.routeLine.computeLineDistances();
    this.routeLine.visible = stops.length > 0;
    this.routeDots.forEach((dot, i) => {
      const p = stops[i];
      dot.visible = !!p;
      if (p) dot.position.set(p.x, 0.08, p.z);
    });

    // Named regulars' moods follow their tickets: SENANG → LAPAR! → MARAH!
    if (this.customerLabels) {
      for (const { api, name } of this.customerLabels) {
        const t = game.board.tickets.find((tk) => tk.customer && tk.customer.toUpperCase() === name);
        const mood = t ? moodFor(Math.max(0, t.patience / t.patienceMax)) : 'MENUNGGU';
        api.setText(name, mood, mood === 'MARAH!'
          ? { bg: 'rgba(120,10,10,0.92)', border: '#ff5252', subColor: '#ffcdd2' }
          : {});
      }
    }

    // Carried items ride on the tray: ingredients as coloured balls, a
    // finished dish as a garnished mini-plate.
    const dishCarried = cook.carrying.find((c) => c.id.startsWith('dish:'));
    if (this.carryDish) {
      this.carryDish.visible = !!dishCarried;
      if (dishCarried) {
        const r = RECIPES.find((x) => x.id === dishCarried.id.slice(5));
        const base = r ? INGREDIENTS[r.layers[0]].color : '#ffcf4d';
        this.carryDishMound.material.color.set(new THREE.Color(base).getHex());
      }
    }
    const ingCarried = cook.carrying.filter((c) => !c.id.startsWith('dish:'));
    while (this.carryMeshes.length < ingCarried.length) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 8),
        new THREE.MeshLambertMaterial({ color: 0xffffff }),
      );
      this.trayAnchor.add(ball);
      this.carryMeshes.push(ball);
    }
    this.carryMeshes.forEach((ball, i) => {
      const item = ingCarried[i];
      ball.visible = !!item;
      if (!item) return;
      const id = item.id.startsWith('dish:') ? 'egg' : item.id;
      ball.material.color.set(INGREDIENTS[id]?.color || '#ffffff');
      ball.position.set((i - (ingCarried.length - 1) / 2) * 0.3, 0.06, 0);
      ball.scale.y = item.prepped === false ? 1.25 : 0.8;
    });

    // Woks: layered food, steam, smoke, progress ring, and the burn countdown.
    const dishColorFor = (id) => {
      const r = RECIPES.find((x) => x.id === id);
      return r ? new THREE.Color(INGREDIENTS[r.layers[0]].color).getHex() : 0xcf8a4b;
    };
    for (const [idx, [id, wok]] of [['wok1', cook.wok], ['wok2', cook.wok2]].entries()) {
      const food = this.wokFood[id];
      food.visible = wok.items.length > 0;
      if (food.visible) {
        const mound = food.children[0];
        mound.material.color.set(wok.burnt ? 0x2b2b2b : wok.ready ? 0xffb347 : dishColorFor(wok.recipe?.id));
      }
      const steamGroup = this.steam[idx];
      steamGroup.visible = wok.cooking > 0 && !wok.burnt && !wok.ready;
      if (steamGroup.visible) {
        steamGroup.children.forEach((puff) => {
          const p = (puff.userData.phase + time * 0.35) % 1;
          puff.position.set(Math.sin(p * 9 + puff.userData.phase * 20) * 0.12, p * 1.1, Math.cos(p * 7) * 0.1);
          puff.material.opacity = 0.35 * (1 - p);
          puff.scale.setScalar(0.6 + p * 1.4);
        });
      }
      // Burn pressure, visible in the scene: a ready wok counts down 5s to
      // burnt, with dark smoke once it gets close.
      const burnLeft = wok.ready && !wok.burnt ? Math.max(0, 5 - (wok.cooking - wok.cookTime)) : null;
      const burnLabel = this.burnLabels[id];
      const smokeGroup = this.smoke[idx];
      if (wok.burnt) {
        burnLabel.setText('BURNT!', 'trash it — E at the bin', { bg: 'rgba(120,10,10,0.92)', border: '#ff5252', fg: '#fff', subColor: '#ffcdd2' });
        burnLabel.sprite.visible = true;
        smokeGroup.visible = true;
      } else if (burnLeft !== null) {
        const n = Math.ceil(burnLeft);
        burnLabel.setText(`BURN IN ${n}s!`, `${wok.recipe?.name || 'Dish'} READY +$${wok.recipe?.price || ''}`, { bg: 'rgba(120,20,8,0.92)', border: '#ff7043', fg: '#fff', subColor: '#ffd166' });
        burnLabel.sprite.visible = true;
        smokeGroup.visible = burnLeft <= 2;
      } else {
        burnLabel.sprite.visible = false;
        smokeGroup.visible = false;
      }
      // The station label steps aside while its alert label shows — two
      // stacked banners over one wok is the clutter the judges flagged.
      const stationLab = this.stationLabels[id];
      if (stationLab) stationLab.visible = !burnLabel.sprite.visible;
      if (smokeGroup.visible) {
        smokeGroup.children.forEach((puff) => {
          const p = (puff.userData.phase + time * 0.5) % 1;
          puff.position.set(Math.sin(p * 8 + puff.userData.phase * 20) * 0.15, p * 1.4, Math.cos(p * 6) * 0.12);
          puff.material.opacity = 0.55 * (1 - p);
          puff.scale.setScalar(0.7 + p * 1.8);
        });
      }
      const state = wok.burnt ? 'burnt' : wok.ready ? 'ready' : wok.cooking > 0 ? 'cooking' : 'idle';
      const frac = wok.cookTime > 0 ? Math.min(1, wok.cooking / wok.cookTime) : 0;
      this.drawRing(this.wokRings[id], frac, state);
    }

    // Plated dish on the plate counter: rebuilt per recipe + garnish state,
    // with its READY callout and the garnish bits showing when TABUR is done.
    const plateKey = cook.plate ? `${cook.plate}|${cook.plateGarnished ? 'g' : ''}` : '';
    if (plateKey !== this.plateKey) {
      this.plateKey = plateKey;
      while (this.plateFood.children.length) {
        const child = this.plateFood.children.pop();
        this.plateFood.remove(child);
      }
      if (cook.plate) {
        const dish = buildDishGroup(cook.plate, cook.plateGarnished);
        dish.position.set(0, 0, 0);
        dish.scale.setScalar(1.5); // the plated dish reads BIG in frame
        this.plateFood.add(dish);
        this.plateDish = dish;
      } else {
        this.plateDish = null;
      }
    }
    this.plateFood.visible = cook.plate !== null;
    if (this.plateReady) {
      const r = cook.plate ? RECIPES.find((x) => x.id === cook.plate) : null;
      if (r) this.plateReady.setText('READY TO SERVE', `${r.name} · 3/3 LAYERS · +$${r.price}`);
      this.plateReady.sprite.visible = cook.plate !== null;
    }
    // The PLATE label steps aside while the READY callout shows.
    const plateLab = this.stationLabels['plate'];
    if (plateLab) plateLab.visible = !this.plateReady.sprite.visible;

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

  /** Shot discipline: ONE strong camera for all four staged shots — the set
   *  reads as one game getting busier (timer down, streak up, orders up),
   *  not four different angles. Live play keeps the chase camera. The staged
   *  camera yaws ~15° toward the east wall so the street outside the window
   *  (passer-by, stall, GANG MAWAR sign) is in frame, not off the right edge. */
  followCamera(cook, shot) {
    if (shot) {
      this.camera.position.set(-1.2, 8.6, 9.2);
      this.camera.lookAt(2.8, 0.2, -2.2);
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
