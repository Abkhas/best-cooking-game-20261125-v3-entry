// Warung Mbak Sari — the flat HUD the judge reads at a glance. The 3D
// scene shows the kitchen; this DOM overlay shows the game: the order board
// with per-ticket countdowns and chop tags, the shift timer with its named
// rush phase, coins, hearts, combo, served/missed record, what the cook is
// carrying (including the dish mid-assembly), toast notifications, and the
// one-line prompt for the nearest station. It also owns the title and
// shift-over screens.

import { INGREDIENTS, RECIPES, matchRecipe, recipeName } from './recipes.js';
import { SHIFT_SECONDS } from './orders.js';

/** The named rush phase for this far into the shift. */
export function rushPhase(elapsedSec) {
  if (elapsedSec < 60) return 'OPENING';
  if (elapsedSec < 120) return 'LUNCH RUSH';
  if (elapsedSec < 150) return 'DINNER RUSH';
  return 'LAST CALL';
}

export class Hud {
  constructor() {
    this.el = {
      board: document.getElementById('orders'),
      timer: document.getElementById('timer'),
      phase: document.getElementById('phase'),
      coins: document.getElementById('coins'),
      hearts: document.getElementById('hearts'),
      combo: document.getElementById('combo'),
      record: document.getElementById('record'),
      carry: document.getElementById('carry'),
      prompt: document.getElementById('prompt'),
      say: document.getElementById('say'),
      toast: document.getElementById('toast'),
      title: document.getElementById('title-screen'),
      over: document.getElementById('over-screen'),
      overStats: document.getElementById('over-stats'),
      chopbar: document.getElementById('chopbar'),
    };
    this._toastTimer = null;
  }

  fmtTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  /** A toast notification: shows for a few seconds, or until replaced. */
  showToast(text, sticky = false) {
    if (this._toastTimer) { clearTimeout(this._toastTimer); this._toastTimer = null; }
    this._toastText = text;
    if (!sticky) {
      this._toastTimer = setTimeout(() => { this._toastText = ''; }, 2800);
    }
  }

  render(game) {
    const { board, cook, elapsed, hearts, phase } = game;
    const left = SHIFT_SECONDS - elapsed;
    this.el.timer.textContent = this.fmtTime(left);
    this.el.timer.classList.toggle('urgent', left <= 30);
    this.el.phase.textContent = rushPhase(elapsed);
    this.el.phase.classList.toggle('rush', elapsed >= 60);
    this.el.coins.textContent = `🪙 ${board.coins}`;
    this.el.hearts.textContent = '♥'.repeat(Math.max(0, hearts)) + '♡'.repeat(Math.max(0, 3 - hearts));
    this.el.combo.textContent = board.combo > 1 ? `COMBO ×${board.combo}` : '';
    this.el.record.textContent = `SERVED ${board.served} · MISSED ${board.lost}`;

    // Order board: one ticket card per order — countdown seconds, ingredient
    // dots with chop tags, and a patience bar that drains left to right.
    this.el.board.innerHTML = board.tickets.map((t) => {
      const share = Math.max(0, t.patience / t.patienceMax);
      const cls = share < 0.3 ? 'low' : share < 0.55 ? 'mid' : '';
      // Per-ingredient step pills: every ingredient names its step, so the
      // ticket reads as a little route (CHOP first, then WOK).
      const pills = t.recipe.needs.map((n) => {
        const ing = INGREDIENTS[n];
        const step = ing.prep === 'chop' ? 'CHOP+WOK' : 'WOK';
        return `<span class="t-pill"><span class="dot" style="background:${ing.dot}"></span>${ing.name} <em>${step}</em></span>`;
      }).join('');
      return `<div class="ticket ${cls} ${t.flash > 0 ? 'flash' : ''}">
        <div class="t-name">${t.recipe.name}<span class="t-secs">${Math.ceil(t.patience)}s · $${t.recipe.price}</span></div>
        <div class="t-needs">${pills}</div>
        <div class="t-bar"><div class="t-fill" style="width:${Math.round(share * 100)}%"></div></div>
      </div>`;
    }).join('') || '<div class="ticket empty">No orders yet — tickets incoming…</div>';

    // Carried items as a little tray row, plus the dish mid-assembly:
    // when the carried ingredients are part of a recipe, name it and count.
    const carriedIds = cook.carrying.filter((c) => !c.id.startsWith('dish:')).map((c) => c.id);
    let assembly = '';
    if (carriedIds.length > 0) {
      const full = matchRecipe(carriedIds);
      if (full) {
        assembly = `<span class="carry-item assembly">→ ${full.name} ✓ ready for the wok</span>`;
      } else {
        const partial = RECIPES.find((r) => carriedIds.every((id) => r.needs.includes(id)));
        if (partial) assembly = `<span class="carry-item assembly">→ ${partial.name} ${carriedIds.length}/${partial.needs.length}</span>`;
      }
    }
    this.el.carry.innerHTML = cook.carrying.map((c) => {
      const isDish = c.id.startsWith('dish:');
      const label = isDish ? `🍽 ${recipeName(c.id.slice(5))}` : INGREDIENTS[c.id]?.name || c.id;
      const color = isDish ? '#ffd166' : INGREDIENTS[c.id]?.dot || '#fff';
      const mark = !isDish && c.prepped === false ? ' ✂' : '';
      const hot = isDish && c.hot ? ' 🔥HOT' : '';
      return `<span class="carry-item" style="border-color:${color}">${label}${mark}${hot}</span>`;
    }).join('') + assembly || '<span class="carry-empty">Hands empty</span>';

    // Chopping progress bar, visible only while chopping.
    if (cook.chopping) {
      const frac = cook.chopping.done / cook.chopping.total;
      this.el.chopbar.style.display = 'block';
      this.el.chopbar.firstElementChild.style.width = `${Math.round(frac * 100)}%`;
    } else {
      this.el.chopbar.style.display = 'none';
    }

    // Toast notification (serve callouts, HOT tips, wok-ready alerts).
    const toastText = game.toastText || this._toastText || '';
    this.el.toast.textContent = toastText;
    this.el.toast.classList.toggle('show', toastText.length > 0);

    this.el.say.textContent = cook.actionTimer > 0 ? cook.actionText : '';
    this.el.title.style.display = phase === 'title' ? 'flex' : 'none';
    this.el.over.style.display = phase === 'over' ? 'flex' : 'none';
    if (phase === 'over') {
      this.el.overStats.innerHTML =
        `Served <b>${board.served}</b> dishes · Lost <b>${board.lost}</b><br>` +
        `Best combo <b>×${board.bestCombo}</b> · Coins <b>${board.coins}</b>`;
    }
  }

  /** One-line hint for the station the cook is standing at. */
  setPrompt(text) {
    this.el.prompt.textContent = text || '';
  }
}
