import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const require = createRequire(import.meta.url);
const PORT = Number(process.env.PORT) || 3840;

const REWRITES = {
  '/': 'install.html',
  '/install.html': 'install.html',
  '/app.html': 'app.html',
  '/main.html': 'main.html',
  '/app.css': 'app.css',
  '/styles.css': 'styles.css',
  '/app.js': 'app.js',
  '/client.js': 'client.js',
  '/version.js': 'version.js',
  '/constants-registry.js': 'constants-registry.js',
  '/img/footer-die.png': 'img/footer-die.png',
  '/img/deny-key.png': 'img/deny-key.png',
  '/img/console-1001.png': 'img/console-1001.png',
};

function createVercelRes(res) {
  return {
    setHeader(k, v) {
      res.setHeader(k, v);
    },
    status(code) {
      res.statusCode = code;
      return {
        end(body) {
          res.end(body);
        },
      };
    },
  };
}

const serve = require(path.join(root, 'api', 'serve.js'));
const { getHandler } = require(path.join(root, 'lib', 'route-handlers.js'));

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const file = REWRITES[pathname];

  const apiMatch = pathname.match(/^\/api\/([^/]+)$/);
  if (apiMatch) {
    const handler = getHandler(apiMatch[1]);
    if (handler) {
      readRequestBody(req)
        .then((body) => {
          const fakeReq = {
            method: req.method || 'GET',
            url: req.url,
            query: Object.fromEntries(url.searchParams),
            body: body,
            headers: req.headers,
          };
          return handler(fakeReq, createVercelRes(res));
        })
        .catch((err) => {
          if (res.headersSent) return;
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err) }));
        });
      return;
    }
  }

  if (file) {
    const fakeReq = {
      url: '/api/serve?file=' + encodeURIComponent(file),
      query: { file },
    };
    serve(fakeReq, createVercelRes(res));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`6 кадров — http://127.0.0.1:${PORT}/app.html`);
  console.log(`Установка:  http://127.0.0.1:${PORT}/install.html`);
});
