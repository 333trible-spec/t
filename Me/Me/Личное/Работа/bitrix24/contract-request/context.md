# Заявка на договор — контекст



Проект: [[PROJECT]] · Регистрация: [[docs/B24-APP-REGISTER]] · Версии: [[docs/VERSIONING]] · URL: [[static-urls.json]]

**Текущая версия:** `v 0.6` (`version.json`) · шаг **+0.01** (`npm run version:bump`)

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

| Запуск из вкладки | **Нет** — БП стартует штатно на портале |

| DOCUMENT_ID | `['crm', 'CCrmDocumentDeal', 'DEAL_{dealId}']` |



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

| 2026-07-01 | Создан проект | ✅ PROJECT, app/public |

| 2026-07-01 | Только ik-navigator, не s2an91 | ✅ зафиксировано в context |

| 2026-07-01 | Деплой Vercel | ✅ https://b24-contract-request.vercel.app/install.html |
| 2026-07-01 | Fix белый экран: POST + serverless serve | ✅ api/html, POST 200 на index/tab/install |
| 2026-06-30 | Prefill формы из UF сделки | ✅ deal-prefill*.js, [[docs/DEAL-PREFILL-MAP]], [[export/deal-prefill-map.json]] |


