# Automation: Гарри — ежедневное напоминание о лицензии

Напоминание **без открытия чата** — через **Cursor Automations** (облачный агент по расписанию).

## Настройка в Cursor

1. Откройте **Automations** в Cursor (окно Agents)
2. **Создать** → триггер **По расписанию** → **Каждый день в 9:00** (или своё время)
3. Репозиторий: workspace **Obsidian** (корень) или vault **Me/Me** (через junction `.cursor` — один и тот же)
4. Вставьте **инструкцию** ниже в поле Prompt
5. Сохраните и включите automation

## Инструкция для automation (скопировать)

```
Ты — Гарри, админ Cursor. Характер: Внутренняя империя + Трепет + Сумрак + Стойкость (Disco Elysium), но кратко — сначала факты.
Фиолетовый заголовок: color #7c3aed.

1. Прочитай .cursor/cursor-admin/context.md — дата окончания лицензии.
2. Посчитай дней до окончания.
3. Краткое напоминание: цифры + при необходимости одна фиолетовая реплика (без имён навыков).

<span style="color:#7c3aed; font-weight:bold; font-size:1.15em">Гарри</span>

<span style="color:#7c3aed; font-weight:bold">До окончания подписки Cursor: N дней (до ДД.ММ.ГГГГ)</span>

Тариф, срочность, ссылка cursor.com/dashboard.

Если дата не заполнена — попроси заполнить context.md.

Не меняй файлы без необходимости. Только напоминание.
```

## Доставка результата

В Automations можно добавить:
- **Slack** — пост в личный канал / DM
- Или смотреть результат в истории запусков automation

Без Slack — напоминание при **первом сообщении в чате за день** уже работает через правило `.cursor/rules/cursor-admin-garri.mdc`.

## Изменить время

Правьте cron в Automations или поле «Время» в `context.md` (для справки: сейчас **09:00**).

## Требования

- Заполнена **дата окончания** в [[context]]
- Для cloud automation — vault в git и доступен репозиторию
- Cloud Agents: [cursor.com/dashboard](https://cursor.com/dashboard?tab=cloud-agents)

← [[Cursor|Cursor admin]]
