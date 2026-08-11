'use strict';

const { json } = require('../b24');
const { assertAppCaller } = require('../app-auth');

const ENDPOINT = 'https://api.cron-job.org';

const STATUS_LABELS = {
  0: 'Ещё не запускался',
  1: 'Успешно',
  2: 'Ошибка (DNS)',
  3: 'Ошибка (нет связи)',
  4: 'Ошибка (HTTP)',
  5: 'Ошибка (таймаут)',
  6: 'Ошибка (слишком большой ответ)',
  7: 'Ошибка (неверный URL)',
  8: 'Ошибка (внутренняя)',
  9: 'Ошибка',
};

function firstScheduleInt(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  const v = arr[0];
  if (v === -1) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function scheduleLabel(schedule) {
  const s = schedule || {};
  const h = firstScheduleInt(s.hours);
  const m = firstScheduleInt(s.minutes);
  const tz = s.timezone || 'Asia/Yekaterinburg';
  const tzShort = /Yekaterinburg/i.test(tz) ? 'YEKT' : tz;
  if (h == null && m == null) return tzShort;
  const hh = String(h != null ? h : 0).padStart(2, '0');
  const mm = String(m != null ? m : 0).padStart(2, '0');
  return hh + ':' + mm + ' ' + tzShort;
}

function eventKind(title, url) {
  const t = String(title || '').toLowerCase();
  const u = String(url || '').toLowerCase();
  if (t.indexOf('делег') !== -1 || u.indexOf('delegation') !== -1) return 'delegation';
  if (t.indexOf('увольн') !== -1 || u.indexOf('dismissal') !== -1) return 'dismissal';
  return 'other';
}

function eventName(kind, title) {
  if (kind === 'delegation') return 'Делегирование';
  if (kind === 'dismissal') return 'Увольнение';
  const raw = String(title || '').trim();
  return raw || 'Задание';
}

function statusLabel(code) {
  const n = Number(code);
  if (STATUS_LABELS[n] != null) return STATUS_LABELS[n];
  return 'Статус ' + String(code);
}

function mapJob(job) {
  const kind = eventKind(job.title, job.url);
  const status = job.lastStatus != null ? Number(job.lastStatus) : 0;
  return {
    jobId: job.jobId,
    enabled: !!job.enabled,
    title: job.title || '',
    kind: kind,
    name: eventName(kind, job.title),
    scheduleLabel: scheduleLabel(job.schedule),
    lastStatus: status,
    lastStatusLabel: statusLabel(status),
    lastDurationMs: job.lastDuration != null ? Number(job.lastDuration) : null,
    lastExecution: job.lastExecution != null ? Number(job.lastExecution) : null,
    nextExecution: job.nextExecution != null ? Number(job.nextExecution) : null,
  };
}

function sortJobs(a, b) {
  const ah = a.scheduleLabel || '';
  const bh = b.scheduleLabel || '';
  if (ah !== bh) return ah < bh ? -1 : 1;
  return String(a.name).localeCompare(String(b.name), 'ru');
}

async function fetchCronJobs(apiKey) {
  const res = await fetch(ENDPOINT + '/jobs', {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = {};
  }
  if (!res.ok) {
    const err = new Error(
      (data && (data.message || data.error)) ||
        'cron-job.org HTTP ' + res.status
    );
    err.status = res.status >= 400 && res.status < 600 ? res.status : 502;
    throw err;
  }
  return data;
}

module.exports = async function handler(req, res) {
  try {
    const method = String((req && req.method) || 'GET').toUpperCase();
    if (method !== 'GET') {
      json(res, 405, { ok: false, error: 'Method not allowed' });
      return;
    }

    await assertAppCaller(req, { query: req.query || {} });

    const apiKey = String(process.env.CRON_JOB_ORG_API_KEY || '').trim();
    if (!apiKey) {
      json(res, 503, {
        ok: false,
        error: 'Не задан CRON_JOB_ORG_API_KEY на сервере',
        code: 'CRON_API_KEY_MISSING',
      });
      return;
    }

    const data = await fetchCronJobs(apiKey);
    const jobs = (Array.isArray(data.jobs) ? data.jobs : [])
      .map(mapJob)
      .sort(sortJobs);

    json(res, 200, {
      ok: true,
      jobs: jobs,
      someFailed: !!data.someFailed,
      consoleUrl: 'https://console.cron-job.org/jobs',
    });
  } catch (err) {
    const status = err && err.status ? err.status : 500;
    json(res, status, {
      ok: false,
      error: err && err.message ? err.message : String(err),
      code: err && err.code ? err.code : undefined,
    });
  }
};
