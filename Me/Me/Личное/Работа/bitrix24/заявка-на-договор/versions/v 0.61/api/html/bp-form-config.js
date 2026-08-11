/* BP 608 PARAMETERS — из bp-608.bpt, только фронт */
window.BP608_FORM_CONFIG = [
  {
    "code": "Parameter3",
    "label": "ЗАПОЛНИ ФИО КЛИЕНТА",
    "type": "bool",
    "required": false,
    "multiple": false,
    "options": null
  },
  {
    "code": "type_doc",
    "label": "Тип договора",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Договор долевого участия (ДДУ)",
      "Договор купли-продажи (ДКП)",
      "Предварительный договор купли-продажи (ПДКП)"
    ]
  },
  {
    "code": "property_type",
    "label": "Тип собственности",
    "type": "select",
    "required": true,
    "multiple": true,
    "options": [
      "Индивидуальная собственность",
      "Долевая собственность",
      "Общая совместная собственность"
    ]
  },
  {
    "code": "Parameter1",
    "label": "Участники общей собственности",
    "type": "UF:crm",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "Parameter2",
    "label": "Участники долевой собственности",
    "type": "UF:crm",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "form_payment",
    "label": "Форма оплаты",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Ипотека ипотека по стандартной программе",
      "100%",
      "Рассрочка.",
      "Рассрочка, переходящая в ипотеку",
      "Сертификат",
      "Семейная ипотека",
      "IT  ипотека"
    ]
  },
  {
    "code": "initial_fee",
    "label": "Общая сумма первоначального взноса(с учетом всех сертификатов и собственных средств)",
    "type": "UF:money",
    "required": false,
    "multiple": false,
    "options": null
  },
  {
    "code": "down_payment_period",
    "label": "Срок первоначального взноса",
    "type": "string",
    "required": false,
    "multiple": false,
    "options": null
  },
  {
    "code": "summ_MSK",
    "label": "Тип сертификата",
    "type": "select",
    "required": false,
    "multiple": true,
    "options": [
      "МСК",
      "Сотрудничество",
      "Молодая семья",
      "Иной вид"
    ]
  },
  {
    "code": "summ_sotrudnichestva",
    "label": "Сумма сертификата",
    "type": "UF:money",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "bank",
    "label": "Банк",
    "type": "select",
    "required": false,
    "multiple": false,
    "options": [
      "Сбербанк",
      "Запсибкомбанк",
      "Россельхозбанк",
      "Сургутнефтегазбанк",
      "ВТБ",
      "Уралсиб",
      "ДОМ.РФ",
      "SEO",
      "Газпромбанк",
      "Промсвязьбанк",
      "Росбанк",
      "Альфа-банк",
      "Абсолют Банк",
      "Тинькофф",
      "Открытие",
      "Металлинвестбанк",
      "Транскапиталбанк",
      "Другой"
    ]
  },
  {
    "code": "commit_deal",
    "label": "Комментарий по сделке",
    "type": "string",
    "required": true,
    "multiple": false,
    "options": null
  },
  {
    "code": "type_registr",
    "label": "Вид регистрации",
    "type": "select",
    "required": false,
    "multiple": false,
    "options": [
      "СКБ-Техно",
      "СЭР",
      "МФЦ"
    ]
  },
  {
    "code": "sber",
    "label": "Есть приложение СБЕР",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Есть",
      "Нет"
    ]
  },
  {
    "code": "repid_sale",
    "label": "Повторная продажа",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Да",
      "Нет"
    ]
  },
  {
    "code": "link_deal",
    "label": "Ссылка на предыдущую сделку",
    "type": "string",
    "required": false,
    "multiple": false,
    "options": null
  },
  {
    "code": "pasport",
    "label": "Паспорт каждого покупателя",
    "type": "file",
    "required": true,
    "multiple": true,
    "options": null
  },
  {
    "code": "snils",
    "label": "СНИЛС каждого покупателя",
    "type": "file",
    "required": true,
    "multiple": true,
    "options": null
  },
  {
    "code": "inn",
    "label": "ИНН каждого покупателя",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "marriage_certificate",
    "label": "Свидетельство о браке",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "birth_certificate",
    "label": "Свидетельство о рождении",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "adress_kids",
    "label": "Адрес регистрации ребенка",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "math_capital",
    "label": "Сертификат на мат. капитал",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "ostatok_capital",
    "label": "Выписка об остатке мат. капитала",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "sertifikat_sotrudnichestva",
    "label": "Сертификат Сотрудничество",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "notarised",
    "label": "Нотариальная доверенность",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "other_docs",
    "label": "Прочие документы",
    "type": "file",
    "required": false,
    "multiple": true,
    "options": null
  },
  {
    "code": "age",
    "label": "Возраст",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "20-34",
      "35-44",
      "45-54",
      "55-65",
      "66 и более"
    ]
  },
  {
    "code": "city",
    "label": "Город обращения",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Тюмень",
      "Сургут",
      "Надым",
      "Новый Уренгой",
      "Ханты-Мансийск",
      "Нижневартовск",
      "Тобольск",
      "Ялуторовск",
      "Ишим",
      "Заводоуковск",
      "Нефтеюганск",
      "Югорск",
      "Ноябрьск",
      "Салехард",
      "Тарко-Сале",
      "другой"
    ]
  },
  {
    "code": "sex",
    "label": "Пол",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Муж",
      "Жен"
    ]
  },
  {
    "code": "target",
    "label": "Цель покупки",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Для личного проживания",
      "Инвестиция",
      "Для родственника"
    ]
  },
  {
    "code": "famStatus",
    "label": "Семейное положение",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "женат/замужем",
      "не женат/не замужем",
      "в разводе",
      "отказ от ответа"
    ]
  },
  {
    "code": "kindOfActivity",
    "label": "Вид деятельности",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Руководитель высшего уровня",
      "Предприниматель",
      "Руководитель среднего уровня",
      "Специалист с высшим образованием",
      "Специалист без высшего образования",
      "Фрилансер",
      "Пенсионер"
    ]
  },
  {
    "code": "kids",
    "label": "Наличие детей",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "нет детей",
      "1 ребёнок",
      "2 ребёнка",
      "3 ребёнка",
      "4 ребёнка и более"
    ]
  },
  {
    "code": "attraction",
    "label": "Что привлекло",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Малоэтажная застройка",
      "Концепция проекта",
      "Внешний вид",
      "Хорошее благоустройство",
      "Природа",
      "Продукт",
      "Близость к городу",
      "Месторасположение",
      "Цена-качество",
      "Другое"
    ]
  },
  {
    "code": "animals",
    "label": "Наличие животных",
    "type": "select",
    "required": true,
    "multiple": false,
    "options": [
      "Да",
      "Нет"
    ]
  }
];
