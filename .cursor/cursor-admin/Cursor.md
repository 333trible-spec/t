# Cursor — администрирование

Зона агента **Гарри**: лицензия, подписка, VPN Happ, инфраструктура Cursor.

← [[../../Me/Me/Личное/Работа|Работа]] · [[../../Me/Me/Личное/Me|Me]]

## Агент

**Гарри** — `/garri` — админ Cursor (Внутренняя империя, Трепет, Сумрак, Стойкость — кратко)  
Файл: `.cursor/agents/garri.md`  
Цвет в чате: фиолетовый `#7c3aed`

## Файлы

| Файл | Назначение |
|------|------------|
| `context.template.md` | Шаблон в git — ручные настройки, MCP, напоминания |
| `context.md` | Рабочая копия (локально, не в git) — читает Гарри |
| `reminder-log.md` | Лог напоминаний (в git, общий дом + работа) |
| `vpn.json` | Кэш статуса Happ (не в git) |
| `notes/` | Заметки по настройке Cursor |

## Дом и работа

1. Workspace Cursor — **корень** `Obsidian/`, не `Me/Me/`.
2. Папка `.cursor/` — **только** в корне репозитория. `Me/Me/.cursor/` не использовать.
3. После `git pull` на другом ПК: `scripts/sync-context.ps1` создаст `context.md` из шаблона.
4. См. также [[../../.cursor/README|README .cursor]].

## Быстрый старт

1. **Авто:** Гарри запускает `scripts/sync-context.ps1` — только **Happ VPN** (TTL 3 мин)
2. **Подписка:** только по запросу — `sync-context.ps1 -Subscription` (`/garri`, лицензия, срок)
3. **По расписанию (опционально):** [[automation-daily]] (Cursor Automations, 9:00)

## Скрипты

| Файл | Назначение |
|------|------------|
| `scripts/sync-context.ps1` | VPN → context.md; `-Subscription` — ещё и подписка |
| `scripts/fetch-subscription.ps1` | Только subscription.json (по запросу) |
| `scripts/fetch-vpn.ps1` | Только vpn.json (Happ) |
| `scripts/fetch-system.ps1` | Снимок Windows (RAM, диск, CPU, **GPU temp**) → system.json |
| `subscription.json` / `vpn.json` / `system.json` | Кэш (не в git) |

Погода / ambience — **отключены** (скрипт удалён).

## Примеры запросов

- Гарри, сколько дней до конца подписки?
- Гарри, как VPN? / Happ подключён?
- Гарри, как дела у компьютера? / состояние ПК?
- Проверь мои агенты и правила — всё ли согласовано?
- Какие MCP нужно переавторизовать?
- Пора ли обновить Cursor?

## Другие агенты

| Агент | Зона |
|-------|------|
| [[../../Me/Me/Личное/Работа/bitrix24/Битрикс24|Витёк]] | Битрикс24 |
| Гена | Безопасность (по просьбе) |
| База знаний | Google Drive → БЗ Б24 |
| Дизайнер | UX/UI Б24, брендбук, UI/CSS |

Канон: `.cursor/rules/agents-allowlist.mdc`.
