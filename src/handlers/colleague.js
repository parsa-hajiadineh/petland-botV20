const prisma = require("../database/prisma");
const { COLLEAGUE_ACCESS_CODE, WHOLESALE_MIN_ORDER } = require("../config");
const { reply } = require("../bot/messenger");
const { BTN, mainMenu, backMain } = require("../keyboards/menus");
const { formatPrice } = require("../utils/price");

module.exports = async function colleagueHandler(user, chatId, text) {
  if (text === BTN.COLLEAGUE) {
    await reply(
      user,
      chatId,
      `🤝 خرید همکار ${formatPrice(WHOLESALE_MIN_ORDER).replace(" تومان", "")} تومان

در حالت همکار:
• قیمت‌ها = قیمت همکاری (بدون سود)
• حداقل سفارش: ${formatPrice(WHOLESALE_MIN_ORDER)}
• مناسب فروشندگان و همکاران

🔐 لطفاً کد دسترسی همکار را وارد کنید:`,
      backMain()
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { orderStep: "COLLEAGUE_CODE" },
    });

    return true;
  }

  if (text === BTN.RETAIL_MODE) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "CUSTOMER", orderStep: null },
    });

    user.role = "CUSTOMER";

    await reply(
      user,
      chatId,
      "✅ به حالت خرید عادی بازگشتید.",
      mainMenu(user)
    );

    return true;
  }

  if (user.orderStep === "COLLEAGUE_CODE") {
    if (text.trim() !== COLLEAGUE_ACCESS_CODE) {
      await reply(
        user,
        chatId,
        "❌ کد دسترسی اشتباه است. دوباره تلاش کنید یا به منوی اصلی برگردید.",
        backMain()
      );
      return true;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: "COLLEAGUE", orderStep: null },
    });

    user.role = "COLLEAGUE";

    await reply(
      user,
      chatId,
      `✅ حالت خرید همکار فعال شد.

قیمت‌ها به صورت همکاری نمایش داده می‌شوند.
حداقل مبلغ سفارش: ${formatPrice(WHOLESALE_MIN_ORDER)}

📦 راهنمای خرید همکار:
• می‌توانید آدرس مشتری خودتان را مستقیم وارد کنید
• محصول را به هر قیمتی که صلاح می‌دانید به مشتریتان بفروشید
• تسویه با ما به قیمت همکاری انجام می‌شود
• فاکتور برای مشتریان همکاران ارسال نمی‌شود — فاکتور فقط در همین چت قابل مشاهده است`,
      mainMenu(user)
    );

    return true;
  }

  return false;
};
