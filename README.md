# Warung Mbak Sari — Wok Rush 3D

A 3D cooking game for the make.fun best-cooking-game bounty. You are the new cook
at Warung Mbak Sari, a small Indonesian warung: walk a 3D kitchen in follow view,
grab ingredients from the crate wall, chop what needs chopping, fire two woks
at once, plate the dish and ring the bell at the serve window — before the
ticket's patience runs out.

## How to play

- **WASD / arrow keys or click** to walk the kitchen.
- **E** (or Space) to use the nearest station: grab from crates, chop on the
  board, cook in a wok, take a ready dish, plate it, serve it, trash burnt food.
- **R** restart the shift, **M** mute.
- 3-minute shift, 3 hearts. A ticket that runs out of patience costs a heart.
- Lift a dish within 5 seconds of it leaving the wok and it goes out HOT: +$10 tip.
- Garnish a plated dish at the plate counter before serving: +$15 tip.
- Every 5th ticket is a CRITIC — 1.5× coins, but only 70% patience.
- Serve fast in a row to build a combo (up to +10 coins per serve).
- The shift runs in 4 legs (OPENING → LUNCH RUSH → DINNER RUSH → LAST CALL),
  shown as `LEG n/4` under the timer; up to 6 tickets can wait at once.
- Follow the gold dashed route line on the floor — and the ROUTE chip under the
  toast — it always points at your next stop (crates → chop → wok → plate → serve).
- The warung's regulars eat at the tables: Pak Darmo (LAPAR!) and Bu Lastri (SENANG).

## Recipes

| Dish | Needs | Price | Cook |
| --- | --- | --- | --- |
| Nasi Goreng | rice, egg, chili | $60 | 6s |
| Mie Goreng | noodle, egg, veg (chopped) | $70 | 7s |
| Ayam Geprek | chicken (chopped), chili, rice | $90 | 8s |
| Soto Ayam | chicken (chopped), veg (chopped), rice | $100 | 9s |
| Gado-Gado | veg (chopped), egg, chili | $80 | 7s |

New recipes unlock as the shift goes on, tickets arrive faster, and patience
shrinks — the rush grows without adding chores. A dish left in the wok 5
seconds past ready burns and must be trashed.

## Tech

- Static files only, no network at runtime. three.js r160 is vendored as
  `game/vendor/three.module.min.js`.
- Source is split by job: `recipes.js` (dishes + the route planner),
  `orders.js` (ticket board, up to 6 waiting), `kitchen.js` (floor plan),
  `cook.js` (hands, stations, garnish pass), `world3d.js` (the 3D warung —
  golden-hour sun, shadows, window sunset, batik cloth, light-pooling lamps,
  layered dishes, burn countdowns, route line, named customers),
  `hud.js` (order board, timer, score, route chip, burn banner),
  `audio.js` (synthesized sizzle and dings), `shots.js` (staged scenes + self-test),
  `main.js` (loop and input).
- Screenshots are real renders of the game's own code, staged with
  `?shot=cover|orders|cooking|plating`. `?selftest=1` plays one full order
  (crate → wok → plate → serve, plus the chopping path) through the real
  interact functions and reports PASS/FAIL in the page.

## Run locally

```
node serve.ts
# open http://localhost:8080/game/index.html
```
