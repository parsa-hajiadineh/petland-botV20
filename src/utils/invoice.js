const fs = require("fs");
const path = require("path");
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
  const PdfPrinter = require("pdfmake");

  const dir = path.join(os.tmpdir(), "petland-invoices");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${order.trackingCode}.pdf`);

  const hasFont = fs.existsSync(FONT_PATH);
  const logoFilePath = findLogoPath();

  // ─── فونت ────────────────────────────────────────────────────────────────
  const fontName = hasFont ? "Vazir" : "Roboto";
  const fontDefs = {};

  if (hasFont) {
    fontDefs["Vazir"] = {
      normal: FONT_PATH,
      bold: FONT_PATH,
      italics: FONT_PATH,
      bolditalics: FONT_PATH,
    };
  } else {
    // فونت پیش‌فرض pdfmake به عنوان fallback
    const robotoBase = path.join(
      path.dirname(require.resolve("pdfmake/package.json")),
      "build", "vfs_fonts.js"
    );
    console.warn("INVOICE: Font not found, using fallback (Persian may not render correctly).");
    // پریسه پیش‌فرض بدون فونت فارسی — حداقل PDF ساخته می‌شه
    fontDefs["Roboto"] = {
      normal: Buffer.from(""),
      bold: Buffer.from(""),
      italics: Buffer.from(""),
      bolditalics: Buffer.from(""),
    };
  }

  const printer = new PdfPrinter(fontDefs);

  // ─── لوگو به base64 ───────────────────────────────────────────────────────
  let logoDataUrl = null;
  if (logoFilePath) {
    try {
      const buf = fs.readFileSync(logoFilePath);
      const ext = path.extname(logoFilePath).slice(1).toLowerCase();
      const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
      logoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    } catch (_) {}
  }

  const createdDate = new Date(order.createdAt || Date.now()).toLocaleDateString("fa-IR");

  // ─── جدول اقلام ───────────────────────────────────────────────────────────
  const tableBody = [
    [
      { text: "محصول", style: "tableHeader", alignment: "right" },
      { text: "کد", style: "tableHeader", alignment: "center" },
      { text: "تعداد", style: "tableHeader", alignment: "center" },
      { text: "قیمت واحد", style: "tableHeader", alignment: "right" },
      { text: "جمع", style: "tableHeader", alignment: "right" },
    ],
    ...items.map((item) => [
      { text: item.product.title, alignment: "right" },
      { text: item.product.code, alignment: "center", fontSize: 8 },
      { text: String(item.quantity), alignment: "center" },
      { text: formatPrice(item.unitPrice), alignment: "right" },
      { text: formatPrice(item.unitPrice * item.quantity), alignment: "right" },
    ]),
  ];

  // ─── سربرگ ───────────────────────────────────────────────────────────────
  const headerContent = [];
  if (logoDataUrl) {
    headerContent.push({ image: logoDataUrl, width: 65, alignment: "center", margin: [0, 0, 0, 6] });
  }
  headerContent.push({ text: SHOP_NAME, style: "shopName" });
  headerContent.push({ text: "PETLAND PET SHOP", style: "shopSub" });
  headerContent.push({ text: "@petland_bot  |  @petlandshop_bot", style: "shopContact" });
  headerContent.push({ canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: "#cccccc" }], margin: [0, 8, 0, 10] });

  const docDef = {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 60],

    defaultStyle: {
      font: fontName,
      direction: "rtl",
      alignment: "right",
      fontSize: 10,
      lineHeight: 1.5,
      color: "#1a1a1a",
    },

    content: [
      ...headerContent,

      { text: "فاکتور رسمی", style: "invoiceTitle" },
      { text: `کد پیگیری: ${order.trackingCode}`, alignment: "center", fontSize: 9, color: "#555555", margin: [0, 2, 0, 10] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }], margin: [0, 0, 0, 10] },

      { text: "اطلاعات گیرنده", style: "sectionTitle" },
      {
        columns: [
          { text: `نام: ${order.fullName}`, width: "*" },
          { text: `موبایل: ${order.phone}`, width: "*" },
        ],
        columnGap: 10,
        margin: [0, 0, 0, 4],
      },
      { text: `استان: ${order.province}   |   شهر: ${order.city}`, margin: [0, 0, 0, 4] },
      { text: `آدرس: ${order.address}`, margin: [0, 0, 0, 4] },
      order.postalCode ? { text: `کد پستی: ${order.postalCode}`, margin: [0, 0, 0, 4] } : null,
      order.description ? { text: `توضیحات: ${order.description}`, margin: [0, 0, 0, 4] } : null,
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }], margin: [0, 8, 0, 10] },

      { text: "اقلام سفارش", style: "sectionTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["*", 60, 45, 90, 90],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex) => rowIndex === 0 ? "#2c2c2c" : rowIndex % 2 === 0 ? "#f5f5f5" : "#ffffff",
          hLineColor: () => "#e0e0e0",
          vLineColor: () => "#e0e0e0",
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          paddingTop: () => 6,
          paddingBottom: () => 6,
          paddingLeft: () => 8,
          paddingRight: () => 8,
        },
        margin: [0, 0, 0, 12],
      },

      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1.5, lineColor: "#2c2c2c" }], margin: [0, 0, 0, 6] },
      { text: `جمع کل: ${formatPrice(order.totalAmount)}`, style: "total" },
      { text: order.isWholesale ? "نوع سفارش: خرید همکار" : "نوع سفارش: خرید عادی", fontSize: 9, color: "#666666", margin: [0, 4, 0, 0] },
      { text: `تاریخ ثبت: ${createdDate}`, fontSize: 9, color: "#666666", margin: [0, 4, 0, 0] },
    ].filter(Boolean),

    styles: {
      shopName: { fontSize: 20, bold: true, color: "#1a1a1a", alignment: "center", margin: [0, 0, 0, 4] },
      shopSub: { fontSize: 10, color: "#555555", alignment: "center", margin: [0, 0, 0, 2] },
      shopContact: { fontSize: 8, color: "#888888", alignment: "center", margin: [0, 0, 0, 4] },
      invoiceTitle: { fontSize: 15, bold: true, color: "#1a1a1a", alignment: "center", margin: [0, 0, 0, 4] },
      sectionTitle: { fontSize: 11, bold: true, color: "#1a1a1a", margin: [0, 0, 0, 6] },
      tableHeader: { bold: true, color: "#ffffff", fontSize: 9 },
      total: { fontSize: 14, bold: true, color: "#1a1a1a", alignment: "right" },
    },

    footer: (currentPage, pageCount) => ({
      text: "این فاکتور به صورت خودکار توسط سیستم پت لند صادر شده است.",
      alignment: "center",
      fontSize: 7,
      color: "#aaaaaa",
      margin: [40, 10, 40, 0],
      font: fontName,
    }),
  };

  await new Promise((resolve, reject) => {
    try {
      const pdfDoc = printer.createPdfKitDocument(docDef);
      const writeStream = fs.createWriteStream(filePath);
      pdfDoc.pipe(writeStream);
      pdfDoc.end();
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });

  return filePath;
}

module.exports = {
  buildInvoiceText,
  buildPaymentInfo,
  buildShippingInfo,
  generateInvoicePdf,
};
