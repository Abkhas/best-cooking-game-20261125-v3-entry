// Sizzle & Serve 3D — staged scenes for screenshots, and a scripted
// end-to-end self-test. A shot is a real render of the game's own code
// with the kitchen put into a fixed mid-shift state (?shot=cover and
// friends); the self-test (?selftest=1) plays one full order through the
// same functions the keyboard uses, then reports the result in the page
// so a headless run can read it.

import { RECIPES } from './recipes.js';

function ticket(id, recipeId, patience, patienceMax) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  return { id, recipe, patience, patienceMax, born: 0, flash: 0 };
}

function setWok(wok, recipeId, cooking, cookTime, ready, burnt) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  wok.items = recipe ? recipe.needs.map((n) => ({ id: n, prepped: true })) : [];
  wok.recipe = recipe ?? null;
  wok.cookTime = cookTime;
  wok.cooking = cooking;
  wok.ready = ready;
  wok.burnt = burnt;
}

/** Put the game into a fixed mid-shift scene for a screenshot. */
export function applyShot(game, name) {
  const { cook, board } = game;
  game.phase = 'playing';
  game.elapsed = 75;
  game.hearts = 3;
  game.shot = name;
  game.toastText = '';
  board.tickets = [];
  board.coins = 0;
  board.combo = 0;
  board.served = 0;
  cook.carrying = [];
  cook.plate = null;
  cook.chopping = null;
  setWok(cook.wok, null, 0, 0, false, false);
  setWok(cook.wok2, null, 0, 0, false, false);

  if (name === 'cover') {
    // The whole kitchen at its busiest: three tickets, one wok mid-cook,
    // one wok ready, a plated dish, and the chef carrying egg and chili.
    board.coins = 320; board.combo = 3; board.served = 5;
    board.tickets = [
      ticket(1, 'nasi-goreng', 26, 44),
      ticket(2, 'mie-goreng', 34, 42),
      ticket(3, 'ayam-geprek', 12, 40),
    ];
    cook.x = -1.0; cook.z = -1.6; cook.heading = Math.PI;
    cook.carrying = [{ id: 'egg', prepped: true }, { id: 'chili', prepped: true }];
    setWok(cook.wok, 'nasi-goreng', 4.2, 6, false, false);
    setWok(cook.wok2, 'mie-goreng', 7, 7, true, false);
    cook.plate = 'soto-ayam';
    game.toastText = 'Served Soto Ayam +$100 · COMBO ×3';
  } else if (name === 'orders') {
    // Early shift: a full board of four tickets, chef at the crates.
    game.elapsed = 20;
    board.coins = 60; board.combo = 0; board.served = 1;
    board.tickets = [
      ticket(1, 'nasi-goreng', 40, 46),
      ticket(2, 'mie-goreng', 30, 44),
      ticket(3, 'soto-ayam', 44, 48),
      ticket(4, 'ayam-geprek', 20, 42),
    ];
    cook.x = -6.0; cook.z = -1.7; cook.heading = -Math.PI / 2;
    cook.carrying = [{ id: 'rice', prepped: true }];
  } else if (name === 'cooking') {
    // Mid-shift rush: chicken on the board, one wok sizzling, one ready.
    game.elapsed = 120;
    board.coins = 210; board.combo = 2; board.served = 3;
    board.tickets = [
      ticket(1, 'ayam-geprek', 18, 36),
      ticket(2, 'soto-ayam', 30, 38),
    ];
    cook.x = -4.9; cook.z = -2.9; cook.heading = Math.PI;
    cook.carrying = [{ id: 'chicken', prepped: false }];
    cook.chopping = { item: cook.carrying[0], done: 1.2, total: 2.2 };
    setWok(cook.wok, 'mie-goreng', 2.8, 7, false, false);
    setWok(cook.wok2, 'nasi-goreng', 6, 6, true, false);
    game.toastText = 'Nasi Goreng ready — lift it now for a HOT +$10 tip!';
  } else if (name === 'plating') {
    // Late shift: a finished dish in hand, one plated, one still cooking.
    game.elapsed = 150;
    board.coins = 480; board.combo = 4; board.served = 7;
    board.tickets = [
      ticket(1, 'soto-ayam', 22, 34),
      ticket(2, 'nasi-goreng', 8, 32),
    ];
    cook.x = 1.6; cook.z = -2.6; cook.heading = Math.PI / 2;
    cook.carrying = [{ id: 'dish:ayam-geprek', prepped: true }];
    cook.plate = 'mie-goreng';
    setWok(cook.wok, 'soto-ayam', 5.4, 9, false, false);
    game.toastText = 'Ayam Geprek plated — ring the bell!';
  }
}

/** Play one full order through the real interact path and report it. */
export function runSelfTest(game) {
  const { cook, board } = game;
  const log = [];
  const at = (x, z) => { cook.x = x; cook.z = z; };
  const pressE = () => cook.interact(board, null);
  const step = (n) => { for (let i = 0; i < n; i++) cook.tick(0.1); };

  game.phase = 'playing';
  game.elapsed = 10;
  board.tickets = [ticket(1, 'nasi-goreng', 45, 45)];
  board.coins = 0; board.served = 0;

  // Pick rice, egg, chili from the west crates.
  at(-6.1, -3.0); pressE();
  at(-6.1, -0.4); pressE();
  at(-6.1, 3.5); pressE();
  log.push(`carrying after crates: ${cook.carrying.map((c) => c.id).join(',')}`);
  // Start cooking at wok 1.
  at(-2.2, -3.0); pressE();
  log.push(`wok cooking: ${cook.wok.cooking > 0}, recipe: ${cook.wok.recipe?.id}`);
  // Fast-forward the cook time, take the dish, plate it, serve it.
  step(70);
  log.push(`wok ready: ${cook.wok.ready}`);
  pressE();
  log.push(`carrying dish: ${cook.carrying.map((c) => c.id).join(',')}`);
  at(3.2, -3.0); pressE();
  log.push(`plate: ${cook.plate}`);
  at(6.0, -1.0); pressE();
  log.push(`served: ${board.served}, coins: ${board.coins}`);
  // Chopping path: raw chicken must chop before the wok takes it.
  at(-6.1, 0.9); pressE();
  log.push(`chicken prepped before chop: ${cook.carrying[0]?.prepped}`);
  at(-4.9, -2.9); pressE();
  step(30);
  log.push(`chicken prepped after chop: ${cook.carrying[0]?.prepped}`);

  const passed = board.served === 1 && board.coins > 0 && cook.carrying[0]?.prepped === true;
  const result = { passed, served: board.served, coins: board.coins, log };
  const node = document.getElementById('selftest');
  if (node) node.textContent = JSON.stringify(result);
  document.title = passed ? 'SELFTEST PASS' : 'SELFTEST FAIL';
  return result;
}
