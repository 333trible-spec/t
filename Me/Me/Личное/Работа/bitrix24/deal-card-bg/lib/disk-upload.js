'use strict';

const fs = require('fs');
const path = require('path');
const { callRest, normalizeWebhook } = require('./b24');

const COMMON_STORAGE_ID = '3';
const FOLDER_NAME = 'deal-card-bg';

const MIME = {
  '.js': 'application/javascript',
  '.html': 'text/html; charset=utf-8',
};

function mimeFor(fileName) {
  return MIME[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
}

async function findChildFolder(parentId, name) {
  const { result } = await callRest('disk.storage.getchildren', { id: parentId });
  return (result || []).find((item) => item.TYPE === 'folder' && item.NAME === name) || null;
}

async function ensureFolder() {
  const hit = await findChildFolder(COMMON_STORAGE_ID, FOLDER_NAME);
  if (hit) return hit.ID;
  const { result: folderId } = await callRest('disk.folder.addsubfolder', {
    id: COMMON_STORAGE_ID,
    data: { NAME: FOLDER_NAME },
  });
  return folderId;
}

async function findFile(folderId, fileName) {
  const { result } = await callRest('disk.folder.getchildren', { id: folderId });
  return (result || []).find((item) => item.TYPE === 'file' && item.NAME === fileName) || null;
}

async function finishDiskUpload(uploadUrl, content, fileName, mime) {
  const form = new FormData();
  form.append('file', new Blob([content], { type: mime }), fileName);
  const res = await fetch(uploadUrl, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  const fileId = data.result?.ID || data.result?.FILE_ID || data.ID;
  if (!fileId) throw new Error(`Не удалось получить ID файла ${fileName}`);
  return fileId;
}

async function uploadFile(folderId, fileName, filePath, contentOverride) {
  const webhook = normalizeWebhook(process.env.B24_WEBHOOK || process.env.B24_TEST_WEBHOOK);
  if (!webhook) throw new Error('B24_TEST_WEBHOOK не задан');

  const content = contentOverride ?? fs.readFileSync(filePath);
  const mime = mimeFor(fileName);
  const existing = await findFile(folderId, fileName);

  if (existing) {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    await callRest('disk.file.uploadversion', {
      id: existing.ID,
      fileContent: [fileName, buffer.toString('base64')],
    });
    return existing.ID;
  }

  const form = new FormData();
  form.append('id', String(folderId));
  form.append('data', JSON.stringify({ NAME: fileName }));
  form.append('file', new Blob([content], { type: mime }), fileName);
  const res = await fetch(`${webhook}disk.folder.uploadfile`, { method: 'POST', body: form });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  if (!data.result?.uploadUrl) throw new Error(`Нет uploadUrl для ${fileName}`);
  return finishDiskUpload(data.result.uploadUrl, content, fileName, mime);
}

async function externalLink(fileId, preferDetail) {
  const { result } = await callRest('disk.file.get', { id: fileId });
  const url = preferDetail
    ? (result?.DETAIL_URL || result?.DOWNLOAD_URL || result?.downloadUrl)
    : (result?.DOWNLOAD_URL || result?.DETAIL_URL || result?.downloadUrl);
  if (!url) throw new Error(`Нет URL для файла ${fileId}`);
  return String(url);
}

async function uploadAppFile(fileName, filePath, contentOverride) {
  const folderId = await ensureFolder();
  const fileId = await uploadFile(folderId, fileName, filePath, contentOverride);
  const isHtml = fileName.toLowerCase().endsWith('.html');
  const url = await externalLink(fileId, isHtml);
  const downloadUrl = isHtml ? await externalLink(fileId, false) : url;
  return { fileId, url, downloadUrl };
}

async function uploadSiteScript(fileName) {
  const filePath = path.join(__dirname, '..', 'site', fileName);
  const { url } = await uploadAppFile(fileName, filePath);
  return url;
}

module.exports = { uploadAppFile, uploadSiteScript, ensureFolder, externalLink };
