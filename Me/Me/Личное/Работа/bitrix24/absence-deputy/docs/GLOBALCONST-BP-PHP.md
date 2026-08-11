# Вариант 3: служебный БП + PHP → GlobalConst::upsert

> Сборка на портале ik-navigator. Код ниже — для активити **«PHP-код»** (без `<?php` … `?>`).

## 1. Создать шаблон

| Поле | Значение |
|------|----------|
| Название | **6 кадров — смена GlobalConst** |
| Сущность | CRM **Сделка** (как у шаблона 2784) или универсальный список-заглушка |
| Автозапуск | **Нет** — только REST / приложение |

### Параметры шаблона (Template parameters)

| Имя (код) | Тип | Обяз. | Описание |
|-----------|-----|-------|----------|
| `ConstId` | Строка | Да | ID константы, напр. `Constant1726726681045` |
| `NewUserId` | Число | Да | ID пользователя Б24 (число, без префикса `user_`) |

Для пакетной подмены позже — параметр `ConstIds` (множ.) + `NewUserId`.

## 2. PHP-код (одна константа, тип «пользователь»)

```php
\Bitrix\Main\Loader::includeModule('bizproc');

use Bitrix\Bizproc\Workflow\Type\GlobalConst;

$constId = (string) $this->getRootActivity()->ConstId;
$newUserId = (int) $this->getRootActivity()->NewUserId;

if ($constId === '' || $newUserId <= 0) {
    $this->WriteToTrackingService(
        '6 кадров: пустой ConstId или NewUserId',
        0,
        CBPTrackingType::Error
    );
    return;
}

$property = GlobalConst::getById($constId);
if (!is_array($property)) {
    $this->WriteToTrackingService(
        '6 кадров: константа не найдена: ' . $constId,
        0,
        CBPTrackingType::Error
    );
    return;
}

$oldDefault = $property['Default'] ?? null;
$newDefault = 'user_' . $newUserId;

$property['Default'] = $newDefault;
$ok = GlobalConst::upsert($constId, $property, (int) $this->getTemplateUserId());

$this->WriteToTrackingService(
    sprintf(
        '6 кадров GlobalConst %s: %s → %s (%s)',
        $constId,
        is_scalar($oldDefault) ? $oldDefault : json_encode($oldDefault),
        $newDefault,
        $ok ? 'OK' : 'FAIL'
    ),
    0,
    $ok ? CBPTrackingType::Report : CBPTrackingType::Error
);
```

### Проверка после сохранения шаблона

1. Вручную запустить БП на любой сделке с параметрами:
   - `ConstId` = `Constant1726726681045`
   - `NewUserId` = ID замещающего (тест)
2. **Глобальные константы** → **Проджект Б24** — новое ФИО.
3. Откатить вручную или вторым запуском.

## 3. Запуск из REST (после проверки PHP)

```http
POST .../bizproc.workflow.start
{
  "TEMPLATE_ID": "<ID нового шаблона>",
  "DOCUMENT_ID": ["crm", "CCrmDocumentDeal", "DEAL_<dealId>"],
  "PARAMETERS": {
    "ConstId": "Constant1726726681045",
    "NewUserId": 18900
  }
}
```

Scope входящего вебхука / приложения: **bizproc** (+ **crm** если документ — сделка).

## 4. Интеграция в «6 кадров» (следующий шаг кода)

- Vercel endpoint или `BX24.callMethod('bizproc.workflow.start', …)` из iframe
- В `client.js` заменить заглушку `applyGlobalConstStub` на вызов БП
- Хранить `TEMPLATE_ID` служебного БП в конфиге (не секрет)

## 5. Если «PHP-код» недоступен на ik-navigator

→ **вариант 5** ([[GLOBALCONST-STRATEGY]]): модуль Маркета с активити замены константы.
