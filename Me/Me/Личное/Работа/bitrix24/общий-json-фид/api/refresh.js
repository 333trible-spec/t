import { getFeed } from '../lib/get-feed.js';

export const config = {
  maxDuration: 60,
};

function readSecret(req) {
  const header = String(req.headers.authorization || '');
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();
  const q = req.query?.secret;
  return q ? String(q) : '';
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'POST, GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const expected = process.env.FEED_CRON_SECRET || '';
  if (!expected) {
    return res.status(503).json({
      ok: false,
      error: 'FEED_CRON_SECRET not configured',
    });
  }

  const got = readSecret(req);
  if (!got || got !== expected) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { feed, updatedAt, source, backend } = await getFeed({ force: true });
    let units = 0;
    for (const p of feed.projects || []) {
      const houses = p.houses_without_stage || p.houses || [];
      for (const h of houses) {
        for (const s of h.sections || []) {
          for (const f of s.floors || []) units += (f.flats || []).length;
        }
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      ok: true,
      updatedAt,
      source,
      backend,
      v: feed.v,
      projects: (feed.projects || []).length,
      units,
    });
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      ok: false,
      error: 'feed_refresh_failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
