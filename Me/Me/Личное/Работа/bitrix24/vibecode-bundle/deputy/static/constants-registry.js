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

  /** Фамилия+Имя (без отчества), порядок слов не важен при сравнении */
  function nameKeyPair(name) {
    var parts = normalizeName(name).split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return [parts[0], parts[1]].sort().join('|');
    }
    return parts[0] || '';
  }

  function namesMatch(a, b) {
    var ka = nameKeyPair(a);
    var kb = nameKeyPair(b);
    if (!ka || !kb) return false;
    return ka === kb;
  }

  /**
   * Найти роли (константы), где value совпадает с ФИО.
   * @param {string} name
   * @returns {{ name: string, value: string, inScope: boolean, writableInTest: boolean }[]}
   */
  function findRolesByPersonName(name) {
    if (!normalizeName(name)) return [];
    return CONSTANTS.filter(function (c) {
      return c.inScope && namesMatch(c.value, name);
    }).map(function (c) {
      return {
        name: c.name,
        value: c.value,
        inScope: c.inScope,
        writableInTest: c.name === TEST_CONSTANT
      };
    });
  }

  /** Есть ли сотрудник хотя бы в одной in-scope константе */
  function personInConstants(name) {
    return findRolesByPersonName(name).length > 0;
  }

  global.SixStaffConstants = {
    TEST_CONSTANT: TEST_CONSTANT,
    CONSTANTS: CONSTANTS,
    findRolesByPersonName: findRolesByPersonName,
    personInConstants: personInConstants
  };
})(typeof window !== 'undefined' ? window : globalThis);
