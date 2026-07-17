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

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const file = REWRITES[pathname];

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
