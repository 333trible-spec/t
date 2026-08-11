# Заявка на договор

Локальное приложение Битрикс24: вкладка **«Заявка на договор»** в карточке сделки запускает и показывает существующий **бизнес-процесс** (шаблон **608** на ik-navigator). Логику БП **не переписываем** — только оболочка в [placement](https://apidocs.bitrix24.com/api-reference/widgets/crm/detail-tab.html).

## Связи

| | |
|---|---|
| **Папка в vault** | `Me/Me/Личное/Работа/bitrix24/заявка-на-договор/` |
| **Агент Cursor** | **Витёк** (`/vitek`) |
| **Портал** | **только** [ik-navigator.bitrix24.ru](https://ik-navigator.bitrix24.ru) — **не** b24-s2an91 |
| **Шаблон БП** | [CRM_DEAL / edit / 608](https://ik-navigator.bitrix24.ru/crm/configs/bp/CRM_DEAL/edit/608/) |
| **Образец placement** | [[../deal-card-bg/PROJECT\|deal-card-bg]] — `CRM_DEAL_DETAIL_TAB` |
| **Статус** | ✅ VibeCode (`/contract/`); установка на ik-navigator |
| **Версия** | `v 1.05` — см. [[docs/VERSIONING]] |

## Решение

| Было | Стало |
|------|-------|
| БП 608 запускается штатно (робот / CRM) | Вкладка: форма + **Отправить** → `bizproc.workflow.start` (608) |
| Отдельный смарт-процесс | **Не нужен** — используем готовый шаблон 608 |

### Архитектура

```
Карточка сделки (ik-navigator)
    └── вкладка «Заявка на договор»  [placement: CRM_DEAL_DETAIL_TAB]
            └── iframe → tab.html (локальное приложение)
                    ├── dealId из PLACEMENT_OPTIONS
                    ├── prefill / сохранение UF сделки
                    └── Отправить → bizproc.workflow.start (шаблон 608 + PARAMETERS)
```

**Отправить** активна, когда заполнены все обязательные поля формы и у контакта(ов) — ФИО, почта и реквизиты. Тогда в параметры уходит `Parameter3 = Y` (Да). Перед запуском форма сохраняется в сделку.

### Prefill из сделки

Заполненные UF сделки подставляются в форму при открытии вкладки. Маппинг: [[docs/DEAL-PREFILL-MAP]] · JSON: [[export/deal-prefill-map.json]] · код: `api/html/deal-prefill-map.js`.

### Scope приложения

`crm` + `placement` + **`bizproc`**

## Структура

```
заявка-на-договор/
├── PROJECT.md
├── context.md
├── README.md
├── docs/
│   ├── B24-APP-REGISTER.md
│   └── DEAL-PREFILL-MAP.md   # маппинг UF сделки → форма БП 608
├── export/
│   └── deal-prefill-map.json
└── api/html/
    ├── tab.html
    ├── deal-prefill-map.js   # источник маппинга (фронт)
    └── deal-prefill.js
```

## Деплой

Production — **VibeCode** (`mts`), путь `/contract/`. Vercel-проект **b24-contract-request** снят.

URL для полей Б24 — в [[static-urls.json]] (`b24InstallUrl`).

**Только ik-navigator.** Тестовый портал b24-s2an91 не используется.

## Смежные проекты

| Проект | Связь |
|--------|-------|
| [[../deal-card-bg/PROJECT\|deal-card-bg]] | Тот же placement `CRM_DEAL_DETAIL_TAB` |
| [[../duplicate-guard/PROJECT\|duplicate-guard]] | Каркас install + Vercel |

← [[../Битрикс24|Битрикс24]]
