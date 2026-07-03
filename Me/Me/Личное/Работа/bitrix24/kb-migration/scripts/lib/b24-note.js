import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function loadWebhook() {
  const env = readFileSync(join(root, '.env'), 'utf8');
  const m = env.match(/^B24_KB_WEBHOOK=(.+)$/m);
  if (!m) throw new Error('B24_KB_WEBHOOK not found in .env');
  return m[1].trim();
}

export function apiUrl(webhook, method) {
  return webhook.replace('/rest/', '/rest/api/').replace(/\/?$/, '/') + method;
}

export async function b24v3(webhook, method, body = {}) {
  const res = await fetch(apiUrl(webhook, method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data?.error) {
    const err = new Error(`${data.error.code}: ${data.error.message}`);
    err.code = data.error.code;
    err.payload = data;
    throw err;
  }
  return data;
}

export function parseIncidentNumber(title) {
  const m = title.match(/Инцидент\s+(\d+)/i);
  return m ? Number(m[1]) : null;
}

/** В БЗ 2.0 соседние страницы сортируются по position по убыванию (больше — выше). */
export function positionForIncidentNumber(incidentNumber, totalCount, step = 1000) {
  return (totalCount - incidentNumber + 1) * step;
}

export function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    const child = findNode(n.children || [], id);
    if (child) return child;
  }
  return null;
}

export async function listChildren(webhook, collectionId, parentId) {
  const tree = await b24v3(webhook, 'note.document.tree.list', { collectionId });
  const folder = findNode(tree.result?.items || [], parentId);
  if (!folder?.children?.length) return [];
  return folder.children.map((c) => ({
    id: c.id,
    title: c.title,
    position: c.position,
    incidentNumber: parseIncidentNumber(c.title),
  }));
}

export async function setDocumentPosition(webhook, id, position) {
  return b24v3(webhook, 'note.document.update', {
    id,
    fields: { position },
  });
}

export async function reorderIncidentsInFolder(webhook, parentId, collectionId = 16, { dryRun = false } = {}) {
  const children = await listChildren(webhook, collectionId, parentId);
  const incidents = children.filter((c) => c.incidentNumber != null);
  if (!incidents.length) {
    return { parentId, updated: [], skipped: children };
  }

  const total = Math.max(...incidents.map((i) => i.incidentNumber));
  const sorted = [...incidents].sort((a, b) => a.incidentNumber - b.incidentNumber);
  const plan = sorted.map((doc) => ({
    id: doc.id,
    title: doc.title,
    incidentNumber: doc.incidentNumber,
    currentPosition: doc.position,
    newPosition: positionForIncidentNumber(doc.incidentNumber, total),
  }));

  const updated = [];
  for (const item of plan) {
    if (item.currentPosition === item.newPosition) continue;
    if (!dryRun) {
      await setDocumentPosition(webhook, item.id, item.newPosition);
    }
    updated.push(item);
  }

  return { parentId, total, plan, updated };
}
