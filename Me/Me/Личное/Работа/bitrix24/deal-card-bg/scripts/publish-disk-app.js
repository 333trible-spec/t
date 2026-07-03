'use strict';

/**
 * Диск Б24 отдаёт HTML с Content-Disposition: attachment — в iframe приложения
 * открывается скачивание или белый экран. Не использовать для обработчиков.
 *
 * Автономный хостинг: npm run publish:surge
 * Разработка: npm run start
 */
console.error(`
publish:disk отключён — URL Диска не подходят для iframe Битрикс24.

  HTML с Диска → Content-Disposition: attachment (скачивание install.html)
  Внешние /file/… ссылки → страница входа, не обработчик

Используйте:
  npm run publish:surge   — стабильный HTTPS без ПК (один раз: npx surge login)
  npm run start           — туннель для разработки

После публикации:
  1. Вставить URL …/install.html в Обработчик и Установка приложения
  2. Сохранить → Переустановить
  3. npm run verify
`);
process.exit(1);
