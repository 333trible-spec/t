'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.DEAL_CARD_BG_PORT || 3848);
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  let urlPath = url.pathname;
  if (urlPath === '/') urlPath = '/install.html';

  if (urlPath === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, service: 'deal-card-bg', port: PORT }));
    return;
  }

  const filePath = path.join(PUBLIC, urlPath.replace(/^\//, ''));
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      Allow: 'GET, POST, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, HEAD, OPTIONS',
    });
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, POST, HEAD, OPTIONS' });
    res.end('Method Not Allowed');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    if (req.method === 'HEAD') {
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      res.end();
      return;
    }
    const isText = ext !== '.png';
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(isText ? data.toString('utf8') : data);
  });
});

server.listen(PORT, () => {
  console.log(`deal-card-bg app: http://127.0.0.1:${PORT}`);
  console.log(`install: http://127.0.0.1:${PORT}/install.html`);
});
