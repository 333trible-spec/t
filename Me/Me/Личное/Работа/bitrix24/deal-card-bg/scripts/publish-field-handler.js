'use strict';

/** Публикует field-handler.html на Диск портала (same-origin → покраска всей карточки). */
require('../lib/load-env');
const fs = require('fs');
const path = require('path');
const { uploadAppFile } = require('../lib/disk-upload');

const PUBLIC = path.join(__dirname, '..', 'app', 'public');
const OUT_JSON = path.join(PUBLIC, 'field-handler-url.json');

async function main() {
  const src = path.join(PUBLIC, 'field-handler.html');
  if (!fs.existsSync(src)) throw new Error('Нет field-handler.html');

  const upload = await uploadAppFile('field-handler.html', src);

  const payload = {
    handlerUrl: upload.url,
    handlerDownloadUrl: upload.downloadUrl,
    handlerBindUrl: upload.downloadUrl,
    handlerFileId: upload.fileId,
    uploadedAt: new Date().toISOString(),
    note: 'handlerBindUrl = DOWNLOAD (same-origin) для userfieldtype HANDLER',
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + '\n');
  await uploadAppFile('field-handler-url.json', OUT_JSON);
  console.log('field-handler.html →', upload.downloadUrl);
  console.log('Сохранено:', OUT_JSON);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
