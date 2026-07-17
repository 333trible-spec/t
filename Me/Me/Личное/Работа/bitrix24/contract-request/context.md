# Заявка на договор — контекст



Проект: [[PROJECT]] · Регистрация: [[docs/B24-APP-REGISTER]] · Для сотрудников: [[docs/USER-GUIDE]] · Кратко: [[docs/USER-GUIDE-SHORT]] · Версии: [[docs/VERSIONING]] · URL: [[static-urls.json]]

**Текущая версия:** `v 1.01` (`version.json`) · на проде после деплоя 16.07.2026.

**В v 1.01:** ускорение загрузки — точечный batch UF, параллельный warmup enum, batch disk.file.get, Cache-Control на статику.

**В v 1.0:** крестик удаления файлов, значок **?** с инструкцией, внешняя рамка: сверху 0, по бокам/снизу узко.

| Команда в чате | Действие |
|----------------|----------|
| **апдейт версии** | `npm run version:save` — снимок + deploy; если снимок есть → сообщить |
| **откат в версии v 0.5** | `npm run version:rollback -- "v 0.5"` |



## Портал (только один)



| Портал | Статус |

|--------|--------|

| **https://ik-navigator.bitrix24.ru** | ✅ **единственный** — приложение, БП 608, установка |

| b24-s2an91 | ❌ **не используется** — этот проект к тестовому порталу не относится |



## Бизнес-процесс (не меняем)



| Параметр | Значение |

|----------|----------|

| Сущность | **Сделка** (`CRM_DEAL`) |

| Шаблон ID | **608** |

| Редактор | https://ik-navigator.bitrix24.ru/crm/configs/bp/CRM_DEAL/edit/608/ |

| Запуск из вкладки | **Да** — кнопка «Отправить» → `bizproc.workflow.start` (шаблон 608) |

| DOCUMENT_ID | `['crm', 'CCrmDocumentDeal', 'DEAL_{dealId}']` |

| Parameter3 | `Y` (Да), если у контакта заполнены ФИО + почта + реквизиты |



## Приложение



| Параметр | Значение |

|----------|----------|

| Placement | `CRM_DEAL_DETAIL_TAB` |

| Вкладка | **Заявка на договор** |

| Scope | `crm`, `placement`, `bizproc`, `user` |

| Деплой | Vercel → `static-urls.json` |



## Журнал работ



| Дата | Задача | Результат |

|------|--------|-----------|

| 2026-07-16 | v 1.01: perf — UF batch, parallel enum, disk batch, cache | ✅ api/html, api/serve.js |

| 2026-07-16 | v 1.0: крестик файлов, help «?», узкая рамка | ✅ деплой prod |

| 2026-07-14 | View-only в оформлении: после refresh кнопки не включаются снова | ✅ tab.html, bp-form.js → v 0.76 |

| 2026-07-14 | Фикс флагов контакта долевая/совместная (ФИО/телефон/почта/реквизиты) | ✅ bp-form.js → v 0.75 |

| 2026-07-13 | Кнопка «Отправить» → запуск БП 608 с PARAMETERS; активность по обязательным + ФИО/почта/реквизиты; Parameter3=Y | ✅ api/html/bp-form.js, deal-prefill.js |

| 2026-07-01 | Создан проект | ✅ PROJECT, app/public |

| 2026-07-01 | Только ik-navigator, не s2an91 | ✅ зафиксировано в context |

| 2026-07-01 | Деплой Vercel | ✅ https://b24-contract-request.vercel.app/install.html |
| 2026-07-01 | Fix белый экран: POST + serverless serve | ✅ api/html, POST 200 на index/tab/install |
| 2026-06-30 | Prefill формы из UF сделки | ✅ deal-prefill*.js, [[docs/DEAL-PREFILL-MAP]], [[export/deal-prefill-map.json]] |


