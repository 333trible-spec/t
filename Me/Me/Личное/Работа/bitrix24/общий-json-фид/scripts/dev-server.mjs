import http from 'node:http';
import { buildMergedFeed } from '../lib/merge.js';

const PORT = Number(process.env.PORT || 3850);

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  if (req.url !== '/' && req.url !== '/api/feed') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  try {
    const feed = await buildMergedFeed();
    const body = JSON.stringify(feed);
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'feed_merge_failed',
        message: err instanceof Error ? err.message : String(err),
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`obshchiy-json-feed http://127.0.0.1:${PORT}/`);
});
