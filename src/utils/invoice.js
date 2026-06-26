const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { formatPrice } = require("./price");
const { statusLabel } = require("./order");
const { SHOP_NAME, BANK_CARD, BANK_IBAN, BANK_HOLDER, BANK_NAME } = require("../config");

function buildInvoiceText(order, items) {
  const lines = [
    `🧾 فاکتور ${SHOP_NAME}`,
    `━━━━━━━━━━━━━━━━━━`,
    `🔖 کد پیگیری: ${order.trackingCode}`,
    `📊 وضعیت: ${statusLabel(order.status)}`,
    `👤 ${order.fullName}`,
    `📱 ${order.phone}`,
    `📍 ${order.province}، ${order.city}`,
    `🏠 ${order.address}`,
  ];

  if (order.postalCode) {
    lines.push(`📮 کد پستی: ${order.postalCode}`);
  }

  if (order.description) {
    lines.push(`📝 توضیحات: ${order.description}`);
  }

  lines.push("", "📦 اقلام سفارش:", "");

  for (const item of items) {
    lines.push(
      `• ${item.product.title}`,
      `  کد: ${item.product.code} | تعداد: ${item.quantity}`,
      `  قیمت واحد: ${formatPrice(item.unitPrice)}`,
      `  جمع: ${formatPrice(item.unitPrice * item.quantity)}`,
      ""
    );
  }

  lines.push(
    "━━━━━━━━━━━━━━━━━━",
    `💰 جمع کل: ${formatPrice(order.totalAmount)}`,
    order.isWholesale ? "🏷 نوع: خرید همکار" : "🏷 نوع: خرید عادی"
  );

  return lines.join("\n");
}

function buildPaymentInfo() {
  const lines = [
    "💳 اطلاعات پرداخت",
    "━━━━━━━━━━━━━━━━━━",
  ];

  if (BANK_CARD) lines.push(`💳 شماره کارت: ${BANK_CARD}`);
  if (BANK_IBAN) lines.push(`🔢 شماره شبا: ${BANK_IBAN}`);
  if (BANK_HOLDER) lines.push(`👤 به نام: ${BANK_HOLDER}`);
  if (BANK_NAME) lines.push(`🏦 بانک: ${BANK_NAME}`);

  lines.push(
    "",
    "پس از واریز، از دکمه «📸 ارسال رسید پرداخت» استفاده کنید",
    "و اسکرین‌شات رسید را ارسال نمایید."
  );

  return lines.join("\n");
}

function buildShippingInfo() {
  return [
    "🚚 اطلاعات ارسال",
    "━━━━━━━━━━━━━━━━━━",
    "📍 تهران و کرج:",
    "تحویل یک‌روزه در روزهای کاری",
    "برای سفارش‌های ثبت‌شده قبل از ساعت ۱۶",
    "ارسال با اسنپ",
    "",
    "📍 شهرستان:",
    "ارسال با پست پیشتاز",
    "",
    "💰 هزینه ارسال به عهده مشتری است.",
  ].join("\n");
}

const FONT_PATH = path.join(__dirname, "..", "assets", "fonts", "VazirMatn-Regular.ttf");

function findLogoPath() {
  const candidates = [
    path.join(__dirname, "..", "assets", "logo.png"),
    path.join(__dirname, "..", "assets", "logo.jpg"),
    path.join(__dirname, "..", "assets", "logo.jpeg"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function generateInvoicePdf(order, items) {
  const os = require("os");
  const dir = path.join(os.tmpdir(), "petland-invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${order.trackingCode}.pdf`);
  const hasFont = fs.existsSync(FONT_PATH);
  const logoPath = findLogoPath();
  const hasLogo = !!logoPath;

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 40,
      info: {
        Title: `فاکتور ${order.trackingCode}`,
        Author: SHOP_NAME,
      },
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    if (hasFont) {
      doc.registerFont("Vazir", FONT_PATH);
    }

    const W = doc.page.width - 80; // عرض محتوا
    const RTL = { align: "right", features: ["rtla"] };
    const CENTER = { align: "center" };

    const farsi = (size, text, opts = RTL) => {
      if (hasFont) doc.font("Vazir");
      return doc.fontSize(size).text(text, 40, doc.y, { width: W, ...opts });
    };

    const line = (y) =>
      doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor("#cccccc").lineWidth(0.5).stroke();

    // ─── سربرگ ─────────────────────────────────────────────────────────────
    const headerTop = 40;

    if (hasLogo) {
      try {
        doc.image(logoPath, 40, headerTop, { width: 70, height: 70 });
      } catch (_) {}
    }

    if (hasFont) doc.font("Vazir");
    doc.fontSize(20).fillColor("#1a1a1a")
       .text(SHOP_NAME, 0, headerTop + 10, { align: "center", width: doc.page.width });

    doc.fontSize(10).fillColor("#555555")
       .text("PETLAND PET SHOP", 0, headerTop + 36, { align: "center", width: doc.page.width });

    doc.fontSize(9).fillColor("#777777")
       .text("@petland_bot  |  @petlandshop_bot", 0, headerTop + 52, { align: "center", width: doc.page.width });

    doc.y = headerTop + 80;
    line(doc.y);
    doc.moveDown(0.5);

    // ─── عنوان فاکتور ───────────────────────────────────────────────────────
    doc.fillColor("#1a1a1a");
    farsi(14, `🧾 فاکتور رسمی`, CENTER);
    doc.moveDown(0.2);
    farsi(10, `کد پیگیری: ${order.trackingCode}`, CENTER);
    doc.moveDown(0.5);
    line(doc.y);
    doc.moveDown(0.5);

    // ─── اطلاعات مشتری ──────────────────────────────────────────────────────
    farsi(11, "اطلاعات گیرنده");
    doc.moveDown(0.2);
    farsi(10, `نام: ${order.fullName}`);
    farsi(10, `موبایل: ${order.phone}`);
    farsi(10, `استان: ${order.province}   شهر: ${order.city}`);
    farsi(10, `آدرس: ${order.address}`);
    if (order.postalCode) farsi(10, `کد پستی: ${order.postalCode}`);
    if (order.description) farsi(10, `توضیحات: ${order.description}`);
    doc.moveDown(0.5);
    line(doc.y);
    doc.moveDown(0.5);

    // ─── جدول اقلام ────────────────────────────────────────────────────────
    farsi(11, "اقلام سفارش");
    doc.moveDown(0.3);

    // هدر جدول
    const col = { title: 40, code: 250, qty: 330, unit: 390, total: 460 };
    if (hasFont) doc.font("Vazir");
    doc.fontSize(9).fillColor("#ffffff");
    doc.rect(40, doc.y, W, 18).fill("#333333");
    const rowY = doc.y + 4;
    doc.fillColor("#ffffff");
    doc.text("محصول", col.title, rowY, { width: 200 });
    doc.text("کد", col.code, rowY, { width: 70 });
    doc.text("تعداد", col.qty, rowY, { width: 50 });
    doc.text("قیمت واحد", col.unit, rowY, { width: 80 });
    doc.text("جمع", col.total, rowY, { width: 80 });
    doc.y += 22;

    // ردیف‌های جدول
    let rowNum = 0;
    for (const item of items) {
      const rowBg = rowNum % 2 === 0 ? "#f9f9f9" : "#ffffff";
      doc.rect(40, doc.y, W, 18).fill(rowBg);
      doc.fillColor("#1a1a1a").fontSize(8);
      if (hasFont) doc.font("Vazir");
      const ry = doc.y + 4;
      const title = item.product.title.length > 28
        ? item.product.title.substring(0, 28) + "..."
        : item.product.title;
      doc.text(title, col.title, ry, { width: 200 });
      doc.text(item.product.code, col.code, ry, { width: 70 });
      doc.text(String(item.quantity), col.qty, ry, { width: 50 });
      doc.text(formatPrice(item.unitPrice), col.unit, ry, { width: 80 });
      doc.text(formatPrice(item.unitPrice * item.quantity), col.total, ry, { width: 80 });
      doc.y += 20;
      rowNum++;
    }

    doc.moveDown(0.5);
    line(doc.y);
    doc.moveDown(0.5);

    // ─── جمع کل ──────────────────────────────────────────────────────────────
    doc.fillColor("#1a1a1a");
    farsi(13, `جمع کل: ${formatPrice(order.totalAmount)}`);
    farsi(9, order.isWholesale ? "نوع سفارش: خرید همکار" : "نوع سفارش: خرید عادی");

    doc.moveDown(0.5);
    line(doc.y);
    doc.moveDown(0.5);

    // ─── تاریخ ───────────────────────────────────────────────────────────────
    const createdDate = new Date(order.createdAt || Date.now()).toLocaleDateString("fa-IR");
    farsi(9, `تاریخ ثبت سفارش: ${createdDate}`);

    // ─── فوتر ─────────────────────────────────────────────────────────────────
    doc.fontSize(8).fillColor("#aaaaaa")
       .text("این فاکتور به صورت خودکار توسط سیستم صادر شده است.", 40,
         doc.page.height - 50, { align: "center", width: W });

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  return filePath;
}

module.exports = {
  buildInvoiceText,
  buildPaymentInfo,
  buildShippingInfo,
  generateInvoicePdf,
};
