// Sizzle & Serve 3D — a tiny static server for local playtesting.
// Serves this directory on http://localhost:8080 (game/ at /game/).
// Node 22, standard library only. Run: node serve.ts

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
};

createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
    const file = join(root, url === '/' ? 'game/index.html' : url);
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(8080, '127.0.0.1', () => {
  console.log('Sizzle & Serve 3D at http://localhost:8080/game/index.html');
});
