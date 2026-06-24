# PROJECT.md — PetLand v20

## نام پروژه
پت لند — PetLand Bot

## نسخه
v20

## توضیح کلی
ربات فروشگاهی پیام‌رسان Bale برای فروش محصولات حیوانات خانگی. این پروژه یک اپلیکیشن وب سنتی نیست؛ تمام تعاملات کاربری از طریق رابط کیبورد ربات در پیام‌رسان Bale (نسخه ایرانی تلگرام) انجام می‌شود.

## اهداف اصلی کسب‌وکار
- فروش آنلاین محصولات حیوانات خانگی از طریق Bale
- پشتیبانی از دو نوع قیمت‌گذاری: خرده‌فروشی و عمده‌فروشی (همکار)
- مدیریت سفارش از لحظه ثبت تا تحویل
- پرداخت دستی کارت به کارت با تأیید رسید
- سیستم تیکت پشتیبانی

## پلتفرم و محیط
- پیام‌رسان: Bale (tapi.bale.ai)
- زبان پروژه: فارسی (Persian/Farsi)
- محیط استقرار: Liara (PaaS ایرانی)
- Runtime: Node.js (CommonJS)

## تیم و مالکیت
- Unknown

## وضعیت پروژه
در حال توسعه / عملیاتی

## مخزن کد
- مسیر: `C:\Users\ParsLap.ir\Desktop\petland-v20`
- بدون `.gitignore`، بدون `README`، بدون CI/CD

## ساختار کلی پوشه‌ها

```
petland-v20/
├── package.json
├── package-lock.json
├── .env.example
├── prisma/
│   └── schema.prisma
└── src/
    ├── index.js              # Entry point
    ├── seed.js               # DB seed
    ├── config/index.js       # Config loader
    ├── database/prisma.js    # Prisma singleton
    ├── bot/                  # Bale API client & helpers
    ├── services/             # User service
    ├── handlers/             # Business logic handlers
    ├── keyboards/            # Bale keyboard definitions
    ├── utils/                # Pricing, order, invoice helpers
    └── data/products.js      # Static product catalog (~130+ items)
```

## اسکریپت‌های اصلی

| دستور | عملکرد |
|-------|--------|
| `npm start` | اجرا در production |
| `npm run dev` | اجرا با nodemon (development) |
| `npm run seed` | بارگذاری محصولات در DB |
| `npm run db:push` | اعمال schema روی DB |
| `npm run build` | prisma generate با mirror ایران (Liara) |
