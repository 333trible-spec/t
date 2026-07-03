# Регистрация локального приложения на b24-s2an91

**Production URL:** https://b24-duplicate-guard.vercel.app

## 1. Создать локальное приложение

1. Откройте https://b24-s2an91.bitrix24.ru/
2. **Приложения** → **Разработчикам** → **Другое** → **Локальное приложение**
3. Заполните:

| Поле | Значение |
|------|----------|
| Название | Duplicate Guard |
| Код (латиница) | duplicate_guard |
| **Путь вашего обработчика** | `https://b24-duplicate-guard.vercel.app/settings.html` |
| **Путь для первоначальной установки** | `https://b24-duplicate-guard.vercel.app/install.html` |
| Использует только API | Нет |
| Поддерживает BitrixMobile | Нет |

4. **Права доступа** (обязательно):
   - CRM (`crm`)
   - Пользователи (`user`)
   - Настройки пользовательских полей (`userfieldconfig`)
   - Встраивание приложений (`placement`) — опционально

5. **Сохранить** → **Переустановить** / **Установить**

## Важно

`event.bind` (исходящий webhook) **нельзя** привязать через входящий webhook.
Привязка выполняется **только** при установке локального приложения — кнопка на `install.html` внутри B24.

После установки откроется `install.html`:

1. Нажмите **«Установить (событие + настройки)»**
2. Должны появиться зелёные строки: `event.bind` и конфиг

Или из терминала (уже выполнено скриптом `npm run register:portal`):

```powershell
node scripts/register-portal.mjs
```

## 3. Настройки

В меню приложений откройте **Duplicate Guard** → `settings.html`

- Выберите воронки: 1, 5, 7, 3
- Настройте сценарии по каждой воронке
- **Сохранить**

## 4. Проверка

1. Создайте лид с телефоном, который уже есть у активного лида/сделки
2. Новый лид должен уйти в **брак** (если сценарий = reject)

Webhook: `POST https://b24-duplicate-guard.vercel.app/api/webhook/lead-add`

## URL приложения

| Страница | URL |
|----------|-----|
| Установка | https://b24-duplicate-guard.vercel.app/install.html |
| Настройки | https://b24-duplicate-guard.vercel.app/settings.html |
| Webhook | https://b24-duplicate-guard.vercel.app/api/webhook/lead-add |
