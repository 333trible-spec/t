'use strict';

const { getCurrentVersion, bumpVersion, setCurrentVersion } = require('./version-lib');

const next = bumpVersion(getCurrentVersion());
setCurrentVersion(next);
console.log('Текущая версия:', next);
console.log('Следующий «апдейт версии» сохранит снимок versions/' + next + '/');
