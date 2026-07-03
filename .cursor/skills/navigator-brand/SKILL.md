---
name: navigator-brand
description: >-
  Брендбук «Навигатор. Девелопмент»: цвета, градиент, шрифты Futura/Micra, паттерн,
  UI-токены для веб-форм и placement Б24. Use when styling Navigator apps, applying
  brand colors, CSS tokens, or reading the guidebook PDF.
---

# Навигатор. Девелопмент — бренд

Источник: `Навигатор. Девелопмент_Гайдбук.pdf` (14 стр.)

Локальная копия (если есть): `C:\Users\mitkinMV\Downloads\Telegram Desktop\Навигатор. Девелопмент_Гайдбук.pdf`

Доп. ассеты (шрифты, паттерн): `Navigator-Tech.zip` в той же папке — распаковать при необходимости.

## О бренде

ГК **«Навигатор. Девелопмент»** — девелопмент городской и загородной недвижимости.

## Цвета

| Имя | HEX | RGB | CMYK | Роль в UI |
|-----|-----|-----|------|-----------|
| Green | `#88c276` | 136, 194, 119 | 53, 0, 66, 0 | Акцент, успех, вторичные CTA |
| Blue | `#2d95d2` | 45, 149, 210 | 75, 28, 0, 0 | Primary, ссылки, основные кнопки |
| Sky | `#d5edfc` | 213, 237, 252 | 20, 0, 0, 0 | Фон страницы, подложка карточек |
| Teal | `#4db6ab` | 77, 182, 171 | 67, 2, 39, 0 | Бейджи, hover, вторичный акцент |

## Градиент

- Угол: **−45°**
- Остановки: `#88c276` → `#4db6ab` → `#2d95d2`

```css
--nd-gradient: linear-gradient(-45deg, #88c276 0%, #4db6ab 50%, #2d95d2 100%);
```

## Шрифты

| Шрифт | Начертания | Назначение |
|-------|------------|------------|
| **Micra** | Normal, Bold | Акцент, лейблы, мелкий капс (если есть web-font) |
| **Futura** | Light, Regular, Medium, Medium Italic, Bold, Bold Italic | Заголовки, UI, кнопки |

### Web fallback (без файлов бренда)

```css
--nd-font-display: "Futura PT", Futura, "Century Gothic", "Trebuchet MS", system-ui, sans-serif;
--nd-font-accent: Micra, "Courier New", monospace;
```

Подключать `.woff2` только из официального архива бренда; не тянуть с CDN без лицензии.

## CSS-токены (стартовый набор)

```css
:root {
  --nd-green: #88c276;
  --nd-blue: #2d95d2;
  --nd-sky: #d5edfc;
  --nd-teal: #4db6ab;
  --nd-gradient: linear-gradient(-45deg, #88c276, #4db6ab, #2d95d2);
  --nd-text: #0f172a;
  --nd-text-muted: #475569;
  --nd-border: #b8d9f0;
  --nd-card: #ffffff;
  --nd-radius: 12px;
  --nd-radius-sm: 8px;
  --nd-shadow: 0 1px 3px rgba(45, 149, 210, 0.08);
}
```

## Элементы дизайна и паттерн

В PDF — ссылки «Скачать» на графические элементы и паттерн. Для веба:

- паттерн — фон секции `opacity: 0.06–0.12`, `background-size: 200px`
- не перегружать формы в placement Б24 — 1 акцент (градиент шапки или primary-кнопка)

## Не для веб-UI

- полиграфия (пакет, папка, листовка)
- мерч (ручка, стаканчик)

## Чеклист перед сдачей UI

- [ ] Primary = `#2d95d2`, не generic Bootstrap blue
- [ ] Фон — `#d5edfc` или белые карточки на sky
- [ ] Шапка/hero — градиент −45° (опционально)
- [ ] Контраст текста на градиенте — белый `#fff`
- [ ] Ошибки — красный вне палитры бренда (`#b91c1c` допустим)
- [ ] Placement Б24: узкая колонка, поля не на всю ширину без нужды
- [ ] Нет стрелок number-spinner на денежных полях

## Проекты vault

Стилизация форм и приложений: `Me/Me/Личное/Работа/bitrix24/contract-request/` и другие в `Me/Me/Личное/Работа/`.
