// Sizzle & Serve 3D — staged scenes for screenshots, and a scripted
// end-to-end self-test. A shot is a real render of the game's own code
// with the kitchen put into a fixed mid-shift state (?shot=cover and
// friends); the self-test (?selftest=1) plays one full order through the
// same functions the keyboard uses, then reports the result in the page
// so a headless run can read it.

import { CUSTOMERS, RECIPES } from './recipes.js';

function ticket(id, recipeId, patience, patienceMax, vip = false) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  return { id, recipe, patience, patienceMax, born: 0, flash: 0, vip,
    customer: CUSTOMERS[(id - 1) % CUSTOMERS.length] };
}

function setWok(wok, recipeId, cooking, cookTime, ready, burnt, burnLeft = 5) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  wok.items = recipe ? recipe.needs.map((n) => ({ id: n, prepped: true })) : [];
  wok.recipe = recipe ?? null;
  wok.cookTime = cookTime;
  // A ready wok is already (5 - burnLeft) seconds into its 5s burn window.
  wok.cooking = ready ? cookTime + (5 - burnLeft) : cooking;
  wok.ready = ready;
  wok.burnt = burnt;
  wok.hotLeft = ready ? burnLeft : 0;
}

/** Put the game into a fixed mid-shift scene for a screenshot.
 *  FOUR DIFFERENT SCREENS of one game — never four kitchen angles:
 *  cover = mid-rush kitchen, book = recipe book + upgrades, cooking =
 *  mid-cook with the route line, tally = shift-over tally. The states
 *  escalate (timer down, streak up, more orders, more pressure) — the set
 *  reads as one rush getting busier, then closing out. */
export function applyShot(game, name) {
  const { cook, board } = game;
  game.phase = 'playing';
  game.elapsed = 75;
  game.hearts = 3;
  game.shot = name;
  game.bookOpen = false;
  game.toastText = '';
  board.tickets = [];
  board.coins = 0;
  board.combo = 0;
  board.served = 0;
  board.lost = 0;
  board.tips = 0;
  cook.carrying = [];
  cook.plate = null;
  cook.plateHot = false;
  cook.plateGarnished = false;
  cook.plateTip = 0;
  cook.chopping = null;
  cook.upgrades = new Set();
  setWok(cook.wok, null, 0, 0, false, false);
  setWok(cook.wok2, null, 0, 0, false, false);

  if (name === 'cover') {
    // Golden-hour dinner rush, mid-action — v5 numbers are DELIBERATELY
    // different from v4's (1:12, 547, ×5, 9·1): 0:47 left, 812 coins,
    // COMBO ×7, SERVED 14 · MISSED 2, HARI 2 · LEG 3/4. The set escalates
    // as one rush: book 1:45 → cover 0:47 → cooking 0:35 → tally close.
    game.elapsed = 133;
    board.coins = 812; board.combo = 7; board.served = 14; board.lost = 2; board.tips = 105;
    board.tickets = [
      ticket(1, 'nasi-goreng', 9, 44),
      ticket(2, 'mie-goreng', 29, 42, true), // ★ CRITIC — 1.5x coins, short fuse
      ticket(3, 'ayam-geprek', 24, 40),
      ticket(4, 'soto-ayam', 41, 46),
      ticket(5, 'gado-gado', 17, 36),
      ticket(6, 'mie-ayam', 28, 44),
    ];
    cook.x = -2.0; cook.z = -2.7; cook.heading = 0.6;
    cook.carrying = [{ id: 'dish:mie-goreng', prepped: true, hot: true }];
    setWok(cook.wok, 'nasi-goreng', 2.7, 6, false, false);
    setWok(cook.wok2, 'mie-goreng', 7, 7, true, false, 2);
    cook.plate = 'nasi-goreng';
    cook.plateHot = true;
    cook.plateGarnished = true;
    cook.plateTip = 15;
    game.toastText = '✦ GARNISHED +$15 TIP · Nasi Goreng on the plate — serve it!';
  } else if (name === 'book') {
    // The recipe book + upgrade screen (B): 8/16 dishes unlocked with their
    // BASE/MAIN/FINISH layers, one upgrade already owned, the route map to
    // the next stop — the meta-layer, as a real in-game screen.
    game.elapsed = 75;
    board.coins = 320; board.combo = 4; board.served = 9; board.tips = 45;
    board.tickets = [
      ticket(1, 'nasi-goreng', 40, 46),
      ticket(2, 'mie-goreng', 30, 44),
      ticket(3, 'soto-ayam', 44, 48),
      ticket(4, 'ayam-geprek', 20, 42),
      ticket(5, 'gado-gado', 34, 44),
      ticket(6, 'mie-ayam', 26, 44),
    ];
    cook.upgrades = new Set(['pisau-tajam']);
    game.bookOpen = true;
    cook.x = -6.0; cook.z = -1.7; cook.heading = Math.PI / 2;
    cook.carrying = [{ id: 'rice', prepped: true }, { id: 'egg', prepped: true }];
  } else if (name === 'cooking') {
    // Mid-shift rush: chicken on the board, one wok sizzling at 61%, one
    // READY with 4s left on its burn clock — and the chef ON the gold route
    // line, mid-carry between chop and wok. ROUTE #7, 4 stops left.
    game.elapsed = 145;
    board.coins = 940; board.combo = 7; board.served = 16; board.lost = 2; board.tips = 95;
    board.tickets = [
      ticket(1, 'ayam-geprek', 18, 36),
      ticket(2, 'soto-ayam', 30, 38),
      ticket(3, 'mie-goreng', 26, 40),
      ticket(4, 'nasi-ayam', 22, 40),
    ];
    cook.x = -2.8; cook.z = -2.6; cook.heading = Math.PI; // east of the chop board: clear of the ticket column, still facing the board/woks
    cook.carrying = [{ id: 'chicken', prepped: false }];
    cook.chopping = { item: cook.carrying[0], done: 1.4, total: 2.2 };
    setWok(cook.wok, 'mie-goreng', 4.3, 7, false, false);
    setWok(cook.wok2, 'nasi-goreng', 6, 6, true, false, 4);
    game.toastText = 'Nasi Goreng ready — lift it now for a HOT +$10 tip!';
  } else if (name === 'tally') {
    // Shift over: the itemized tally — dishes, tips, best combo, stars,
    // and the route map to the next shift. The loop visibly closes.
    game.phase = 'over';
    game.elapsed = 180;
    board.coins = 1148; board.combo = 7; board.served = 18; board.lost = 2;
    board.tips = 120; board.bestCombo = 7;
    board.tickets = [];
    cook.x = 6.0; cook.z = -1.0; cook.heading = -Math.PI / 2;
    cook.carrying = [{ id: 'dish:ayam-geprek', prepped: true, hot: true }];
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
  // Fast-forward the cook time, take the dish, plate it, garnish it, serve it.
  step(70);
  log.push(`wok ready: ${cook.wok.ready}`);
  pressE();
  log.push(`carrying dish: ${cook.carrying.map((c) => c.id).join(',')}`);
  at(3.2, -3.0); pressE();
  log.push(`plate: ${cook.plate}`);
  pressE(); // hands empty at the plate counter: the garnish pass (+$15 tip)
  log.push(`plate garnished: ${cook.plateGarnished}`);
  at(6.0, -1.0); pressE();
  log.push(`served: ${board.served}, coins: ${board.coins}`);
  // Chopping path: raw chicken must chop before the wok takes it.
  at(-6.1, 0.9); pressE();
  log.push(`chicken prepped before chop: ${cook.carrying[0]?.prepped}`);
  at(-4.9, -2.9); pressE();
  step(30);
  log.push(`chicken prepped after chop: ${cook.carrying[0]?.prepped}`);

  const passed = board.served === 1 && board.coins >= 80 && cook.carrying[0]?.prepped === true;
  // coins nominally 85 = $60 base (full patience) + $10 HOT tip + $15 garnish
  // tip; >= 80 tolerates a little patience drain from the live frame loop.
  const result = { passed, served: board.served, coins: board.coins, log };
  const node = document.getElementById('selftest');
  if (node) node.textContent = JSON.stringify(result);
  document.title = passed ? 'SELFTEST PASS' : 'SELFTEST FAIL';
  return result;
}
