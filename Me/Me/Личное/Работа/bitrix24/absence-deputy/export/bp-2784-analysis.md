# Разбор bp-2784.bpt

Источник: `C:\Users\mitkinMV\Downloads\bp-2784.bpt` → `export/bp-2784.bpt`  
Ссылка: шаблон CRM_DEAL **2784**

## Результат

**Глобальных констант в шаблоне нет** — выражений `{=GlobalConst:…}` / `GlobalConst:` / `Constant…` в экспорте **0**.

Шаблон по сути пустой:

| Что | Значение |
|-----|----------|
| Активности | `SequentialWorkflowActivity` → одна `LogActivity` («Запись в отчет») |
| PARAMETERS / VARIABLES / CONSTANTS шаблона | пустые |
| Выражения | только `{=System:Now}` |
| Якорь из URL `A62638_89551_10304_32527` | в файле **отсутствует** |
| Основной объём файла | `DOCUMENT_FIELDS` сделки (~1113 полей) |

## Вывод

Из **этого** БП ID портальных GlobalConst вытащить нельзя: он их просто не использует. Нужен шаблон, где в действиях уже вставлены глобальные константы (например, назначение ответственного / уведомление / условие по роли), либо другой способ (settings-UI робота).

## Файлы

- `export/bp-2784.bpt`
- `export/bp-2784.decoded.txt`
- `scripts/extract-globalconst-from-bpt.js`
- `scripts/analyze-bp-2784.js`
