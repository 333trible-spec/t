'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED_HTML = new Set([
  'install.html',
  'app.html',
  'field-handler.html',
  'tab.html',
  'worker.html',
  'bookmarklet.html',
  'fix-worker.html',
  'fix-field.html',
  'portal-worker.html',
]);

const ALLOWED_ASSET = {
  'version.json': 'application/json; charset=utf-8',
  'portal-worker-url.json': 'application/json; charset=utf-8',
  'field-handler-url.json': 'application/json; charset=utf-8',
  'paint-bridge.js': 'application/javascript; charset=utf-8',
  'parent-painter.js': 'application/javascript; charset=utf-8',
  'deal-card-bg.user.js': 'application/javascript; charset=utf-8',
  'assets/mascot.png': 'image/png',
  'mascot.png': 'image/png',
};

module.exports = (req, res) => {
  const file = String(req.query.file || 'install.html').replace(/\.\./g, '');
  const assetDir = path.join(__dirname, 'assets');
  const htmlDir = path.join(__dirname, 'html');

  if (ALLOWED_ASSET[file]) {
    const rel = file === 'mascot.png' ? 'mascot.png' : file.replace(/^assets\//, '');
    const filePath = path.join(assetDir, rel);
    if (!fs.existsSync(filePath)) {
      res.status(404).end('Not found');
      return;
    }
    const isBinary = ALLOWED_ASSET[file].startsWith('image/');
    res.setHeader('Content-Type', ALLOWED_ASSET[file]);
    res.status(200).end(fs.readFileSync(filePath, isBinary ? undefined : 'utf8'));
    return;
  }

  if (!ALLOWED_HTML.has(file)) {
    res.status(404).end('Not found');
    return;
  }

  const html = fs.readFileSync(path.join(htmlDir, file), 'utf8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(html);
};
