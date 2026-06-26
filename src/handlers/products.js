const prisma = require("../database/prisma");
const { reply, replyPhoto } = require("../bot/messenger");
const bale = require("../bot/bale");
const { BTN, kb, inlineKb, productDetailMenu } = require("../keyboards/menus");
const {
  getUnitPrice,
  formatPrice,
  isWholesaleUser,
} = require("../utils/price");

module.exports = async function productsHandler(user, chatId) {
  const categories = await prisma.category.findMany({
    orderBy: { title: "asc" },
  });

  if (categories.length === 0) {
    await reply(user, chatId, "❌ هیچ دسته‌بندی ثبت نشده است.");
    return;
  }

  const rows = categories.map((cat) => [
    { text: `📂 ${cat.title}` },
  ]);

  rows.push([{ text: BTN.BACK_MAIN }]);

  await reply(
    user,
    chatId,
    "🛍 دسته‌بندی مورد نظر را انتخاب کنید:",
    kb(rows)
  );
};

module.exports.showCategory = async function showCategory(
  user,
  chatId,
  categoryTitle
) {
  const category = await prisma.category.findFirst({
    where: { title: categoryTitle },
  });

  if (!category) {
    await reply(user, chatId, "دسته‌بندی پیدا نشد.");
    return;
  }

  const products = await prisma.product.findMany({
    where: { categoryId: category.id },
    orderBy: { title: "asc" },
  });

  if (products.length === 0) {
    await reply(user, chatId, "در این دسته محصولی وجود ندارد.");
    return;
  }

  const wholesale = isWholesaleUser(user);

  const productRows = products.map((product) => {
    const price = getUnitPrice(product, wholesale);
    const availability = product.status === "AVAILABLE" ? "🟢" : "🔴";
    const label = `${availability} ${product.title} | ${formatPrice(price)}`;
    return [{ text: label, callback_data: `product:${product.code}` }];
  });

  // ارسال keyboard عادی با دکمه بازگشت (tracked — حذف می‌شه در ناوبری بعدی)
  await reply(
    user,
    chatId,
    `📂 ${category.title}`,
    kb([
      [{ text: BTN.BACK_PRODUCTS }],
      [{ text: BTN.BACK_MAIN }],
    ])
  );

  // ارسال لیست محصولات به صورت inline (بدون track)
  await bale.sendKeyboard(
    chatId,
    `${products.length} محصول — روی هر محصول برای جزئیات کلیک کنید:`,
    inlineKb(productRows)
  );
};

module.exports.showProduct = async function showProduct(
  user,
  chatId,
  product
) {
  const wholesale = isWholesaleUser(user);
  const price = getUnitPrice(product, wholesale);
  const status =
    product.status === "AVAILABLE" ? "🟢 موجود" : "🔴 ناموجود";

  await prisma.user.update({
    where: { id: user.id },
    data: { lastProductCode: product.code },
  });

  const caption = `📦 ${product.title}

🔖 کد: ${product.code}
🏷 دسته: ${product.category.title}
💰 قیمت: ${formatPrice(price)}
${wholesale ? "🤝 قیمت همکار" : "🛒 قیمت مصرف‌کننده"}
${status}

📝 ${product.description || "بدون توضیحات"}

${
  product.status === "AVAILABLE"
    ? "برای انتخاب محصول از دکمه \"افزودن به سبد\" استفاده نمایید."
    : "این محصول ناموجود است."
}`;

  if (product.imageUrl) {
    await replyPhoto(
      user,
      chatId,
      product.imageUrl,
      caption,
      productDetailMenu(product)
    );
  } else {
    await reply(
      user,
      chatId,
      caption,
      productDetailMenu(product)
    );
  }
};

module.exports.startAddToCart = async function startAddToCart(user, chatId) {
  if (!user.lastProductCode) {
    await reply(user, chatId, "محصولی انتخاب نشده است.");
    return;
  }

  const product = await prisma.product.findUnique({
    where: { code: user.lastProductCode },
  });

  if (!product || product.status !== "AVAILABLE") {
    await reply(user, chatId, "این محصول موجود نیست.");
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { orderStep: "PRODUCT_QTY" },
  });

  await reply(
    user,
    chatId,
    "🔢 تعداد مورد نظر را وارد کنید (عدد):",
    kb([[{ text: BTN.BACK_MAIN }]])
  );
};

module.exports.addToCartWithQty = async function addToCartWithQty(
  user,
  chatId,
  quantity
) {
  const product = await prisma.product.findUnique({
    where: { code: user.lastProductCode },
  });

  if (!product || product.status !== "AVAILABLE") {
    await reply(user, chatId, "محصول موجود نیست.");
    return;
  }

  let cart = await prisma.cart.findUnique({
    where: { userId: user.id },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId: user.id },
    });
  }

  const existing = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId: product.id },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity,
      },
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { orderStep: null },
  });

  await reply(
    user,
    chatId,
    `✅ ${quantity} عدد «${product.title}» به سبد اضافه شد.`,
    kb([
      [{ text: BTN.CART }],
      [{ text: BTN.PRODUCTS }],
      [{ text: BTN.BACK_MAIN }],
    ])
  );
};
