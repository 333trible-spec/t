'use strict';

const fs = require('fs');
const path = require('path');

const HTML_DIR = path.join(__dirname, 'html');
const ALLOWED = new Set([
  'index.html',
  'install.html',
  'tab.html',
  'bp-form-config.js',
  'bp-form.js',
  'deal-prefill-map.js',
  'deal-prefill.js',
  'version.js',
  'app-dashboard.js',
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

/** Встраивание только с порталов Битрикс24 (и с того же origin на Vercel). */
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

function hasVersionQuery(req) {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    return url.searchParams.has('v');
  } catch (_) {
    return /\bv=/.test(String(req.url || ''));
  }
}

function applyCacheHeaders(file, ext, req, res) {
  if (file === 'version.js') {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    return;
  }
  if (ext === '.js') {
    if (hasVersionQuery(req)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
    return;
  }
  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
  }
}

module.exports = (req, res) => {
  const file = String(req.query.file || 'index.html').replace(/\.\./g, '').replace(/\\/g, '');
  if (!ALLOWED.has(file)) {
    res.status(404).end('Not found');
    return;
  }
  const filePath = path.join(HTML_DIR, file);
  if (!fs.existsSync(filePath)) {
    res.status(404).end('Not found');
    return;
  }
  const ext = path.extname(file);
  res.setHeader('Content-Type', MIME[ext] || 'text/plain; charset=utf-8');
  res.setHeader('Content-Security-Policy', 'frame-ancestors ' + CSP_FRAME_ANCESTORS);
  applyCacheHeaders(file, ext, req, res);
  res.status(200).end(fs.readFileSync(filePath, 'utf8'));
};
