# Контроль дубликатов (Duplicate Guard)

Локальное приложение Битрикс24: дубли по телефону/email, поле «Проверка на дубль», сценарии по воронкам.

## Связи

| | |
|---|---|
| **Папка в vault** | `bitrix24/duplicate-guard/` |
| **GitHub (деплой)** | [333trible-spec/b24-duplicate-guard](https://github.com/333trible-spec/b24-duplicate-guard) — репозиторий может остаться |
| **Vercel** | **снят** (2026-07-17) — на сервере не крутится |
| **Обработчик / установка** | были `b24-duplicate-guard.vercel.app` — offline |
| **Портал (тест)** | b24-s2an91, app **5** — URL в приложении Б24 нужно отвязать вручную, если ещё указывает на Vercel |

Исходники остаются в vault: `bitrix24/duplicate-guard/`.

## Исходники

Код с рабочего ПК положить в `app/public/`. Затем:

```powershell
cd "Me/Me/Личное/Работа/bitrix24/duplicate-guard"
npm run publish:github
```

Подробнее: [[ИНСТРУКЦИЯ]].
