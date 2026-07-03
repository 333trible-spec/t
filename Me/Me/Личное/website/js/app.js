const topNav = document.getElementById('topNav');
const navToggle = document.getElementById('navToggle');

const NAV_ICONS = {
  'index.html': 'map',
  'ishchem-istinu.html': 'map',
  'prisca-sapientia.html': 'sparkle',
  'filosofiya.html': 'book',
  'fenomenologiya.html': 'book',
  'psihologiya.html': 'brain',
  'religiya.html': 'flame',
  'germetizm.html': 'compass',
  'alhimiya.html': 'flask',
  'rozenkreycery.html': 'rose',
  'gravury.html': 'image',
  'epistemologiya.html': 'book',
  'ontologiya.html': 'book',
  'etika.html': 'book',
  'logika.html': 'book',
  'gusserl.html': 'book',
  'haydegger.html': 'book',
  'azoth.html': 'image',
  'coniunctio.html': 'image',
  'nigredo-splendor-solis.html': 'image',
  'rebis.html': 'image',
  'mutus-liber.html': 'image',
  'ripley-scroll.html': 'image',
};

const CALLOUT_ICONS = {
  abstract: 'info',
  note: 'info',
  tip: 'sparkle',
  warning: 'info',
  'как': 'info',
  quote: 'quote',
};

function icon(name, className = 'icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="icons.svg#${name}"></use></svg>`;
}

function isMobileNav() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function closeNav() {
  topNav?.classList.remove('open');
  document.body.classList.remove('nav-open');
  if (navToggle) {
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Открыть меню');
  }
  document.querySelectorAll('.nav-dropdown.open').forEach((el) => {
    el.classList.remove('open');
    el.querySelector('.nav-dropdown-btn')?.setAttribute('aria-expanded', 'false');
  });
}

function setupNavToggle() {
  if (!navToggle) return;
  if (!navToggle.querySelector('svg')) {
    navToggle.innerHTML = icon('menu', 'icon icon-menu');
  }
  navToggle.addEventListener('click', () => {
    const isOpen = topNav?.classList.toggle('open');
    document.body.classList.toggle('nav-open', isOpen);
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    navToggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  });
}

function setupDropdowns() {
  document.querySelectorAll('.nav-dropdown-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (!isMobileNav()) return;
      e.preventDefault();
      e.stopPropagation();
      const parent = btn.closest('.nav-dropdown');
      if (!parent) return;
      const willOpen = !parent.classList.contains('open');
      document.querySelectorAll('.nav-dropdown.open').forEach((el) => {
        if (el !== parent) {
          el.classList.remove('open');
          el.querySelector('.nav-dropdown-btn')?.setAttribute('aria-expanded', 'false');
        }
      });
      parent.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
  });
}

function setupNavIcons() {
  const brand = document.querySelector('.site-brand');
  if (brand && !brand.querySelector('.icon')) {
    brand.insertAdjacentHTML('afterbegin', icon('sparkle', 'icon'));
  }
}

function setupCalloutIcons() {
  document.querySelectorAll('.callout').forEach((el) => {
    const title = el.querySelector('.callout-title');
    if (!title || title.querySelector('.icon-callout')) return;
    const type = [...el.classList]
      .find((c) => c.startsWith('callout-'))
      ?.replace('callout-', '') || 'note';
    const name = CALLOUT_ICONS[type] || 'info';
    title.insertAdjacentHTML('afterbegin', icon(name, 'icon icon-callout'));
  });
}

const CARD_THEMES = {
  'filosofiya.html': 'card-theme-sky',
  'psihologiya.html': 'card-theme-mind',
  'religiya.html': 'card-theme-flame',
  'germetizm.html': 'card-theme-hermetic',
  'alhimiya.html': 'card-theme-alchemy',
  'rozenkreycery.html': 'card-theme-rose',
  'gravury.html': 'card-theme-art',
};

function setupCardIcons() {
  const CARD_ICONS = {
    'filosofiya.html': 'book',
    'psihologiya.html': 'brain',
    'religiya.html': 'flame',
    'germetizm.html': 'compass',
    'alhimiya.html': 'flask',
    'rozenkreycery.html': 'rose',
    'gravury.html': 'image',
  };

  document.querySelectorAll('.card[href]').forEach((card) => {
    const href = card.getAttribute('href') || '';
    const theme = CARD_THEMES[href];
    if (theme) card.classList.add(theme);

    if (card.querySelector('.icon-card')) return;
    const name = CARD_ICONS[href];
    if (name) {
      const h3 = card.querySelector('h3');
      if (h3) {
        h3.insertAdjacentHTML('beforebegin', icon(name, 'icon icon-card'));
      }
    }
  });
}

document.querySelectorAll('.top-nav a').forEach((link) => {
  link.addEventListener('click', closeNav);
});

document.body.addEventListener('click', (e) => {
  if (
    document.body.classList.contains('nav-open') &&
    !topNav?.contains(e.target) &&
    e.target !== navToggle &&
    !navToggle?.contains(e.target)
  ) {
    closeNav();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeNav();
});

window.addEventListener('resize', () => {
  if (!isMobileNav()) closeNav();
});

setupNavToggle();
setupDropdowns();
setupNavIcons();
setupCalloutIcons();
setupCardIcons();
