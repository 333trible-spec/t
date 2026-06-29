---
name: b24-bizproc
description: >-
  Бизнес-процессы Битрикс24 (bizproc): шаблоны, запуск и остановка workflow, активити, согласования,
  паузы, роботы CRM vs БП, REST bizproc.*, scope bizproc.
  Use when designing or debugging Bitrix24 business processes, bizproc workflows, BP templates,
  approvals, bizproc.workflow.start, CRM automation with branching logic.
---

# Битрикс24 — бизнес-процессы

Skill для проектирования и отладки БП (bizproc) на портале.

## Что читать

| Задача | Файл |
|--------|------|
| REST bizproc, шаблоны, активити, CRM-документы | [reference.md](reference.md) |
| Роботы CRM (простая автоматизация) | `../b24-agent-lk/b24-platform.md` → «Роботы CRM» |
| REST и scope | `../b24-rest-api/SKILL.md` |

## Робот vs бизнес-процесс

| | Робот CRM | Бизнес-процесс |
|--|-----------|----------------|
| Сложность | Низкая | Высокая |
| Ветвления | Ограничены | Полные |
| Ожидание | Задержка | Пауза, ожидание действия пользователя |
| REST | Робот-вебхук | Активити «Вебхук» / REST |
| Scope | `crm` | `bizproc` |
| Где | CRM → Роботы | CRM → Бизнес-процессы |

**Робот** — смена стадии, уведомление, простой вебхук, автобраковка по дате UF.

**БП** — согласование, многошаговые цепочки, таймауты, ожидание ответа менеджера, интеграция с документами/1С.

## Запуск БП из REST

```javascript
await b24('bizproc.workflow.start', {
  TEMPLATE_ID: 123,
  DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_456'],
  PARAMETERS: { comment: 'Запуск из ЛК' },
});
```

Scope webhook/приложения: добавить **`bizproc`**.

## Чеклист БП

- [ ] Шаблон привязан к нужной сущности (сделка/лид/смарт-процесс)
- [ ] Параметры шаблона совпадают с `PARAMETERS` в REST
- [ ] Права: кто может запускать и кто видит задания
- [ ] Таймауты и эскалация при отсутствии ответа
- [ ] Тест на одной записи перед массовым запуском

## Ссылки

- [Бизнес-процессы REST](https://dev.1c-bitrix.ru/rest_help/bizproc/index.php)
- [Документация bizproc](https://dev.1c-bitrix.ru/learning/course/index.php?COURSE_ID=57)
