# ARCHITECTURE.md — PetLand v20

## نوع معماری
Single-Service Monolith — یک سرویس Node.js که همه منطق را در بر می‌گیرد.

## دیاگرام کلی

```
┌─────────────────────────────────────────────────────────┐
│                  Bale Messenger Platform                 │
│         (tapi.bale.ai — Iranian messaging service)      │
└────────────────────────┬────────────────────────────────┘
                         │ Long Polling (HTTP GET, 30s timeout)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                petland-v20 (Node.js)                    │
│                                                         │
│  ┌──────────────┐    ┌──────────────────────────────┐  │
│  │ Express :3000│    │      Polling Loop             │  │
│  │  GET /        │    │  getUpdates → router.js       │  │
│  │  GET /health  │    └──────────────┬───────────────┘  │
│  └──────────────┘                   │                   │
│                          ┌──────────▼──────────┐        │
│                          │    handlers/         │        │
│                          │  ┌────────────────┐ │        │
│                          │  │ start.js       │ │        │
│                          │  │ products.js    │ │        │
│                          │  │ cart.js        │ │        │
│                          │  │ order.js       │ │        │
│                          │  │ admin.js       │ │        │
│                          │  │ colleague.js   │ │        │
│                          │  │ support.js     │ │        │
│                          │  │ help.js        │ │        │
│                          │  └────────────────┘ │        │
│                          └──────────┬──────────┘        │
│                                     │                   │
│                          ┌──────────▼──────────┐        │
│                          │   Prisma Client      │        │
│                          └──────────┬──────────┘        │
└─────────────────────────────────────┼───────────────────┘
                                      │
                         ┌────────────▼────────────┐
                         │      PostgreSQL DB        │
                         └─────────────────────────┘
```

## لایه‌های معماری

### 1. Transport Layer — `src/bot/bale.js`
- ارتباط با Bale API از طریق `node-fetch`
- Long Polling: `getUpdates` با timeout=30 ثانیه
- Webhook: پیاده‌سازی نشده (فایل stub موجود است)

### 2. HTTP Layer — `src/index.js`
- Express 5 فقط برای health check
- `GET /` → text
- `GET /health` → JSON
- هیچ REST API کسب‌وکاری ندارد

### 3. Routing Layer — `src/handlers/router.js`
مسیریابی پیام‌های Bale بر اساس:
- متن دکمه (ثابت‌های BTN فارسی)
- وضعیت مکالمه کاربر (`orderStep`, `adminStep`)
- Pattern matching (کدهای محصول، کدهای رهگیری)

### 4. Business Logic — `src/handlers/`
هر handler مسئول یک حوزه کاری مستقل:

| فایل | مسئولیت |
|------|---------|
| `start.js` | خوش‌آمدگویی، منوی اصلی |
| `products.js` | مرور دسته‌بندی و محصول، افزودن به سبد |
| `cart.js` | نمایش سبد خرید، اعتبارسنجی |
| `order.js` | تسویه حساب، آپلود رسید، مشاهده سفارش‌ها |
| `admin.js` | پنل ادمین، مدیریت سفارش، تصویر محصول |
| `colleague.js` | ورود به حالت عمده‌فروشی |
| `support.js` | سیستم تیکت پشتیبانی |
| `help.js` | راهنمای کاربر |

### 5. Data Access Layer — `src/database/prisma.js`
- Prisma Client singleton
- PostgreSQL از طریق `DATABASE_URL`

### 6. Utility Layer — `src/utils/`

| فایل | عملکرد |
|------|--------|
| `price.js` | محاسبه قیمت خرده/عمده |
| `order.js` | تولید کد رهگیری، برچسب وضعیت |
| `invoice.js` | متن فاکتور، تولید PDF |

## State Machine کاربر
کاربر در DB یک state machine است. مکالمات چند مرحله‌ای از طریق فیلدهای `orderStep` و `adminStep` در جدول User ردیابی می‌شوند:

```
orderStep:
  null → WAITING_NAME → WAITING_PHONE → WAITING_PROVINCE
       → WAITING_CITY → WAITING_ADDRESS → WAITING_POSTAL
       → WAITING_NOTES → WAITING_RECEIPT → null

adminStep:
  null → WAITING_REJECT_REASON → WAITING_SHIPMENT_INFO
       → WAITING_PRODUCT_IMAGE → WAITING_PRODUCT_CODE → null
```

## الگوهای طراحی
- **Singleton:** Prisma Client (`src/database/prisma.js`)
- **Router Pattern:** `handlers/router.js` برای dispatch پیام‌ها
- **State Machine:** فیلدهای step در User برای مکالمات چند مرحله‌ای

## محدودیت‌های معماری فعلی
- Long Polling نیاز به پروسه دائمی دارد (نه serverless)
- وضعیت مکالمه در DB ذخیره می‌شود (سربار DB برای هر پیام)
- Webhook پیاده‌سازی نشده
- تست‌های خودکار وجود ندارد
- مدیریت خطا جزئی است
