const fs = require('fs');
const path = require('path');

const VAULT = path.resolve(__dirname, '..');
const OUT = __dirname;

const PAGES = {
  index: 'Ищем истину/Ищем истину.md',
  'prisca-sapientia': 'Ищем истину/Prisca sapientia.md',
  filosofiya: 'Ищем истину/Философия/Философия.md',
  fenomenologiya: 'Ищем истину/Философия/Феноменология/Феноменология.md',
  epistemologiya: 'Ищем истину/Философия/Эпистемология.md',
  ontologiya: 'Ищем истину/Философия/Онтология.md',
  etika: 'Ищем истину/Философия/Этика.md',
  logika: 'Ищем истину/Философия/Логика и аргументация.md',
  gusserl: 'Ищем истину/Философия/Феноменология/Гуссерль — интенциональность.md',
  haydegger: 'Ищем истину/Философия/Феноменология/Хайдеггер — бытие-в-мире.md',
  epokhe: 'Ищем истину/Философия/Феноменология/Редукция и эпохе.md',
  'zhiznennyj-mir': 'Ищем истину/Философия/Феноменология/Жизненный мир.md',
  psihologiya: 'Ищем истину/Психология/Психология.md',
  soznanie: 'Ищем истину/Психология/Сознание и восприятие.md',
  bessoznatelnoe: 'Ищем истину/Психология/Бессознательное.md',
  arhetipy: 'Ищем истину/Психология/Архетипы и коллективное бессознательное.md',
  snovideniya: 'Ищем истину/Психология/Сновидения и символы.md',
  'psihologicheskaya-alhimiya': 'Ищем истину/Психология/Психологическая алхимия.md',
  religiya: 'Ищем истину/Религия/Религия.md',
  sakralnoe: 'Ищем истину/Религия/Сакральное и профанное.md',
  'misticheskij-opyt': 'Ищем истину/Религия/Мистический опыт.md',
  'sravnenie-traditsij': 'Ищем истину/Религия/Сравнение традиций.md',
  'simvol-i-ritual': 'Ищем истину/Религия/Символ и ритуал.md',
  'religiya-i-alhimiya': 'Ищем истину/Религия/Религия и алхимия.md',
  germetizm: 'Ищем истину/Герметизм/Герметизм.md',
  'corpus-hermeticum': 'Ищем истину/Герметизм/Corpus Hermeticum — обзор.md',
  'printsip-sootvetstviya': 'Ищем истину/Герметизм/Принцип соответствия.md',
  'tri-velikih-printsipa': 'Ищем истину/Герметизм/Три великих принципа.md',
  'simvol-i-interpretatsiya': 'Ищем истину/Герметизм/Символ и интерпретация.md',
  'germetizm-i-rozenkreycerstvo': 'Ищем истину/Герметизм/Герметизм и розенкрейцерство.md',
  alhimiya: 'Ищем истину/Алхимия/Алхимия.md',
  'tri-stadii': 'Ищем истину/Алхимия/Три стадии — nigredo albedo rubedo.md',
  'solve-et-coagula': 'Ищем истину/Алхимия/Solve et coagula.md',
  'velikoe-delanie': 'Ищем истину/Алхимия/Великое делание.md',
  'simvolika-stadii': 'Ищем истину/Алхимия/Символика стадий.md',
  'psihologicheskoe-chtenie': 'Ищем истину/Алхимия/Психологическое чтение.md',
  'laboratornaya-vs-vnutrennyaya': 'Ищем истину/Алхимия/Лабораторная vs внутренняя алхимия.md',
  rozenkreycery: 'Ищем истину/Розенкрейцеры/Розенкрейцеры.md',
  'fama-confessio': 'Ищем истину/Розенкрейцеры/Fama Fraternitatis и Confessio.md',
  'simvolika-rozy-i-kresta': 'Ищем истину/Розенкрейцеры/Символика розы и креста.md',
  'istorichnost-vs-mif': 'Ищем истину/Розенкрейцеры/Историчность vs миф ордена.md',
  'posvyashchenie-i-stepeni': 'Ищем истину/Розенкрейцеры/Посвящение и степени.md',
  'rozenkreycery-i-alhimiya': 'Ищем истину/Розенкрейцеры/Розенкрейцеры и алхимия.md',
  gravury: 'Ищем истину/Алхимия/Алхимические гравюры/Алхимические гравюры.md',
  azoth: 'Ищем истину/Алхимия/Алхимические гравюры/Azoth — Базилий Валентин.md',
  coniunctio: 'Ищем истину/Алхимия/Алхимические гравюры/Coniunctio — Rosarium.md',
  'nigredo-splendor-solis': 'Ищем истину/Алхимия/Алхимические гравюры/Nigredo — Splendor Solis.md',
  rebis: 'Ищем истину/Алхимия/Алхимические гравюры/Rebis — ерметродит.md',
  'mutus-liber': 'Ищем истину/Алхимия/Алхимические гравюры/Mutus Liber — вознесение.md',
  'ripley-scroll': 'Ищем истину/Алхимия/Алхимические гравюры/Ripley Scroll — змея и король.md',
};

const LINK_MAP = {
  Me: 'index', '../Me': 'index', '../../Me': 'index',
  'Ищем истину': 'index', '../Ищем истину': 'index', '../../Ищем истину': 'index',
  'Prisca sapientia': 'prisca-sapientia', '../Prisca sapientia': 'prisca-sapientia',
  'Алхимические гравюры': 'gravury', Алхимия: 'alhimiya', Философия: 'filosofiya',
  Психология: 'psihologiya', Религия: 'religiya', Герметизм: 'germetizm',
  Розенкрейцеры: 'rozenkreycery', Феноменология: 'fenomenologiya',
  'Три стадии — nigredo albedo rubedo': 'tri-stadii',
  'Nigredo — Splendor Solis': 'nigredo-splendor-solis',
  Бессознательное: 'bessoznatelnoe', 'Символика стадий': 'simvolika-stadii',
  'Великое делание': 'velikoe-delanie', 'Принцип соответствия': 'printsip-sootvetstviya',
  'Психологическое чтение': 'psihologicheskoe-chtenie',
  Эпистемология: 'epistemologiya', Онтология: 'ontologiya', Этика: 'etika',
  'Логика и аргументация': 'logika', 'Сознание и восприятие': 'soznanie',
  'Сновидения и символы': 'snovideniya', 'Психологическая алхимия': 'psihologicheskaya-alhimiya',
  'Архетипы и коллективное бессознательное': 'arhetipy',
  'Сакральное и профанное': 'sakralnoe', 'Мистический опыт': 'misticheskij-opyt',
  'Сравнение традиций': 'sravnenie-traditsij', 'Символ и ритуал': 'simvol-i-ritual',
  'Религия и алхимия': 'religiya-i-alhimiya',
  'Corpus Hermeticum — обзор': 'corpus-hermeticum',
  'Три великих принципа': 'tri-velikih-printsipa',
  'Символ и интерпретация': 'simvol-i-interpretatsiya',
  'Solve et coagula': 'solve-et-coagula',
  'Лабораторная vs внутренняя алхимия': 'laboratornaya-vs-vnutrennyaya',
  'Fama Fraternitatis и Confessio': 'fama-confessio',
  'Символика розы и креста': 'simvolika-rozy-i-kresta',
  'Историчность vs миф ордена': 'istorichnost-vs-mif',
  'Посвящение и степени': 'posvyashchenie-i-stepeni',
  'Розенкрейцеры и алхимия': 'rozenkreycery-i-alhimiya',
  'Azoth — Базилий Валентин': 'azoth', 'Coniunctio — Rosarium': 'coniunctio',
  'Rebis — ерметродит': 'rebis', 'Mutus Liber — вознесение': 'mutus-liber',
  'Ripley Scroll — змея и король': 'ripley-scroll',
  'Философия/Философия': 'filosofiya',
  'Философия/Феноменология/Феноменология': 'fenomenologiya',
  'Психология/Психология': 'psihologiya', 'Религия/Религия': 'religiya',
  'Герметизм/Герметизм': 'germetizm', 'Алхимия/Алхимия': 'alhimiya',
  'Розенкрейцеры/Розенкрейцеры': 'rozenkreycery',
  'Алхимия/Алхимические гравюры/Алхимические гравюры': 'gravury',
  'Ищем истину/Prisca sapientia': 'prisca-sapientia',
  'Ищем истину/Ищем истину': 'index',
  'Ищем истину/Философия/Философия': 'filosofiya',
  'Ищем истину/Психология/Психология': 'psihologiya',
  'Ищем истину/Религия/Религия': 'religiya',
  'Ищем истину/Герметизм/Герметизм': 'germetizm',
  'Ищем истину/Алхимия/Алхимия': 'alhimiya',
  'Ищем истину/Розенкрейцеры/Розенкрейцеры': 'rozenkreycery',
  'Ищем истину/Алхимия/Алхимические гравюры/Алхимические гравюры': 'gravury',
  'Ищем истину/Алхимия/Три стадии — nigredo albedo rubedo': 'tri-stadii',
  '../Ищем истину/Алхимия/Три стадии — nigredo albedo rubedo': 'tri-stadii',
  '../Алхимия/Три стадии — nigredo albedo rubedo': 'tri-stadii',
  '../Алхимия/Алхимия': 'alhimiya', '../Герметизм/Герметизм': 'germetizm',
  '../Психология/Психология': 'psihologiya',
  '../Философия/Феноменология/Феноменология': 'fenomenologiya',
  '../Герметизм/Герметизм и розенкрейцерство': 'germetizm-i-rozenkreycerstvo',
  '../Алхимия/Психологическое чтение': 'psihologicheskoe-chtenie',
  '../Алхимия/Великое делание': 'velikoe-delanie',
  '../Герметизм/Принцип соответствия': 'printsip-sootvetstviya',
  '../Розенкрейцеры/Розенкрейцеры': 'rozenkreycery',
  '../Алхимия/Алхимические гравюры/Coniunctio — Rosarium': 'coniunctio',
  'Философия/Феноменология/Гуссерль — интенциональность': 'gusserl',
  'Философия/Феноменология/Хайдеггер — бытие-в-мире': 'haydegger',
  'Философия/Феноменология/Редукция и эпохе': 'epokhe',
  'Философия/Феноменология/Жизненный мир': 'zhiznennyj-mir',
  'Алхимические гравюры/Coniunctio — Rosarium': 'coniunctio',
  'Алхимические гравюры/Nigredo — Splendor Solis': 'nigredo-splendor-solis',
};

for (const [slug, rel] of Object.entries(PAGES)) {
  const name = path.basename(rel, '.md');
  LINK_MAP[name] = slug;
  LINK_MAP[rel.replace('.md', '')] = slug;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function resolveLink(target) {
  target = target.trim();
  if (target.includes('|')) target = target.split('|')[0].trim();
  if (LINK_MAP[target]) {
    const slug = LINK_MAP[target];
    return slug === 'index' ? 'index.html' : `${slug}.html`;
  }
  return '#';
}

function inlineMd(text) {
  let t = esc(text);
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
  t = t.replace(/`(.+?)`/g, '<code>$1</code>');
  t = t.replace(/\[\[(.+?)\]\]/g, (_, inner) => {
    const label = inner.split('|').pop();
    return `<a href="${resolveLink(inner)}">${esc(label)}</a>`;
  });
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return t;
}

function preprocessMd(md) {
  return md.replace(/\r/g, '').split('\n')
    .map(line => line.replace(/\\\|/g, '|'))
    .filter(line => !/^←\s/.test(line.trim()))
    .join('\n');
}

function mdToHtml(md) {
  const lines = preprocessMd(md).split('\n');
  const out = [];
  let i = 0;
  let inCode = false;
  let codeLang = '';
  let codeBuf = [];
  let inTable = false;
  let tableRows = [];

  function splitTableCells(row) {
    const inner = row.trim().replace(/^\||\|$/g, '');
    const cells = [];
    let current = '';
    let depth = 0;
    for (let j = 0; j < inner.length; j++) {
      const c = inner[j];
      if (c === '[' && inner[j + 1] === '[') { depth++; current += '[['; j++; continue; }
      if (c === ']' && inner[j + 1] === ']' && depth > 0) { depth--; current += ']]'; j++; continue; }
      if (c === '|' && depth === 0) { cells.push(current.trim()); current = ''; continue; }
      current += c;
    }
    cells.push(current.trim());
    return cells;
  }

  function flushTable() {
    if (!tableRows.length) return '';
    const htmlRows = tableRows.map((row, ri) => {
      const cells = splitTableCells(row).map(c => inlineMd(c));
      const tag = ri === 0 ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag}>${c}</${tag}>`).join('') + '</tr>';
    });
    inTable = false;
    tableRows = [];
    return '<div class="table-wrap"><table>' + htmlRows.join('') + '</table></div>';
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuf = [];
      } else {
        const cls = codeLang ? ` class="language-${codeLang}"` : '';
        out.push(`<pre><code${cls}>${esc(codeBuf.join('\n'))}</code></pre>`);
        inCode = false;
        codeLang = '';
        codeBuf = [];
      }
      i++;
      continue;
    }

    if (inCode) { codeBuf.push(line); i++; continue; }

    if (line.trim().startsWith('|') && line.trim().includes('|', 1)) {
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) { i++; continue; }
      if (!inTable) { inTable = true; tableRows = []; }
      tableRows.push(line);
      i++;
      continue;
    } else if (inTable) {
      out.push(flushTable());
    }

    const hm = line.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      out.push(`<h${hm[1].length}>${inlineMd(hm[2])}</h${hm[1].length}>`);
      i++;
      continue;
    }

    if (line.trim() === '---') { out.push('<hr>'); i++; continue; }

    if (line.trim().startsWith('> [!')) {
      const typeMatch = line.match(/>\s*\[!(\w+)\]/);
      const ctype = typeMatch ? typeMatch[1].toLowerCase() : 'note';
      const titleMatch = line.match(/>\s*\[!\w+\]\s*(.+)/);
      const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : ctype;
      i++;
      const bodyLines = [];
      while (i < lines.length && (lines[i].startsWith('>') || lines[i].trim() === '')) {
        if (lines[i].startsWith('>')) bodyLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const body = bodyLines.filter(l => l.trim()).map(l => inlineMd(l)).join('<br>');
      out.push(`<div class="callout callout-${ctype}"><div class="callout-title">${inlineMd(title)}</div><div class="callout-body">${body}</div></div>`);
      continue;
    }

    if (line.trim().startsWith('>')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      out.push(`<blockquote>${inlineMd(quoteLines.join(' '))}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(line.trim())) {
      out.push('<ul>');
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        out.push(`<li>${inlineMd(lines[i].trim().replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push('</ul>');
      continue;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      out.push('<ol>');
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        out.push(`<li>${inlineMd(lines[i].trim().replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push('</ol>');
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    if (/^#[\w-]+$/.test(line.trim())) {
      out.push(`<span class="tag">${esc(line.trim())}</span>`);
      i++;
      continue;
    }

    out.push(`<p>${inlineMd(line)}</p>`);
    i++;
  }

  if (inTable) out.push(flushTable());
  return out.join('\n');
}

const NAV = `
<header class="site-header" id="siteHeader">
  <div class="header-inner">
    <a href="index.html" class="site-brand">Ищем истину</a>
    <button class="nav-toggle" id="navToggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="topNav"></button>
    <nav class="top-nav" id="topNav" aria-label="Оглавление">
      <ul class="nav-list">
        <li class="nav-item"><a href="index.html">Карта</a></li>
        <li class="nav-item"><a href="prisca-sapientia.html">Prisca sapientia</a></li>
        <li class="nav-item nav-dropdown">
          <button type="button" class="nav-dropdown-btn" aria-expanded="false" aria-haspopup="true">Философия</button>
          <ul class="nav-dropdown-menu">
            <li><a href="filosofiya.html">Хаб</a></li>
            <li><a href="fenomenologiya.html">Феноменология</a></li>
            <li><a href="epistemologiya.html">Эпистемология</a></li>
            <li><a href="ontologiya.html">Онтология</a></li>
            <li><a href="etika.html">Этика</a></li>
            <li><a href="logika.html">Логика</a></li>
            <li><a href="gusserl.html">Гуссерль</a></li>
            <li><a href="haydegger.html">Хайдеггер</a></li>
          </ul>
        </li>
        <li class="nav-item"><a href="psihologiya.html">Психология</a></li>
        <li class="nav-item"><a href="religiya.html">Религия</a></li>
        <li class="nav-item"><a href="germetizm.html">Герметизм</a></li>
        <li class="nav-item"><a href="alhimiya.html">Алхимия</a></li>
        <li class="nav-item"><a href="rozenkreycery.html">Розенкрейцеры</a></li>
        <li class="nav-item nav-dropdown">
          <button type="button" class="nav-dropdown-btn" aria-expanded="false" aria-haspopup="true">Гравюры</button>
          <ul class="nav-dropdown-menu">
            <li><a href="gravury.html">Хаб</a></li>
            <li><a href="azoth.html">Azoth</a></li>
            <li><a href="coniunctio.html">Coniunctio</a></li>
            <li><a href="nigredo-splendor-solis.html">Nigredo</a></li>
            <li><a href="rebis.html">Rebis</a></li>
            <li><a href="mutus-liber.html">Mutus Liber</a></li>
            <li><a href="ripley-scroll.html">Ripley Scroll</a></li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</header>`;

function pageHtml(title, body, current) {
  let nav = NAV;
  if (current !== 'index.html') {
    nav = nav.replace(`href="${current}"`, `href="${current}" class="active"`);
  } else {
    nav = nav.replace('href="index.html">Карта', 'href="index.html" class="active">Карта');
  }
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} — Ищем истину</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  ${nav}
  <main class="content">
    <article class="prose">
      ${body}
    </article>
    <footer class="site-footer">
      <p>Obsidian · <strong>Ищем истину</strong> · prisca sapientia</p>
    </footer>
  </main>
  <script src="js/app.js"></script>
</body>
</html>`;
}

function extractTitle(md) {
  for (const line of md.split('\n')) {
    if (line.startsWith('# ')) return line.slice(2).trim();
  }
  return 'Ищем истину';
}

const EXTRA = {
  index: `
<h2 class="section-eyebrow">Разделы</h2>
<p class="section-lead">У каждого раздела — <strong>идеи, источники, связи</strong>. Выберите хаб категории.</p>
<div class="cards-grid">
  <a href="filosofiya.html" class="card">
    <h3>Философия</h3>
    <p>Разум, опыт, этика, феноменология</p>
  </a>
  <a href="psihologiya.html" class="card">
    <h3>Психология</h3>
    <p>Сознание, бессознательное, сны, архетипы</p>
  </a>
  <a href="religiya.html" class="card">
    <h3>Религия</h3>
    <p>Сакральное, мистика, ритуал</p>
  </a>
  <a href="germetizm.html" class="card">
    <h3>Герметизм</h3>
    <p>Corpus Hermeticum, соответствия, гнозис</p>
  </a>
  <a href="alhimiya.html" class="card">
    <h3>Алхимия</h3>
    <p>Nigredo, albedo, rubedo · magnum opus</p>
  </a>
  <a href="rozenkreycery.html" class="card">
    <h3>Розенкрейцеры</h3>
    <p>Fama, роза и крест, миф братства</p>
  </a>
  <a href="gravury.html" class="card">
    <h3>Гравюры</h3>
    <p>Визуальный учебник без слов</p>
  </a>
</div>
<div class="graph-card">
  <h2>Граф связей</h2>
  <div class="graph">
    <div class="graph-node graph-root"><a href="prisca-sapientia.html">Prisca sapientia</a></div>
    <div class="graph-row">
      <div class="graph-node"><a href="filosofiya.html">Философия</a><div class="graph-sub">→ <a href="fenomenologiya.html">Феноменология</a></div></div>
      <div class="graph-node"><a href="psihologiya.html">Психология</a></div>
      <div class="graph-node"><a href="religiya.html">Религия</a></div>
      <div class="graph-node"><a href="germetizm.html">Герметизм</a></div>
    </div>
    <div class="graph-row">
      <div class="graph-node"><a href="rozenkreycery.html">Розенкрейцеры</a></div>
      <div class="graph-node graph-center"><a href="alhimiya.html">Алхимия</a></div>
      <div class="graph-node"><a href="gravury.html">Гравюры</a></div>
    </div>
  </div>
</div>`,
};

for (const [slug, rel] of Object.entries(PAGES)) {
  const src = path.join(VAULT, rel);
  if (!fs.existsSync(src)) { console.log('SKIP', rel); continue; }
  const md = fs.readFileSync(src, 'utf8');
  const title = extractTitle(md);
  let body = mdToHtml(md);
  if (slug === 'index') {
    body = body.replace(/<h2>Граф связей<\/h2>\s*<pre><code class="language-mermaid">[\s\S]*?<\/code><\/pre>\s*/g, '');
    body = body.replace(/<p>←[\s\S]*?<\/p>\s*/g, '');
    body = body.replace(/<h2>Категории<\/h2>\s*<blockquote>[\s\S]*?<\/table>\s*/g, '');
    const tagMatch = body.match(/<span class="tag">[\s\S]*?<\/span>\s*/);
    if (tagMatch) body = body.replace(tagMatch[0], '');
    body = body.replace(
      /(<h1>[\s\S]*?<\/h1>)\s*<p>([\s\S]*?)<\/p>\s*<p>([\s\S]*?)<\/p>/,
      `<header class="page-hero page-hero--split"><div class="page-hero__text">$1<p class="hero-lede">$2</p><p class="hero-meta">$3</p></div><figure class="hero-figure"><img src="images/philosophy-hero.jpg" alt="Философы в дискуссии — аллегория поиска истины" width="960" height="720" loading="eager"><figcaption>Диалог как метод: философия начинается с вопроса</figcaption></figure></header>`
    );
    if (tagMatch) body += `\n${tagMatch[0]}`;
  }
  if (EXTRA[slug]) body += EXTRA[slug];
  const filename = slug === 'index' ? 'index.html' : `${slug}.html`;
  fs.writeFileSync(path.join(OUT, filename), pageHtml(title, body, filename), 'utf8');
  console.log('OK', filename);
}

const keep = new Set(['index.html', ...Object.keys(PAGES).filter(s => s !== 'index').map(s => `${s}.html`)]);
for (const file of fs.readdirSync(OUT)) {
  if (file.endsWith('.html') && !keep.has(file)) {
    fs.unlinkSync(path.join(OUT, file));
    console.log('DEL', file);
  }
}

console.log('Done.');
