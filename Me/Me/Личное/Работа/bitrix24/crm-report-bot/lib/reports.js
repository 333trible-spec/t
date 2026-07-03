'use strict';

const { listAll } = require('./b24');

const DEAL_CATEGORY_ID = Number(process.env.B24_DEAL_CATEGORY_ID || 1);
const STATUS_NAMES = {
  NEW: 'Новый лид',
  IN_PROCESS: 'Первичный контакт',
  UC_SHOW: 'Показ объекта',
  PROCESSED: 'Квалифицирован',
  CONVERTED: 'Конвертирован',
  JUNK: 'Некачественный',
};

const DEAL_STAGE_LABELS = {
  'C1:NEW': 'Новая сделка',
  'C1:PREPARATION': 'Консультация / Показ',
  'C1:PREPAYMENT_INVOICE': 'Бронь',
  'C1:EXECUTING': 'Оформление',
  'C1:FINAL_INVOICE': 'Оплата / Рассрочка',
  'C1:WON': 'Успешна',
  'C1:LOSE': 'Провалена',
};

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function formatMoney(n) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function groupCount(items, keyFn, labelFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, label: labelFn(key), count }))
    .sort((a, b) => b.count - a.count);
}

async function fetchLeadsSince(sinceIso, webhook) {
  return listAll(
    'crm.lead.list',
    {
      filter: { '>=DATE_CREATE': sinceIso },
      select: ['ID', 'TITLE', 'STATUS_ID', 'DATE_CREATE', 'OPPORTUNITY'],
    },
    webhook,
  );
}

async function fetchDealsSince(sinceIso, webhook) {
  return listAll(
    'crm.deal.list',
    {
      filter: {
        '>=DATE_CREATE': sinceIso,
        CATEGORY_ID: DEAL_CATEGORY_ID,
      },
      select: ['ID', 'TITLE', 'STAGE_ID', 'OPPORTUNITY', 'DATE_CREATE', 'CLOSEDATE'],
    },
    webhook,
  );
}

async function reportLeads(days = 7, webhook) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = formatDate(since);
  const leads = await fetchLeadsSince(sinceIso, webhook);
  const byStatus = groupCount(
    leads,
    (l) => l.STATUS_ID,
    (k) => STATUS_NAMES[k] || k,
  );

  const lines = [
    `📋 **Лиды за ${days} дн.** (с ${sinceIso})`,
    `Всего: **${leads.length}**`,
    '',
  ];
  if (byStatus.length === 0) {
    lines.push('_Новых лидов за период нет._');
  } else {
    lines.push('По стадиям:');
    for (const row of byStatus) {
      lines.push(`• ${row.label}: **${row.count}**`);
    }
  }
  return lines.join('\n');
}

async function reportDeals(days = 7, webhook) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = formatDate(since);
  const deals = await fetchDealsSince(sinceIso, webhook);
  const byStage = groupCount(
    deals,
    (d) => d.STAGE_ID,
    (k) => DEAL_STAGE_LABELS[k] || k,
  );
  const totalSum = deals.reduce((s, d) => s + Number(d.OPPORTUNITY || 0), 0);
  const won = deals.filter((d) => d.STAGE_ID === 'C1:WON');
  const wonSum = won.reduce((s, d) => s + Number(d.OPPORTUNITY || 0), 0);

  const lines = [
    `💼 **Сделки «Продажа недвижимости» за ${days} дн.**`,
    `Создано: **${deals.length}** · сумма: **${formatMoney(totalSum)}**`,
    `Успешных (WON): **${won.length}** · ${formatMoney(wonSum)}`,
    '',
  ];
  if (byStage.length === 0) {
    lines.push('_Новых сделок за период нет._');
  } else {
    lines.push('По стадиям:');
    for (const row of byStage) {
      lines.push(`• ${row.label}: **${row.count}**`);
    }
  }
  return lines.join('\n');
}

async function reportSummary(days = 7, webhook) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = formatDate(since);
  const [leads, deals] = await Promise.all([
    fetchLeadsSince(sinceIso, webhook),
    fetchDealsSince(sinceIso, webhook),
  ]);

  const todayIso = formatDate(startOfDay());
  const leadsToday = leads.filter((l) => (l.DATE_CREATE || '').startsWith(todayIso));
  const dealsToday = deals.filter((d) => (d.DATE_CREATE || '').startsWith(todayIso));
  const pipeline = deals.filter((d) => d.STAGE_ID !== 'C1:WON' && d.STAGE_ID !== 'C1:LOSE');
  const pipelineSum = pipeline.reduce((s, d) => s + Number(d.OPPORTUNITY || 0), 0);

  return [
    `📊 **Сводка CRM за ${days} дн.** (с ${sinceIso})`,
    '',
    `**Сегодня**`,
    `• Новых лидов: **${leadsToday.length}**`,
    `• Новых сделок: **${dealsToday.length}**`,
    '',
    `**За период**`,
    `• Лидов: **${leads.length}**`,
    `• Сделок в воронке: **${deals.length}**`,
    `• В работе (не WON/LOSE): **${pipeline.length}** · ${formatMoney(pipelineSum)}`,
    '',
    '_Команды: `отчет лиды`, `отчет сделки`, `отчет 30` (дней), `помощь`_',
  ].join('\n');
}

function helpText() {
  return [
    '🤖 **CRM-отчёты** — команды в чате с ботом:',
    '',
    '• `отчет` — сводка за 7 дней',
    '• `отчет 30` — сводка за 30 дней',
    '• `отчет лиды` / `отчет лиды 14`',
    '• `отчет сделки` / `отчет сделки 30`',
    '• `помощь` — это сообщение',
    '',
    'Данные: лиды + воронка «Продажа недвижимости».',
  ].join('\n');
}

async function buildReport(message, webhook) {
  const text = (message || '').trim().toLowerCase().replace(/^\//, '');
  const daysMatch = text.match(/(\d{1,3})/);
  const days = daysMatch ? Math.min(365, Math.max(1, Number(daysMatch[1]))) : 7;

  if (!text || text === 'помощь' || text === 'help' || text === 'старт') {
    return helpText();
  }
  if (text.startsWith('отчет лиды') || text.startsWith('отчет лид')) {
    return reportLeads(days, webhook);
  }
  if (text.startsWith('отчет сделки') || text.startsWith('отчет сделка')) {
    return reportDeals(days, webhook);
  }
  if (text.startsWith('отчет') || text.startsWith('сводка')) {
    return reportSummary(days, webhook);
  }
  return `${helpText()}\n\n_Не понял команду. Напишите «отчет» или «помощь»._`;
}

module.exports = { buildReport, helpText };
