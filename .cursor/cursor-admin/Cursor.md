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

1. **Авто:** Гарри запускает `scripts/sync-context.ps1` — подписка и **Happ VPN** подтягиваются сами
2. **Ежедневно:** при первом сообщении за день — напоминание о лицензии
3. **По расписанию:** [[automation-daily]] (Cursor Automations, 9:00)
4. Вручную: `/garri`

## Скрипты

| Файл | Назначение |
|------|------------|
| `scripts/sync-context.ps1` | Подписка + VPN → context.md |
| `scripts/fetch-subscription.ps1` | Только subscription.json |
| `scripts/fetch-vpn.ps1` | Только vpn.json (Happ) |
| `scripts/fetch-ambience.ps1` | Время и погода Тюмени → ambience.json |
| `scripts/fetch-system.ps1` | Снимок Windows (RAM, диск, CPU, **GPU temp**) → system.json |
| `subscription.json` / `vpn.json` / `system.json` / `ambience.json` | Кэш (не в git) |

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
| Гена | Безопасность настроек |
