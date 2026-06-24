# ROADMAP.md — PetLand v20

## وضعیت فعلی
پایه اصلی ربات کامل است. اولویت‌های بعدی بر اساس شکاف‌های شناسایی‌شده در سورس کد تعریف شده‌اند.

---

## اولویت بالا (Critical)

### 1. افزودن `.gitignore`
- **چرا:** فایل `.env` (حاوی `BOT_TOKEN` و `DATABASE_URL`) ممکن است به مخزن push شود
- **کار:** ایجاد `.gitignore` با `node_modules/`, `.env`, `tmp/`

### 2. Prisma Migration Files
- **چرا:** الان فقط `db:push` استفاده می‌شود — rollback یا تاریخچه تغییرات DB وجود ندارد
- **کار:** مهاجرت به `prisma migrate dev` و نگهداری migration files

### 3. بهبود مدیریت خطا
- **چرا:** crash در polling loop کل ربات را از کار می‌اندازد
- **کار:** try/catch در polling loop، graceful restart، logging ساختاریافته

---

## اولویت متوسط (Important)

### 4. پیاده‌سازی Webhook
- **چرا:** Long polling نیاز به پروسه دائمی دارد — webhook پایدارتر است
- **کار:** فعال‌سازی `src/bot/webhook.js` و وصل به Express router

### 5. حذف وابستگی بلااستفاده
- **چرا:** `axios` نصب است ولی استفاده نمی‌شود
- **کار:** `npm uninstall axios`

### 6. README.md
- **چرا:** هیچ مستندات راه‌اندازی وجود ندارد
- **کار:** راهنمای نصب، پیکربندی، و اجرا

### 7. Rate Limiting
- **چرا:** هیچ محدودیتی روی تعداد پیام‌های ورودی وجود ندارد
- **کار:** محدودیت تعداد درخواست per user در unit time

---

## اولویت پایین (Nice to Have)

### 8. تست‌های خودکار
- **چرا:** هیچ test وجود ندارد
- **کار:** unit test برای `utils/price.js`، `utils/order.js`، mock Bale API

### 9. Dockerfile / Docker Compose
- **کار:** containerization برای استقرار یکنواخت

### 10. PM2 Config
- **کار:** `ecosystem.config.js` برای restart خودکار در crash

### 11. Admin Dashboard (Web)
- **چرا:** مدیریت محصولات و سفارش‌ها از طریق مرورگر راحت‌تر است
- **توجه:** نیاز به معماری جدید (REST API + Frontend)

### 12. امنیت کد همکار
- **چرا:** یک کد مشترک برای همه همکاران — لغو یک همکار امکان‌پذیر نیست
- **کار:** کدهای یکتا per-colleague یا سیستم whitelist

### 13. Logging سیستماتیک
- **کار:** integration با یک logging service (مثل console.log ساختاریافته یا Sentry)

---

## موارد بدون اولویت مشخص (Unknown Priority)

| مورد | توضیح |
|------|-------|
| درگاه پرداخت آنلاین | جایگزینی یا مکمل پرداخت دستی |
| سیستم کوپن/تخفیف | Unknown — نیاز به بررسی |
| پشتیبانی چند زبانه | Unknown |
| آمار و گزارش‌گیری | Unknown |
