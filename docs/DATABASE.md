# DATABASE.md — PetLand v20

## نوع پایگاه داده
- **DBMS:** PostgreSQL
- **ORM:** Prisma 6
- **Migration strategy:** `prisma db push` (بدون migration files)

## اتصال
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## Enum ها

### UserRole
```
CUSTOMER    — مشتری معمولی
ADMIN       — مدیر سیستم
COLLEAGUE   — همکار (خرید عمده)
```

### ProductStatus
```
AVAILABLE     — موجود
UNAVAILABLE   — ناموجود
```

### OrderStatus (چرخه کامل سفارش)
```
WAITING_PAYMENT    → در انتظار پرداخت (ثبت اولیه)
WAITING_APPROVAL   → در انتظار تأیید (رسید آپلود شده)
APPROVED           → تأیید شده
PACKAGING          → در حال بسته‌بندی
SHIPPED            → ارسال شده
DELIVERED          → تحویل داده شده
REJECTED           → رد شده
```

### TicketStatus
```
OPEN       — باز
ANSWERED   — پاسخ داده شده
CLOSED     — بسته شده
```

---

## مدل‌های داده

### User
```prisma
model User {
  id              String    @id @default(cuid())
  baleId          String    @unique     // شناسه یکتای Bale
  firstName       String?
  lastName        String?
  username        String?
  role            UserRole  @default(CUSTOMER)
  
  // وضعیت مکالمه (State Machine)
  orderStep       String?               // مرحله جاری فرم سفارش
  adminStep       String?               // مرحله جاری پنل ادمین
  pendingOrderId  String?               // سفارش در حال پردازش
  
  // فیلدهای موقت فرم آدرس
  tempName        String?
  tempPhone       String?
  tempProvince    String?
  tempCity        String?
  tempAddress     String?
  tempPostal      String?
  tempNotes       String?
  
  // UI state
  lastMessageId   Int?                 // آخرین پیام ربات (برای حذف)
  
  orders          Order[]
  tickets         Ticket[]
  cart            Cart?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### Category
```prisma
model Category {
  id        String    @id @default(cuid())
  title     String    @unique
  products  Product[]
  createdAt DateTime  @default(now())
}
```

### Product
```prisma
model Product {
  id            String        @id @default(cuid())
  code          String        @unique   // مثال: JMK-001
  name          String
  description   String?
  costPrice     Int                     // قیمت خرید (تومان)
  profitPercent Float?                  // درصد سود (override DEFAULT_PROFIT_PERCENT)
  status        ProductStatus @default(AVAILABLE)
  imageUrl      String?                 // Bale file_id (نه URL واقعی)
  categoryId    String
  category      Category      @relation(...)
  orderItems    OrderItem[]
  cartItems     CartItem[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}
```

### Cart
```prisma
model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(...)
  items     CartItem[]
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
}
```

### CartItem
```prisma
model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  productId String
  quantity  Int      @default(1)
  cart      Cart     @relation(...)
  product   Product  @relation(...)
  
  @@unique([cartId, productId])
}
```

### Order
```prisma
model Order {
  id            String      @id @default(cuid())
  trackingCode  String      @unique   // PL-YYYYMMDD-####
  userId        String
  user          User        @relation(...)
  items         OrderItem[]
  
  // اطلاعات تحویل
  recipientName String
  phone         String
  province      String
  city          String
  address       String
  postalCode    String
  notes         String?
  
  totalAmount   Int                   // مجموع (تومان)
  isWholesale   Boolean  @default(false)
  status        OrderStatus @default(WAITING_PAYMENT)
  
  // پرداخت
  receiptImage  String?               // Bale file_id رسید
  
  // ارسال
  shipmentInfo  String?               // اطلاعات ارسال از ادمین
  rejectReason  String?               // دلیل رد سفارش
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### OrderItem
```prisma
model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int
  unitPrice Int             // قیمت لحظه‌ای (snapshot)
  order     Order   @relation(...)
  product   Product @relation(...)
}
```

### Ticket
```prisma
model Ticket {
  id        String         @id @default(cuid())
  userId    String
  user      User           @relation(...)
  title     String
  status    TicketStatus   @default(OPEN)
  messages  TicketMessage[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}
```

### TicketMessage
```prisma
model TicketMessage {
  id         String   @id @default(cuid())
  ticketId   String
  ticket     Ticket   @relation(...)
  senderType String             // "USER" یا "ADMIN"
  message    String
  createdAt  DateTime @default(now())
}
```

---

## نکات مهم

### قیمت‌گذاری محصول
- `costPrice` = قیمت خرید (ذخیره در DB)
- قیمت فروش خرده = `costPrice + floor(costPrice * profitPercent / 100)`
- `profitPercent` اگر روی محصول null باشد از `DEFAULT_PROFIT_PERCENT` (env) خوانده می‌شود
- قیمت عمده (COLLEAGUE) = `costPrice` (بدون سود)
- محصولاتی که `costPrice = 0` دارند → وضعیت `UNAVAILABLE`

### imageUrl
- مقدار این فیلد یک Bale `file_id` است، نه یک URL عادی
- برای نمایش عکس باید از API Bale استفاده شود

### کد رهگیری
- فرمت: `PL-YYYYMMDD-####`
- مثال: `PL-20250623-4521`
- تولید در: `src/utils/order.js`

### مهاجرت
- فایل migration وجود ندارد
- schema با `prisma db push` اعمال می‌شود
- برای بازسازی DB: `npm run db:push && npm run seed`

### Seed
- `npm run seed` دسته‌بندی‌ها و ~130 محصول را upsert می‌کند
- منبع داده: `src/data/products.js`
