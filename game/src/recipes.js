// Sizzle & Serve 3D — every dish the warung can make.
// A recipe is the list of ingredients a ticket asks for. Each ingredient
// names the prep it needs before the wok will take it: 'none' goes straight
// in, 'chop' must visit the chopping board first. Cook time is seconds
// sizzling in a wok.

export const INGREDIENTS = {
  rice: { name: 'Rice', color: '#fff3d6', prep: 'none', dot: '#f5e6b8' },
  noodle: { name: 'Noodle', color: '#ffcf4d', prep: 'none', dot: '#ffcf4d' },
  egg: { name: 'Egg', color: '#ffe082', prep: 'none', dot: '#ffd54f' },
  chicken: { name: 'Chicken', color: '#e08a52', prep: 'chop', dot: '#e08a52' },
  veg: { name: 'Veg', color: '#66bb6a', prep: 'chop', dot: '#66bb6a' },
  chili: { name: 'Chili', color: '#e53935', prep: 'none', dot: '#e53935' },
};

export const RECIPES = [
  {
    id: 'nasi-goreng', name: 'Nasi Goreng', price: 60, cookTime: 6,
    needs: ['rice', 'egg', 'chili'],
    blurb: 'Fried rice, egg, chili — the warung classic.',
  },
  {
    id: 'mie-goreng', name: 'Mie Goreng', price: 70, cookTime: 7,
    needs: ['noodle', 'egg', 'veg'],
    blurb: 'Fried noodles with egg and chopped veg.',
  },
  {
    id: 'ayam-geprek', name: 'Ayam Geprek', price: 90, cookTime: 8,
    needs: ['chicken', 'chili', 'rice'],
    blurb: 'Smashed fried chicken, chili, rice.',
  },
  {
    id: 'soto-ayam', name: 'Soto Ayam', price: 100, cookTime: 9,
    needs: ['chicken', 'veg', 'rice'],
    blurb: 'Chicken soup with veg, served over rice.',
  },
  {
    id: 'gado-gado', name: 'Gado-Gado', price: 80, cookTime: 7,
    needs: ['veg', 'egg', 'chili'],
    blurb: 'Blanched veg, egg and chili under peanut sauce.',
  },
];

/** Recipes a ticket may ask for this far into the shift (seconds elapsed). */
export function unlockedRecipes(elapsedSec) {
  if (elapsedSec < 45) return RECIPES.slice(0, 2);
  if (elapsedSec < 100) return RECIPES.slice(0, 3);
  if (elapsedSec < 140) return RECIPES.slice(0, 4);
  return RECIPES;
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
