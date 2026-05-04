# Фото «Приклади виконаних робіт» (WebP)

## Папки

| Папка | Призначення |
|--------|-------------|
| **`public/images/works-original/`** | Оригінали (будь-які імена файлів, `.jpg` / `.jpeg` / `.png` / `.webp`). |
| **`public/images/works/`** | Результат: **`work1-thumb.webp` … `work15-thumb.webp`** (стрічка) та **`work1-large.webp` … `work15-large.webp`** (lightbox). |

У стрічці завантажуються **тільки thumb**; **large** підвантажується **після відкриття** lightbox.

## Як згенерувати

1. Поклади фото в **`public/images/works-original/`** (наприклад `IMG_001.jpg`, `foto2.png` — як завгодно).
2. Файли **сортуються за іменем**; перші **до 15** отримують номери **`work1` … `work15`** у виході.
3. У корені проєкту:

```bash
pnpm run optimize:work-images
```

(те саме: **`pnpm run generate:work-images`** — зворотна сумісність.)

4. Закоміть згенеровані **`.webp`** у `public/images/works/` (або залий разом із деплоєм).
5. Перевір: `pnpm run dev`.

## Параметри (`scripts/generate-work-images.mjs`)

- **Thumb:** ширина **320px**, пропорції як у оригіналу, WebP **quality 75**.
- **Large:** ширина **до 1600px**, WebP **quality 85**.
- **`withoutEnlargement: true`** — маленькі джерела не збільшуються.
