'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'app', 'public');

function syncPublicAssets() {
  const userscript = path.join(ROOT, 'userscript', 'deal-card-bg.user.js');
  const dest = path.join(PUBLIC, 'deal-card-bg.user.js');
  if (!fs.existsSync(userscript)) {
    throw new Error(`userscript not found: ${userscript}`);
  }
  fs.copyFileSync(userscript, dest);
}

if (require.main === module) {
  syncPublicAssets();
  console.log('OK: userscript → app/public/deal-card-bg.user.js');
}

module.exports = { syncPublicAssets };
