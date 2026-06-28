# Фото «Приклади виконаних робіт» (WebP)

## Папки

| Папка | Призначення |
|--------|-------------|
| **`source/works-original/`** | Оригінали (`.jpg` / `.jpeg` / `.png` / `.webp` / `.heic` з iPhone). **Не клади сюди** готові `work*-thumb.webp` / `work*-large.webp`. |
| **`public/images/works/`** | Тільки результат генерації: **`work1-thumb.webp` … `work50-thumb.webp`** та **`work1-large.webp` … `work50-large.webp`**. |

У стрічці завантажуються **тільки thumb**; **large** підвантажується **після відкриття** lightbox.

## Як згенерувати

1. Поклади фото в **`source/works-original/`** (наприклад `IMG_001.jpg`, `foto2.png` — як завгодно).
2. Файли **сортуються за іменем** (числово: `work2` перед `work10`); перші **до 50** отримують номери **`work1` … `work50`** у виході.
3. У корені проєкту:

```bash
pnpm run optimize:work-images
```

(те саме: **`pnpm run generate:work-images`** — зворотна сумісність.)

4. Закоміть згенеровані **`.webp`** у `public/images/works/` та **`src/generated/works-gallery.json`** (або залий разом із деплоєм).
5. Перевір: `pnpm run dev`.

## Параметри (`scripts/generate-work-images.mjs`)

- **Thumb:** ширина **320px**, пропорції як у оригіналу, WebP **quality 75**.
- **Large:** ширина **до 1600px**, WebP **quality 85**.
- **`withoutEnlargement: true`** — маленькі джерела не збільшуються.
