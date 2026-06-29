# Битрикс24 — бизнес-процессы (bizproc)

## Где настраивать

- **CRM → Ещё → Бизнес-процессы** — шаблоны для сделок, лидов, смарт-процессов
- **Настройки → Бизроботы и бизнес-процессы** — общие шаблоны
- **CRM → Роботы** — простая автоматизация (не путать с БП)

## Идентификаторы документов CRM

Формат `DOCUMENT_ID` для REST:

| Сущность | DOCUMENT_ID |
|----------|-------------|
| Сделка | `['crm', 'CCrmDocumentDeal', 'DEAL_{id}']` |
| Лид | `['crm', 'CCrmDocumentLead', 'LEAD_{id}']` |
| Контакт | `['crm', 'CCrmDocumentContact', 'CONTACT_{id}']` |
| Компания | `['crm', 'CCrmDocumentCompany', 'COMPANY_{id}']` |
| Смарт-процесс | `['crm', 'Bitrix\\Crm\\Integration\\BizProc\\Document\\Dynamic', 'DYNAMIC_{typeId}_{id}']` |

## REST-методы bizproc

| Задача | Метод |
|--------|-------|
| Запуск БП | `bizproc.workflow.start` |
| Остановка | `bizproc.workflow.kill` |
| Список запущенных | `bizproc.workflow.instances` |
| Задания пользователя | `bizproc.task.list` |
| Выполнить задание | `bizproc.task.complete` |
| Шаблоны | `bizproc.workflow.template.list` |
| Роботы БП | `bizproc.robot.add` |

### Запуск

```javascript
await b24('bizproc.workflow.start', {
  TEMPLATE_ID: 123,
  DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_456'],
  PARAMETERS: {
    comment: 'Согласование закрепления',
    manager_id: 1,
  },
});
```

### Список активных процессов по документу

```javascript
await b24('bizproc.workflow.instances', {
  filter: {
    DOCUMENT_ID: ['crm', 'CCrmDocumentDeal', 'DEAL_456'],
  },
});
```

### Остановка

```javascript
await b24('bizproc.workflow.kill', { ID: 'workflow_instance_id' });
```

### Задания пользователя

```javascript
await b24('bizproc.task.list', {
  filter: { USER_ID: 1, STATUS: 0 },
});
```

```javascript
await b24('bizproc.task.complete', {
  TASK_ID: 789,
  STATUS: 'ok',  // или 'no' / 'cancel' — зависит от шаблона
  COMMENT: 'Согласовано',
});
```

## Scope

Webhook или приложение должно иметь право **`bizproc`** в дополнение к `crm`.

Проверка: `app.info` → `SCOPE`.

## Типовые активити в шаблоне

| Активити | Назначение |
|----------|------------|
| Утверждение документа | Согласование с таймаутом |
| Запрос доп. информации | Ожидание ответа пользователя |
| Условие | Ветвление по полям CRM |
| Пауза в выполнении | Задержка N дней/часов |
| Вебхук / REST | Вызов внешнего API |
| Уведомление | Сообщение в колокольчик / email |
| Изменение полей документа | Обновление UF, стадии |
| Запуск бизнес-процесса | Вложенный БП |

## Параметры шаблона

- Параметры объявляются в дизайнере БП (тип: строка, число, пользователь, дата).
- В REST передаются в `PARAMETERS` по **имени параметра** шаблона.
- Поля документа доступны как `{=Document:FIELD_NAME}` в шаблоне.
- Системные: `{=System:Now}`, `{=System:Date}`.

## Когда БП, когда робот

| Сценарий | Решение |
|----------|---------|
| Автобраковка по дате UF | Робот CRM |
| Смена стадии по условию | Робот CRM |
| POST на внешний URL | Робот «Вебхук» |
| Согласование менеджером | БП |
| Цепочка с паузами и эскалацией | БП |
| Ожидание действия пользователя | БП |
| Интеграция с 1С / документами | БП |

## Запуск БП из робота CRM

В роботе CRM: действие **«Запустить бизнес-процесс»** → выбрать шаблон → передать параметры.

Альтернатива: робот-вебхук на backend → `bizproc.workflow.start` через REST.

## Отладка

| Проблема | Решение |
|----------|---------|
| `ACCESS_DENIED` | Нет scope `bizproc` |
| БП не стартует | Неверный `TEMPLATE_ID` или `DOCUMENT_ID` |
| Параметр пустой | Имя в `PARAMETERS` не совпадает с шаблоном |
| Задание не появляется | Проверить ответственного в активити «Утверждение» |
| Дубли процессов | Проверить `bizproc.workflow.instances` перед повторным start |

## Пример: согласование закрепления

1. Шаблон БП на сделке воронки «Закрепления агентов».
2. Триггер: робот CRM на стадии «Новая» → «Запустить БП».
3. Шаг 1: Уведомление менеджеру.
4. Шаг 2: Утверждение (таймаут 24ч → эскалация).
5. Ветка «Да» → смена стадии на «Согласовано».
6. Ветка «Нет» → стадия «Брак» + комментарий в таймлайн.

## Ссылки

- [bizproc REST](https://dev.1c-bitrix.ru/rest_help/bizproc/index.php)
- [bizproc.workflow.start](https://dev.1c-bitrix.ru/rest_help/bizproc/bizproc_workflow_start.php)
- [Курс по бизнес-процессам](https://dev.1c-bitrix.ru/learning/course/index.php?COURSE_ID=57)
