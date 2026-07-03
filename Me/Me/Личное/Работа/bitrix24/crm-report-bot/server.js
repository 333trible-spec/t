'use strict';

require('./lib/load-env');

const http = require('http');
const { handleBitrixEvent } = require('./lib/bot-handler');
const { pollEvents } = require('./lib/poll-events');

const PORT = Number(process.env.PORT || 3847);
const HANDLER_PATH = process.env.B24_HANDLER_PATH || '/bitrix/handler';
const EVENT_MODE = (process.env.B24_EVENT_MODE || 'fetch').toLowerCase();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'b24-crm-report-bot' }));
    return;
  }

  if (req.method === 'POST' && url.pathname === HANDLER_PATH) {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      console.log(`[${new Date().toISOString()}] event:`, body?.event || '(no event)');
      const result = await handleBitrixEvent(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`B24 CRM report bot listening on http://127.0.0.1:${PORT}`);
  console.log(`Handler: POST ${HANDLER_PATH}`);
  console.log(`Health:  GET /health`);
  console.log(`Events:  ${EVENT_MODE}`);
  if (EVENT_MODE === 'fetch') {
    pollEvents().catch((err) => console.error('poll fatal:', err));
  }
});
