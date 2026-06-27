# AI_CONTEXT.md — PetLand v22
> خلاصه مدیریتی پروژه برای استفاده در چت‌های AI. این فایل را در ابتدای هر مکالمه بارگذاری کن.

---

## پروژه چیست؟
**PetLand** یک ربات فروشگاهی روی پیام‌رسان **Bale** (نسخه ایرانی تلگرام) است که محصولات حیوانات خانگی می‌فروشد. این یک اپلیکیشن وب معمولی **نیست** — رابط کاربری آن کاملاً از طریق کیبوردهای ربات در Bale است.

---

## Stack فنی

| لایه | تکنولوژی |
|------|---------|
| زبان | JavaScript (Node.js، CommonJS) |
| HTTP | Express 5 (فقط health check) |
| Database | PostgreSQL + Prisma 6 ORM |
| Messaging | Bale Bot API (long polling) |
| PDF | PDFKit (فارسی ناقص) |
| Deploy | Liara (PaaS ایرانی) |
| UI | Bale inline + reply keyboards — کاملاً فارسی |

---

## ساختار کد (30 فایل)

```
src/
  index.js          ← entry point (Express + polling loop)
  config/index.js   ← env variables
  database/prisma.js← Prisma singleton
  bot/
    bale.js         ← Bale API client (sendMessage, getUpdates, ...)
    messenger.js    ← reply helpers
    webhook.js      ← stub (unused)
  handlers/
    router.js       ← message dispatcher
    start.js        ← main menu
    products.js     ← browse & add to cart
    cart.js         ← cart view
    order.js        ← checkout & receipts
    admin.js        ← admin panel
    colleague.js    ← wholesale mode
    support.js      ← tickets
    help.js         ← help text
    marketing.js    ← referral system & marketing info
    wallet.js       ← wallet, withdrawal request & history
  keyboards/menus.js← Persian keyboard buttons
  utils/
    price.js        ← retail vs wholesale pricing
    order.js        ← tracking code generation
    invoice.js      ← PDF invoice + text invoice builder
  data/products.js  ← static catalog (~130+ products, 14 categories)
  seed.js           ← DB seeder
prisma/schema.prisma← DB schema
setup-assets.js     ← one-time script for font/logo setup
```

---

## Database (12 مدل)

| مدل | نقش کلیدی |
|-----|----------|
| `User` | کاربر + state machine + `referrerId` (معرف) + `marketingEnabled` + `tempAddressId` |
| `Category` | دسته‌بندی محصولات |
| `Product` | کد یکتا، `costPrice`, `profitPercent`, Bale `file_id` برای عکس |
| `Cart` / `CartItem` | سبد خرید یک‌به‌یک با User |
| `Order` / `OrderItem` | سفارش با چرخه وضعیت کامل |
| `Ticket` / `TicketMessage` | تیکت پشتیبانی |
| `Wallet` | کیف پول کاربر (موجودی پورسانت) |
| `Withdrawal` | درخواست برداشت از کیف پول |
| `SavedAddress` | آدرس‌های ذخیره‌شده کاربر (حداکثر ۳ عدد) |
| `MonthlySalesReport` | آرشیو ماهانه آمار فروش (حداکثر ۶ ماه) |

**چرخه وضعیت سفارش:**
```
WAITING_PAYMENT → WAITING_APPROVAL → APPROVED → PACKAGING → SHIPPED → DELIVERED
                                           ↘ REJECTED
```

---

## نقش‌های کاربری

| نقش | احراز هویت |
|-----|-----------|
| `CUSTOMER` | هر کاربر Bale (خودکار) |
| `ADMIN` | `baleId` در `ADMIN_BALE_IDS` env |
| `COLLEAGUE` | ورود کد `COLLEAGUE_ACCESS_CODE` |

---

## منطق کسب‌وکار کلیدی

- **قیمت خرده** = `costPrice × (1 + profitPercent/100)` (پیش‌فرض 20% از env)
- **قیمت عمده** = `costPrice` (بدون سود، برای COLLEAGUE)
- **حداقل سفارش عمده** = 10,000,000 تومان (قابل تنظیم)
- **پرداخت** = دستی، کارت به کارت یا شبا (پایا)، آپلود رسید در ربات
- **کد رهگیری** = فرمت `PL-YYYYMMDD-####`
- **فاکتور PDF** = با PDFKit — ارسال به ادمین هنگام تایید (فقط در چت ادمین)
- **بازاریابی** = لینک معرفی `/start ref_<baleId>` — معرف برای همیشه ثبت می‌شود
- **پورسانت** = 5٪ مبلغ فاکتور تایید‌شده به کیف پول معرف واریز می‌شود
- **برداشت** = حداقل 50,000 تومان، حداکثر 10,000,000 تومان — ادمین تایید می‌کند
- **آدرس ذخیره‌شده** = بعد از اولین سفارش، آدرس ذخیره می‌شود؛ در checkout بعدی inline نمایش داده می‌شود (حداکثر ۳)
- **بازاریابی/کیف پول** = پشت کد مخفی `MARKETING_ACCESS_CODE` — پیش‌فرض `petland-vip`
- **آمار فروش** = آرشیو ماهانه خودکار در پنل ادمین (حداکثر ۶ ماه)

---

## متغیرهای محیطی مهم

```env
BOT_TOKEN              # توکن ربات Bale (الزامی)
DATABASE_URL           # PostgreSQL connection string (الزامی)
PORT                   # پیش‌فرض 3000
ADMIN_BALE_IDS         # شناسه‌های Bale ادمین، با کاما
COLLEAGUE_ACCESS_CODE  # کد دسترسی عمده (پیش‌فرض: petland1404)
MARKETING_ACCESS_CODE  # کد فعال‌سازی بازاریابی+کیف‌پول (پیش‌فرض: petland-vip)
DEFAULT_PROFIT_PERCENT # پیش‌فرض: 20 (در env تنظیم شده)
WHOLESALE_MIN_ORDER    # پیش‌فرض: 10000000
BANK_CARD              # شماره کارت
BANK_IBAN              # شماره شبا (اختیاری)
BANK_HOLDER            # نام صاحب حساب
BANK_NAME              # نام بانک
BOT_USERNAME           # یوزرنیم ربات بدون @ (برای لینک معرفی)
SHOP_NAME              # پیش‌فرض: پت لند
```

---

## اسکریپت‌های راه‌اندازی

```bash
npm run build    # prisma generate (با mirror ایران)
npm run db:push  # sync schema
npm run seed     # بارگذاری محصولات
npm start        # اجرا (پروسه دائمی)
node setup-assets.js  # کپی لوگو و فونت (یک بار)
```

---

## شکاف‌های مهم (برای AI: در صورت درخواست تغییر توجه کن)

| شکاف | اهمیت |
|------|-------|
| بدون `.gitignore` | خطر push کردن `.env` |
| بدون Migration files | rollback DB ممکن نیست |
| فاکتور PDF فارسی ناقص | PDFKit متن فارسی را درست render نمی‌کند |
| `webhook.js` stub و بلااستفاده | |
| `axios` نصب ولی استفاده نشده | |
| بدون تست | |
| بدون rate limiting | |
| تغییر `profitPercent` محصول فقط از طریق DB مستقیم | نیاز به دستور ادمین در ربات |

---

## قوانین AI

1. **هیچ فایل کدی بدون دستور صریح تغییر نده**
2. فقط بر اساس سورس واقعی پاسخ بده — حدس نزن
3. اگر اطلاعات ناموجود است، `Unknown` بنویس
4. تغییر schema Prisma = تغییر `prisma/schema.prisma` + اجرای `db:push`
5. محصولات از `src/data/products.js` می‌آیند — تغییر catalog = ویرایش این فایل + `npm run seed`
6. فایل‌های مستندات در `docs/` هستند

---

## مستندات تفصیلی
- `docs/PROJECT.md` — اطلاعات پروژه
- `docs/ARCHITECTURE.md` — معماری و دیاگرام
- `docs/DATABASE.md` — schema کامل
- `docs/API.md` — endpoints و Bot flow
- `docs/CURRENT_STATUS.md` — وضعیت فعلی و شکاف‌ها
- `docs/PROJECT_RULES.md` — قوانین توسعه
- `docs/ROADMAP.md` — برنامه آینده
- `docs/DECISIONS.md` — تصمیمات معماری (ADR)
> خلاصه مدیریتی پروژه برای استفاده در چت‌های AI. این فایل را در ابتدای هر مکالمه بارگذاری کن.

---

## پروژه چیست؟
**PetLand** یک ربات فروشگاهی روی پیام‌رسان **Bale** (نسخه ایرانی تلگرام) است که محصولات حیوانات خانگی می‌فروشد. این یک اپلیکیشن وب معمولی **نیست** — رابط کاربری آن کاملاً از طریق کیبوردهای ربات در Bale است.

---

## Stack فنی

| لایه | تکنولوژی |
|------|---------|
| زبان | JavaScript (Node.js، CommonJS) |
| HTTP | Express 5 (فقط health check) |
| Database | PostgreSQL + Prisma 6 ORM |
| Messaging | Bale Bot API (long polling) |
| PDF | PDFKit (فارسی ناقص) |
| Deploy | Liara (PaaS ایرانی) |
| UI | Bale inline + reply keyboards — کاملاً فارسی |

---

## ساختار کد (30 فایل)

```
src/
  index.js          ← entry point (Express + polling loop)
  config/index.js   ← env variables
  database/prisma.js← Prisma singleton
  bot/
    bale.js         ← Bale API client (sendMessage, getUpdates, ...)
    messenger.js    ← reply helpers
    webhook.js      ← stub (unused)
  handlers/
    router.js       ← message dispatcher
    start.js        ← main menu
    products.js     ← browse & add to cart
    cart.js         ← cart view
    order.js        ← checkout & receipts
    admin.js        ← admin panel
    colleague.js    ← wholesale mode
    support.js      ← tickets
    help.js         ← help text
    marketing.js    ← referral system & marketing info
    wallet.js       ← wallet, withdrawal request & history
  keyboards/menus.js← Persian keyboard buttons
  utils/
    price.js        ← retail vs wholesale pricing
    order.js        ← tracking code generation
    invoice.js      ← PDF invoice + text invoice builder
  data/products.js  ← static catalog (~130+ products, 14 categories)
  seed.js           ← DB seeder
prisma/schema.prisma← DB schema
setup-assets.js     ← one-time script for font/logo setup
```

---

## Database (10 مدل)

| مدل | نقش کلیدی |
|-----|----------|
| `User` | کاربر + state machine + `referrerId` (معرف) |
| `Category` | دسته‌بندی محصولات |
| `Product` | کد یکتا، `costPrice`, `profitPercent`, Bale `file_id` برای عکس |
| `Cart` / `CartItem` | سبد خرید یک‌به‌یک با User |
| `Order` / `OrderItem` | سفارش با چرخه وضعیت کامل |
| `Ticket` / `TicketMessage` | تیکت پشتیبانی |
| `Wallet` | کیف پول کاربر (موجودی پورسانت) |
| `Withdrawal` | درخواست برداشت از کیف پول |

**چرخه وضعیت سفارش:**
```
WAITING_PAYMENT → WAITING_APPROVAL → APPROVED → PACKAGING → SHIPPED → DELIVERED
                                           ↘ REJECTED
```

---

## نقش‌های کاربری

| نقش | احراز هویت |
|-----|-----------|
| `CUSTOMER` | هر کاربر Bale (خودکار) |
| `ADMIN` | `baleId` در `ADMIN_BALE_IDS` env |
| `COLLEAGUE` | ورود کد `COLLEAGUE_ACCESS_CODE` |

---

## منطق کسب‌وکار کلیدی

- **قیمت خرده** = `costPrice × (1 + profitPercent/100)` (پیش‌فرض 15%)
- **قیمت عمده** = `costPrice` (بدون سود، برای COLLEAGUE)
- **حداقل سفارش عمده** = 50,000,000 تومان (قابل تنظیم)
- **پرداخت** = دستی، کارت به کارت یا شبا، آپلود رسید در ربات
- **کد رهگیری** = فرمت `PL-YYYYMMDD-####`
- **فاکتور PDF** = با PDFKit — ارسال به ادمین هنگام تایید
- **بازاریابی** = لینک معرفی `/start ref_<baleId>` — معرف برای همیشه ثبت می‌شود
- **پورسانت** = 5٪ مبلغ فاکتور تایید‌شده به کیف پول معرف واریز می‌شود
- **برداشت** = حداقل 50,000 تومان، حداکثر 10,000,000 تومان — ادمین تایید می‌کند

---

## متغیرهای محیطی مهم

```env
BOT_TOKEN              # توکن ربات Bale (الزامی)
DATABASE_URL           # PostgreSQL connection string (الزامی)
PORT                   # پیش‌فرض 3000
ADMIN_BALE_IDS         # شناسه‌های Bale ادمین، با کاما
COLLEAGUE_ACCESS_CODE  # کد دسترسی عمده (پیش‌فرض: petland1404)
DEFAULT_PROFIT_PERCENT # پیش‌فرض: 15
WHOLESALE_MIN_ORDER    # پیش‌فرض: 50000000
BANK_CARD              # شماره کارت
BANK_IBAN              # شماره شبا (اختیاری)
BANK_HOLDER            # نام صاحب حساب
BANK_NAME              # نام بانک
BOT_USERNAME           # یوزرنیم ربات بدون @ (برای لینک معرفی)
SHOP_NAME              # پیش‌فرض: پت لند
```

---

## اسکریپت‌های راه‌اندازی

```bash
npm run build    # prisma generate (با mirror ایران)
npm run db:push  # sync schema
npm run seed     # بارگذاری محصولات
npm start        # اجرا (پروسه دائمی)
node setup-assets.js  # کپی لوگو و فونت (یک بار)
```

---

## شکاف‌های مهم (برای AI: در صورت درخواست تغییر توجه کن)

| شکاف | اهمیت |
|------|-------|
| بدون `.gitignore` | خطر push کردن `.env` |
| بدون Migration files | rollback DB ممکن نیست |
| فاکتور PDF فارسی ناقص | PDFKit متن فارسی را درست render نمی‌کند |
| `webhook.js` stub و بلااستفاده | |
| `axios` نصب ولی استفاده نشده | |
| بدون تست | |
| بدون rate limiting | |

---

## قوانین AI

1. **هیچ فایل کدی بدون دستور صریح تغییر نده**
2. فقط بر اساس سورس واقعی پاسخ بده — حدس نزن
3. اگر اطلاعات ناموجود است، `Unknown` بنویس
4. تغییر schema Prisma = تغییر `prisma/schema.prisma` + اجرای `db:push`
5. محصولات از `src/data/products.js` می‌آیند — تغییر catalog = ویرایش این فایل + `npm run seed`
6. فایل‌های مستندات در `docs/` هستند

---

## مستندات تفصیلی
- `docs/PROJECT.md` — اطلاعات پروژه
- `docs/ARCHITECTURE.md` — معماری و دیاگرام
- `docs/DATABASE.md` — schema کامل
- `docs/API.md` — endpoints و Bot flow
- `docs/CURRENT_STATUS.md` — وضعیت فعلی و شکاف‌ها
- `docs/PROJECT_RULES.md` — قوانین توسعه
- `docs/ROADMAP.md` — برنامه آینده
- `docs/DECISIONS.md` — تصمیمات معماری (ADR)
