'use strict';

const { json } = require('../lib/b24');
const { routeName, getHandler } = require('../lib/route-handlers');

module.exports = async function handler(req, res) {
  const name = routeName(req);
  const fn = getHandler(name);
  if (!fn) {
    json(res, 404, { ok: false, error: 'API route not found: ' + name });
    return;
  }
  return fn(req, res);
};
