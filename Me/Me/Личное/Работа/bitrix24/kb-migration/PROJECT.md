# Миграция в базу знаний Битрикс24

Перенос документов **Google Drive** в базу знаний **БЗ 2.0** на портале dm-tmn: парсинг, оформление статей, скриншоты, публикация через REST `note.document.*`.

**Отдельный проект** от [[../kb-qa-bot/PROJECT|kb-qa-bot]] (чат-бот по уже опубликованным статьям).

## Связи

| | |
|---|---|
| **Папка в vault** | `Me/Me/Личное/Работа/bitrix24/kb-migration/` |
| **Агент Cursor** | **База знаний** (`/baza-znaniy`) |
| **Портал** | https://dm-tmn.bitrix24.ru |
| **Skill** | `.cursor/skills/b24-knowledge-base/SKILL.md` |
| **Контекст** | [[context]] — параметры, журнал, вебхуки |
| **Статус** | 🟢 В работе (инциденты Б24 и 1С частично перенесены) |

## Зона ответственности

| Входит | Не входит |
|--------|-----------|
| Экспорт из Google Drive | Чат-бот, imbot, ответы в мессенджере → [[../kb-qa-bot/PROJECT\|kb-qa-bot]] |
| Черновики в `drafts/` | CRM, роботы, вебхуки сделок → Витёк |
| Публикация `note.document.add/update` | |
| Скриншоты `note.file.add` | |
| Порядок статей в папках БЗ | |

## Источники и целевая БЗ

| Источник | Целевая папка на dm-tmn |
|----------|-------------------------|
| [Google Drive «Навигатор»](https://drive.google.com/drive/folders/1GEQLvw1vvSkbuIw79-h9bhddHYwef_NL) | collection **16** «Клиенты» |
| Навигатор \| Б24 - инциденты | [document/74](https://dm-tmn.bitrix24.ru/note/document/74/) |
| Навигатор \| 1C - инциденты | [document/76](https://dm-tmn.bitrix24.ru/note/document/76/) |
| Навигатор \| Админ | document/78 |
| Навигатор \| BI | document/104 |
| Корень инцидентов | [document/36](https://dm-tmn.bitrix24.ru/note/document/36/) |

Шаблон оформления: [document/30](https://dm-tmn.bitrix24.ru/note/document/30/)

## Скрипты

| Скрипт | Назначение |
|--------|------------|
| `scripts/parse-b24.js`, `parse-1c.js` | Парсинг export → markdown |
| `scripts/publish-b24-rest.js`, `publish-1c.js` | Публикация в БЗ |
| `scripts/attach-b24-images.js` | Скриншоты из Google Doc → `note.file.add` |
| `scripts/fetch-incidents.js` | Выгрузка статей из БЗ в `export/` |
| `scripts/lib/b24-note.js` | REST v3: `note.document.*` |
| `scripts/check-note-access.js` | Проверка вебхука |

```powershell
cd "Me/Me/Личное/Работа/bitrix24/kb-migration"
node scripts/fetch-incidents.js
```

## Секреты

Файл `.env` (не в git):

- `B24_KB_WEBHOOK` — входящий вебхук dm-tmn (user 44, scope `note`, `disk`)

## Правила оформления

- Заголовок статьи **как в исходнике Drive**
- Без блока «Краткое описание»
- Wellsoft (авторизация) — часть инцидента 6, не отдельная статья

Журнал и детали: [[context]].

← [[../Битрикс24|Битрикс24]] · [[../kb-qa-bot/PROJECT|kb-qa-bot]]
