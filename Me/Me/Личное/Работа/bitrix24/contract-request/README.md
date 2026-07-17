# Заявка на договор

Локальное приложение на **[ik-navigator](https://ik-navigator.bitrix24.ru)** — вкладка в сделке, БП **608**.

> **Не для b24-s2an91.** Только прод-портал ik-navigator.

## URL для регистрации приложения

См. [[static-urls.json]] — оба поля Б24: `b24InstallUrl` (= `install.html`).

## Деплой

```powershell
cd "Me/Me/Личное/Работа/bitrix24/contract-request"
npm run deploy
```

## Документация

| Файл | Содержание |
|------|------------|
| [[docs/USER-GUIDE]] | Инструкция для сотрудников (полная) |
| [[docs/USER-GUIDE-SHORT]] | Краткая памятка |
| [[PROJECT]] | Архитектура |
| [[context]] | Портал, журнал |
| [[docs/B24-APP-REGISTER]] | Scope, установка на ik-navigator |
| [[docs/DEAL-PREFILL-MAP]] | Prefill формы из UF сделки (БП 608) |
| [[export/deal-prefill-map.json]] | Маппинг полей (JSON) |

← [[../Битрикс24|Битрикс24]]
