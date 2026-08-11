'use strict';

const fs = require('fs');
const path = require('path');

const HTML_DIR = path.join(__dirname, '..', 'static');

/** Публичное имя → файл на диске (уникальные basenames для Vercel) */
const FILE_MAP = {
  'install.html': 'install.html',
  'app.html': 'main.html',
  'main.html': 'main.html',
  'app.css': 'styles.css',
  'styles.css': 'styles.css',
  'app.js': 'client.js',
  'client.js': 'client.js',
  'version.js': 'version.js',
  'constants-registry.js': 'constants-registry.js',
  'img/footer-die.png': 'img/footer-die.png',
  'img/deny-key.png': 'img/deny-key.png',
  'img/console-1001.png': 'img/console-1001.png',
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

const CSP_FRAME_ANCESTORS = [
  "'self'",
  'https://*.bitrix24.ru',
  'https://*.bitrix24.com',
  'https://*.bitrix24.eu',
  'https://*.bitrix24.de',
  'https://*.bitrix24.fr',
  'https://*.bitrix24.pl',
  'https://*.bitrix24.es',
  'https://*.bitrix24.com.br',
  'https://*.bitrix24.cn',
].join(' ');

module.exports = (req, res) => {
  const requested = String(req.query.file || 'install.html').replace(/\.\./g, '').replace(/\\/g, '');
  const file = FILE_MAP[requested];
  if (!file) {
    res.status(404).end('Not found');
    return;
  }
  const filePath = path.join(HTML_DIR, file);
  if (!fs.existsSync(filePath)) {
    res.status(404).end('Not found');
    return;
  }
  const ext = path.extname(file).toLowerCase();
  res.setHeader('Content-Type', MIME[ext] || 'text/plain; charset=utf-8');
  res.setHeader('Content-Security-Policy', 'frame-ancestors ' + CSP_FRAME_ANCESTORS);
  if (ext === '.html' || ext === '.js' || ext === '.css') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  if (BINARY_EXT.has(ext)) {
    res.status(200).end(fs.readFileSync(filePath));
    return;
  }
  res.status(200).end(fs.readFileSync(filePath, 'utf8'));
};
