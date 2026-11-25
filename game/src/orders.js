// Sizzle & Serve 3D — the order board. Tickets arrive, wait, and leave.
// A ticket holds a recipe, a patience bar that drains, and a price. Serve
// the right dish while patience is left and the warung earns; let patience
// run out and a heart is lost. Serving fast in a row builds a combo.

import { unlockedRecipes } from './recipes.js';

export const SHIFT_SECONDS = 180;

export class OrderBoard {
  constructor() {
    this.tickets = [];
    this.nextId = 1;
    this.spawnIn = 2.5; // seconds until the first ticket
    this.served = 0;
    this.lost = 0;
    this.coins = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.comboTimer = 0;
  }

  get maxTickets() { return 6; }

  spawnInterval(elapsedSec) {
    return Math.max(7, 14 - elapsedSec / 25);
  }

  patienceFor(elapsedSec) {
    return Math.max(30, 48 - elapsedSec / 12);
  }

  spawnTicket(elapsedSec) {
    const pool = unlockedRecipes(elapsedSec);
    const recipe = pool[Math.floor(Math.random() * pool.length)];
    // Every 5th ticket is a CRITIC: 1.5x coins, but only 70% patience.
    const vip = this.nextId % 5 === 0;
    const patience = vip
      ? Math.round(this.patienceFor(elapsedSec) * 0.7)
      : this.patienceFor(elapsedSec);
    this.tickets.push({
      id: this.nextId++, recipe, patience, patienceMax: patience,
      born: elapsedSec, flash: 0, vip,
    });
  }

  update(dt, elapsedSec) {
    this.spawnIn -= dt;
    if (this.spawnIn <= 0 && this.tickets.length < this.maxTickets) {
      this.spawnTicket(elapsedSec);
      this.spawnIn = this.spawnInterval(elapsedSec);
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    for (const t of this.tickets) {
      t.patience -= dt;
      if (t.flash > 0) t.flash -= dt;
    }
    const expired = this.tickets.filter((t) => t.patience <= 0);
    for (const t of expired) this.lost++;
    this.tickets = this.tickets.filter((t) => t.patience > 0);
    return expired.length;
  }

  /**
   * Serve a finished dish. Returns the coins earned, or 0 when no ticket wants it.
   * A dish lifted within 5 seconds of leaving the wok is HOT: +$10 tip.
   * A dish that got the garnish pass at the plate counter: +$15 tip.
   */
  serveDish(recipeId, hot = false, garnish = false) {
    const idx = this.tickets.findIndex((t) => t.recipe.id === recipeId);
    if (idx < 0) return { coins: 0, served: false };
    const ticket = this.tickets[idx];
    const patienceShare = Math.max(0, ticket.patience / ticket.patienceMax);
    let earned = Math.round(ticket.recipe.price * (0.6 + 0.4 * patienceShare)) + this.combo * 10 + (hot ? 10 : 0) + (garnish ? 15 : 0);
    if (ticket.vip) earned = Math.round(earned * 1.5); // critic pays 1.5x
    this.tickets.splice(idx, 1);
    this.served++;
    this.coins += earned;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.comboTimer = 20;
    return { coins: earned, served: true, hot };
  }

  /** A wrong dish at the window: the angriest ticket loses patience. */
  wrongServe() {
    if (this.tickets.length === 0) return;
    let worst = this.tickets[0];
    for (const t of this.tickets) if (t.patience < worst.patience) worst = t;
    worst.patience = Math.max(1, worst.patience - 12);
    worst.flash = 0.6;
  }
}
