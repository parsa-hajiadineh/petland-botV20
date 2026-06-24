const prisma = require("../database/prisma");
const { ADMIN_BALE_IDS } = require("../config");
const { reply, notify } = require("../bot/messenger");
const { BTN, supportMenu, backMain, activeTicketMenu } = require("../keyboards/menus");

module.exports.showSupportMenu = async function showSupportMenu(user, chatId) {
  await reply(user, chatId, "🎫 پشتیبانی", supportMenu());
};

module.exports.handleSupport = async function handleSupport(
  user,
  chatId,
  text
) {
  if (text === BTN.SUPPORT) {
    await module.exports.showSupportMenu(user, chatId);
    return true;
  }

  if (text === BTN.NEW_TICKET) {
    await prisma.user.update({
      where: { id: user.id },
      data: { orderStep: "TICKET_MESSAGE" },
    });

    await reply(
      user,
      chatId,
      "📝 پیام خود را بنویسید:",
      backMain()
    );
    return true;
  }

  if (text === BTN.MY_TICKETS) {
    const tickets = await prisma.ticket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    if (!tickets.length) {
      await reply(user, chatId, "تیکتی ثبت نشده است.");
      return true;
    }

    const statusLabel = (s) =>
      s === "ANSWERED" ? "پاسخ داده شده" : "در انتظار پاسخ";

    let msg = "📋 تیکت‌های شما\n\n";
    for (const t of tickets) {
      msg += `#${t.id.slice(-6)} | ${t.title}\n`;
      msg += `وضعیت: ${statusLabel(t.status)}\n\n`;
    }

    await reply(user, chatId, msg, supportMenu());
    return true;
  }


  if (user.orderStep === "TICKET_MESSAGE") {
    if (!user.activeTicketId) {
      const autoTitle = text.slice(0, 40);
      const ticket = await prisma.ticket.create({
        data: {
          title: autoTitle,
          userId: user.id,
          status: "OPEN",
          messages: {
            create: { senderType: "USER", message: text },
          },
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { activeTicketId: ticket.id },
      });

      await reply(
        user,
        chatId,
        "✅ تیکت ثبت شد.\nبرای بستن تیکت از دکمه زیر استفاده کنید:",
        activeTicketMenu()
      );

      for (const adminId of ADMIN_BALE_IDS) {
        await notify(
          adminId,
          `🎫 تیکت جدید\nکاربر: ${user.fullName || user.baleId}\n\n${text}`
        );
      }

      return true;
    }

    await prisma.ticketMessage.create({
      data: {
        ticketId: user.activeTicketId,
        senderType: "USER",
        message: text,
      },
    });

    await prisma.ticket.update({
      where: { id: user.activeTicketId },
      data: { status: "OPEN" },
    });

    await reply(user, chatId, "✅ پیام ارسال شد.", activeTicketMenu());

    for (const adminId of ADMIN_BALE_IDS) {
      await notify(adminId, `💬 پیام تیکت\nکاربر: ${user.fullName || user.baleId}\n\n${text}`);
    }

    return true;
  }

  return false;
};

module.exports.adminListTickets = async function adminListTickets(user, chatId) {
  const tickets = await prisma.ticket.findMany({
    where: { status: { in: ["OPEN", "ANSWERED"] } },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { user: true },
  });

  if (!tickets.length) {
    await reply(user, chatId, "تیکت بازی وجود ندارد.");
    return;
  }

  let text = "🎫 تیکت‌های باز\n\n";
  for (const t of tickets) {
    text += `#${t.id.slice(-6)} | ${t.title}\n`;
    text += `کاربر: ${t.user.fullName || t.user.baleId}\n`;
    text += `وضعیت: ${t.status}\n\n`;
  }

  text += "برای پاسخ: #کد_تیکت را ارسال کنید\nمثال: #a1b2c3";

  await reply(user, chatId, text);
};

module.exports.adminReplyTicket = async function adminReplyTicket(
  user,
  chatId,
  ticketSuffix,
  message
) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: { endsWith: ticketSuffix } },
    include: { user: true },
  });

  if (!ticket) {
    await reply(user, chatId, "تیکت پیدا نشد.");
    return;
  }

  await prisma.ticketMessage.create({
    data: {
      ticketId: ticket.id,
      senderType: "ADMIN",
      message,
    },
  });

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: "ANSWERED" },
  });

  await notify(
    ticket.user.baleId,
    `🎫 پاسخ پشتیبانی\n\n${message}`
  );

  await reply(user, chatId, "✅ پاسخ ارسال شد.");
};
