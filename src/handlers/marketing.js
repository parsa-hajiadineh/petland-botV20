const prisma = require("../database/prisma");
const { BOT_USERNAME, SHOP_NAME } = require("../config");
const { reply, notify } = require("../bot/messenger");
const { inlineKb, backMain } = require("../keyboards/menus");

function buildReferralLink(baleId) {
  if (!BOT_USERNAME) return null;
  return `https://ble.ir/${BOT_USERNAME}?start=ref_${baleId}`;
}

module.exports.showMarketing = async function showMarketing(user, chatId) {
  const referralLink = buildReferralLink(user.baleId);

  const referralCount = await prisma.user.count({
    where: { referrerId: user.id },
  });

  const lines = [
    `📣 بازاریابی ${SHOP_NAME}`,
    `━━━━━━━━━━━━━━━━━━`,
    ``,
    `با معرفی دوستان خود به ${SHOP_NAME} درآمد کسب کنید!`,
    ``,
    `📋 شرایط و توضیحات:`,
    `• لینک اختصاصی خود را با دوستانتان به اشتراک بگذارید`,
    `• هر شخصی که از طریق لینک شما وارد ربات شود،`,
    `  برای همیشه به عنوان معرفی‌شده شما ثبت می‌شود`,
    `• برای دریافت جزئیات پاداش با پشتیبانی تماس بگیرید`,
    ``,
    `👥 تعداد معرفی‌های شما: ${referralCount} نفر`,
  ];

  if (referralLink) {
    lines.push(``, `🔗 لینک معرفی اختصاصی شما:`, referralLink);
  } else {
    lines.push(``, `⚠️ لینک معرفی در حال حاضر در دسترس نیست.`);
  }

  const inlineRows = [];
  if (referralLink) {
    inlineRows.push([
      { text: "📋 دریافت لینک برای کپی", callback_data: "ref:copy" },
    ]);
  }
  inlineRows.push([
    { text: "🏠 بازگشت به منوی اصلی", callback_data: "main:back" },
  ]);

  await reply(user, chatId, lines.join("\n"), inlineKb(inlineRows));
};

module.exports.handleCopyReferral = async function handleCopyReferral(user, chatId) {
  const referralLink = buildReferralLink(user.baleId);

  if (!referralLink) {
    await notify(user.baleId, "⚠️ لینک معرفی در حال حاضر در دسترس نیست.");
    return;
  }

  await notify(
    user.baleId,
    `🔗 لینک معرفی شما:\n\n${referralLink}\n\nاین لینک را کپی کرده و برای دوستانتان ارسال کنید.`
  );
};
