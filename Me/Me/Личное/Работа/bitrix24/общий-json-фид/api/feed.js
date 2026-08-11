import { getFeed } from '../lib/get-feed.js';

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { feed, updatedAt, source, backend } = await getFeed({ force: false });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.setHeader('X-Feed-Updated-At', updatedAt);
    res.setHeader('X-Feed-Source', source);
    res.setHeader('X-Feed-Backend', backend);
    return res.status(200).send(JSON.stringify(feed));
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      error: 'feed_merge_failed',
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
