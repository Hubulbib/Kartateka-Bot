import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AppContext } from "../../../interfaces";
import { prismaClient } from "../../../db";
import { adminKeyboard } from "../admin";
import { getUserRole } from "../../bot";
import { UserRole } from "@prisma/client";

export const setupBusinessAdmin = (bot: Bot<AppContext>) => {
  bot.hears("⭐ Бизнес-заявки", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    const keyboard = new Keyboard()
      .text("📝 Просмотр активных бизнес-заявок")
      .row()
      .text("🔙 Назад")
      .resized();
    await ctx.reply("Управление жалобами:", { reply_markup: keyboard });
  });

  bot.hears("📝 Просмотр активных бизнес-заявок", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    const businessRequestRepo = prismaClient.businessRequest;
    const businessRequests = await businessRequestRepo.findMany({
      include: { owner: true },
      orderBy: { createdAt: "desc" },
    });

    const message = "⭐ Активные бизнес-заявки:\n\n";

    const backKeyboard = new Keyboard().text("🔙 Назад").resized();

    await ctx.reply(message, {
      reply_markup: backKeyboard,
    });

    if (businessRequests.length === 0) {
      await ctx.reply("Активных бизнес-заявок нет");
      return;
    }

    await Promise.all(
      businessRequests.map(async (request) => {
        const keyboard = new InlineKeyboard().text(
          "✅ Одобрить",
          `approve_business_${request.id}`
        );

        const ownerInfo = request.owner
          ? `Владелец: ${request.owner.tgId}`
          : "Владелец не указан";
        const message = `Название кафе: ${request.cafeName}\nUsername: ${
          request.cafeUsername
        }\nСоц. сеть: ${request.socialNetwork}\n${ownerInfo}\nКод: ${
          request.code
        }\nДата: ${request.createdAt.toLocaleDateString()}\n`;

        await ctx.reply(message, {
          reply_markup: keyboard,
        });
      })
    );
  });

  bot.callbackQuery(/^approve_business_(\d+)$/, async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    const businessRequestId = parseInt(ctx.match[1]);
    const businessRequestRepo = prismaClient.businessRequest;

    const request = await businessRequestRepo.findFirst({
      where: { id: businessRequestId },
    });
    if (!request) {
      await ctx.editMessageText(`❌ Ошибка: заявка не найдена`, {
        reply_markup: new InlineKeyboard().text(
          "🔙 Назад",
          "admin_request_back"
        ),
      });
      return;
    }

    await businessRequestRepo.delete({ where: { id: businessRequestId } });
    await ctx.reply(`✅ Заявка "${request.id}" успешно обработана`);
  });

  bot.callbackQuery("admin_business_back", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    await ctx.reply("Выберите сущность для управления:", {
      reply_markup: adminKeyboard,
    });
  });
};
