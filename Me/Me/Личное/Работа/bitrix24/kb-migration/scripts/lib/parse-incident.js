/**
 * Общий парсинг инцидентов Навигатора → markdown БЗ 2.0.
 */
export function normalizeFormulations(text) {
  return text
    .replace(/\n+/g, ' ')
    .replace(/\s*\/\s*/g, '/ ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseTags(raw) {
  return raw
    .replace(/\[a\]/gi, '')
    .split(/[,;]/)
    .map((t) => t.trim().replace(/\.$/, ''))
    .filter(Boolean)
    .map((t) => `\`${t}\``)
    .join(', ');
}

export function parseRoles(raw) {
  return raw.replace(/[()]/g, '').trim();
}

export function cleanSolutionText(text) {
  return text
    .split(/\n\[a\]/)[0]
    .split(/\n\nСобственник может авторизоваться/)[0]
    .trim();
}

export function parseSolutions(body) {
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

export function fieldValue(body, name) {
  const re = new RegExp(
    `${name}\\s*(?:\\([^)]*\\))?\\s*:?\\s*([\\s\\S]*?)(?=\\n\\n|Решение\\s+\\d+:|Теги|Причина|Описание сценария|Формулировки|$)`,
    'i',
  );
  const m = body.match(re);
  return m ? m[1].trim() : '';
}

export function buildIncidentMarkdown({ formulations, scenario, tagsRaw, cause, solutions, extra = '' }) {
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

  if (extra) md += `\n${extra.trim()}\n`;
  return md.trim();
}

export function parseIncidentBody(title, body, { order = 0, extra = '' } = {}) {
  const formulations = normalizeFormulations(fieldValue(body, 'Формулировки клиентов'));
  const scenario = fieldValue(body, 'Описание сценария');
  const tagsRaw = fieldValue(body, 'Теги');
  const cause = fieldValue(body, 'Причина').replace(/\r/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  const solutions = parseSolutions(body);

  return {
    order,
    title: title.trim(),
    markdown: buildIncidentMarkdown({ formulations, scenario, tagsRaw, cause, solutions, extra }),
  };
}
