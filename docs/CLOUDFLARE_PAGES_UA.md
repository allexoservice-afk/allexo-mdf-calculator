# Cloudflare Pages: деплой з комп’ютера (Wrangler) — покроково

Цей проєкт уже налаштований: після збірки файли лежать у папці **`dist/`**. Команда **`pnpm run deploy:pages`** (або **`npm run deploy:pages`**) збирає сайт і завантажує його на Cloudflare Pages.

Ім’я проєкту в Cloudflare: **`allexo-mdf-calculator-v2`** (домен **allexo.be**). Якщо хочеш інше — зміни його **в двох місцях**:

1. файл **`package.json`** → рядок `"deploy:pages":` → параметр `--project-name=...`
2. файл **`wrangler.toml`** → рядок `name = "..."`

---

## Що потрібно один раз на комп’ютері

1. **Node.js** (версія 20 або новіша). У репозиторії є файл **`.nvmrc`** з числом `20` — якщо користуєшся [nvm](https://github.com/nvm-sh/nvm), у папці проєкту виконай: `nvm use`.
2. У папці проєкту встанови залежності (включно з **Wrangler**):

```bash
cd /шлях/до/allexo-mdf-calculator
```

Далі залежно від того, чим користуєшся:

- якщо **pnpm** (у проєкті є `pnpm-lock.yaml`):

```bash
pnpm install
```

- якщо **npm**:

```bash
npm install
```

---

## Крок 1. Акаунт Cloudflare

1. Відкрий **https://dash.cloudflare.com** і зареєструйся або увійди.
2. Нічого купувати не обов’язково — безкоштовного тарифу Pages зазвичай достатньо для такого сайту.

---

## Крок 2. Увійти в Wrangler з термінала (один раз)

У папці проєкту виконай:

```bash
pnpm exec wrangler login
```

(Якщо без pnpm — тоді **`npx wrangler login`**.)

- Відкриється браузер → дозволь доступ акаунту Cloudflare.
- Після успіху в терміналі буде повідомлення, що логін збережено.

---

## Крок 3. Перший деплой (створення проєкту Pages)

У тій самій папці:

```bash
pnpm run deploy:pages
```

(Якщо без pnpm — **`npm run deploy:pages`**.)

Що відбувається:

1. Запускається **`vite build`** — з’являється папка **`dist/`**.
2. **`wrangler pages deploy dist`** завантажує вміст **`dist/`** на Cloudflare під іменем проєкту **`allexo-mdf-calculator-v2`**.
3. Якщо такого проєкту ще **немає**, Wrangler може запропонувати **створити** його — погодься (y / yes), якщо запитає.

У кінці в терміналі з’явиться посилання на сайт (типу **`https://allexo-mdf-calculator.pages.dev`** або з іншим піддоменом). Відкрий його в браузері.

### Якщо команда скаржиться на ім’я проєкту

Створи проєкт вручну в інтерфейсі:

1. **Cloudflare Dashboard** → **Workers & Pages** → **Pages** → **Create a project**.
2. Обери **Direct Upload** (або спочатку створи порожній проєкт — залежить від інтерфейсу) **або** просто ще раз запусти **`pnpm run deploy:pages`** (або **`npm run deploy:pages`**) і підтверди створення в терміналі.

Потім знову ту саму команду деплою.

---

## Як оновлювати сайт пізніше (це «варіант 2» — з комп’ютера, одна команда)

Щоразу, коли змінив код і хочеш оновити сайт у мережі:

```bash
cd /шлях/до/allexo-mdf-calculator
pnpm run deploy:pages
```

(Якщо без pnpm — **`npm run deploy:pages`**.)

Більше нічого не потрібно: зібралось → завантажилось → через хвилину зміни на сайті.

---

## Перевірка локально перед деплоєм (необов’язково)

```bash
pnpm run build
pnpm run preview
```

(Якщо без pnpm — **`npm run build`** і **`npm run preview`**.)

Відкрий у браузері адресу, яку покаже Vite (зазвичай `http://localhost:4173`).

---

## Свій домен

Публічний сайт: **https://allexo.be** (також можна додати **www.allexo.be**).

У **Cloudflare** → твій **Pages**-проєкт → **Custom domains** → **Set up a custom domain** → вкажи `allexo.be` і виконай DNS (зазвичай CNAME на `*.pages.dev` або nameservers Cloudflare, якщо домен уже там).

Після підключення домену в **Environment variables** для Functions (якщо використовуєш `functions/api/proposal-delivery.js`) додай:

`ALLOWED_ORIGINS=https://allexo.be,https://www.allexo.be`

У `index.html` canonical і Open Graph уже вказують на **allexo.be**.

---

## Листи після заявки (варіант A — Resend)

Після форми «Отримати пропозицію» сайт викликає **`POST /api/proposal-delivery`** (Cloudflare Function) і надсилає:

1. лист **клієнту** на email з форми;
2. копію на **`info@allexo.be`**.

### 1. Resend

1. Зареєструйтесь на **https://resend.com**.
2. **API Keys** → створіть ключ (`re_…`).
3. **Domains** → додайте **allexo.be** і пройдіть DNS (TXT/MX), щоб відправляти з `info@allexo.be`.  
   До верифікації домену для тесту можна `RESEND_FROM_EMAIL=onboarding@resend.dev`.

### 2. Змінні в Cloudflare Pages

**Workers & Pages** → проєкт **`allexo-mdf-calculator-v2`** → **Settings** → **Environment variables** → **Production** (і Preview, якщо треба):

| Змінна | Тип | Приклад |
|--------|-----|---------|
| `RESEND_API_KEY` | Secret (Encrypt) | `re_…` |
| `RESEND_FROM_EMAIL` | Plain text | `ALLEXO <info@allexo.be>` |
| `OWNER_EMAIL` | Plain text | `info@allexo.be` |
| `ALLOWED_ORIGINS` | Plain text | `https://allexo.be,https://www.allexo.be` |

У **`wrangler.toml`** уже задані значення за замовчуванням для `OWNER_EMAIL`, `RESEND_FROM_EMAIL`, `ALLOWED_ORIGINS`; секрет **`RESEND_API_KEY`** додайте в Dashboard або в терміналі:

```bash
pnpm run secret:resend
# вставте ключ re_… коли запитає
```

### 3. Деплой

```bash
pnpm run deploy:pages
```

### 4. Перевірка

1. Відкрийте **https://allexo.be**, заповніть форму заявки.
2. У **Resend** → **Emails** мають з’явитися 2 листи (клієнт + власник).
3. Якщо листа немає — перевірте **Спам** і лог у браузері (F12 → Network → `proposal-delivery`).

### Локальна перевірка

```bash
cp .dev.vars.example .dev.vars
# вставте RESEND_API_KEY у .dev.vars
pnpm dev:api    # термінал 1 — API на :8788
pnpm dev        # термінал 2 — сайт на :5173, /api проксується на :8788
```

---

## Якщо щось не вийшло

| Проблема | Що спробувати |
|----------|----------------|
| `command not found` / немає `npm` | Перевстанови Node.js з **https://nodejs.org** (LTS). |
| Помилка збірки | Запусти **`pnpm run build`** (або **`npm run build`**) окремо і прочитай текст помилки в терміналі. |
| `Authentication error` | Ще раз **`pnpm exec wrangler login`** або **`npx wrangler login`**. |
| pnpm каже про **approve-builds** | У папці проєкту: **`pnpm approve-builds`** і дозволь скрипти для **wrangler** / **workerd** (потрібно один раз). |
| Старий кеш у браузері | Відкрий сайт у вікні інкогніто або Ctrl+F5. |
| **`Your user email must been verified` [code: 8000077]** | Увійди на **https://dash.cloudflare.com** → **My Profile** / **Account home** — підтвердь email за посиланням з листа (перевір **Спам**). Без цього Pages-проєкт не створиться. |
| Заявка в Supabase є, **листа немає** | У Cloudflare додай **`RESEND_API_KEY`** (Secret), задеплой знову. У Resend перевір домен / відправника. F12 → запит **`proposal-delivery`** (503 = немає ключа). |
| **`RESEND_API_KEY not configured`** | Секрет не заданий у Pages або деплой був до додавання змінної — зроби **Redeploy**. |
| **`Origin not allowed`** | Додай свій URL у **`ALLOWED_ORIGINS`** (з `https://`). |
| Попередження про **`pages_build_output_dir`** | У корені проєкту має бути актуальний **`wrangler.toml`** з рядком `pages_build_output_dir = "dist"` (у цьому репозиторії він уже є). |

Якщо Wrangler питає **production branch**: для деплою з комп’ютера зазвичай підходить **`main`** (або **`master`**, якщо так називається гілка в Git). Це **не** ім’я проєкту — ім’я проєкту задається параметром **`--project-name`** у `package.json`.

---

## Примітка про «ще простіше оновлення»

Якщо колись підключиш **GitHub** до Cloudflare Pages, оновлення буде таким: **запушив зміни в репозиторій — Cloudflare сам збере і опублікує**. Це не обов’язково; поточний спосіб (**`pnpm run deploy:pages`** / **`npm run deploy:pages`**) уже зручний і не вимагає GitHub.
