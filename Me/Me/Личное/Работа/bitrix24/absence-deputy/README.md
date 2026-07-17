# 6 кадров

Локальное приложение Битрикс24 для портала [ik-navigator.bitrix24.ru](https://ik-navigator.bitrix24.ru): подмена сотрудников в глобальных константах на время отпуска и подготовка к увольнению.

Техническая папка: `absence-deputy`.  
Версия: **0.1.10** — UI picker + иллюстрации + ACL (user 24880) + деплой Vercel.

**Production:** https://b24-six-staff.vercel.app  
Регистрация на портале: [[docs/B24-APP-REGISTER]]

- Описание: [[PROJECT]]
- UX: [[docs/UX-B24]]
- Реестр констант: [[data/global-constants]]
- URL: [[static-urls.json]]

## Локальный запуск

```bash
cd Me/Me/Личное/Работа/bitrix24/absence-deputy
npm run dev
```

| URL | Назначение |
|-----|------------|
| http://127.0.0.1:3840/app.html | Приложение |
| http://127.0.0.1:3840/install.html | Установка |

## Деплой

```bash
npm run deploy
```

## Стек v0.1

HTML + CSS + JS. Запись констант и cron — заглушки TODO.
