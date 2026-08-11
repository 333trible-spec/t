'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// ── 6 кадров (deputy) ──────────────────────────────────────────────

const deputyRoot = path.join(__dirname, 'deputy');
const deputyServe = require(path.join(deputyRoot, 'api', 'serve.js'));
const { getHandler: deputyGetHandler } = require(path.join(deputyRoot, 'lib', 'route-handlers.js'));

const DEPUTY_REWRITES = {
  '/': 'install.html',
  '/install.html': 'install.html',
  '/app.html': 'main.html',
  '/main.html': 'main.html',
  '/app.css': 'styles.css',
  '/styles.css': 'styles.css',
  '/app.js': 'client.js',
  '/client.js': 'client.js',
  '/version.js': 'version.js',
  '/constants-registry.js': 'constants-registry.js',
  '/img/footer-die.png': 'img/footer-die.png',
  '/img/deny-key.png': 'img/deny-key.png',
  '/img/console-1001.png': 'img/console-1001.png',
};

// ── Заявка на договор (contract) ────────────────────────────────────

const contractHtmlDir = path.join(__dirname, 'contract', 'html');
const CONTRACT_ALLOWED = new Set([
  'index.html', 'install.html', 'tab.html',
  'bp-form-config.js', 'bp-form.js',
  'deal-prefill-map.js', 'deal-prefill.js',
  'version.js', 'app-dashboard.js',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const CSP_FRAME_ANCESTORS = [
  "'self'",
  'https://*.bitrix24.ru', 'https://*.bitrix24.com',
  'https://*.bitrix24.eu', 'https://*.bitrix24.de',
  'https://*.bitrix24.fr', 'https://*.bitrix24.pl',
  'https://*.bitrix24.es', 'https://*.bitrix24.com.br',
  'https://*.bitrix24.cn',
].join(' ');

function wrapRes(res) {
  return {
    setHeader: function (k, v) { res.setHeader(k, v); },
    status: function (code) {
      res.statusCode = code;
      return { end: function (body) { res.end(body); } };
    },
  };
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on('data', function (c) { chunks.push(c); });
    req.on('end', function () {
      var raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) { resolve(undefined); return; }
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function handleDeputyApi(routeName, req, res, parsed) {
  var handler = deputyGetHandler(routeName);
  if (!handler) return false;
  readBody(req).then(function (body) {
    var fakeReq = {
      method: req.method || 'GET',
      url: req.url,
      query: Object.fromEntries(parsed.searchParams),
      body: body,
      headers: req.headers,
    };
    return handler(fakeReq, wrapRes(res));
  }).catch(function (err) {
    if (res.headersSent) return;
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: err && err.message ? err.message : String(err) }));
  });
  return true;
}

function serveDeputyStatic(subPath, res) {
  var file = DEPUTY_REWRITES[subPath];
  if (!file) return false;
  var fakeReq = { url: '/api/serve?file=' + encodeURIComponent(file), query: { file: file } };
  deputyServe(fakeReq, wrapRes(res));
  return true;
}

function serveContractFile(fileName, req, res) {
  if (!CONTRACT_ALLOWED.has(fileName)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  var filePath = path.join(contractHtmlDir, fileName);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  var ext = path.extname(fileName);
  res.setHeader('Content-Type', MIME[ext] || 'text/plain; charset=utf-8');
  res.setHeader('Content-Security-Policy', 'frame-ancestors ' + CSP_FRAME_ANCESTORS);
  if (fileName === 'version.js') {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  } else if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  } else if (ext === '.js') {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  res.writeHead(200);
  res.end(fs.readFileSync(filePath, 'utf8'));
}

// ── HTTP-сервер ─────────────────────────────────────────────────────

var server = http.createServer(function (req, res) {
  var parsed = new URL(req.url || '/', 'http://127.0.0.1:' + PORT);
  var pathname = parsed.pathname.replace(/\/+$/, '') || '/';

  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
    return;
  }

  // ── /contract/* ───────────────────────────────────────────────────
  if (pathname === '/contract' || pathname.startsWith('/contract/')) {
    var contractFile = pathname.replace(/^\/contract\/?/, '') || 'index.html';
    serveContractFile(contractFile, req, res);
    return;
  }

  // ── /api/* и /deputy/api/* ───────────────────────────────────────
  var apiMatch = pathname.match(/^\/(?:deputy\/)?api\/([^/]+)$/);
  if (apiMatch && handleDeputyApi(apiMatch[1], req, res, parsed)) {
    return;
  }

  // ── /deputy/* (статика, алиас) ────────────────────────────────────
  if (pathname === '/deputy' || pathname.startsWith('/deputy/')) {
    var deputySub = '/' + (pathname.replace(/^\/deputy\/?/, '') || '');
    if (serveDeputyStatic(deputySub, res)) return;
  }

  // ── корень: 6 кадров (как на Vercel) ──────────────────────────────
  if (serveDeputyStatic(pathname, res)) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', function () {
  console.log('Listening on port ' + PORT);
});
