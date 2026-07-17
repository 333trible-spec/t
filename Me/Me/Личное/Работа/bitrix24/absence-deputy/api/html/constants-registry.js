/**
 * Реестр user-констант in-scope (из data/global-constants.json).
 * v0.1: сопоставление по ФИО в value.
 */
(function (global) {
  'use strict';

  var TEST_CONSTANT = 'Проджект Б24';

  /** @type {{ name: string, value: string, inScope: boolean }[]} */
  var CONSTANTS = [
    { name: 'Технический директор', value: 'Татьяна Григорьева', inScope: true },
    { name: 'Исполнительный директор', value: 'Татьяна Григорьева', inScope: true },
    { name: 'Офис-менеджер АХО', value: 'Мария Ошуркова', inScope: true },
    { name: 'Рук. Маркетинг', value: 'Татьяна Югова', inScope: true },
    { name: 'Директор продаж', value: 'Ирина Прокудина', inScope: true },
    { name: 'HR кадры', value: 'Полина Топорченко', inScope: true },
    { name: 'HR рекрутинг', value: 'Полина Топорченко', inScope: true },
    { name: 'Разраб Б24', value: 'Станислав Малышев', inScope: true },
    { name: 'Проджект Б24', value: 'Станислав Малышев', inScope: true },
    { name: 'Главный Админ', value: 'Никита Ивановский', inScope: true },
    { name: 'Админ', value: 'Никита Ивановский', inScope: true },
    { name: 'Аналитик 1С', value: 'Анастасия Агеева', inScope: true },
    { name: 'Разраб 1С', value: 'Вадим Добротворский', inScope: true },
    { name: 'Разраб БИТ', value: 'Ярослав Царегородцев', inScope: true },
    { name: 'Аналитик BI', value: 'Ольга Федорова', inScope: true },
    { name: 'Директор IT', value: 'Дмитрий Фуров', inScope: true },
    { name: 'РП', value: 'Арсений Речкин', inScope: true },
    { name: 'ФЭС', value: 'Зинаида Мартемьянова', inScope: true },
    { name: 'ОКС', value: 'Арсений Речкин', inScope: true },
    { name: 'ЮД', value: 'Любовь Майер', inScope: true },
    { name: 'Бухгалтер: Увол/Прием', value: 'Оксана Жетикова', inScope: true },
    { name: 'Кадр. юрист', value: 'Алексей Пшеничников', inScope: true },
    { name: 'Бухгалтер: Отпуска', value: 'Мария Остякова', inScope: true },
    { name: 'ОРБ', value: 'Надежда Шаврина', inScope: true },
    { name: 'ПТО', value: 'Елена Шпакович', inScope: true },
    { name: 'КСП', value: 'Илья Пахомов', inScope: true },
    { name: 'Бухгалтер', value: 'Оксана Жетикова', inScope: true },
    { name: 'ПО', value: 'Игорь Юрчишен', inScope: true },
    { name: 'Энергетик', value: 'Денис Московский', inScope: true },
    { name: 'Утверждающий', value: 'Solutions BOS', inScope: true },
    { name: 'ГИП', value: 'Игорь Юрчишен', inScope: true },
    { name: 'ВИП', value: 'Игорь Юрчишен', inScope: true },
    { name: 'Оформитель ОП', value: 'Ирина Прокудина', inScope: true },
    { name: 'Маркетолог', value: 'Татьяна Югова', inScope: true },
    { name: 'Юрист Документооборота', value: 'Алексей Пшеничников', inScope: true },
    { name: 'Рук. Гарантии', value: 'Кирилл Лейбгам', inScope: true },
    { name: 'Глав Бух', value: 'Оксана Образцова', inScope: true },
    { name: 'HR рук', value: 'Полина Топорченко', inScope: true },
    { name: 'ОМТО', value: 'Артём Сагитов', inScope: true },
    { name: 'Охрана труда', value: 'Алексей Моисеев', inScope: true },
    { name: 'Дир. по строительству(НУ)', value: 'Юрий Хохряков', inScope: true },
    { name: 'МОП НДР', value: 'Светлана Бабий', inScope: true }
  ];

  function normalizeName(name) {
    return String(name || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Найти роли (константы), где value совпадает с ФИО.
   * @param {string} name
   * @returns {{ name: string, value: string, inScope: boolean, writableInTest: boolean }[]}
   */
  function findRolesByPersonName(name) {
    var key = normalizeName(name);
    if (!key) return [];
    return CONSTANTS.filter(function (c) {
      return c.inScope && normalizeName(c.value) === key;
    }).map(function (c) {
      return {
        name: c.name,
        value: c.value,
        inScope: c.inScope,
        writableInTest: c.name === TEST_CONSTANT
      };
    });
  }

  global.SixStaffConstants = {
    TEST_CONSTANT: TEST_CONSTANT,
    CONSTANTS: CONSTANTS,
    findRolesByPersonName: findRolesByPersonName
  };
})(typeof window !== 'undefined' ? window : globalThis);
