const { SHOP_NAME } = require("../config");
const { buildShippingInfo, buildPaymentInfo } = require("../utils/invoice");
const { reply } = require("../bot/messenger");
const { BTN, backMain } = require("../keyboards/menus");

const HELP_TEXT = `📖 راهنمای ${SHOP_NAME}

🛍 خرید محصول:
1️⃣ «محصولات» را بزنید
2️⃣ دسته‌بندی را انتخاب کنید
3️⃣ کد محصول را ارسال کنید
4️⃣ تعداد را وارد کنید
5️⃣ به سبد اضافه و ثبت سفارش کنید

🤝 خرید همکار:
با کد اختصاصی، قیمت همکاری (بدون سود) اعمال می‌شود.
حداقل مبلغ سفارش: ۵۰ میلیون تومان.

💳 پرداخت:
پرداخت فقط به صورت کارت‌به‌کارت (دستی) است.
پس از واریز، اسکرین‌شات رسید را ارسال کنید.

${buildShippingInfo()}

🎫 پشتیبانی:
از بخش «پشتیبانی» تیکت ثبت کنید.`;

module.exports = async function helpHandler(user, chatId) {
  await reply(
    user,
    chatId,
    HELP_TEXT,
    backMain()
  );
};

module.exports.showPaymentInfo = async function showPaymentInfo(user, chatId) {
  await reply(user, chatId, buildPaymentInfo(), backMain());
};
