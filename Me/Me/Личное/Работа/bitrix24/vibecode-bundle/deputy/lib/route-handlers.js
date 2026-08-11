'use strict';

const ROUTES = {
  dismissal: require('./handlers/dismissal'),
  'dismissal-cron': require('./handlers/dismissal-cron'),
  'delegation-cron': require('./handlers/delegation-cron'),
  'delegation-run': require('./handlers/delegation-run'),
  'cron-jobs': require('./handlers/cron-jobs'),
  'server-status': require('./handlers/server-status'),
  'hr-dismissals': require('./handlers/hr-dismissals'),
  'hr-vacations': require('./handlers/hr-vacations'),
  vacation: require('./handlers/hr-vacations'),
};

function routeName(req) {
  const q = req.query || {};
  if (q.path != null) {
    const p = q.path;
    return Array.isArray(p) ? p.join('/') : String(p);
  }
  const url = String((req && req.url) || '');
  const m = url.match(/\/api\/([^/?]+)/);
  return m ? m[1] : '';
}

function getHandler(name) {
  return ROUTES[name] || null;
}

module.exports = {
  ROUTES,
  routeName,
  getHandler,
};
