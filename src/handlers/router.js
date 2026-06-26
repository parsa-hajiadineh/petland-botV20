const prisma = require("../database/prisma");
const { reloadUser } = require("../services/user");
const { isAdmin } = require("../services/user");
const { BTN } = require("../keyboards/menus");
const { reply } = require("../bot/messenger");

const productsHandler = require("./products");
const cartHandler = require("./cart");
const orderHandler = require("./order");
const colleagueHandler = require("./colleague");
const helpHandler = require("./help");
const supportHandler = require("./support");
const adminHandler = require("./admin");
const startHandler = require("./start");

module.exports = async function messageHandler(message, user) {
  const text = (message.text || "").trim();
  const chatId = message.chat.id;

  user = await reloadUser(user.id);

  if (text === BTN.BACK_MAIN || text === "/start") {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        orderStep: null,
        adminStep: null,
        pendingOrderId: null,
      },
    });
    user = await reloadUser(user.id);
    await startHandler(user, message);
    return;
  }

  if (text.startsWith("PL-") && user.adminStep === "VIEW_MY_ORDERS") {
    const shown = await orderHandler.showOrderByTracking(user, chatId, text);
    if (!shown) {
      await reply(user, chatId, "❌ سفارشی با این کد پیگیری یافت نشد.\nلطفاً کد را بررسی و دوباره ارسال کنید.");
    }
    return;
  }

  if (isAdmin(user) && (await adminHandler.handleAdmin(user, chatId, text))) {
    return;
  }

  if (await colleagueHandler(user, chatId, text)) return;

  if (await supportHandler.handleSupport(user, chatId, text)) return;

  if (text === BTN.HELP) {
    await helpHandler(user, chatId);
    return;
  }

  if (text === BTN.PRODUCTS || text === BTN.BACK_PRODUCTS) {
    await productsHandler(user, chatId);
    return;
  }

  if (text === BTN.CART) {
    await cartHandler.showCart(user, chatId);
    return;
  }

  if (text === BTN.CLEAR_CART) {
    await cartHandler.clearCart(user, chatId);
    return;
  }

  if (text === BTN.CHECKOUT) {
    await orderHandler.startCheckout(user, chatId);
    return;
  }

  if (text === BTN.ORDERS) {
    await prisma.user.update({
      where: { id: user.id },
      data: { orderStep: null, pendingOrderId: null, adminStep: "VIEW_MY_ORDERS" },
    });
    user = await reloadUser(user.id);
    await orderHandler.showMyOrders(user, chatId);
    return;
  }

  if (text === BTN.ADD_CART) {
    await productsHandler.startAddToCart(user, chatId);
    return;
  }

  if (text === BTN.UPLOAD_RECEIPT) {
    let pendingId = user.pendingOrderId;

    if (!pendingId) {
      const pending = await prisma.order.findFirst({
        where: {
          userId: user.id,
          status: "WAITING_PAYMENT",
        },
        orderBy: { createdAt: "desc" },
      });
      pendingId = pending?.id;
    }

    if (!pendingId) {
      await reply(user, chatId, "سفارشی در انتظار پرداخت ندارید.");
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        orderStep: "UPLOAD_RECEIPT",
        pendingOrderId: pendingId,
      },
    });
    await reply(user, chatId, "📸 لطفاً اسکرین‌شات رسید پرداخت را ارسال کنید.");
    return;
  }

  if (text.startsWith("PL-") && !isAdmin(user)) {
    const shown = await orderHandler.showOrderByTracking(user, chatId, text);
    if (!shown) {
      await reply(user, chatId, "❌ سفارشی با این کد پیگیری یافت نشد.\nلطفاً کد را بررسی و دوباره ارسال کنید.");
    }
    return;
  }

  if (user.orderStep === "PRODUCT_QTY") {
    const qty = parseInt(text, 10);
    if (!qty || qty < 1 || qty > 999) {
      await reply(user, chatId, "لطفاً یک عدد معتبر (1 تا 999) وارد کنید.");
      return;
    }
    await productsHandler.addToCartWithQty(user, chatId, qty);
    return;
  }

  if (await orderHandler.handleCheckoutStep(user, chatId, text)) {
    return;
  }

  if (text.startsWith("📂 ")) {
    await productsHandler.showCategory(
      user,
      chatId,
      text.replace("📂 ", "")
    );
    return;
  }

  const product = await prisma.product.findUnique({
    where: { code: text.trim().toUpperCase() },
    include: { category: true },
  });

  if (product) {
    await productsHandler.showProduct(user, chatId, product);
    return;
  }

  await reply(
    user,
    chatId,
    "لطفاً از دکمه‌های منو استفاده کنید.\nبرای راهنما: 📖 راهنما"
  );
};

module.exports.handleCallbackQuery = async function handleCallbackQuery(cq, user) {
  const data = (cq.data || "").trim();
  const chatId = cq.message.chat.id;

  user = await reloadUser(user.id);

  if (data.startsWith("PL-")) {
    const shown = await orderHandler.showOrderByTracking(user, chatId, data);
    if (!shown) {
      await reply(user, chatId, "❌ سفارشی با این کد پیگیری یافت نشد.");
    }
  }
};

module.exports.handlePhoto = async function handlePhoto(message, user) {
  const chatId = message.chat.id;
  user = await reloadUser(user.id);
  const photo = message.photo;

  if (!photo?.length) return;

  if (isAdmin(user) && (await adminHandler.handleAdminPhoto(user, chatId, photo))) {
    return;
  }

  if (await orderHandler.handleReceiptPhoto(user, chatId, photo)) {
    return;
  }

  await reply(user, chatId, "عکس دریافت شد ولی در این مرحله نیاز نیست.");
};
