# 6 кадров — контекст

| | |
|---|---|
| Название | **6 кадров** |
| Версия | **0.8.9** — статус сервера на кнопке 10/01 |
| Папка | `bitrix24/absence-deputy/` |
| Портал | `https://ik-navigator.bitrix24.ru` |
| npm | `b24-six-staff` |
| Экраны | Отпуск · Увольнение |
| Доступ | только [user 24880](https://ik-navigator.bitrix24.ru/company/personal/user/24880/) — сервер: `user.current` по OAuth токену iframe |
| Сотрудники в селекторах | все пользователи портала (Б24) |
| Тест | выкл. — отпуск/увольнение любого сотрудника; GlobalConst-запись пока stub |
| UX | [[docs/UX-B24]] |
| Стиль UI | нативный Б24 (светлый), не брендбук Навигатора |
| Хранение | **УС #276** (`lists`) → Redis → file; форма черновика: `localStorage` |
| HR отпуска | `/api/hr-vacations` · основной источник УС #276; CRM entityTypeId **136** — fallback |
| Подмена | интервал **`[С; До)`** — день «До» уже без делегирования |
| GlobalConst | стратегия [[docs/GLOBALCONST-STRATEGY]] · вариант **3** (PHP в БП) ⏳; делегирование заданий — cron `bizproc.task.delegate` |
| Cron | dismissal 02:00/03:30 · delegation 08/11/14/17 YEKT · [[docs/CRON-JOB-ORG]] |
| Деплой | **VibeCode** (`mts`) · https://app-d561d9d4f2bd.vibecode.bitrix24.tech · Vercel снят |

## Статус 0.1.10

Каркас UI + ACL + **VibeCode**. UI-правки:

- иллюстрации `deny-key.png` (экран доступа) и `footer-die.png` (футер);
- после выбора сотрудника суффикс `(ID)` скрыт — показывается только ФИО;
- поле fallback ID выровнено по размеру с кнопкой «Выбрать…»;
- кнопки «Выбрать замещающего», hint `dis-bp-hint`, confirm «Уволить сотрудника?».

Без реальной записи констант. Следующий шаг — регистрация на ik-navigator.

## Отпуск

- Таблица «Отпуска» — **read-only** из HR (стадия «Оформление»), не localStorage
- Форма «Новый отпуск» пока может писать в localStorage (не в таблицу)
- Статус в таблице: planned / active / returned (active включительно до даты «До»)
- GlobalConst / cron — заглушки TODO

## Увольнение

- **Сейчас** — `POST /api/dismissal` → `user.update` ACTIVE=false
- **Приглашён / ожидает подтверждения** — REST `intranet.invite.delete` недоступен (22002); UI показывает инструкцию для ручного «Отклонить вход»
- **С даты** — план в **Upstash Redis** на VibeCode (ключ `six-staff:dismissal-plans`), cron `/api/dismissal-cron`
- **Смарт-процесс HR не трогаем**
- Локально (`npm run dev`) — fallback в `data/dismissal-plans.json`, если Redis не задан
- Таблица «Увольнения» — только записи приложения
- Webhook `B24_NAV_WEBHOOK`: scope **user**

## Запись GlobalConst — допустимые варианты (2026-07-20)

| Приоритет | Вариант |
|-----------|---------|
| **1** | **3** — PHP в БП → `GlobalConst::upsert` ([[docs/GLOBALCONST-BP-PHP]]) |
| **2** | **5** — маркет-модуль БП («заменить константу») |
| fallback | **6** GlobalConst→GlobalVar · **7** список/СП + REST |

**Не рассматриваем:** 1 (ручной UI), 2 (REST), 4 (только GlobalVar), 8 (чеклист).

## Альтернатива «cron переназначает задания» (2026-07-23)

Идея: константы не менять; cron 08/11/14/17 YEKT → `bizproc.task.list` + `bizproc.task.delegate` с отпускника на заместителя.

**Вердикт:** не замена GlobalConst upsert. Покрывает только ожидающие задания БП (`/bizproc/userprocesses/`). Не трогает CRM-ответственных, роботов без задания, уведомления, уже прошедшие шаги. Блокер API: `delegate` — только своё задание (нужен probe админ-webhook). Окно до 3–9 ч для согласований обычно плохо. Как доп. слой после подмены констант — ок (подхват «хвостов»).

## Следующий шаг

Служебный БП «6 кадров — смена GlobalConst» на ik-navigator (проверить доступность PHP-кода).
