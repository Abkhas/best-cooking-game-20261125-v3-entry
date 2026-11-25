// Sizzle & Serve 3D — the warung floor plan. World units are metres on the
// ground plane (x east, z south, y up). The room is one open floor, 16 by 10:
// crates down the west wall, a counter run along the north wall with the
// chopping board, two woks and the plating counter, and the serve window
// cut into the east wall. The middle holds a prep island and dining tables.

export const ROOM = { minX: -8, maxX: 8, minZ: -5, maxZ: 5 };

// A station the cook can stand beside and use with E. x/z is the centre,
// w is the east-west size, d the north-south size.
export const STATIONS = [
  { id: 'crate-rice', kind: 'crate', gives: 'rice', x: -7.3, z: -3.0, w: 1.2, d: 1.2, label: 'RICE' },
  { id: 'crate-noodle', kind: 'crate', gives: 'noodle', x: -7.3, z: -1.7, w: 1.2, d: 1.2, label: 'NOODLE' },
  { id: 'crate-egg', kind: 'crate', gives: 'egg', x: -7.3, z: -0.4, w: 1.2, d: 1.2, label: 'EGG' },
  { id: 'crate-chicken', kind: 'crate', gives: 'chicken', x: -7.3, z: 0.9, w: 1.2, d: 1.2, label: 'CHICKEN' },
  { id: 'crate-veg', kind: 'crate', gives: 'veg', x: -7.3, z: 2.2, w: 1.2, d: 1.2, label: 'VEG' },
  { id: 'crate-chili', kind: 'crate', gives: 'chili', x: -7.3, z: 3.5, w: 1.2, d: 1.2, label: 'CHILI' },
  { id: 'board', kind: 'board', x: -4.9, z: -4.2, w: 1.8, d: 1.2, label: 'CHOP' },
  { id: 'wok1', kind: 'wok', x: -2.2, z: -4.2, w: 1.8, d: 1.2, label: 'WOK 1' },
  { id: 'wok2', kind: 'wok', x: 0.5, z: -4.2, w: 1.8, d: 1.2, label: 'WOK 2' },
  { id: 'plate', kind: 'plate', x: 3.2, z: -4.2, w: 1.8, d: 1.2, label: 'PLATE' },
  { id: 'trash', kind: 'trash', x: 5.6, z: -4.2, w: 1.2, d: 1.2, label: 'TRASH' },
  { id: 'serve', kind: 'serve', x: 7.3, z: -1.0, w: 1.2, d: 2.4, label: 'SERVE' },
];

// Furniture that fills the room but is never used: a prep island, dining
// tables with chairs, and plants. Solid like a station, never a station.
export const DECOR = [
  { id: 'island', kind: 'island', x: 0, z: 1.2, w: 3.4, d: 1.4, label: 'PREP' },
  { id: 'table1', kind: 'table', x: -4.6, z: 3.0, w: 2.2, d: 1.2 },
  { id: 'table2', kind: 'table', x: 4.6, z: 3.0, w: 2.2, d: 1.2 },
  { id: 'plant1', kind: 'plant', x: -7.3, z: 4.4, w: 0.7, d: 0.7 },
  { id: 'plant2', kind: 'plant', x: 7.3, z: 4.4, w: 0.7, d: 0.7 },
  // Seated customers eating at the tables — named regulars with moods.
  { id: 'cust1', kind: 'customer', x: -4.6, z: 4.1, w: 0.8, d: 0.8, shirt: 0x7e57c2, name: 'PAK DARMO', mood: 'LAPAR!' },
  { id: 'cust2', kind: 'customer', x: 4.6, z: 4.1, w: 0.8, d: 0.8, shirt: 0x00897b, name: 'BU LASTRI', mood: 'SENANG' },
  // Foreground props at the south edge, so the frame bottom is kitchen, not wall.
  { id: 'fg-basket', kind: 'basket', x: -5.9, z: 4.5, w: 0.9, d: 0.9 },
  { id: 'fg-plates', kind: 'plates', x: 5.9, z: 4.5, w: 0.9, d: 0.9 },
];

function hitsBox(x, z, r, b) {
  return x + r > b.x - b.w / 2 && x - r < b.x + b.w / 2
    && z + r > b.z - b.d / 2 && z - r < b.z + b.d / 2;
}

/** The station or decor box a circle at (x, z) with radius r overlaps. */
export function collidesWith(x, z, r) {
  for (const s of STATIONS) if (hitsBox(x, z, r, s)) return s;
  for (const d of DECOR) if (hitsBox(x, z, r, d)) return d;
  return null;
}

export function insideRoom(x, z, r) {
  return x - r >= ROOM.minX + 0.2 && x + r <= ROOM.maxX - 0.2
    && z - r >= ROOM.minZ + 0.2 && z + r <= ROOM.maxZ - 0.2;
}

/** The front face of a station: the side the cook stands at to use it. */
export function frontPoint(s) {
  if (s.kind === 'crate') return { x: s.x + s.w / 2, z: s.z };
  if (s.kind === 'serve') return { x: s.x - s.w / 2, z: s.z };
  return { x: s.x, z: s.z + s.d / 2 };
}

/** The station whose front the cook is nearest to, within reach. */
export function nearestStation(x, z, reach = 1.4) {
  let best = null;
  let bestD = Infinity;
  for (const s of STATIONS) {
    const f = frontPoint(s);
    const d = Math.hypot(x - f.x, z - f.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return bestD <= reach ? best : null;
}
