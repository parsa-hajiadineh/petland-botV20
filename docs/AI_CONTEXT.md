# AI_CONTEXT.md — PetLand v20
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
| PDF | PDFKit |
| Deploy | Liara (PaaS ایرانی) |
| UI | Bale inline keyboards — کاملاً فارسی |

---

## ساختار کد (26 فایل)

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
  keyboards/menus.js← Persian keyboard buttons
  utils/
    price.js        ← retail vs wholesale pricing
    order.js        ← tracking code generation
    invoice.js      ← PDF invoice
  data/products.js  ← static catalog (~130+ products, 14 categories)
  seed.js           ← DB seeder
prisma/schema.prisma← DB schema
```

---

## Database (8 مدل)

| مدل | نقش کلیدی |
|-----|----------|
| `User` | کاربر + state machine مکالمه (`orderStep`, `adminStep`, فیلدهای temp) |
| `Category` | دسته‌بندی محصولات |
| `Product` | کد یکتا، `costPrice`, `profitPercent`, Bale `file_id` برای عکس |
| `Cart` / `CartItem` | سبد خرید یک‌به‌یک با User |
| `Order` / `OrderItem` | سفارش با چرخه وضعیت کامل |
| `Ticket` / `TicketMessage` | تیکت پشتیبانی |

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
- **پرداخت** = دستی، کارت به کارت، آپلود رسید در ربات
- **کد رهگیری** = فرمت `PL-YYYYMMDD-####`
- **فاکتور** = PDF تولیدشده با PDFKit، ارسال به ادمین و مشتری

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
BANK_CARD / BANK_HOLDER / BANK_NAME  # اطلاعات پرداخت
```

---

## اسکریپت‌های راه‌اندازی

```bash
npm run build    # prisma generate (با mirror ایران)
npm run db:push  # sync schema
npm run seed     # بارگذاری محصولات
npm start        # اجرا (پروسه دائمی)
```

---

## شکاف‌های مهم (برای AI: در صورت درخواست تغییر توجه کن)

| شکاف | اهمیت |
|------|-------|
| بدون `.gitignore` | خطر push کردن `.env` |
| بدون Migration files | rollback DB ممکن نیست |
| `webhook.js` stub و بلااستفاده | |
| `axios` نصب ولی استفاده نشده | |
| بدون تست | |
| بدون README | |
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
