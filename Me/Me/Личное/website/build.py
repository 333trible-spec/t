#!/usr/bin/env python3
"""Build static HTML site from Obsidian vault markdown files."""

import re
import html
from pathlib import Path

VAULT = Path(__file__).resolve().parent.parent
OUT = Path(__file__).resolve().parent

# slug -> source path relative to vault
PAGES = {
    "index": "Me.md",
    "razvitie": "Развитие.md",
    "razbiraemsya-s-soboy": "Разбираемся с собой/Разбираемся с собой.md",
    "kto-ya": "Разбираемся с собой/Кто я.md",
    "proshloe": "Разбираемся с собой/Прошлое.md",
    "zarabatyvaem-kopeechku": "Зарабатываем копеечку/Зарабатываем копeечку.md",
    "rabota": "Зарабатываем копеечку/Работа.md",
    "dengi-denezhki": "Зарабатываем копеечку/Деньги-денежки.md",
    "ishchem-istinu": "Ищем истину/Ищем истину.md",
    "prisca-sapientia": "Ищем истину/Prisca sapientia.md",
    "filosofiya": "Ищем истину/Философия/Философия.md",
    "fenomenologiya": "Ищем истину/Философия/Феноменология/Феноменология.md",
    "epistemologiya": "Ищем истину/Философия/Эпистемология.md",
    "ontologiya": "Ищем истину/Философия/Онтология.md",
    "etika": "Ищем истину/Философия/Этика.md",
    "logika": "Ищем истину/Философия/Логика и аргументация.md",
    "gusserl": "Ищем истину/Философия/Феноменология/Гуссерль — интенциональность.md",
    "haydegger": "Ищем истину/Философия/Феноменология/Хайдеггер — бытие-в-мире.md",
    "epokhe": "Ищем истину/Философия/Феноменология/Редукция и эпохе.md",
    "zhiznennyj-mir": "Ищем истину/Философия/Феноменология/Жизненный мир.md",
    "psihologiya": "Ищем истину/Психология/Психология.md",
    "soznanie": "Ищем истину/Психология/Сознание и восприятие.md",
    "bessoznatelnoe": "Ищем истину/Психология/Бессознательное.md",
    "arhetipy": "Ищем истину/Психология/Архетипы и коллективное бессознательное.md",
    "snovideniya": "Ищем истину/Психология/Сновидения и символы.md",
    "psihologicheskaya-alhimiya": "Ищем истину/Психология/Психологическая алхимия.md",
    "religiya": "Ищем истину/Религия/Религия.md",
    "sakralnoe": "Ищем истину/Религия/Сакральное и профанное.md",
    "misticheskij-opyt": "Ищем истину/Религия/Мистический опыт.md",
    "sravnenie-traditsij": "Ищем истину/Религия/Сравнение традиций.md",
    "simvol-i-ritual": "Ищем истину/Религия/Символ и ритуал.md",
    "religiya-i-alhimiya": "Ищем истину/Религия/Религия и алхимия.md",
    "germetizm": "Ищем истину/Герметизм/Герметизм.md",
    "corpus-hermeticum": "Ищем истину/Герметизм/Corpus Hermeticum — обзор.md",
    "printsip-sootvetstviya": "Ищем истину/Герметизм/Принцип соответствия.md",
    "tri-velikih-printsipa": "Ищем истину/Герметизм/Три великих принципа.md",
    "simvol-i-interpretatsiya": "Ищем истину/Герметизм/Символ и интерпретация.md",
    "germetizm-i-rozenkreycerstvo": "Ищем истину/Герметизм/Герметизм и розенкрейцерство.md",
    "alhimiya": "Ищем истину/Алхимия/Алхимия.md",
    "tri-stadii": "Ищем истину/Алхимия/Три стадии — nigredo albedo rubedo.md",
    "solve-et-coagula": "Ищем истину/Алхимия/Solve et coagula.md",
    "velikoe-delanie": "Ищем истину/Алхимия/Великое делание.md",
    "simvolika-stadii": "Ищем истину/Алхимия/Символика стадий.md",
    "psihologicheskoe-chtenie": "Ищем истину/Алхимия/Психологическое чтение.md",
    "laboratornaya-vs-vnutrennyaya": "Ищем истину/Алхимия/Лабораторная vs внутренняя алхимия.md",
    "rozenkreycery": "Ищем истину/Розенкрейцеры/Розенкрейцеры.md",
    "fama-confessio": "Ищем истину/Розенкрейцеры/Fama Fraternitatis и Confessio.md",
    "simvolika-rozy-i-kresta": "Ищем истину/Розенкрейцеры/Символика розы и креста.md",
    "istorichnost-vs-mif": "Ищем истину/Розенкрейцеры/Историчность vs миф ордена.md",
    "posvyashchenie-i-stepeni": "Ищем истину/Розенкрейцеры/Посвящение и степени.md",
    "rozenkreycery-i-alhimiya": "Ищем истину/Розенкрейцеры/Розенкрейцеры и алхимия.md",
    "gravury": "Ищем истину/Алхимия/Алхимические гравюры/Алхимические гравюры.md",
    "azoth": "Ищем истину/Алхимия/Алхимические гравюры/Azoth — Базилий Валентин.md",
    "coniunctio": "Ищем истину/Алхимия/Алхимические гравюры/Coniunctio — Rosarium.md",
    "nigredo-splendor-solis": "Ищем истину/Алхимия/Алхимические гравюры/Nigredo — Splendor Solis.md",
    "rebis": "Ищем истину/Алхимия/Алхимические гравюры/Rebis — ерметродит.md",
    "mutus-liber": "Ищем истину/Алхимия/Алхимические гравюры/Mutus Liber — вознесение.md",
    "ripley-scroll": "Ищем истину/Алхимия/Алхимические гравюры/Ripley Scroll — змея и король.md",
}

# wiki link -> slug
LINK_MAP = {}
for slug, rel in PAGES.items():
    name = Path(rel).stem
    LINK_MAP[name] = slug
    LINK_MAP[rel.replace(".md", "").replace("\\", "/")] = slug
    parts = rel.replace(".md", "").split("/")
    if len(parts) >= 2:
        LINK_MAP[parts[-1]] = slug
        LINK_MAP["/".join(parts[-2:])] = slug
    if len(parts) >= 3:
        LINK_MAP["/".join(parts[-3:])] = slug

LINK_MAP["Me"] = "index"
LINK_MAP["../Me"] = "index"
LINK_MAP["../../Me"] = "index"
LINK_MAP["Развитие"] = "razvitie"
LINK_MAP["../Развитие"] = "razvitie"
LINK_MAP["Разбираемся с собой"] = "razbiraemsya-s-soboy"
LINK_MAP["Зарабатываем копеечку"] = "zarabatyvaem-kopeechku"
LINK_MAP["Ищем истину"] = "ishchem-istinu"
LINK_MAP["Prisca sapientia"] = "prisca-sapientia"
LINK_MAP["../Prisca sapientia"] = "prisca-sapientia"
LINK_MAP["../Ищем истину"] = "ishchem-istinu"
LINK_MAP["Прошлое"] = "proshloe"
LINK_MAP["Кто я"] = "kto-ya"
LINK_MAP["Работа"] = "rabota"
LINK_MAP["Деньги-денежки"] = "dengi-denezhki"
LINK_MAP["Алхимические гравюры"] = "gravury"
LINK_MAP["Алхимия"] = "alhimiya"
LINK_MAP["Философия"] = "filosofiya"
LINK_MAP["Психология"] = "psihologiya"
LINK_MAP["Религия"] = "religiya"
LINK_MAP["Герметизм"] = "germetizm"
LINK_MAP["Розенкрейцеры"] = "rozenkreycery"
LINK_MAP["Феноменология"] = "fenomenologiya"
LINK_MAP["Три стадии — nigredo albedo rubedo"] = "tri-stadii"
LINK_MAP["Nigredo — Splendor Solis"] = "nigredo-splendor-solis"
LINK_MAP["Бессознательное"] = "bessoznatelnoe"
LINK_MAP["Символика стадий"] = "simvolika-stadii"
LINK_MAP["Великое делание"] = "velikoe-delanie"
LINK_MAP["Принцип соответствия"] = "printsip-sootvetstviya"
LINK_MAP["Психологическое чтение"] = "psihologicheskoe-chtenie"
LINK_MAP["Алхимические гравюры/Coniunctio — Rosarium"] = "coniunctio"
LINK_MAP["Философия/Философия"] = "filosofiya"
LINK_MAP["Философия/Феноменология/Феноменология"] = "fenomenologiya"
LINK_MAP["Психология/Психология"] = "psihologiya"
LINK_MAP["Религия/Религия"] = "religiya"
LINK_MAP["Герметизм/Герметизм"] = "germetizm"
LINK_MAP["Алхимия/Алхимия"] = "alhimiya"
LINK_MAP["Розенкрейцеры/Розенкрейцеры"] = "rozenkreycery"
LINK_MAP["Алхимия/Алхимические гравюры/Алхимические гравюры"] = "gravury"
LINK_MAP["Ищем истину/Prisca sapientia"] = "prisca-sapientia"
LINK_MAP["Разбираемся с собой/Разбираемся с собой"] = "razbiraemsya-s-soboy"
LINK_MAP["Зарабатываем копеечку/Зарабатываем копеечку"] = "zarabatyvaem-kopeechku"
LINK_MAP["Зарабатываем копеечку/Работа"] = "rabota"
LINK_MAP["Ищем истину/Ищем истину"] = "ishchem-istinu"
LINK_MAP["Ищем истину/Философия/Философия"] = "filosofiya"
LINK_MAP["Ищем истину/Психология/Психология"] = "psihologiya"
LINK_MAP["Ищем истину/Религия/Религия"] = "religiya"
LINK_MAP["Ищем истину/Герметизм/Герметизм"] = "germetizm"
LINK_MAP["Ищем истину/Алхимия/Алхимия"] = "alhimiya"
LINK_MAP["Ищем истину/Розенкрейцеры/Розенкрейцеры"] = "rozenkreycery"
LINK_MAP["Ищем истину/Алхимия/Алхимические гравюры/Алхимические гравюры"] = "gravury"
LINK_MAP["Ищем истину/Алхимия/Три стадии — nigredo albedo rubedo"] = "tri-stadii"
LINK_MAP["../Ищем истину/Алхимия/Три стадии — nigredo albedo rubedo"] = "tri-stadii"
LINK_MAP["../Алхимия/Три стадии — nigredo albedo rubedo"] = "tri-stadii"
LINK_MAP["../Алхимия/Алхимия"] = "alhimiya"
LINK_MAP["../Герметизм/Герметизм"] = "germetizm"
LINK_MAP["../Психология/Психология"] = "psihologiya"
LINK_MAP["../Философия/Феноменология/Феноменология"] = "fenomenologiya"
LINK_MAP["../Герметизм/Герметизм и розенкрейцерство"] = "germetizm-i-rozenkreycerstvo"
LINK_MAP["../Алхимия/Психологическое чтение"] = "psihologicheskoe-chtenie"
LINK_MAP["../Алхимия/Великое делание"] = "velikoe-delanie"
LINK_MAP["../Герметизм/Принцип соответствия"] = "printsip-sootvetstviya"
LINK_MAP["../Розенкрейцеры/Розенкрейцеры"] = "rozenkreycery"
LINK_MAP["../Алхимия/Алхимические гравюры/Coniunctio — Rosarium"] = "coniunctio"
LINK_MAP["Философия/Феноменология/Гуссерль — интенциональность"] = "gusserl"
LINK_MAP["Философия/Феноменология/Хайдеггер — бытие-в-мире"] = "haydegger"
LINK_MAP["Философия/Феноменология/Редукция и эпохе"] = "epokhe"
LINK_MAP["Философия/Феноменология/Жизненный мир"] = "zhiznennyj-mir"
LINK_MAP["Эпистемология"] = "epistemologiya"
LINK_MAP["Онтология"] = "ontologiya"
LINK_MAP["Этика"] = "etika"
LINK_MAP["Логика и аргументация"] = "logika"
LINK_MAP["Сознание и восприятие"] = "soznanie"
LINK_MAP["Сновидения и символы"] = "snovideniya"
LINK_MAP["Психологическая алхимия"] = "psihologicheskaya-alhimiya"
LINK_MAP["Архетипы и коллективное бессознательное"] = "arhetipy"
LINK_MAP["Сакральное и профанное"] = "sakralnoe"
LINK_MAP["Мистический опыт"] = "misticheskij-opyt"
LINK_MAP["Сравнение традиций"] = "sravnenie-traditsij"
LINK_MAP["Символ и ритуал"] = "simvol-i-ritual"
LINK_MAP["Религия и алхимия"] = "religiya-i-alhimiya"
LINK_MAP["Corpus Hermeticum — обзор"] = "corpus-hermeticum"
LINK_MAP["Три великих принципа"] = "tri-velikih-printsipa"
LINK_MAP["Символ и интерпретация"] = "simvol-i-interpretatsiya"
LINK_MAP["Три стадии — nigredo albedo rubedo"] = "tri-stadii"
LINK_MAP["Solve et coagula"] = "solve-et-coagula"
LINK_MAP["Лабораторная vs внутренняя алхимия"] = "laboratornaya-vs-vnutrennyaya"
LINK_MAP["Fama Fraternitatis и Confessio"] = "fama-confessio"
LINK_MAP["Символика розы и креста"] = "simvolika-rozy-i-kresta"
LINK_MAP["Историчность vs миф ордена"] = "istorichnost-vs-mif"
LINK_MAP["Посвящение и степени"] = "posvyashchenie-i-stepeni"
LINK_MAP["Розенкрейцеры и алхимия"] = "rozenkreycery-i-alhimiya"
LINK_MAP["Azoth — Базилий Валентин"] = "azoth"
LINK_MAP["Coniunctio — Rosarium"] = "coniunctio"
LINK_MAP["Rebis — ерметродит"] = "rebis"
LINK_MAP["Mutus Liber — вознесение"] = "mutus-liber"
LINK_MAP["Ripley Scroll — змея и король"] = "ripley-scroll"
LINK_MAP["Три стадии — nigredo albedo rubedo"] = "tri-stadii"
LINK_MAP["Nigredo — Splendor Solis"] = "nigredo-splendor-solis"
LINK_MAP["Алхимические гравюры/Coniunctio — Rosarium"] = "coniunctio"
LINK_MAP["Алхимические гравюры/Nigredo — Splendor Solis"] = "nigredo-splendor-solis"


def resolve_link(target: str) -> str:
    target = target.strip()
    if "|" in target:
        target = target.split("|", 1)[0].strip()
    if target in LINK_MAP:
        slug = LINK_MAP[target]
        return f"{slug}.html" if slug != "index" else "index.html"
    for key, slug in LINK_MAP.items():
        if target.endswith(key) or key.endswith(target):
            return f"{slug}.html" if slug != "index" else "index.html"
    return "#"


def inline_md(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
    text = re.sub(r"`(.+?)`", r"<code>\1</code>", text)
    text = re.sub(r"\[\[(.+?)\]\]", lambda m: f'<a href="{resolve_link(m.group(1))}">{html.escape(m.group(1).split("|")[-1])}</a>', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', text)
    return text


def md_to_html(md: str) -> str:
    lines = md.splitlines()
    out = []
    i = 0
    in_code = False
    code_lang = ""
    code_buf = []
    in_table = False
    table_rows = []

    def flush_table():
        nonlocal in_table, table_rows
        if not table_rows:
            return ""
        html_rows = []
        for ri, row in enumerate(table_rows):
            cells = [inline_md(c.strip()) for c in row.strip("|").split("|")]
            tag = "th" if ri == 0 else "td"
            html_rows.append("<tr>" + "".join(f"<{tag}>{c}</{tag}>" for c in cells) + "</tr>")
        in_table = False
        table_rows = []
        return '<div class="table-wrap"><table>' + "".join(html_rows) + "</table></div>"

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith("```"):
            if not in_code:
                in_code = True
                code_lang = line.strip()[3:].strip()
                code_buf = []
            else:
                cls = f' class="language-{code_lang}"' if code_lang else ""
                out.append(f'<pre><code{cls}>{html.escape(chr(10).join(code_buf))}</code></pre>')
                in_code = False
                code_lang = ""
                code_buf = []
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        if line.strip().startswith("|") and "|" in line.strip()[1:]:
            if not in_table:
                in_table = True
                table_rows = []
            table_rows.append(line)
            i += 1
            continue
        elif in_table:
            out.append(flush_table())

        m = re.match(r"^(#{1,6})\s+(.+)$", line)
        if m:
            level = len(m.group(1))
            out.append(f"<h{level}>{inline_md(m.group(2))}</h{level}>")
            i += 1
            continue

        if line.strip() == "---":
            out.append("<hr>")
            i += 1
            continue

        if line.strip().startswith("> [!"):
            callout_type = re.search(r">\s*\[!(\w+)\]", line)
            ctype = callout_type.group(1).lower() if callout_type else "note"
            title_match = re.search(r">\s*\[!\w+\]\s*(.+)", line)
            title = title_match.group(1).strip() if title_match and title_match.group(1) else ctype
            i += 1
            body_lines = []
            while i < len(lines) and (lines[i].startswith(">") or lines[i].strip() == ""):
                if lines[i].startswith(">"):
                    body_lines.append(re.sub(r"^>\s?", "", lines[i]))
                i += 1
            body = "<br>".join(inline_md(l) for l in body_lines if l.strip())
            out.append(f'<div class="callout callout-{ctype}"><div class="callout-title">{inline_md(title)}</div><div class="callout-body">{body}</div></div>')
            continue

        if line.strip().startswith(">"):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote_lines.append(re.sub(r"^>\s?", "", lines[i]))
                i += 1
            out.append(f'<blockquote>{inline_md(" ".join(quote_lines))}</blockquote>')
            continue

        if re.match(r"^[-*]\s+", line.strip()):
            out.append("<ul>")
            while i < len(lines) and re.match(r"^[-*]\s+", lines[i].strip()):
                item = re.sub(r"^[-*]\s+", "", lines[i].strip())
                out.append(f"<li>{inline_md(item)}</li>")
                i += 1
            out.append("</ul>")
            continue

        if re.match(r"^\d+\.\s+", line.strip()):
            out.append("<ol>")
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i].strip()):
                item = re.sub(r"^\d+\.\s+", "", lines[i].strip())
                out.append(f"<li>{inline_md(item)}</li>")
                i += 1
            out.append("</ol>")
            continue

        if line.strip() == "":
            i += 1
            continue

        if line.strip().startswith("#"):
            tag_match = re.match(r"^#([\w-]+)$", line.strip())
            if tag_match:
                out.append(f'<span class="tag">#{tag_match.group(1)}</span>')
                i += 1
                continue

        out.append(f"<p>{inline_md(line)}</p>")
        i += 1

    if in_table:
        out.append(flush_table())

    return "\n".join(out)


NAV = """
<nav class="sidebar" id="sidebar">
  <div class="sidebar-brand">
    <a href="index.html">Me</a>
    <button class="nav-toggle" id="navToggle" aria-label="Меню"></button>
  </div>
  <div class="nav-section">
    <span class="nav-label">Главное</span>
    <a href="index.html">Me</a>
    <a href="razvitie.html">Развитие</a>
  </div>
  <div class="nav-section">
    <span class="nav-label">Разбираемся с собой</span>
    <a href="razbiraemsya-s-soboy.html">Хаб</a>
    <a href="kto-ya.html">Кто я</a>
    <a href="proshloe.html">Прошлое</a>
  </div>
  <div class="nav-section">
    <span class="nav-label">Зарабатываем копеечку</span>
    <a href="zarabatyvaem-kopeechku.html">Хаб</a>
    <a href="rabota.html">Работа</a>
    <a href="dengi-denezhki.html">Деньги-денежки</a>
  </div>
  <div class="nav-section">
    <span class="nav-label">Ищем истину</span>
    <a href="ishchem-istinu.html">Хаб</a>
    <a href="prisca-sapientia.html">Prisca sapientia</a>
    <a href="filosofiya.html">Философия</a>
    <a href="psihologiya.html">Психология</a>
    <a href="religiya.html">Религия</a>
    <a href="germetizm.html">Герметизм</a>
    <a href="alhimiya.html">Алхимия</a>
    <a href="rozenkreycery.html">Розенкрейцеры</a>
    <a href="gravury.html">Гравюры</a>
  </div>
</nav>
"""


def page_html(title: str, body: str, current: str) -> str:
    nav = NAV.replace(f'href="{current}"', f'href="{current}" class="active"')
    return f"""<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{html.escape(title)} — Me</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Mono:wght@400&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  {nav}
  <main class="content">
    <article class="prose">
      {body}
    </article>
    <footer class="site-footer">
      <p>Из Obsidian vault <strong>Me</strong> · prisca sapientia</p>
    </footer>
  </main>
  <script src="js/app.js"></script>
</body>
</html>
"""


def extract_title(md: str) -> str:
    for line in md.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return "Me"


def main():
    # fix typo in PAGES key
    PAGES["zarabatyvaem-kopeechku"] = "Зарабатываем копеечку/Зарабатываем копеечку.md"

    for slug, rel in PAGES.items():
        src = VAULT / rel
        if not src.exists():
            print(f"SKIP missing: {rel}")
            continue
        md = src.read_text(encoding="utf-8")
        title = extract_title(md)
        body = md_to_html(md)

        if slug == "ishchem-istinu":
            body += """
<div class="graph-card">
  <h2>Граф связей</h2>
  <div class="graph">
    <div class="graph-node graph-root">Prisca sapientia</div>
    <div class="graph-row">
      <div class="graph-node">Философия<div class="graph-sub">→ Феноменология</div></div>
      <div class="graph-node">Психология</div>
      <div class="graph-node">Религия</div>
      <div class="graph-node">Герметизм</div>
    </div>
    <div class="graph-row">
      <div class="graph-node">Розенкрейцеры</div>
      <div class="graph-node graph-center">Алхимия</div>
      <div class="graph-node">Гравюры</div>
    </div>
  </div>
</div>
"""

        if slug == "index":
            body += """
<div class="cards-grid">
  <a href="razbiraemsya-s-soboy.html" class="card card-self">
    <h3>Разбираемся с собой</h3>
    <p>Кто я, прошлое, внутренний мир</p>
  </a>
  <a href="zarabatyvaem-kopeechku.html" class="card card-money">
    <h3>Зарабатываем копеечку</h3>
    <p>Работа, деньги, быт</p>
  </a>
  <a href="ishchem-istinu.html" class="card card-truth">
    <h3>Ищем истину</h3>
    <p>Философия, религия, алхимия, гравюры</p>
  </a>
</div>
"""

        filename = "index.html" if slug == "index" else f"{slug}.html"
        out_path = OUT / filename
        current = filename
        out_path.write_text(page_html(title, body, current), encoding="utf-8")
        print(f"OK {filename}")

    print("Done.")


if __name__ == "__main__":
    main()
