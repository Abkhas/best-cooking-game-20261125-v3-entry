// Sizzle & Serve 3D — every dish the warung can make.
// A recipe is the list of ingredients a ticket asks for. Each ingredient
// names the prep it needs before the wok will take it: 'none' goes straight
// in, 'chop' must visit the chopping board first. Cook time is seconds
// sizzling in a wok.
//
// Every dish is visibly layered — BASE / MAIN / FINISH — so two tickets for
// the same base never cook the same way: the ticket, the recipe book and the
// plated dish all show which layer is which. Six ingredients make sixteen
// distinct three-ingredient dishes; they unlock across the shift, so the
// book fills up as the rush grows (RECIPE BOOK n/16).

export const INGREDIENTS = {
  rice: { name: 'Rice', color: '#fff3d6', prep: 'none', dot: '#f5e6b8' },
  noodle: { name: 'Noodle', color: '#ffcf4d', prep: 'none', dot: '#ffcf4d' },
  egg: { name: 'Egg', color: '#ffe082', prep: 'none', dot: '#ffd54f' },
  chicken: { name: 'Chicken', color: '#e08a52', prep: 'chop', dot: '#e08a52' },
  veg: { name: 'Veg', color: '#66bb6a', prep: 'chop', dot: '#66bb6a' },
  chili: { name: 'Chili', color: '#e53935', prep: 'none', dot: '#e53935' },
};

// layers: [base, main, finish] — ingredient ids, in plate order.
export const RECIPES = [
  { id: 'nasi-goreng', name: 'Nasi Goreng', price: 60, cookTime: 6,
    needs: ['rice', 'egg', 'chili'], layers: ['rice', 'egg', 'chili'],
    blurb: 'Fried rice, egg, chili — the warung classic.' },
  { id: 'mie-goreng', name: 'Mie Goreng', price: 70, cookTime: 7,
    needs: ['noodle', 'egg', 'veg'], layers: ['noodle', 'egg', 'veg'],
    blurb: 'Fried noodles with egg and chopped veg.' },
  { id: 'ayam-geprek', name: 'Ayam Geprek', price: 90, cookTime: 8,
    needs: ['chicken', 'chili', 'rice'], layers: ['rice', 'chicken', 'chili'],
    blurb: 'Smashed fried chicken, chili, rice.' },
  { id: 'soto-ayam', name: 'Soto Ayam', price: 100, cookTime: 9,
    needs: ['chicken', 'veg', 'rice'], layers: ['rice', 'chicken', 'veg'],
    blurb: 'Chicken soup with veg, served over rice.' },
  { id: 'gado-gado', name: 'Gado-Gado', price: 80, cookTime: 7,
    needs: ['veg', 'egg', 'chili'], layers: ['veg', 'egg', 'chili'],
    blurb: 'Blanched veg, egg and chili under peanut sauce.' },
  { id: 'nasi-ayam', name: 'Nasi Ayam', price: 85, cookTime: 8,
    needs: ['rice', 'chicken', 'egg'], layers: ['rice', 'chicken', 'egg'],
    blurb: 'Rice, fried chicken, egg — the lunch-box plate.' },
  { id: 'mie-ayam', name: 'Mie Ayam', price: 85, cookTime: 8,
    needs: ['noodle', 'chicken', 'veg'], layers: ['noodle', 'chicken', 'veg'],
    blurb: 'Chicken noodles with chopped veg.' },
  { id: 'nasi-pecel', name: 'Nasi Pecel', price: 65, cookTime: 6,
    needs: ['rice', 'veg', 'chili'], layers: ['rice', 'veg', 'chili'],
    blurb: 'Rice with veg and peanut-chili sauce.' },
  { id: 'mie-pedas', name: 'Mie Pedas', price: 75, cookTime: 7,
    needs: ['noodle', 'egg', 'chili'], layers: ['noodle', 'egg', 'chili'],
    blurb: 'Spicy noodles, egg, extra chili.' },
  { id: 'ayam-bakar', name: 'Ayam Bakar', price: 95, cookTime: 9,
    needs: ['chicken', 'egg', 'chili'], layers: ['chicken', 'egg', 'chili'],
    blurb: 'Grilled chicken, egg, sambal.' },
  { id: 'mie-soto', name: 'Mie Soto', price: 90, cookTime: 8,
    needs: ['noodle', 'chicken', 'egg'], layers: ['noodle', 'chicken', 'egg'],
    blurb: 'Noodle soup with chicken and egg.' },
  { id: 'nasi-uduk', name: 'Nasi Uduk', price: 70, cookTime: 7,
    needs: ['rice', 'veg', 'egg'], layers: ['rice', 'veg', 'egg'],
    blurb: 'Coconut rice with veg and egg.' },
  { id: 'ayam-sayur', name: 'Ayam Sayur', price: 95, cookTime: 9,
    needs: ['chicken', 'veg', 'egg'], layers: ['chicken', 'veg', 'egg'],
    blurb: 'Chicken and veg with egg.' },
  { id: 'mie-sayur', name: 'Mie Sayur', price: 65, cookTime: 6,
    needs: ['noodle', 'veg', 'chili'], layers: ['noodle', 'veg', 'chili'],
    blurb: 'Veg noodles with chili.' },
  { id: 'nasi-campur', name: 'Nasi Campur', price: 95, cookTime: 9,
    needs: ['rice', 'noodle', 'chicken'], layers: ['rice', 'chicken', 'noodle'],
    blurb: 'Mixed rice plate — chicken and noodles.' },
  { id: 'mie-geprek', name: 'Mie Geprek', price: 90, cookTime: 8,
    needs: ['noodle', 'chicken', 'chili'], layers: ['noodle', 'chicken', 'chili'],
    blurb: 'Smashed-chicken noodles, fiery chili.' },
];

/** Recipes a ticket may ask for this far into the shift (seconds elapsed).
 *  Two at the start, one more every 12 seconds — the book fills 2/16 → 16/16
 *  across the 3-minute shift. */
export function unlockedRecipes(elapsedSec) {
  const n = Math.min(RECIPES.length, 2 + Math.floor(elapsedSec / 12));
  return RECIPES.slice(0, n);
}

/** True when the carried items, once prepped, match a recipe exactly. */
export function matchRecipe(carriedIds) {
  const sorted = [...carriedIds].sort().join(',');
  return RECIPES.find((r) => [...r.needs].sort().join(',') === sorted) ?? null;
}

/** The route plan from the current hands state: the next stops, in order.
 *  The HUD chip and the gold dashed floor line both read this one function,
 *  so the plan on the floor and the plan in the HUD can never disagree.
 *  Steps are station labels, or an ingredient name when a crate is next. */
export function routeSteps(cook) {
  const carried = cook.carrying.map((c) => c.id);
  const dish = carried.find((id) => id.startsWith('dish:'));
  if (cook.plate) return ['SERVE'];
  if (dish) return ['PLATE', 'SERVE'];
  if (matchRecipe(carried)) return ['WOK', 'PLATE', 'SERVE'];
  if (cook.carrying.find((c) => !c.prepped)) return ['CHOP', 'WOK', 'PLATE', 'SERVE'];
  const partial = RECIPES.find((r) => carried.length > 0 && carried.every((id) => r.needs.includes(id)));
  if (partial) {
    const missing = partial.needs.find((n) => !carried.includes(n));
    return [INGREDIENTS[missing].name.toUpperCase(), 'WOK', 'PLATE', 'SERVE'];
  }
  return ['CRATES', 'WOK', 'PLATE', 'SERVE'];
}
export function recipeName(id) {
  const r = RECIPES.find((x) => x.id === id);
  return r ? r.name : id;
}

/** The warung's regulars — every ticket belongs to one of them, and their
 *  mood is the ticket's patience: SENANG while there is time, LAPAR as it
 *  drains, MARAH! when the ticket is about to walk out. */
export const CUSTOMERS = ['Pak Darmo', 'Bu Lastri', 'Mas Budi', 'Dek Ani', 'Pak RT', 'Mbak Rini'];

export function moodFor(share) {
  if (share > 0.55) return 'SENANG';
  if (share > 0.3) return 'LAPAR!';
  return 'MARAH!';
}

/** SINGLE SOURCE OF TRUTH for the campaign clock. Every displayed
 *  day/leg number — the phase line, the event line, the tally screen,
 *  the shot prompts — derives from legFor() below. Nothing hardcodes
 *  a day or leg anywhere else. (v6 bug: rushPhase said HARI 2/5 while
 *  eventFor said HARI 1/5 — two hardcoded strings that disagreed.)
 *  This shift is HARI 1 of 5; the 3-minute shift runs LEG 1–4. */
export const CAMPAIGN = { day: 1, totalDays: 5, legs: 4 };
const LEGS = [
  { phase: 'OPENING', event: 'BUKA WARUNG' },
  { phase: 'LUNCH RUSH', event: '★ KENDURI — COURSE 2/3 · 3 PLATES TO GO' },
  { phase: 'DINNER RUSH', event: '★ ARISAN NIGHT · COURSE 3/3' },
  { phase: 'LAST CALL', event: 'LAST CALL' },
];
const LEG_BOUNDS = [60, 120, 150, 180];

/** Which leg of the campaign this far into the shift is. */
export function legFor(elapsedSec) {
  const leg = LEG_BOUNDS.findIndex((b) => elapsedSec < b) + 1;
  const n = leg === 0 ? CAMPAIGN.legs : leg;
  const d = CAMPAIGN.day;
  return { day: d, leg: n, totalDays: CAMPAIGN.totalDays, legs: CAMPAIGN.legs,
    phase: LEGS[n - 1].phase, event: LEGS[n - 1].event };
}

/** The phase line: "HARI 1/5 · OPENING · LEG 1/4". */
export function rushPhase(elapsedSec) {
  const l = legFor(elapsedSec);
  return `HARI ${l.day}/${l.totalDays} · ${l.phase} · LEG ${l.leg}/${l.legs}`;
}

/** The event line: "BUKA WARUNG · HARI 1/5" — same day as the phase line. */
export function eventFor(elapsedSec) {
  const l = legFor(elapsedSec);
  return `${l.event} · HARI ${l.day}/${l.totalDays}`;
}

/** The sub-rush inside the rush: a short timer that lives inside the leg,
 *  so pressure has two clocks, not one. */
export function subRushFor(elapsedSec) {
  if (elapsedSec < 60) return null;
  const bounds = [60, 120, 150, 180];
  const next = bounds.find((b) => b > elapsedSec);
  if (next === undefined) return null;
  const left = Math.max(0, Math.ceil(next - elapsedSec));
  const name = elapsedSec < 120 ? 'SAMBAL RUSH' : elapsedSec < 150 ? 'ARISAN RUSH' : 'LAST ORDERS';
  return { name, left };
}

/** Warung upgrades — bought with coins from the recipe-book screen (B).
 *  Each one is a real effect: faster woks, faster chopping, an extra hand. */
export const UPGRADES = [
  { id: 'wok-baru', name: 'Wok Baru', cost: 150, effect: 'Woks cook 20% faster' },
  { id: 'pisau-tajam', name: 'Pisau Tajam', cost: 120, effect: 'Chopping 30% faster' },
  { id: 'nampan-besar', name: 'Nampan Besar', cost: 200, effect: 'Carry 4 items, not 3' },
];

/** The route map between shifts: the warung's street, stop by stop. */
export const ROUTE_MAP = ['GANG MAWAR', 'PASAR', 'STASIUN'];
