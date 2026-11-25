// Sizzle & Serve 3D — boot, the game loop, input, and the shift's phases.
// Title → playing → shift over. One file owns the loop; the kitchen, the
// orders, the cook, the 3D world and the HUD each live in their own module.

import * as THREE from 'three';
import { Cook } from './cook.js';
import { OrderBoard, SHIFT_SECONDS } from './orders.js';
import { nearestStation } from './kitchen.js';
import { World3D } from './world3d.js';
import { Hud } from './hud.js';
import { Sfx } from './audio.js';
import { applyShot, runSelfTest } from './shots.js';
import { recipeName } from './recipes.js';

const canvas = document.getElementById('game');
const sfx = new Sfx();
const cook = new Cook();
const board = new OrderBoard();
const world = new World3D(canvas);
const hud = new Hud();

const game = {
  phase: 'title', // 'title' | 'playing' | 'over'
  elapsed: 0,
  hearts: 3,
  shot: null,
  cook, board,
};

const keys = new Set();
let clickTarget = null;
let clickInteracted = false;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  world.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

function resetShift() {
  cook.x = 0; cook.z = 2.6; cook.heading = Math.PI;
  cook.carrying = []; cook.chopping = null; cook.plate = null;
  cook.wok = { items: [], cooking: 0, cookTime: 0, ready: false, burnt: false, recipe: null };
  cook.wok2 = { items: [], cooking: 0, cookTime: 0, ready: false, burnt: false, recipe: null };
  board.tickets = []; board.served = 0; board.lost = 0;
  board.coins = 0; board.combo = 0; board.bestCombo = 0; board.comboTimer = 0;
  board.spawnIn = 2.5; board.nextId = 1;
  game.elapsed = 0;
  game.hearts = 3;
  game.toastText = '';
  cook.plateHot = false;
  cook.plateGarnished = false;
  cook.plateTip = 0;
  game.phase = 'playing';
}

function startShift() {
  sfx.ensure();
  resetShift();
}

function interact() {
  const before = board.coins;
  const servedName = cook.plate ? recipeName(cook.plate) : null;
  const wasHot = cook.plateHot === true;
  const wasGarnished = cook.plateGarnished === true;
  cook.interact(board, sfx);
  if (board.coins > before && servedName) {
    hud.showToast(`Served ${servedName} +$${board.coins - before}${wasHot ? ' · HOT +$10 tip!' : ''}${wasGarnished ? ' · GARNISH +$15!' : ''}`);
  }
}

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  if (e.repeat) return;
  sfx.ensure();
  const k = e.key.toLowerCase();
  if (k === 'm') { sfx.muted = !sfx.muted; return; }
  if (k === 'r' && game.phase !== 'title') { startShift(); return; }
  if (game.phase === 'title' && (k === 'enter' || k === ' ')) { startShift(); return; }
  if (game.phase === 'over' && (k === 'enter' || k === ' ')) { startShift(); return; }
  if (game.phase !== 'playing') return;
  if (k === 'e' || k === ' ') { interact(); return; }
  keys.add(k);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener('pointerdown', (e) => {
  sfx.ensure();
  if (game.phase === 'title') { startShift(); return; }
  if (game.phase === 'over') { startShift(); return; }
  if (game.phase !== 'playing') return;
  // Raycast the click onto the floor plane to get a walk target.
  const rect = canvas.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera({ x: nx, y: ny }, world.camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(plane, hit)) {
    clickTarget = { x: hit.x, z: hit.z };
    clickInteracted = false;
    // A click right on a station in reach uses it at once.
    const near = nearestStation(cook.x, cook.z);
    if (near && Math.hypot(hit.x - near.x, hit.z - near.z) < 1.2) {
      interact();
      clickTarget = null;
    }
  }
});

document.getElementById('start-btn')?.addEventListener('click', startShift);
document.getElementById('again-btn')?.addEventListener('click', startShift);

const clock = new THREE.Clock();
let promptText = '';
let prevWokReady = { wok: false, wok2: false };

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (game.phase === 'playing' && !game.shot) {
    game.elapsed += dt;
    const expired = board.update(dt, game.elapsed);
    if (expired > 0) {
      game.hearts -= expired;
      cook.say(`Order lost! -${expired} ♥`);
      sfx.deny();
    }
    if (game.elapsed >= SHIFT_SECONDS || game.hearts <= 0) {
      game.phase = 'over';
      sfx.done();
    }
  }

  if (game.phase === 'playing') {
    // Staged screenshots are frozen tableaus: the cook/wok state must not
    // drift while the headless capture runs, or the burn countdown would
    // expire and the wok would burn before the screenshot lands.
    if (!game.shot) cook.tick(dt);
    // Toast the moment a wok turns ready (live play only; staged shots
    // carry their own preset toast so the screenshot shows one too).
    if (!game.shot) {
      for (const [key, wok] of [['wok', cook.wok], ['wok2', cook.wok2]]) {
        if (wok.ready && !wok.burnt && !prevWokReady[key]) {
          hud.showToast(`${wok.recipe.name} ready — lift it now for a HOT +$10 tip!`);
        }
        prevWokReady[key] = wok.ready && !wok.burnt;
      }
    }
    // Keyboard movement (WASD / arrows), camera-relative: up is north.
    let dx = 0; let dz = 0;
    if (keys.has('w') || keys.has('arrowup')) dz -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dz += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;
    if (dx !== 0 || dz !== 0) {
      clickTarget = null;
      cook.move(dx, dz, dt);
    } else if (clickTarget) {
      cook.moveToward(clickTarget.x, clickTarget.z, dt);
      if (!cook.moving) {
        if (!clickInteracted) {
          clickInteracted = true;
          interact();
        }
        clickTarget = null;
      }
    }
    // Prompt for the nearest station.
    const near = nearestStation(cook.x, cook.z);
    if (cook.chopping) {
      promptText = `Chopping… ${cook.chopping.done.toFixed(1)}s / ${cook.chopping.total}s`;
    } else if (near) {
      const verbs = {
        crate: `E — Grab ${near.label}`,
        board: 'E — Chop (needs a raw ingredient)',
        wok: 'E — Cook / take dish',
        plate: cook.plate && !cook.carrying.some((c) => c.id.startsWith('dish:'))
          ? 'E — Garnish the plated dish (+$15 tip!)'
          : 'E — Plate the dish',
        serve: 'E — Serve the plated dish!',
        trash: 'E — Trash burnt food',
      };
      promptText = verbs[near.kind] || '';
    } else {
      promptText = 'WASD / click to walk — E to use a station';
    }
  } else {
    promptText = '';
  }

  hud.setPrompt(promptText);
  hud.render(game);
  world.sync(game, t);
  if (game.phase === 'title') {
    // Slow orbit around the kitchen while the title shows.
    const a = t * 0.12;
    world.camera.position.set(Math.sin(a) * 11, 9.5, Math.cos(a) * 8 + 1);
    world.camera.lookAt(0, 0, -0.5);
  } else {
    world.followCamera(cook, game.shot);
  }
  world.render();
}

// Boot: staged shot, self-test, or the title screen.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) applyShot(game, shot);
window.__game = game;
frame();
if (params.get('selftest') === '1') {
  setTimeout(() => runSelfTest(game), 300);
}
