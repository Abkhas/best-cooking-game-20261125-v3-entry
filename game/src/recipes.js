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
];

/** Recipes a ticket may ask for this far into the shift (seconds elapsed). */
export function unlockedRecipes(elapsedSec) {
  if (elapsedSec < 45) return RECIPES.slice(0, 2);
  if (elapsedSec < 100) return RECIPES.slice(0, 3);
  return RECIPES;
}

/** True when the carried items, once prepped, match a recipe exactly. */
export function matchRecipe(carriedIds) {
  const sorted = [...carriedIds].sort().join(',');
  return RECIPES.find((r) => [...r.needs].sort().join(',') === sorted) ?? null;
}

/** Short display name for a recipe id, e.g. 'ayam-geprek' -> 'Ayam Geprek'. */
export function recipeName(id) {
  const r = RECIPES.find((x) => x.id === id);
  return r ? r.name : id;
}
