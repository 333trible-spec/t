# Миграция в базу знаний Битрикс24

Контекст для **агента базы знаний** (`/baza-znaniy`).

Проект: [[PROJECT]] · README: [[README]] · Чат-бот по БЗ (отдельно): [[../kb-qa-bot/PROJECT|kb-qa-bot]]

## Портал

См. общий контекст: [[../context|bitrix24/context.md]]

## Параметры миграции

| Параметр | Значение |
|----------|----------|
| Папка Google Drive | https://drive.google.com/drive/folders/1GEQLvw1vvSkbuIw79-h9bhddHYwef_NL |
| ID папки Drive | `1GEQLvw1vvSkbuIw79-h9bhddHYwef_NL` |
| Раздел базы знаний Б24 | [note/document/36](https://dm-tmn.bitrix24.ru/note/document/36/) — **Инциденты**; инциденты **Б24** → [document/74](https://dm-tmn.bitrix24.ru/note/document/74/) **Битрикс24** |
| Шаблон оформления статьи | [note/document/30](https://dm-tmn.bitrix24.ru/note/document/30/) |
| Права доступа | **доступно всем** сотрудникам портала |
| Вебхук | ✅ user **44** МЦ Интегратор (админ) в `.env` — `note.document.add` OK |

## Инвентарь Drive (проверка 2026-06-30)

Папка [Навигатор](https://drive.google.com/drive/folders/1GEQLvw1vvSkbuIw79-h9bhddHYwef_NL) — **доступ есть**: листинг и экспорт всех 4 документов (HTTP 200).

| Документ | ID | Экспорт |
|----------|-----|---------|
| Навигатор \| 1C - инциденты | `1itUCNI8lYlc5-832CboGgOiv5E0R4Y5Hd89g-Xq5ECU` | ✅ |
| Навигатор \| BI - инциденты | `1d0BALLE2TD4qBtTjn2CyriIDIo13P6bcpeJUQWCi8tg` | ✅ |
| Навигатор \| Админ - инциденты | `1KVurDPoyMPDLuRQx6ea5MkJoCnilxUx8y_n19mGhLck` | ✅ |
| Навигатор \| Б24 - инциденты | `1_tJp3soURnrTzYmD38eQmQ73n_y_O1Nuv--HGoZdpNs` | ✅ (~118 KB) |

Drive API без credentials — 403; для миграции достаточно публичного export URL (`/export?format=txt`). Service Account — опционально, для стабильности.

## Базы знаний на портале (REST)

| ID | Название |
|----|----------|
| 20 | База знаний |
| 22 | База знаний Разработки |

Раздел для публикации — _уточнить у пользователя_ (какой site ID / папка внутри БЗ).

**Решение по Wellsoft:** блок авторизации в конце файла Б24 — **не** отдельная статья; входит в **инцидент 6**.

**Именование статей:** заголовок **как в исходнике**. **Без** «Краткого описания».

**Папки в БЗ (collection 16 «Клиенты»):**
- `document/36` — Инциденты (корень)
- `document/74` — **Битрикс24** (инциденты из файла «Навигатор | Б24»)
- `document/76` — **1С** (инциденты из файла «Навигатор | 1C»)
- `document/78` — Администрирование
- `document/104` — BI

## Вебхук Битрикс24 (dm-tmn)

Создать **входящий вебхук** на портале https://dm-tmn.bitrix24.ru → Разработчикам → Другое → Входящий вебхук.

| Параметр | Рекомендация |
|----------|--------------|
| Пользователь | Админ или сотрудник с правом **создавать и редактировать** документы в нужной базе знаний |
| Scope REST | **`landing`** (обязательно), **`disk`** (если картинки/вложения), **`user`** (проверка доступа) |
| Хранение | `kb-migration/.env` → `B24_KB_WEBHOOK=https://dm-tmn.bitrix24.ru/rest/...` |

Проверка после создания:

```http
POST .../profile.json
POST .../landing.site.getList.json  body: { "scope": "KNOWLEDGE" }
```

Шаблон `note/document/30` — новый интерфейс БЗ; если `landing.*` не видит эту базу, нужен отдельный токен маркетплейс-приложения БЗ или публикация через UI (агент готовит черновики).

## Google Drive (отдельно от вебхука)

| Параметр | Рекомендация |
|----------|--------------|
| Доступ | Service Account JSON **или** OAuth; папка расшарена на SA / аккаунт |
| Scope Google | `https://www.googleapis.com/auth/drive.readonly` |
| Хранение | `kb-migration/.env` → `GOOGLE_APPLICATION_CREDENTIALS` или `GOOGLE_DRIVE_CREDENTIALS_JSON` |

## Секреты

- Google API / Service Account — `.env` в этой папке (не в git)
- Вебхук B24 — `B24_KB_WEBHOOK` в `.env` (не в git, не в context.md)

## Журнал работ

| Дата | Задача | Результат | Открытые пункты |
|------|--------|-----------|-----------------|
| 2026-06-30 | Проверка доступов note | user **12** — ACCESS_DENIED; user **44** — OK | — |
| 2026-06-30 | Скриншоты Б24 → БЗ | ✅ 5 изображений в статьях: Удаляется контакт, Пропавшее поле, Пропавшее агентство, Нет доступа в приложение, Не создаётся контрагент | — |
| 2026-06-30 | Заголовки Б24 из Drive | ✅ смысловые названия в папке 74 (7 статей) | — |
| 2026-06-30 | Инциденты 1С → БЗ | ✅ [Недоступен реквизит](https://dm-tmn.bitrix24.ru/note/document/152/) [Не заполнена обработка документа](https://dm-tmn.bitrix24.ru/note/document/146/) в папке **76** | — |
| 2026-06-30 | Инциденты Б24 3–7 → БЗ | ✅ [3](https://dm-tmn.bitrix24.ru/note/document/140/) [4](https://dm-tmn.bitrix24.ru/note/document/138/) [5](https://dm-tmn.bitrix24.ru/note/document/136/) [6](https://dm-tmn.bitrix24.ru/note/document/134/) [7](https://dm-tmn.bitrix24.ru/note/document/124/); порядок 1–7 выровнен | Инцидент 1→144, 2→142 после reorder |
| 2026-06-30 | Порядок инцидентов в папке 74 | ✅ после миграции 3–7: порядок 1…7 в дереве | — |
| 2026-06-30 | Инцидент 2 → БЗ | ✅ [document/120](https://dm-tmn.bitrix24.ru/note/document/120/) под parent **74** (Битрикс24); старый 118 удалён | — |
