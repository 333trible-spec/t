import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const PORT = Number(process.env.PORT) || 3090;

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      if (!process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
    }
  }
}
loadEnv();

const routes = [
  { method: 'POST', path: '/api/webhook/lead-add', file: '../api/webhook/lead-add.js' },
];

function createRes(res) {
  return {
    setHeader(k, v) { res.setHeader(k, v); },
    status(code) {
      res.statusCode = code;
      return {
        json(obj) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(obj));
        },
      };
    },
    get body() { return res.body; },
  };
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('INVALID_JSON')); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  if (pathname === '/install.html' || pathname === '/settings.html' || pathname === '/field-handler.html' || pathname === '/fix-dup-fields.html' || pathname === '/') {
    const file = pathname === '/' ? 'install.html' : pathname.slice(1);
    const fp = path.join(root, 'api', 'html', file);
    if (fs.existsSync(fp)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(fp));
      return;
    }
  }

  const route = routes.find((r) => r.path === pathname && r.method === req.method);
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'NOT_FOUND' }));
    return;
  }

  try {
    req.body = await readBody(req);
    const handler = require(path.join(__dirname, route.file));
    const vercelRes = createRes(res);
    await handler(req, vercelRes);
    if (!res.writableEnded) res.writeHead(500).end('{}');
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Duplicate Guard dev: http://localhost:${PORT}/install.html`);
});
