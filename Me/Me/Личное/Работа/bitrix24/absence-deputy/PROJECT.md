# 6 кадров

Локальное приложение Битрикс24: **Отпуск** и **Увольнение** с учётом глобальных констант (роли на портале).

| | |
|---|---|
| **Версия** | **0.8.24** (VibeCode / mts) |
| **Папка в vault** | `bitrix24/absence-deputy/` |
| **Портал** | [ik-navigator.bitrix24.ru](https://ik-navigator.bitrix24.ru) |
| **Реестр констант** | [[data/global-constants\|global-constants]] · `data/global-constants.json` |
| **Название в меню** | **6 кадров** |
| **UX** | [[docs/UX-B24\|UX-B24]] |
| **Регистрация Б24** | [[docs/B24-APP-REGISTER\|B24-APP-REGISTER]] |
| **npm name** | `b24-six-staff` |
| **Production** | [VibeCode](https://app-d561d9d4f2bd.vibecode.bitrix24.tech) · Vercel снят |

## Структура app (v0.1)

```
absence-deputy/
├── package.json          # npm run dev → :3840
├── version.json
├── vercel.json           # rewrites → api/serve
├── api/
│   ├── serve.js          # отдача html/css/js из api/html/
│   └── html/
│       ├── install.html  # BX24.installFinish + ссылка на app
│       ├── main.html     # UI (публично /app.html)
│       ├── styles.css    # нативный светлый Б24 (/app.css)
│       ├── client.js     # формы, таблицы, localStorage (/app.js)
│       ├── constants-registry.js
│       └── version.js
├── scripts/dev-server.mjs
├── data/                 # реестр GlobalConst
├── docs/                 # UX-B24
├── export/               # разборы .bpt
└── scripts/              # утилиты анализа БП
```

**Хранение v0.1:** `localStorage` ключ `six_staff_v01`.  
**Запись GlobalConst:** [[docs/GLOBALCONST-STRATEGY]] — приоритет **3** (PHP в БП), запас **5**, fallback **6/7**.  
**Cron:** заглушка TODO.

## Экраны

1. **Отпуск**
2. **Увольнение**

Список сотрудников — селектор Б24 (`BX24.selectUser`); локально — fallback ID + ФИО.

---

## Отпуск (зафиксировано)

- GlobalConst типа user; строки не трогаем
- Период «С»–«До» обязателен; «До» строго позже «С»
- В день «С» — подмена заместителем во всех константах, где он указан
- Если запись создана в день «С» — подмена сразу после сохранения
- В день «До» — автовозврат (день «До» уже без подмены — см. [[docs/UX-B24]])
- Ручной возврат кнопкой тоже есть
- Заместитель обязателен
- Календарь Б24 не используем; уведомления Б24 не шлём
- UI: нативный стиль Б24; конфликт — спросить в UI (модал в следующих версиях)
- Портал: `ik-navigator`
- Тест: только константа **«Проджект Б24»**
- Права: только пользователь [24880](https://ik-navigator.bitrix24.ru/company/personal/user/24880/) (`user.current`)

## Увольнение (зафиксировано)

- Режим: **уволить сейчас** или **уволить с даты** (авто в этот день)
- Константы **не трогаем автоматически**
- В UI предупреждение: какие константы станут «пустыми»
- Замена в константах — **опционально**
- Автовозврата нет

## Открыто

- [x] Выбрать название → **6 кадров**
- [x] Каркас app UI + install (v0.1)
- [x] ACL: только user ID 24880 на портале
- [x] Деплой → VibeCode `https://app-d561d9d4f2bd.vibecode.bitrix24.tech` (Vercel снят)
- [ ] Регистрация локального приложения на ik-navigator
- [ ] Системные ID констант
- [ ] Действие записи GlobalConst (вариант 3: [[docs/GLOBALCONST-BP-PHP]])
- [ ] Cron / backend хранения
