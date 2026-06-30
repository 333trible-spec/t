# Cursor — инфраструктура workspace

Workspace Cursor открывается из **корня репозитория** `Obsidian/`, не из `Me/Me/`.

## Единственная папка `.cursor`

| Путь | В git | Назначение |
|------|-------|------------|
| `.cursor/rules/` | да | Правила агентов |
| `.cursor/agents/` | да | Гарри, Витёк, Гена |
| `.cursor/hooks/` | да | Звук, хуки |
| `.cursor/cursor-admin/scripts/` | да | Скрипты синхронизации |
| `.cursor/cursor-admin/context.template.md` | да | Шаблон ручных настроек |
| `.cursor/cursor-admin/context.md` | **нет** | Рабочий контекст (обновляет `sync-context.ps1`) |
| `.cursor/cursor-admin/reminder-log.md` | да | Лог напоминаний (общий дом + работа) |
| `.cursor/cursor-admin/*.json` | **нет** | Кэш подписки, VPN, ПК |

**Не создавать** `Me/Me/.cursor/` — это дубликат, ломает синхронизацию.

## Дом и работа

1. Клон / pull репозитория `Obsidian` в одно и то же место (OneDrive или git).
2. Открыть в Cursor папку **`Obsidian`** (корень), не `Me/Me`.
3. После первого pull на новом ПК: запустить `sync-context.ps1` — появится локальный `context.md`.
4. Оранжевые точки на `context.md` и `*.json` — норма: эти файлы намеренно не в git.

Подробнее: [[cursor-admin/Cursor|Cursor — администрирование]].
