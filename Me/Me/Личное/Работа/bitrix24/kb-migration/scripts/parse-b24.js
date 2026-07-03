/**
 * Парсинг export/B24.txt → markdown для БЗ 2.0 (формат document/122).
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const WELLSOFT_BLOCK = `Собственник может авторизоваться в приложении либо если в системе у него есть завершенная сделка, либо активные лицевые счета. Также обязательно наличие хотя бы одного контакта: email/телефон.

Завершенные сделки проверяются по Б24, лицевые счета — из учетной системы. Чтобы не возникало дублей собственников, нужно, чтобы ФИО и контакты собственника были везде указаны одинаково.

При авторизации с номером застройщика доступен модуль Застройщика: контент на главной странице, купленные объекты в разделе "Мои объекты" (с возможностью записаться на получение ключей, если доступно), программа лояльности, настройки аккаунта и уведомления.

При авторизации с активным ЛС доступен модуль УК со всеми инструментами управления объектом и лицевым счетом.

Если у собственника есть сделка в Б24, и ЛС, то ему доступны оба модуля. Проверить, когда исчез доступ, возможности нет — такие данные не логируются.

Отдельно подчеркиваем, что модули УК и Застройщик находятся в одной инфраструктуре с общим интерфейсом и БД, а модуль Приёмки является отдельным`;

function normalizeFormulations(text) {
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s*\/\s*/g, '/ ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTags(raw) {
  return raw
    .replace(/\[a\]/gi, '')
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `\`${t}\``)
    .join(', ');
}

function parseRoles(raw) {
  return raw.replace(/[()]/g, '').trim();
}

function cleanSolutionText(text) {
  return text
    .split(/\n\[a\]/)[0]
    .split(/\n\nСобственник может авторизоваться/)[0]
    .trim();
}

function parseSolutions(body) {
  const solutions = [];
  const re = /Решение\s+(\d+):\s*(?:\(([^)]*)\))?\s*([\s\S]*?)(?=Решение\s+\d+:|$)/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    solutions.push({
      num: Number(m[1]),
      roles: m[2] ? parseRoles(m[2]) : '',
      text: cleanSolutionText(m[3]).replace(/\n{3,}/g, '\n\n'),
    });
  }
  return solutions.sort((a, b) => a.num - b.num);
}

function fieldValue(body, name) {
  const re = new RegExp(
    `${name}\\s*(?:\\([^)]*\\))?\\s*:?\\s*([\\s\\S]*?)(?=\\n\\n|Решение\\s+\\d+:|Теги|Причина|Описание сценария|Формулировки|$)`,
    'i',
  );
  const m = body.match(re);
  return m ? m[1].trim() : '';
}

export function parseB24Export(filePath = join(root, 'export', 'B24.txt')) {
  const text = readFileSync(filePath, 'utf8');
  const afterTemplate = text.split(/\n_{10,}\s*\n/).slice(1).join('\n');
  const lines = afterTemplate.split('\n');
  const incidents = [];

  for (let i = 0; i < lines.length - 1; i++) {
    const title = lines[i].trim();
    if (!title || !/^Формулировки клиентов/i.test(lines[i + 1].trim())) continue;

    let j = i + 1;
    const bodyLines = [];
    while (j < lines.length) {
      const t = lines[j].trim();
      if (j > i + 1 && t && /^Формулировки клиентов/i.test(t)) break;
      bodyLines.push(lines[j]);
      j++;
    }

    const body = bodyLines.join('\n');
    const order = incidents.length + 1;
    const parsed = parseIncidentSection(order, body, title);
    incidents.push(parsed);
    i = j - 1;
  }

  return incidents;
}

function parseIncidentSection(order, body, title) {
  const formulations = normalizeFormulations(
    fieldValue(body, 'Формулировки клиентов') || fieldValue(body, 'Формулировки клиентов '),
  );
  let scenario = fieldValue(body, 'Описание сценария');
  const tagsRaw = fieldValue(body, 'Теги');
  const cause = fieldValue(body, 'Причина');
  const solutions = parseSolutions(body);

  let md = `**Формулировки клиентов:** ${formulations}

**Описание сценария для повторения ошибки:** ${scenario}

**Теги**: ${parseTags(tagsRaw)}

**Причина:** ${cause}
`;

  for (const sol of solutions) {
    const label = sol.num === 1 ? '**Решение**' : `**Решение ${sol.num}**`;
    const roles = sol.roles ? `(*${sol.roles}*) ` : '';
    md += `\n${label}: ${roles}${sol.text}\n`;
  }

  if (order === 6) {
    md += `\n**Wellsoft — авторизация собственника**\n\n${WELLSOFT_BLOCK}\n`;
  }

  return { order, title, markdown: md.trim() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const incidents = parseB24Export();
  for (const inc of incidents) {
    console.log('===', inc.title, '===');
    console.log(inc.markdown.slice(0, 400) + '...\n');
  }
}
