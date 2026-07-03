'use strict';

const fs = require('fs');
const path = require('path');

const ALLOWED = new Set(['install.html', 'settings.html', 'field-handler.html', 'fix-dup-fields.html']);

module.exports = (req, res) => {
  const file = String(req.query.file || 'install.html').replace(/\.\./g, '');
  if (!ALLOWED.has(file)) {
    res.status(404).end('Not found');
    return;
  }
  const filePath = path.join(__dirname, 'html', file);
  if (!fs.existsSync(filePath)) {
    res.status(404).end('Not found');
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).end(fs.readFileSync(filePath, 'utf8'));
};
