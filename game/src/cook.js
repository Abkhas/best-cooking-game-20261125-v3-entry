// Sizzle & Serve 3D — the cook. Movement, hands, and every station action.
// The cook carries up to 3 items. An item is { id, prepped } where prepped
// means chopped where chopping was needed. A wok holds one dish at a time;
// the plate counter holds one finished dish ready for the serve window.

import { INGREDIENTS, matchRecipe } from './recipes.js';
import { collidesWith, insideRoom, nearestStation } from './kitchen.js';

export const CARRY_MAX = 3;
export const CHOP_SECONDS = 2.2;

export class Cook {
  constructor() {
    this.x = 0; this.z = 2.6;
    this.r = 0.45;
    this.speed = 5.2;
    this.heading = Math.PI; // facing north (-z) at the start
    this.moving = false;
    this.carrying = []; // [{ id, prepped }]
    this.chopping = null; // { item, done, total } while at the board
    this.wok = { items: [], cooking: 0, cookTime: 0, ready: false, burnt: false, recipe: null };
    this.wok2 = { items: [], cooking: 0, cookTime: 0, ready: false, burnt: false, recipe: null };
    this.plate = null; // recipe id waiting on the plate counter
    this.plateHot = false; // the plated dish was lifted while HOT
    this.plateGarnished = false; // a garnish pass was done on the plated dish
    this.plateTip = 0; // +$15 tip banked by the garnish pass
    this.actionText = '';
    this.actionTimer = 0;
    this._sfx = null;
    this.upgrades = new Set(); // bought in the recipe book (B): real effects
  }

  get carryMax() {
    return this.upgrades.has('nampan-besar') ? CARRY_MAX + 1 : CARRY_MAX;
  }

  move(dx, dz, dt) {
    if (dx === 0 && dz === 0) { this.moving = false; return; }
    const len = Math.hypot(dx, dz);
    const nx = this.x + (dx / len) * this.speed * dt;
    const nz = this.z + (dz / len) * this.speed * dt;
    if (insideRoom(nx, this.z, this.r) && !collidesWith(nx, this.z, this.r)) this.x = nx;
    if (insideRoom(this.x, nz, this.r) && !collidesWith(this.x, nz, this.r)) this.z = nz;
    this.heading = Math.atan2(dx, dz);
    this.moving = true;
  }

  moveToward(tx, tz, dt) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    if (Math.hypot(dx, dz) < 0.15) { this.moving = false; return; }
    this.move(dx, dz, dt);
  }

  say(text, seconds = 1.6) {
    this.actionText = text;
    this.actionTimer = seconds;
  }

  tick(dt) {
    if (this.actionTimer > 0) this.actionTimer -= dt;
    if (this.chopping) {
      const near = nearestStation(this.x, this.z);
      if (!near || near.kind !== 'board') {
        this.chopping = null;
        this.say('Chopping stopped.');
      } else {
        this.chopping.done += dt;
        if (this.chopping.done >= this.chopping.total) this.finishChop();
      }
    }
    for (const wok of [this.wok, this.wok2]) {
      if (wok.cooking > 0 && !wok.ready) {
        wok.cooking += dt;
        if (wok.cooking >= wok.cookTime) { wok.ready = true; wok.cooking = wok.cookTime; }
      } else if (wok.ready && !wok.burnt) {
        wok.cooking += dt;
        // HOT window: 5 seconds after ready, a fast lift earns a tip.
        wok.hotLeft = Math.max(0, 5 - (wok.cooking - wok.cookTime));
        if (wok.cooking >= wok.cookTime + 5) wok.burnt = true;
      }
    }
  }

  /** The one interact key: what E does depends on the nearest station. */
  interact(board, sfx) {
    this._sfx = sfx;
    const station = nearestStation(this.x, this.z);
    if (!station) { this.say('Walk to a station!'); return; }
    if (station.kind === 'crate') return this.pickUp(station, sfx);
    if (station.kind === 'board') return this.chop(sfx);
    if (station.kind === 'wok') return this.useWok(station.id === 'wok2' ? this.wok2 : this.wok, sfx);
    if (station.kind === 'plate') return this.usePlate(sfx);
    if (station.kind === 'serve') return this.serve(board, sfx);
    if (station.kind === 'trash') return this.trash(sfx);
  }

  pickUp(station, sfx) {
    if (this.carrying.length >= this.carryMax) { this.say('Hands full!'); sfx?.deny(); return; }
    const ing = INGREDIENTS[station.gives];
    this.carrying.push({ id: station.gives, prepped: ing.prep === 'none' });
    this.say(`+ ${ing.name}`);
    sfx?.pickup();
  }

  chop(sfx) {
    const raw = this.carrying.find((c) => !c.prepped);
    if (!raw) { this.say('Nothing to chop!'); sfx?.deny(); return; }
    if (this.chopping) return;
    const total = CHOP_SECONDS * (this.upgrades.has('pisau-tajam') ? 0.7 : 1);
    this.chopping = { item: raw, done: 0, total };
    sfx?.chop();
  }

  finishChop() {
    if (!this.chopping) return;
    this.chopping.item.prepped = true;
    this.chopping = null;
    this.say('Chopped!');
    this._sfx?.done();
  }

  useWok(wok, sfx) {
    if (wok.ready) {
      if (wok.burnt) { this.say('Burnt! Trash it.'); sfx?.deny(); return; }
      this.takeFromWok(wok, sfx);
      return;
    }
    if (wok.cooking > 0) { this.say('Still cooking…'); return; }
    if (this.carrying.length === 0) { this.say('Bring ingredients!'); sfx?.deny(); return; }
    const unprepped = this.carrying.find((c) => !c.prepped);
    if (unprepped) { this.say(`${INGREDIENTS[unprepped.id].name} needs chopping!`); sfx?.deny(); return; }
    const recipe = matchRecipe(this.carrying.map((c) => c.id));
    if (!recipe) { this.say('That is no recipe!'); sfx?.deny(); return; }
    wok.items = [...this.carrying];
    wok.recipe = recipe;
    // Wok Baru upgrade: 20% faster cooking, bought in the book (B).
    wok.cookTime = recipe.cookTime * (this.upgrades.has('wok-baru') ? 0.8 : 1);
    wok.cooking = 0.01;
    this.carrying = [];
    this.say(`Cooking ${recipe.name}…`);
    sfx?.sizzle();
  }

  takeFromWok(wok, sfx) {
    if (this.carrying.length >= this.carryMax) { this.say('Hands full!'); sfx?.deny(); return; }
    this.carrying.push({ id: `dish:${wok.recipe.id}`, prepped: true, hot: (wok.hotLeft || 0) > 0 });
    wok.items = []; wok.cooking = 0; wok.ready = false; wok.burnt = false; wok.recipe = null;
    this.say('Dish up!');
    sfx?.pickup();
  }

  usePlate(sfx) {
    const dish = this.carrying.find((c) => c.id.startsWith('dish:'));
    // Garnish pass: hands empty, a dish already plated, not garnished yet —
    // one extra step at the plate counter banks a +$15 tip (TABUR!).
    if (!dish && this.plate !== null && !this.plateGarnished) {
      this.plateGarnished = true;
      this.plateTip = 15;
      this.say('Garnished! +$15 tip');
      sfx?.done();
      return;
    }
    if (!dish) { this.say(this.plate !== null ? 'Already garnished — serve it!' : 'Bring a cooked dish!'); sfx?.deny(); return; }
    if (this.plate !== null) { this.say('Plate is busy!'); sfx?.deny(); return; }
    this.plate = dish.id.slice(5);
    this.plateHot = dish.hot === true;
    this.plateGarnished = false;
    this.plateTip = 0;
    this.carrying = this.carrying.filter((c) => c !== dish);
    this.say(`${this.plateName()} plated — serve it!`);
    sfx?.done();
  }

  plateName() {
    if (!this.plate) return '';
    return this.plate.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  serve(board, sfx) {
    if (this.plate === null) { this.say('Nothing to serve!'); sfx?.deny(); return; }
    const result = board.serveDish(this.plate, this.plateHot, this.plateGarnished);
    if (result.served) {
      this.say(`Served! +${result.coins}`);
      sfx?.serve();
    } else {
      board.wrongServe();
      this.say('Nobody ordered that!');
      sfx?.deny();
    }
    this.plate = null;
    this.plateHot = false;
    this.plateGarnished = false;
    this.plateTip = 0;
  }

  trash(sfx) {
    let cleared = false;
    for (const wok of [this.wok, this.wok2]) {
      if (wok.burnt || wok.items.length > 0) {
        wok.items = []; wok.cooking = 0; wok.ready = false; wok.burnt = false; wok.recipe = null;
        cleared = true;
      }
    }
    if (this.carrying.length > 0) { this.carrying = []; cleared = true; }
    if (this.plate !== null) { this.plate = null; this.plateHot = false; this.plateGarnished = false; this.plateTip = 0; cleared = true; }
    this.say(cleared ? 'Trashed.' : 'Nothing to trash.');
    if (cleared) sfx?.trash();
  }
}
