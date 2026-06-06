ALLEXO — теми оформлення сайту
==============================

Варіант 0 (оригінал) — teal
  Файл: variant-0-teal.css (довідка)
  База: src/assets/main.css
  Увімкнення: applyColorTheme('teal') або кнопка «↩ Teal (оригінал)»

Варіант 1 — BLACK + GOLD + WARM BEIGE (основний дизайн у main.css)  ★ ЗБЕРЕЖЕНИЙ
  Файл: variant-1-logo.css
  Підключення: src/assets/logo-theme.css → @import
  Увімкнення: applyColorTheme('logo') або кнопка «◆ Чорний + золото»
  Ключ sessionStorage: allexo-theme-preview

Як повернути варіант 1 після нових експериментів:
  1. Скопіювати variant-1-logo.css → logo-theme.css (або залишити @import)
  2. У App.vue: applyColorTheme('logo')
  3. Не чіпати структуру шаблонів — лише кольори в theme-файлах

Нові варіанти:
  Створюйте variant-2-*.css, підключайте в main.js замість logo-theme.css
  НЕ перезаписуйте variant-1-logo.css

Логотипи для друку: brand/
