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
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

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
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  res.status(200).end(fs.readFileSync(filePath, 'utf8'));
};
