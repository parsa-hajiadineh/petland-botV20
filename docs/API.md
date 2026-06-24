# API.md — PetLand v20

## نوع API
این پروژه دو نوع رابط ارتباطی دارد:
1. **HTTP REST (Express)** — فقط برای health check، بدون منطق کسب‌وکار
2. **Bale Bot API** — تمام منطق کسب‌وکار از طریق پیام‌رسان Bale

---

## 1. HTTP Endpoints (Express)

### GET /
- **پاسخ:** `PetLand Bot is Running` (text/plain)
- **کاربرد:** تأیید اجرای سرویس

### GET /health
- **پاسخ:**
```json
{
  "ok": true,
  "service": "petland-bot"
}
```
- **کاربرد:** Health check برای Liara یا load balancer

**هیچ endpoint دیگری وجود ندارد.** هیچ REST API برای محصولات، سفارش‌ها یا کاربران ارائه نمی‌شود.

---

## 2. Bale Bot API (ورودی — Long Polling)

### Base URL
```
https://tapi.bale.ai/bot{BOT_TOKEN}
```

### متدهای استفاده‌شده از Bale API

| متد | نوع درخواست | کاربرد |
|-----|------------|--------|
| `getMe` | POST | تأیید توکن ربات در startup |
| `getUpdates` | GET | دریافت پیام‌ها (long polling، offset، timeout=30) |
| `sendMessage` | POST | ارسال متن + کیبورد |
| `sendPhoto` | POST | ارسال تصویر محصول |
| `sendDocument` | POST | ارسال PDF فاکتور به ادمین |
| `deleteMessage` | POST | حذف آخرین پیام ربات |
| `getFile` | POST | دریافت metadata فایل (رسید پرداخت) |

### پارامترهای `getUpdates`
```json
{
  "offset": <last_update_id + 1>,
  "timeout": 30
}
```

### پارامترهای `sendMessage`
```json
{
  "chat_id": "<bale_user_id>",
  "text": "<متن پیام>",
  "reply_markup": {
    "keyboard": [[...buttons...]],
    "resize_keyboard": true
  }
}
```

---

## 3. منطق مسیریابی ربات (`handlers/router.js`)

ورودی ربات بر اساس اولویت زیر پردازش می‌شود:

### اولویت 1 — وضعیت مکالمه (State Machine)
اگر `user.adminStep` مقدار دارد:
- `WAITING_REJECT_REASON` → پردازش دلیل رد
- `WAITING_SHIPMENT_INFO` → پردازش اطلاعات ارسال
- `WAITING_PRODUCT_IMAGE` → پردازش تصویر محصول
- `WAITING_PRODUCT_CODE` → پردازش کد محصول برای تصویر

اگر `user.orderStep` مقدار دارد:
- مراحل فرم سفارش: `WAITING_NAME` → ... → `WAITING_RECEIPT`

### اولویت 2 — دکمه‌های کیبورد (متن ثابت)

| دکمه (فارسی) | عملکرد |
|-------------|--------|
| `🏠 منو اصلی` | بازگشت به منوی اصلی |
| `🛍️ محصولات` | نمایش دسته‌بندی‌ها |
| `🛒 سبد خرید` | نمایش سبد |
| `📦 سفارشاتم` | لیست سفارش‌های کاربر |
| `🎫 پشتیبانی` | منوی تیکت |
| `❓ راهنما` | نمایش راهنما |
| `👥 همکاری` | ورود به حالت عمده |
| `🔧 پنل ادمین` | پنل مدیریت (فقط ادمین) |
| `✅ تأیید سفارش` | تأیید و ثبت سفارش |

### اولویت 3 — Pattern Matching

| الگو | عملکرد |
|------|--------|
| `📂 {نام دسته}` | نمایش محصولات دسته |
| `PL-YYYYMMDD-####` | جزئیات سفارش با کد رهگیری |
| `{CODE}-{num}` مانند `JMK-001` | نمایش جزئیات محصول |
| `{CODE}-{num} AVAILABLE/UNAVAILABLE` | تغییر وضعیت محصول (ادمین) |
| `#ticketSuffix\nمتن` | پاسخ ادمین به تیکت |

---

## 4. جریان کامل خرید (Bot Conversation Flow)

```
کاربر شروع می‌کند
        ↓
/start  → Welcome + Main Menu
        ↓
محصولات → لیست دسته‌بندی‌ها
        ↓
انتخاب دسته → لیست محصولات (کد + نام + قیمت)
        ↓
انتخاب محصول → جزئیات + عکس + "افزودن به سبد"
        ↓
افزودن به سبد → درخواست تعداد → تأیید
        ↓
سبد خرید → مشاهده + "ثبت سفارش"
        ↓
فرم آدرس (7 مرحله):
  نام → تلفن → استان → شهر → آدرس → کدپستی → توضیحات
        ↓
نمایش خلاصه + "تأیید سفارش"
        ↓
Order ساخته می‌شود (WAITING_PAYMENT)
        ↓
اطلاعات پرداخت کارت به کارت نمایش داده می‌شود
        ↓
کاربر رسید آپلود می‌کند (عکس)
        ↓
وضعیت → WAITING_APPROVAL + اطلاع‌رسانی به ادمین
        ↓
ادمین تأیید/رد می‌کند
  تأیید → PDF فاکتور → APPROVED/PACKAGING/SHIPPED/DELIVERED
  رد → دلیل رد → REJECTED + اطلاع‌رسانی به کاربر
```

---

## 5. Authentication (هویت‌سنجی)

| نقش | روش احراز هویت |
|-----|---------------|
| Customer | هر کاربر Bale که پیام بفرستد (بر اساس `baleId`) |
| Admin | `baleId` باید در متغیر محیطی `ADMIN_BALE_IDS` باشد |
| Colleague | ورود کد `COLLEAGUE_ACCESS_CODE` از طریق ربات |

توکن، JWT، OAuth یا Session وجود ندارد.

---

## 6. متغیرهای محیطی مرتبط با API

| متغیر | توضیح |
|-------|-------|
| `BOT_TOKEN` | توکن ربات Bale |
| `ADMIN_BALE_IDS` | شناسه‌های Bale ادمین‌ها (با کاما) |
| `COLLEAGUE_ACCESS_CODE` | کد دسترسی عمده‌فروشی |
| `BANK_CARD` | شماره کارت برای پرداخت |
| `BANK_HOLDER` | نام صاحب کارت |
| `BANK_NAME` | نام بانک |
