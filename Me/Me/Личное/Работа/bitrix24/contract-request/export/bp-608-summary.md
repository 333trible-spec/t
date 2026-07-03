# BP 608 — разбор экспорта

Источник: `bp-608.bpt` · сущность **CRM_DEAL** · ik-navigator

## Тип шаблона

- **Последовательный бизнес-процесс** (`SequentialWorkflowActivity`)

## Активити (порядок, Type + Title)

1. **SequentialWorkflowActivity** — Последовательный бизнес-процесс
2. **SetFieldActivity** — !!!Загрушка!!!
3. **LogActivity** — Запись в отчет
4. **IfElseActivity** — Условие
5. **IfElseBranchActivity** — ФИО контакта не заполнено
6. **SocnetBlogPostActivity** — Добавить новость
7. **LogActivity** — ФИО не заполнено
8. **IfElseBranchActivity** — Почта не заполнена
9. **SocnetBlogPostActivity** — Добавить новость
10. **IfElseBranchActivity** — Условие
11. **LogActivity** — Истина
12. **SetFieldActivity** — Заполняем портрет покупателя
13. **EmptyBlockActivity** — Заявка на оформление
14. **SequenceActivity** — Последовательность действий
15. **LogActivity** — Запись в отчет
16. **IfElseActivity** — Генерируем заявку
17. **IfElseBranchActivity** — Индивидуальный собственник
18. **IfElseActivity** — Тип помещения
19. **IfElseBranchActivity** — Кладовка
20. **CrmGenerateEntityDocumentActivity** — Заявка на договор инд
21. **LogActivity** — Запись в отчет
22. **SetFieldActivity** — Сохраняем заявку
23. **IfElseBranchActivity** — Квартира
24. **CrmGenerateEntityDocumentActivity** — Заявка на договор инд
25. **LogActivity** — Запись в отчет
26. **SetFieldActivity** — Сохраняем заявку
27. **IfElseBranchActivity** — Долевая
28. **IfElseActivity** — Тип помещения
29. **IfElseBranchActivity** — Кладовка
30. **CrmGenerateEntityDocumentActivity** — Заявка на договор долевая
31. **LogActivity** — Запись в отчет
32. **SetFieldActivity** — Сохраняем заявку
33. **IfElseBranchActivity** — Квартира
34. **CrmGenerateEntityDocumentActivity** — Заявка на договор долевая
35. **LogActivity** — Запись в отчет
36. **SetFieldActivity** — Сохраняем заявку
37. **LogActivity** — Запись в отчет
38. **IfElseActivity** — проверка наличия контакта
39. **IfElseBranchActivity** — есть контакт
40. **IfElseActivity** — проверка направления текущей сделки
41. **IfElseBranchActivity** — Поселки Н или ЗА Н
42. **EmptyBlockActivity** — вторая проверка - наличие сделок в целевом направлении
43. **SequenceActivity** — Последовательность действий
44. **EmptyBlockActivity** — определяем кол-во контактов в сделке
45. **SequenceActivity** — Последовательность действий
46. **SetVariableActivity** — записываем ВСЕ контакты в Сделку
47. **SetVariableActivity** — счетчик контактов в сделке  = 0 
48. **ForEachActivity** — Итератор
49. **SequenceActivity** — Последовательность действий
50. **SetVariableActivity** — счетчик контактов в сделке  +1
51. **LogActivity** — Запись в отчет
52. **EmptyBlockActivity** — Проверка всех Контактов
53. **SequenceActivity** — Последовательность действий
54. **ForEachActivity** — Итератор - КОнтакты сделки
55. **SequenceActivity** — Последовательность действий
56. **SetVariableActivity** — записываем ИД контакта в переменную - ИЗ итератора!
57. **rest_0218e6ebf3931dc28210b5d6390061f0** — [Активити ВВиП (новые)] Найти все сделки контакта
58. **SetVariableActivity** — записываем найденные сделки в переменную
59. **LogActivity** — Запись в отчет
60. **ForEachActivity** — Проверяем каждую найденную сделку
61. **SequenceActivity** — Последовательность действий
62. **CrmGetDataEntityActivity** — Выбор данных crm - берем инфу из каждой сделке на проверке
63. **SetVariableActivity** — запись стадии сделки
64. **IfElseActivity** — проверка стадии (ТОЛЬКО ЗА!)
65. **IfElseBranchActivity** — проверяем только РАБОЧИЕ стадии ЗА
66. **SetVariableActivity** — записываем ИД найденной сделки
67. **LogActivity** — Запись в отчет
68. **IfElseBranchActivity** — нету совпадений
69. **LogActivity** — Запись в отчет
70. **IfElseActivity** — Нашли сделку в Оформлении?
71. **IfElseBranchActivity** — Параллельная бронь
72. **EmptyBlockActivity** — Фиксируем ID созданной сделки
73. **SequenceActivity** — Последовательность действий
74. **LogActivity** — Параллельная бронь
75. **SetFieldActivity** — Записываем ссылку на сделку в продажах (параллельная бронь)
76. **CreateCrmDealDocumentActivity** — Создание 2новой сделки - в направлении Оформлении ЗА Н
параллельная бронь
77. **CrmGetDataEntityActivity** — Выбор данных crm
78. **SetFieldActivity** — запись в поле ИД новой сделки
79. **LogActivity** — Запись в отчет
80. **CrmTimelineCommentAdd** — Добавить комментарий
81. **SetFieldActivity** — очищаем поле Дополнительно
82. **LogActivity** — Очищаем поле Дополнительно
83. **IfElseBranchActivity** — Нашли!
84. **LogActivity** — Запись в отчет
85. **CrmGetDataEntityActivity** — Выбор данных crm 2
86. **SetFieldActivity** — запись в текущую сделку - ссылки на сделку в оформлении
87. **CrmTimelineCommentAdd** — Добавить комментарий
88. **IfElseBranchActivity** — Не нашли!
89. **LogActivity** — Запись в отчет
90. **IfElseActivity** — какое текущее направление?
91. **IfElseBranchActivity** — Поселки Н
92. **IfElseBranchActivity** — Зеленые Аллеи Н
93. **ParallelActivity** — Параллельное выполнение
94. **SequenceActivity** — Последовательность действий
95. **EmptyBlockActivity** — Фиксируем ID созданной сделки
96. **SequenceActivity** — Последовательность действий
97. **SetFieldActivity** — Записываем ссылку на сделку в продажах
98. **CreateCrmDealDocumentActivity** — Создание 1новой сделки - в направлении Оформлении ЗА Н
99. **CrmGetDataEntityActivity** — Выбор данных crm
100. **SetFieldActivity** — запись в поле ИД новой сделки
101. **CrmTimelineCommentAdd** — Добавить комментарий
102. **SequenceActivity** — Последовательность действий
103. **IfElseActivity** — Есть завышение
104. **IfElseBranchActivity** — Да
105. **ParallelActivity** — Параллельное выполнение
106. **SequenceActivity** — Последовательность действий
107. **MailActivity** — Почтовое сообщение
108. **SequenceActivity** — Последовательность действий
109. **IMNotifyActivity** — Уведомление пользователя
110. **IfElseBranchActivity** — Условие
111. **SetFieldActivity** — Меняем стадию
112. **IfElseBranchActivity** — Условие
113. **IMNotifyActivity** — уведомление - об ошибке запуска (неверное направление)
114. **rest_f9210145878e5fe33c86751dad52a894** — [Шахматка] Изменить статус помещения
115. **CrmTimelineCommentAdd** — Добавить комментарий в элемент
116. **IfElseBranchActivity** — Условие
117. **CrmTimelineCommentAdd** — Добавить комментарий
118. **TerminateActivity** — Прерывание процесса
119. **IfElseActivity** — Проверка ФИО клиента
120. **IfElseBranchActivity** — ФИО клиента заполнено
121. **IfElseBranchActivity** — ФИО не заполнено
122. **CrmTimelineCommentAdd** — Добавить комментарий в элемент
123. **CrmChangeStatusActivity** — Сменить стадию

## UF-поля сделки в процессе

- `UF_CRM_1644993988`
- `UF_CRM_1659005450720`
- `UF_CRM_1659005409074`
- `UF_CRM_1659008047015`
- `UF_CRM_1659009682372`
- `UF_CRM_1659007926721`
- `UF_CRM_1659074512261`
- `UF_CRM_1659074341994`
- `UF_CRM_1668572647`
- `UF_CRM_1659074620049`
- `UF_CRM_1722231570`
- `UF_CRM_1514285621`
- `UF_CRM_1619419271478`
- `UF_CRM_1722843190`
- `UF_CRM_1722232687`
- `UF_CRM_1514285671`
- `UF_CRM_64`
- `UF_CRM_1722839839`
- `UF_CRM_1722839884`
- `UF_CRM_1722851893`
- `UF_CRM_1722839925`
- `UF_CRM_1722839965`
- `UF_CRM_1722840010`
- `UF_CRM_1722840057`
- `UF_CRM_1722840095`
- `UF_CRM_1722840150`
- `UF_CRM_1722840210`
- `UF_CRM_1722938526204`
- `UF_CRM_1722941445`
- `UF_CRM_1685943769`
- `UF_CRM_1722231741`
- `UF_CRM_1722231954`
- `UF_CRM_1723030206`
- `UF_CRM_1723532204`
- `UF_CRM_1726038020`
- `UF_CRM_1538729147`
- `UF_CRM_1723528988`
- `UF_CRM_1664775472`
- `UF_CRM_1664792769`
- `UF_CRM_1514285784`
- `UF_CRM_1538728238762`
- `UF_CRM_1538728252471`
- `UF_CRM_1538728258081`
- `UF_CRM_1538728286642`
- `UF_CRM_1538728292007`
- `UF_CRM_1540552899`
- `UF_CRM_1554441569076`
- `UF_CRM_1566896313`
- `UF_CRM_1580876455874`
- `UF_CRM_1580876464731`
- `UF_CRM_1619419293422`
- `UF_CRM_1619419381158`
- `UF_CRM_1619419426779`
- `UF_CRM_1647847963971`
- `UF_CRM_1648620318066`
- `UF_CRM_1648622722604`
- `UF_CRM_6260`
- `UF_CRM_1650958311024`
- `UF_CRM_1650958359213`
- `UF_CRM_1657873655`
- `UF_CRM_62`
- `UF_CRM_1660043118613`
- `UF_CRM_1660535141`
- `UF_CRM_1664969607`
- `UF_CRM_1674214850`
- `UF_CRM_1676357023`
- `UF_CRM_1679476064`
- `UF_CRM_1686043236`
- `UF_CRM_649`
- `UF_CRM_121`
- `UF_CRM_1696847562`
- `UF_CRM_1697015111`
- `UF_CRM_1697018686`
- `UF_CRM_1697020510`
- `UF_CRM_1697195546`
- `UF_CRM_1700215388994`
- `UF_CRM_1700215460776`
- `UF_CRM_1700217998116`
- `UF_CRM_1700457910`
- `UF_CRM_1700471607414`
- `UF_CRM_655`
- `UF_CRM_1704975890651`
- `UF_CRM_1705491161999`
- `UF_CRM_1707196677821`
- `UF_CRM_1707211888`
- `UF_CRM_1707211971`
- `UF_CRM_1707287114`
- `UF_CRM_1709102252`
- `UF_CRM_1712733610`
- `UF_CRM_1722233695`
- `UF_CRM_1722246835`
- `UF_CRM_1722855061`
- `UF_CRM_1723613436`
- `UF_CRM_1739347967`
- `UF_CRM_1739351362`
- `UF_CRM_1739357026`
- `UF_CRM_1741592250`
- `UF_CRM_1749018147`
- `UF_CRM_1753075344`
- `UF_CRM_1753865705041`
- `UF_CRM_1689224441`
- `UF_CRM_1689316871842`
- `UF_CRM_5`
- `UF_CRM_6360`
- `UF_CRM_1619692947`
- `UF_CRM_1622183969`
- `UF_CRM_1622183995`
- `UF_CRM_1622184023`
- `UF_CRM_1649750063`
- `UF_CRM_1649753152`
- `UF_CRM_1656057996`
- `UF_CRM_1664775392`
- `UF_CRM_1664792607`
- `UF_CRM_625`
- `UF_CRM_1580876531207`
- `UF_CRM_1653397101`
- `UF_CRM_646`
- `UF_CRM_1754367756909`
- `UF_CRM_1662629293`
- `UF_CRM_1489662019`
- `UF_CRM_1514285709`
- `UF_CRM_1514285720`
- `UF_CRM_1514285737`
- `UF_CRM_1516087526`
- `UF_CRM_1516110338`
- `UF_CRM_1516188182`
- `UF_CRM_1517818034`
- `UF_CRM_1519044876`
- `UF_CRM_1538728175196`
- `UF_CRM_1538728263731`
- `UF_CRM_1538728269909`
- `UF_CRM_1538728276066`
- `UF_CRM_1539687636`
- `UF_CRM_1540548252`
- `UF_CRM_1540553564`
- `UF_CRM_1540553594`
- `UF_CRM_1540554275`
- `UF_CRM_1540554740`
- `UF_CRM_1540554805`
- `UF_CRM_1540554822`
- `UF_CRM_1542270475`
- `UF_CRM_1542270499`
- `UF_CRM_1542270524`
- `UF_CRM_1542800844`
- `UF_CRM_1554371480174`
- `UF_CRM_1554440345378`
- `UF_CRM_1554441471323`
- `UF_CRM_1566371562`
- `UF_CRM_1581071847`
- `UF_CRM_1581509456929`
- `UF_CRM_1582012969`
- `UF_CRM_1591077995374`
- `UF_CRM_1599212908923`
- `UF_CRM_1599212940506`
- `UF_CRM_1619418611769`
- `UF_CRM_1619418745002`
- `UF_CRM_1619419325995`
- `UF_CRM_1619419358548`
- `UF_CRM_1619419522421`
- `UF_CRM_1619419554637`
- `UF_CRM_1619419588171`
- `UF_CRM_1619435259403`
- `UF_CRM_1619515162085`
- `UF_CRM_1619618497873`
- `UF_CRM_1626763524972`
- `UF_CRM_1626853324790`
- `UF_CRM_1630396564387`
- `UF_CRM_1638516174709`
- `UF_CRM_1639116266399`
- `UF_CRM_1647340962`
- `UF_CRM_1647848029617`
- `UF_CRM_1647852416795`
- `UF_CRM_1650958148343`
- `UF_CRM_1650959214562`
- `UF_CRM_1653456666850`
- `UF_CRM_1653457227797`
- `UF_CRM_1653457314150`
- `UF_CRM_1656935682167`
- `UF_CRM_1656935706386`
- `UF_CRM_1657187469180`
- `UF_CRM_1657873213`
- `UF_CRM_1657884727174`
- `UF_CRM_1657884761876`
- `UF_CRM_1657884785292`
- `UF_CRM_1657884802348`
- `UF_CRM_1657884827604`
- `UF_CRM_1657885780068`
- `UF_CRM_1658998576`
- `UF_CRM_1659498442261`
- `UF_CRM_1659595292115`
- `UF_CRM_1659697660501`
- `UF_CRM_1659697771995`
- `UF_CRM_1660041810`
- `UF_CRM_1660644640`
- `UF_CRM_1660888065753`
- `UF_CRM_1661764685`
- `UF_CRM_1662721064`
- `UF_CRM_6322`
- `UF_CRM_1663658772`
- `UF_CRM_1663660947`
- `UF_CRM_632984`
- `UF_CRM_1663674513`
- `UF_CRM_1663674681`
- `UF_CRM_1663737776`
- `UF_CRM_1664431613`
- `UF_CRM_1664529814`
- `UF_CRM_1664530057`
- `UF_CRM_1664530081`
- `UF_CRM_1664530244`
- `UF_CRM_634`
- `UF_CRM_1666157549`
- `UF_CRM_63567`
- `UF_CRM_637`
- `UF_CRM_639837`
- `UF_CRM_63`
- `UF_CRM_641`
- `UF_CRM_1683805668`
- `UF_CRM_1684845420`
- `UF_CRM_1690960836`
- `UF_CRM_1692183647`
- `UF_CRM_6502`
- `UF_CRM_1695982032`
- `UF_CRM_1695982033`
- `UF_CRM_1696414290326`
- `UF_CRM_1696566768473`
- `UF_CRM_1696568305521`
- `UF_CRM_1699343028`
- `UF_CRM_1699449054`
- `UF_CRM_65521`
- `UF_CRM_65607412`
- `UF_CRM_6566`
- `UF_CRM_1703505805`
- `UF_CRM_1706524400`
- `UF_CRM_1706526939978`
- `UF_CRM_1707196553249`
- `UF_CRM_65`
- `UF_CRM_1708940135`
- `UF_CRM_1710230664`
- `UF_CRM_1710494587`
- `UF_CRM_1710495594`
- `UF_CRM_1710995148`
- `UF_CRM_1710997656`
- `UF_CRM_6603`
- `UF_CRM_663`
- `UF_CRM_66555`
- `UF_CRM_1718618351`
- `UF_CRM_6673`
- `UF_CRM_667`
- `UF_CRM_1722939499`
- `UF_CRM_1723199854315`
- `UF_CRM_1723456654`
- `UF_CRM_1724149252`
- `UF_CRM_66`
- `UF_CRM_675688669`
- `UF_CRM_1739353069`
- `UF_CRM_1742989121`
- `UF_CRM_1742989123`
- `UF_CRM_1744779334`
- `UF_CRM_1754975401369`
- `UF_CRM_1756207944`
- `UF_CRM_1776852546752`
- `UF_CRM_1776852774142`
- `UF_CRM_1776855310914`
- `UF_CRM_1776855355606`
- `UF_CRM_1776855427146`
- `UF_CRM_1777023001835`
- `UF_CRM_1777023476482`
- `UF_CRM_1777024041`
- `UF_CRM_1778581864832`
- `UF_CRM_1782215619343`
- `UF_CRM_1782216309667`
- `UF_CRM_1782815976`
- `UF_CRM_1782816044`
- `UF_CRM_1782816883`
- `UF_CRM_1782816939`
- `UF_CRM_1782816991`
- `UF_CRM_1782817037`
- `UF_CRM_1782817073`
- `UF_CRM_1782817098`
- `UF_CRM_1782817120`
- `UF_CRM_1782817166`
- `UF_CRM_1782817206`
- `UF_CRM_1782817257`
- `UF_CRM_1782817274`
- `UF_CRM_1782817308`
- `UF_CRM_1782817348`
- `UF_CRM_1782817363`
- `UF_CRM_1782817414`
- `UF_CRM_6`
- `UF_CRM_1693308309392`
- `UF_CRM_1693540108`
- `UF_CRM_1693553546`
- `UF_CRM_1693553595`
- `UF_CRM_1693553642`
- `UF_CRM_1693553670`
- `UF_CRM_1693656913`
- `UF_CRM_1693656976`
- `UF_CRM_1693657017`
- `UF_CRM_1694352376`
- `UF_CRM_1694352398`
- `UF_CRM_1695363057`
- `UF_CRM_1489656054`
- `UF_CRM_1504065664`
- `UF_CRM_1593586909`
- `UF_CRM_1578484533`
- `UF_CRM_1557008108`
- `UF_CRM_1557008119`
- `UF_CRM_1634903177`
- `UF_CRM_635`
- `UF_CRM_6788`
- `UF_CRM_1579073932`
- `UF_CRM_1584706806`
- `UF_CRM_1579601630`
- `UF_CRM_1582082289`
- `UF_CRM_1582091435`
- `UF_CRM_1579079347`
- `UF_CRM_1579079421`
- `UF_CRM_1579777690`
- `UF_CRM_1579779128`
- `UF_CRM_1619692983`
- `UF_CRM_1586152755`
- `UF_CRM_1598874108`
- `UF_CRM_1626081681`
- `UF_CRM_1643109623`
- `UF_CRM_1640151193`
- `UF_CRM_1640151983`
- `UF_CRM_1640156227`
- `UF_CRM_633`
- `UF_CRM_1649752943`
- `UF_CRM_1649752988`
- `UF_CRM_1649753011`
- `UF_CRM_1649753040`
- `UF_CRM_1649753090`
- `UF_CRM_1649753119`
- `UF_CRM_1649753176`
- `UF_CRM_1649753202`
- `UF_CRM_1656062400`
- `UF_CRM_1684153610`
- `UF_CRM_6346`
- `UF_CRM_1695980864`
- `UF_CRM_1702277580`
- `UF_CRM_1702537697`
- `UF_CRM_1702537731`
- `UF_CRM_59`
- `UF_CRM_1514285145`
- `UF_CRM_1542800839`
- `UF_CRM_1582005107`
- `UF_CRM_1582005750`
- `UF_CRM_1582008586983`
- `UF_CRM_1638092857988`
- `UF_CRM_1638092976684`
- `UF_CRM_1638098562414`
- `UF_CRM_1638098621042`
- `UF_CRM_1639295741292`
- `UF_CRM_1657001309`
- `UF_CRM_1658465868488`
- `UF_CRM_1658466069923`
- `UF_CRM_1658466137636`
- `UF_CRM_1658466192688`
- `UF_CRM_1658466222856`
- `UF_CRM_1658466242337`
- `UF_CRM_630`
- `UF_CRM_1662956961`
- `UF_CRM_63203`
- `UF_CRM_632`
- `UF_CRM_63807`
- `UF_CRM_1684326063958`
- `UF_CRM_1684412549`
- `UF_CRM_1684753562`
- `UF_CRM_6503`
- `UF_CRM_6560740`
- `UF_CRM_659`
- `UF_CRM_1706265688`
- `UF_CRM_1710412968`
- `UF_CRM_66700`
- `UF_CRM_1721129282`
- `UF_CRM_1773990099`
- `UF_CRM_62319`
- `UF_CRM_1718358123`
- `UF_CRM_1542800812`
- `UF_CRM_1718919216`
- `UF_CRM_1732790138`
- `UF_CRM_1732790183`
- `UF_CRM_1733208845253`
- `UF_CRM_1781503203212`

## Комментарии из дизайнера

- Заглушка для передачи в оформление сделки сразу без проверки на дубли
- 11.11.22
- только ЗА! нужно будет добавить для Поселков!
- на Прокудину

