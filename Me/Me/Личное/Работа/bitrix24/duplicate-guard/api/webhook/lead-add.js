'use strict';

const { processNewLead } = require('../lib/engine');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    let body = req.body;
    if (!body || typeof body === 'string') {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : {};
    }
    if (!body.event && req.on) {
      body = await readBody(req);
    }

    const event = body.event || body.EVENT;
    if (event !== 'ONCRMLEADADD') {
      res.status(200).json({ ok: true, skipped: true, reason: 'not_lead_add' });
      return;
    }

    const auth = body.auth;
    if (!auth?.access_token || !auth?.domain) {
      res.status(401).json({ error: 'NO_AUTH' });
      return;
    }

    const expectedToken = process.env.OUTGOING_APP_TOKEN;
    if (expectedToken && body.auth?.application_token !== expectedToken) {
      res.status(403).json({ error: 'INVALID_APP_TOKEN' });
      return;
    }

    const leadId = body.data?.FIELDS?.ID || body.data?.FIELDS?.id;
    if (!leadId) {
      res.status(400).json({ error: 'NO_LEAD_ID' });
      return;
    }

    const result = await processNewLead(auth, null, leadId);
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('webhook lead-add:', err);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: err.message,
    });
  }
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
