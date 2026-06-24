const fs = require("fs");
const prisma = require("../database/prisma");
const bale = require("../bot/bale");
const { reply, notify, replyPhoto } = require("../bot/messenger");
const {
  BTN,
  adminMenu,
  adminOrderActions,
  adminApprovedActions,
  kb,
} = require("../keyboards/menus");
const { buildInvoiceText, generateInvoicePdf } = require("../utils/invoice");
const { statusLabel } = require("../utils/order");
const { notifyOrderStatus } = require("./order");

module.exports.showAdminPanel = async function showAdminPanel(user, chatId) {
  await reply(user, chatId, "⚙️ پنل ادمین", adminMenu());
};

async function listOrdersByStatus(user, chatId, status, title) {
  const orders = await prisma.order.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (!orders.length) {
    await reply(user, chatId, `${title}\n\nموردی وجود ندارد.`, adminMenu());
    return;
  }

  let text = `${title}\n\n`;
  for (const o of orders) {
    text += `🔖 ${o.trackingCode}\n`;
    text += `👤 ${o.fullName} | 💰 ${o.totalAmount.toLocaleString("fa-IR")}\n`;
    text += `📊 ${statusLabel(o.status)}\n\n`;
  }

  text += "برای مشاهده جزئیات، کد پیگیری را ارسال کنید.";

  await prisma.user.update({
    where: { id: user.id },
    data: { adminStep: `VIEW_${status}` },
  });

  await reply(user, chatId, text, adminMenu());
}

module.exports.handleAdmin = async function handleAdmin(user, chatId, text) {
  if (text === BTN.ADMIN_PANEL) {
    await module.exports.showAdminPanel(user, chatId);
    return true;
  }

  if (text === BTN.ADMIN_PENDING) {
    await listOrdersByStatus(
      user,
      chatId,
      "WAITING_APPROVAL",
      "🧾 فاکتورهای در انتظار تایید"
    );
    return true;
  }

  if (text === BTN.ADMIN_APPROVED) {
    const orders = await prisma.order.findMany({
      where: { status: { in: ["APPROVED", "PACKAGING"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    if (!orders.length) {
      await reply(user, chatId, "✅ فاکتور تایید شده‌ای وجود ندارد.", adminMenu());
      return true;
    }

    let text = "✅ فاکتورهای تایید شده / بسته‌بندی\n\n";
    for (const o of orders) {
      text += `🔖 ${o.trackingCode}\n`;
      text += `👤 ${o.fullName} | 📊 ${statusLabel(o.status)}\n\n`;
    }
    text += "کد پیگیری را ارسال کنید.";

    await reply(user, chatId, text, adminMenu());
    return true;
  }

  if (text === BTN.ADMIN_REJECTED) {
    await listOrdersByStatus(user, chatId, "REJECTED", "❌ فاکتورهای رد شده");
    return true;
  }

  if (text === BTN.ADMIN_SHIPPED) {
    await listOrdersByStatus(user, chatId, "SHIPPED", "🚚 فاکتورهای ارسال شده");
    return true;
  }

  if (text === BTN.ADMIN_TICKETS) {
    const support = require("./support");
    await support.adminListTickets(user, chatId);
    return true;
  }

  if (text === BTN.ADMIN_PRODUCTS) {
    await reply(
      user,
      chatId,
      `📦 مدیریت محصولات

• برای تغییر موجودی: PL-کد محصول AVAILABLE یا UNAVAILABLE
  مثال: JMK-001 AVAILABLE

• برای تنظیم عکس: دکمه «🖼 تنظیم عکس محصول» سپس کد محصول سپس عکس`,
      kb([
        [{ text: BTN.SET_IMAGE }],
        [{ text: BTN.ADMIN_PANEL }],
      ])
    );
    return true;
  }

  if (text === BTN.SET_IMAGE) {
    await prisma.user.update({
      where: { id: user.id },
      data: { adminStep: "SET_IMAGE_CODE" },
    });
    await reply(user, chatId, "کد محصول را وارد کنید:");
    return true;
  }

  if (user.adminStep === "SET_IMAGE_CODE") {
    const product = await prisma.product.findUnique({
      where: { code: text.trim().toUpperCase() },
    });

    if (!product) {
      await reply(user, chatId, "محصول پیدا نشد.");
      return true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        adminStep: "SET_IMAGE_UPLOAD",
        lastProductCode: product.code,
      },
    });

    await reply(user, chatId, "عکس محصول را ارسال کنید:");
    return true;
  }

  if (text.match(/^[A-Z]{2,3}-\d{3}\s+(AVAILABLE|UNAVAILABLE)$/i)) {
    const [code, status] = text.trim().split(/\s+/);

    const product = await prisma.product
      .update({
        where: { code: code.toUpperCase() },
        data: { status: status.toUpperCase() },
      })
      .catch(() => null);

    if (!product) {
      await reply(user, chatId, "محصول پیدا نشد.");
      return true;
    }

    await reply(
      user,
      chatId,
      `✅ ${product.code} → ${status === "AVAILABLE" ? "موجود" : "ناموجود"}`
    );
    return true;
  }

  if (text.startsWith("#") && user.role === "ADMIN") {
    const parts = text.split("\n");
    const ticketRef = parts[0].replace("#", "").trim();
    const message = parts.slice(1).join("\n").trim();

    if (!message) {
      await reply(user, chatId, "فرمت:\n#کد_تیکت\nمتن پاسخ");
      return true;
    }

    const support = require("./support");
    await support.adminReplyTicket(user, chatId, ticketRef, message);
    return true;
  }

  const order = await prisma.order.findUnique({
    where: { trackingCode: text.trim() },
    include: { items: { include: { product: true } } },
  });

  if (order && user.role === "ADMIN") {
    await showAdminOrderDetail(user, chatId, order);
    return true;
  }

  if (user.adminStep === "REJECT_REASON" && user.pendingOrderId) {
    const order = await prisma.order.update({
      where: { id: user.pendingOrderId },
      data: {
        status: "REJECTED",
        rejectReason: text,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { adminStep: null, pendingOrderId: null },
    });

    await notifyOrderStatus(order, "❌ فاکتور شما رد شد.");
    await reply(user, chatId, "فاکتور رد شد.", adminMenu());
    return true;
  }

  if (user.adminStep === "SHIP_INFO" && user.pendingOrderId) {
    const order = await prisma.order.update({
      where: { id: user.pendingOrderId },
      data: {
        status: "SHIPPED",
        shipmentInfo: text,
      },
      include: { items: { include: { product: true } } },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { adminStep: null, pendingOrderId: null },
    });

    await notifyOrderStatus(
      order,
      `🚚 سفارش ارسال شد.\n${text}`
    );

    await reply(user, chatId, "✅ ارسال ثبت شد.", adminMenu());
    return true;
  }

  if (text === BTN.APPROVE && user.pendingOrderId) {
    await approveOrder(user, chatId);
    return true;
  }

  if (text === BTN.REJECT && user.pendingOrderId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { adminStep: "REJECT_REASON" },
    });
    await reply(user, chatId, "دلیل رد فاکتور را بنویسید:");
    return true;
  }

  if (text === BTN.PACK && user.pendingOrderId) {
    const order = await prisma.order.update({
      where: { id: user.pendingOrderId },
      data: { status: "PACKAGING" },
    });

    await notifyOrderStatus(order, "📦 سفارش در حال بسته‌بندی است.");
    await reply(user, chatId, "وضعیت: بسته‌بندی", adminApprovedActions());
    return true;
  }

  if (text === BTN.SHIP && user.pendingOrderId) {
    await prisma.user.update({
      where: { id: user.id },
      data: { adminStep: "SHIP_INFO" },
    });
    await reply(
      user,
      chatId,
      "اطلاعات ارسال را وارد کنید:\n(کد رهگیری پست یا شماره تماس اسنپ)"
    );
    return true;
  }

  return false;
};

async function showAdminOrderDetail(user, chatId, order) {
  await prisma.user.update({
    where: { id: user.id },
    data: { pendingOrderId: order.id },
  });

  const invoice = buildInvoiceText(order, order.items);
  let keyboard = adminMenu();

  if (order.status === "WAITING_APPROVAL") {
    keyboard = adminOrderActions();

    await reply(user, chatId, invoice, keyboard);

    if (order.receiptImage) {
      await replyPhoto(
        user,
        chatId,
        order.receiptImage,
        "📸 رسید پرداخت"
      );
    }

    return;
  }

  if (order.status === "APPROVED" || order.status === "PACKAGING") {
    keyboard = adminApprovedActions();
  }

  await reply(user, chatId, invoice, keyboard);
}

async function approveOrder(user, chatId) {
  const order = await prisma.order.update({
    where: { id: user.pendingOrderId },
    data: { status: "PACKAGING" },
    include: { items: { include: { product: true } } },
  });

  await notifyOrderStatus(order, "✅ فاکتور تایید شد. در حال آماده‌سازی.");

  try {
    const pdfPath = await generateInvoicePdf(order, order.items);
    await bale.sendDocument(
      chatId,
      fs.createReadStream(pdfPath),
      `فاکتور ${order.trackingCode}`
    );
    fs.unlinkSync(pdfPath);
  } catch (err) {
    console.log("PDF ERROR:", err.message);
  }

  const owner = await prisma.user.findUnique({
    where: { id: order.userId },
  });

  if (owner) {
    await notify(
      owner.baleId,
      buildInvoiceText(order, order.items)
    );
  }

  await reply(user, chatId, "✅ فاکتور تایید شد.", adminApprovedActions());
}

module.exports.handleAdminPhoto = async function handleAdminPhoto(
  user,
  chatId,
  photo
) {
  if (user.adminStep !== "SET_IMAGE_UPLOAD" || !user.lastProductCode) {
    return false;
  }

  const fileId = photo[photo.length - 1].file_id;

  await prisma.product.update({
    where: { code: user.lastProductCode },
    data: { imageUrl: fileId },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { adminStep: null, lastProductCode: null },
  });

  await reply(user, chatId, "✅ عکس محصول ذخیره شد.", adminMenu());
  return true;
};
