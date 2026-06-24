# PROJECT_RULES.md — PetLand v20

## قوانین توسعه

### زبان کد
- زبان برنامه‌نویسی: **JavaScript (CommonJS)**
- TypeScript استفاده نمی‌شود
- تمام متن‌های نمایشی به کاربر: **فارسی**
- نام متغیرها، توابع، فایل‌ها: **انگلیسی**

### ساختار ماژول
- سیستم ماژول: **CommonJS** (`require` / `module.exports`)
- `"type": "commonjs"` در `package.json` تعریف شده
- از `import/export` استفاده نشود

### پایگاه داده
- همه تغییرات schema از طریق `prisma/schema.prisma` اعمال شود
- اجرای `npm run db:push` برای sync schema
- Migration file ایجاد نمی‌شود (تصمیم گرفته‌شده در پروژه)
- داده seed از `src/data/products.js` تغذیه می‌شود

### Bale Bot
- ارتباط با Bale فقط از طریق `src/bot/bale.js`
- Long Polling فعال است — Webhook پیاده‌سازی نشده
- برای ارسال پیام از helper‌های `src/bot/messenger.js` استفاده شود
- حذف پیام قبلی ربات قبل از ارسال پیام جدید (clean UX)

### Handler‌ها
- هر handler باید یک حوزه کاری مستقل داشته باشد
- routing فقط در `src/handlers/router.js` انجام می‌شود
- state machine کاربر از طریق `orderStep` و `adminStep` مدیریت می‌شود

### Keyboard / UI
- تمام دکمه‌های کیبورد در `src/keyboards/menus.js` تعریف شوند
- متن دکمه‌ها به فارسی با emoji

### قیمت‌گذاری
- قیمت همیشه به **تومان** (integer) ذخیره می‌شود
- محاسبه قیمت فقط از طریق `src/utils/price.js`
- قیمت عمده = `costPrice` (بدون سود)
- قیمت خرده = `costPrice * (1 + profitPercent/100)`

### Admin
- شناسه ادمین‌ها در `ADMIN_BALE_IDS` env var تعریف می‌شود
- role ادمین هنگام `getOrCreateUser` تعیین می‌شود
- هیچ راهی برای ارتقای نقش از طریق ربات وجود ندارد (غیر از Colleague)

### امنیت
- `BOT_TOKEN` و `DATABASE_URL` هرگز در کد hardcode نشوند
- متغیرهای حساس فقط در `.env` (که در `.gitignore` باید باشد)
- هیچ اطلاعات حساسی در لاگ چاپ نشود

### استقرار
- برای Liara از اسکریپت `npm run build` استفاده شود (با mirror ایران)
- ترتیب اجرا: `build` → `db:push` → `seed` → `start`
- سرویس باید دائم در حال اجرا باشد (long polling)

### افزودن وابستگی
- قبل از افزودن پکیج جدید، بررسی شود که آیا نیاز واقعی وجود دارد
- پکیج `axios` بلااستفاده است و باید حذف شود
- ترجیحاً از `node-fetch` (موجود) برای HTTP استفاده شود

---

## قوانین AI / Agent

- هیچ فایل کدی بدون دستور صریح تغییر داده نشود
- اگر اطلاعات از سورس قابل استخراج نیست، `Unknown` نوشته شود
- مستندات بر اساس سورس واقعی تولید شود، نه حدس
- تغییرات schema Prisma فقط با هماهنگی کامل انجام شود
- seed مجدد داده ممکن است داده‌های موجود را overwrite کند
