---
name: b24-knowledge-base
description: >-
  Перенос документов Google Drive в базу знаний Битрикс24: экспорт файлов, разбор
  структуры, шаблон статьи, landing.* REST (scope KNOWLEDGE), отчёт миграции.
  Use when migrating documents to Bitrix24 knowledge base, Google Drive folder
  import, KB article formatting, landing.knowledge.
---

# База знаний Битрикс24 + Google Drive

## Контекст проекта

- Рабочая папка: `Me/Me/Личное/Работа/bitrix24/kb-migration/`
- Портал и вебхук: `Me/Me/Личное/Работа/bitrix24/context.md`
- Журнал миграций: `kb-migration/context.md`

## Параметры миграции (dm-tmn)

| Параметр | Значение |
|----------|----------|
| Папка Google Drive | https://drive.google.com/drive/folders/1GEQLvw1vvSkbuIw79-h9bhddHYwef_NL |
| ID папки | `1GEQLvw1vvSkbuIw79-h9bhddHYwef_NL` |
| Шаблон статьи | https://dm-tmn.bitrix24.ru/note/document/144/ (Инцидент 1, Б24) |

### Папки инцидентов (collection **16**, корень **36**)

| parentId | Папка | Файл Drive |
|----------|-------|------------|
| **74** | Битрикс24 | `export/B24.txt` |
| **76** | 1С | `export/1C.txt` |
| **78** | Администрирование | `export/Admin.txt` |
| **104** | BI | `export/BI.txt` |

Перед миграцией открыть [document/144](https://dm-tmn.bitrix24.ru/note/document/144/) и зафиксировать структуру markdown.

## Инциденты

**1 инцидент = 1 документ базы знаний.** Заголовок **как в исходнике** («Инцидент N» или смысловое имя). **Без** «Краткого описания». Блок Wellsoft в конце B24.txt — **внутрь инцидента 6**, не отдельная статья.

## Google Drive

### Доступ

- Service Account + shared folder, или OAuth пользователя с доступом к папке.
- Секреты: `.env` в `kb-migration/`, в `.gitignore`; не в чат и не в git.

### Список файлов

- Google Drive API v3: `files.list` с `q: "'<FOLDER_ID>' in parents and trashed=false"`.
- ID папки — из URL: `https://drive.google.com/drive/folders/<FOLDER_ID>`.

### Экспорт по типам

| Тип в Drive | MIME | Экспорт / чтение |
|-------------|------|------------------|
| Google Docs | `application/vnd.google-apps.document` | `export` → `text/plain` или `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Google Sheets | `application/vnd.google-apps.spreadsheet` | `export` → `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `files.get` + `alt=media` |
| PDF | `application/pdf` | `files.get` + `alt=media` → парсер PDF |
| TXT | `text/plain` | `files.get` + `alt=media` |
| XLSX | spreadsheet MIME | `files.get` или export |

Рекурсия в подпапки — опционально; по умолчанию только указанная папка, если пользователь не просит иначе.

## База знаний Битрикс24

### Два варианта на портале

1. **Встроенная БЗ (модуль landing, TYPE=KNOWLEDGE)** — сайты-знания, страницы, блоки.
2. **Маркетплейс-приложение** (например IT-Solution) — свой REST для статей; нужен отдельный токен приложения.

Сначала уточни, какая БЗ на портале. Для встроенной — UI или `landing.*` с `scope: "KNOWLEDGE"`.

### REST v3 (База знаний 2.0, `/note/document/`)

**Важно:** методы `note.*` вызываются через **`/rest/api/`**, не через `/rest/`:

```
https://{portal}/rest/api/{user_id}/{webhook}/note.document.add
```

Документация: [note.document.add](https://github.com/bitrix-tools/b24-rest-docs/blob/main/api-reference/rest-v3/note/document/note-document-add.md)

| Задача | Метод |
|--------|-------|
| Получить документ | `note.document.get` — `{ "id": 36 }` |
| Список баз знаний | `note.collection.list` |
| Дерево документов | `note.document.tree.list` |
| **Создать документ** | `note.document.add` — см. ниже |
| Обновить | `note.document.update` |

**Создание инцидента (дочерний документ):**

```json
POST .../rest/api/.../note.document.add
{
  "fields": {
    "collectionId": 16,
    "parentId": 74,
    "title": "Инцидент 2",
    "markdown": "**Формулировки клиентов:** …"
  }
}
```

- `collectionId` — **16** (база «Клиенты»)
- `parentId` — папка раздела (74 Б24, 76 1С, …)
- Контент — **Markdown** (жирные метки в строке, не `##`)

**Права:** пользователь вебхука должен иметь **«Редактирование»** в этой базе знаний. Иначе `BITRIX_REST_V3_EXCEPTION_ACCESSDENIEDEXCEPTION`.

### REST (встроенная БЗ landing, scope KNOWLEDGE)

Вебхук должен иметь scope **landing** (и права на редактирование БЗ).

| Задача | Метод |
|--------|-------|
| Список баз знаний | `landing.site.getList` + `filter: { TYPE: "KNOWLEDGE" }`, корень: `"scope": "KNOWLEDGE"` |
| Создать БЗ | `landing.site.add` — `scope: "KNOWLEDGE"`, `fields.TYPE: "KNOWLEDGE"` |
| Список страниц (статей) | `landing.landing.getList` + `scope: "KNOWLEDGE"` |
| Создать страницу | `landing.landing.add` |
| Блоки контента | `landing.landing.addblock`, правка — `landing.block.*` |
| Публикация | `landing.landing.publication`, `landing.site.publication` |

Контент статей в landing — HTML-блоки. Черновик готовить в markdown/HTML по образцу, затем переносить в блоки или вставлять через UI.

### Права доступа

- Настраиваются в интерфейсе БЗ (отделы, группы, роли) или через методы прав landing — уточнять по порталу.
- В отчёте фиксировать, какие права применены.

## Шаблон статьи (базовый, если образец не задан)

```markdown
**Формулировки клиентов:** [варианты через / в одной строке]

**Описание сценария для повторения ошибки:** [текст]

**Теги**: `тег1`, `тег2`, `тег3`

**Причина:** [текст]

**Решение**: (*роли*) [алгоритм одним абзацем]
```

Образец — [document/144](https://dm-tmn.bitrix24.ru/note/document/144/). **Без** `##`, **без** списков `-` для формулировок, **без** «Краткого описания», **без** «Связанные материалы».

**Порядок в папке:** `position` сортируется **по убыванию**. Нумерованные (Б24): публиковать **7 → 1**, затем `fix-incident-order.js --parent=74`. Смысловые заголовки (1С): `publish-1c.js`. REST не меняет `position`.

### Скрипты миграции

| Скрипт | Описание |
|--------|----------|
| `scripts/parse-b24.js` | `export/B24.txt` → markdown по «Инцидент N» |
| `scripts/parse-1c.js` | `export/1C.txt` → markdown по смысловым заголовкам |
| `scripts/publish-b24-rest.js` | Публикация Б24, `--from=3 --to=7` |
| `scripts/publish-1c.js` | Публикация 1С в parent **76** |
| `scripts/fix-incident-order.js` | Порядок «Инцидент 1…N» |
| `scripts/lib/parse-incident.js` | Общий парсер полей |
| `scripts/lib/b24-note.js` | REST v3, дерево, webhook |

Если пользователь дал образец — **копировать его структуру**, не этот шаблон.

## Разбиение и объединение

- **Инциденты:** всегда **отдельный документ БЗ на каждый инцидент** — приоритетнее правил по объёму.
- **> ~8000 знаков** без инцидентов или **> 8 крупных разделов** — кандидат на несколько статей с перекрёстными ссылками в «Связанные материалы».
- Несколько мелких файлов одной темы (не инциденты) — предложить дерево разделов до публикации.

## Маркировка «Требует проверки»

В тексте статьи или в отчёте:

```markdown
> **Требует проверки:** [что именно сомнительно — дата, сумма, имя, противоречие]
```

Не исправлять содержание самостоятельно.

## Формат итогового отчёта

```markdown
## Отчёт миграции — ГГГГ-ММ-ДД

| Метрика | Значение |
|---------|----------|
| Документов найдено | N |
| Статей создано | N |
| Статей обновлено | N |
| Требует проверки | N |

### Статьи

| Исходный файл | Статья | Раздел | Статус |
|---------------|--------|--------|--------|

### Требует проверки

- …

### Не обработано

| Файл | Причина |
|------|---------|
```

## Диагностика

| Проблема | Действие |
|----------|----------|
| Нет доступа к Drive | Проверить sharing для SA/OAuth, ID папки |
| Образец не открывается | **Стоп** — запросить образец |
| landing 403 | Права вебхука, scope KNOWLEDGE в запросе |
| PDF/скан без текста | Отметить «не обработано» или «требует ручного ввода» |
| Битая кодировка | Перекодировать UTF-8, повторить экспорт |

## Безопасность

- Токены Google и B24 — только `.env`, не коммитить.
- Массовая публикация — сначала **одна тестовая статья** в черновике/тестовом разделе.
- Юридические и финансовые документы — не сокращать; спорное — «Требует проверки».
